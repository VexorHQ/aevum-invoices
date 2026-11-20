"use client";

import { getLogsChunked, invoiceAbi, txUrl } from "@aevum-kit/aevum";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUnits, getAbiItem, type Hex, type PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { AnimatePresence, motion } from "motion/react";
import { blurUpChild, easeSmooth, springSnappy, staggerParent } from "@/lib/motion";
import { useToken } from "@/components/useToken";
import { ReceiptIcon } from "@/components/Icons";
import { CountUp } from "@/components/CountUp";
import { HeroParticles } from "@/components/HeroParticles";
import { HeroGlow } from "@/components/motion/HeroGlow";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { StatusBadge } from "@/components/motion/StatusBadge";
import { InvoiceSkeleton, SyncProgress } from "@/components/motion/SyncProgress";
import { VivusDraw } from "@/components/VivusDraw";
import { fadeUpChild, useEnter } from "@/components/Reveal";
import { useNetwork } from "@/lib/network";
import { formatDueDate, invoiceLabel, parseInvoiceData, short, statusOf, type InvoiceData, type InvoiceStatus } from "@/lib/invoice";

type Filter = "all" | InvoiceStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "paid", label: "Paid" },
  { id: "overdue", label: "Overdue" },
];

interface Row {
  id: Hex;
  inv: InvoiceData;
  paidAt: bigint | null;
  paidTx: Hex | null;
  createdBlock: bigint;
}

const SCAN_BACK = 20_000n;

export default function InvoicesPage() {
  const { net } = useNetwork();
  const appChain = net.chain;
  const invoiceAddress = net.invoice;
  const deployBlock = net.deployBlock;
  const hasExplorer = net.hasExplorer;
  const client = usePublicClient({ chainId: appChain.id }) as PublicClient | undefined;
  const token = useToken();
  const [filter, setFilter] = useState<Filter>("all");
  const [progress, setProgress] = useState(0);

  const invoices = useQuery({
    queryKey: ["invoices", appChain.id, invoiceAddress, deployBlock?.toString()],
    enabled: Boolean(client && invoiceAddress),
    queryFn: async (): Promise<{ rows: Row[]; from: bigint; head: bigint }> => {
      const c = client!;
      const head = await c.getBlockNumber();
      let from = head > SCAN_BACK ? head - SCAN_BACK + 1n : 0n;
      if (deployBlock !== undefined && deployBlock > from) from = deployBlock;
      setProgress(0);
      const created = await getLogsChunked(c, {
        address: invoiceAddress!,
        event: getAbiItem({ abi: invoiceAbi, name: "InvoiceCreated" }),
        fromBlock: from,
        toBlock: head,
        onProgress: (done, total) => setProgress(total ? Number((done * 50n) / total) : 50),
      });
      const paid = await getLogsChunked(c, {
        address: invoiceAddress!,
        event: getAbiItem({ abi: invoiceAbi, name: "InvoicePaid" }),
        fromBlock: from,
        toBlock: head,
        onProgress: (done, total) => setProgress(50 + (total ? Number((done * 50n) / total) : 50)),
      });
      const paidById = new Map<string, { paidAt: bigint; tx: Hex | null }>();
      for (const l of paid) {
        if (l.args.invoiceId) paidById.set(l.args.invoiceId.toLowerCase(), { paidAt: l.args.paidAt ?? 0n, tx: (l.transactionHash ?? null) as Hex | null });
      }
      const ids = [...new Map(created.map((l) => [l.args.invoiceId?.toLowerCase(), l])).values()].filter(
        (l): l is typeof l & { args: { invoiceId: Hex } } => Boolean(l.args.invoiceId),
      );
      const calls = await c.multicall({
        contracts: ids.map((l) => ({ address: invoiceAddress!, abi: invoiceAbi, functionName: "getInvoice", args: [l.args.invoiceId] }) as const),
      });
      const rows: Row[] = [];
      ids.forEach((l, i) => {
        const inv = parseInvoiceData(calls[i]?.result);
        if (!inv) return;
        const p = paidById.get(l.args.invoiceId.toLowerCase());
        rows.push({ id: l.args.invoiceId, inv, paidAt: p?.paidAt ?? null, paidTx: p?.tx ?? null, createdBlock: l.blockNumber ?? 0n });
      });
      rows.sort((a, b) => (a.createdBlock > b.createdBlock ? -1 : 1));
      setProgress(100);
      return { rows, from, head };
    },
  });

  const rows = invoices.data?.rows ?? [];
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, open: 0, paid: 0, overdue: 0 };
    for (const r of rows) c[statusOf(r.inv)]++;
    return c;
  }, [rows]);
  const shown = filter === "all" ? rows : rows.filter((r) => statusOf(r.inv) === filter);
  const openTotal = rows.filter((r) => statusOf(r.inv) !== "paid").reduce((s, r) => s + r.inv.amount, 0n);
  const paidTotal = rows.filter((r) => statusOf(r.inv) === "paid").reduce((s, r) => s + r.inv.amount, 0n);
  const unpaidCount = counts.open + counts.overdue;
  const enter = useEnter();
  const totalValue = paidTotal + openTotal;
  const paidShare = totalValue > 0n ? Number((paidTotal * 100n) / totalValue) : 0;
  const openShare = totalValue > 0n ? 100 - paidShare : 0;

  return (
    <main className="shell">
      <div className="hero-band">
        <HeroParticles />
        <HeroGlow />
        <motion.div className="page-head" variants={staggerParent} {...enter}>
          <div>
            <motion.div className="head-eyebrow-row" variants={blurUpChild}>
              <p className="eyebrow">Aevum testnet · tUSD8</p>
              {invoices.data && (
                <span className="live-chip">
                  <span className="live-dot" aria-hidden="true" />
                  Live · block {invoices.data.head.toString()}
                </span>
              )}
            </motion.div>
            <motion.h1 variants={blurUpChild}>Invoices</motion.h1>
            <motion.p className="lede" variants={blurUpChild}>
              Bills you send as a freelancer or small shop, settled on-chain in tUSD8. A client pays the exact amount — or signs once and a
              relayer submits it, so they need no gas.
            </motion.p>
          </div>
          <motion.div variants={blurUpChild}>
            <motion.span whileTap={{ scale: 0.97 }} style={{ display: "inline-flex" }}>
              <Link className="btn sheen" href="/invoices/new">
                New invoice
              </Link>
            </motion.span>
          </motion.div>
        </motion.div>
      </div>

      {!invoiceAddress ? (
        <div className="card empty">
          No Invoice contract configured for {net.label}. Deploy it with <code>make deploy-aevum</code> (or <code>make deploy-fork</code>{" "}
          locally), then set <code>NEXT_PUBLIC_CHECKOUT_{net.key.toUpperCase()}</code> in <code>web/.env.local</code>. The{" "}
          <Link href="/setup">Setup</Link> page checks the rest.
        </div>
      ) : (
        <>
          {invoices.data && (
            <motion.div className="metrics" aria-label="Invoice totals" variants={staggerParent} {...enter}>
              <SpotlightCard className="metric hero" variants={fadeUpChild}>
                <div className="metric-label">Paid in</div>
                <div className="metric-value">
                  <CountUp value={paidTotal} decimals={token.decimals} symbol={token.symbol} />
                </div>
                <div className="metric-note">
                  {counts.paid} invoice{counts.paid === 1 ? "" : "s"} settled on-chain
                </div>
                <div className="share" title={`${paidShare}% of invoiced value settled`}>
                  <span style={{ width: `${paidShare}%` }} />
                </div>
              </SpotlightCard>
              <SpotlightCard className="metric" variants={fadeUpChild}>
                <div className="metric-label">Still open</div>
                <div className="metric-value">
                  {formatUnits(openTotal, token.decimals)} <small>{token.symbol}</small>
                </div>
                <div className="metric-note">
                  across {unpaidCount} unpaid invoice{unpaidCount === 1 ? "" : "s"}
                </div>
                <div className="share navy" title={`${openShare}% of invoiced value still open`}>
                  <span style={{ width: `${openShare}%` }} />
                </div>
              </SpotlightCard>
              <SpotlightCard className="metric" variants={fadeUpChild}>
                <div className="metric-label">Open invoices</div>
                <div className="metric-value">{counts.open}</div>
                <div className="metric-note">awaiting payment</div>
              </SpotlightCard>
              <SpotlightCard className="metric" variants={fadeUpChild}>
                <div className="metric-label">Overdue</div>
                <div className="metric-value">{counts.overdue}</div>
                <div className="metric-note">past due, still payable</div>
              </SpotlightCard>
            </motion.div>
          )}
          <section className="card flush" aria-label="Invoices">
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="filter-btn"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {filter === f.id && <motion.span layoutId="filter-pill" className="filter-pill" transition={springSnappy} aria-hidden="true" />}
                <span className="filter-label">
                  {f.label} · {counts[f.id]}
                </span>
              </button>
            ))}
          </div>

          {invoices.error && <p className="empty">Couldn&apos;t read invoices: {(invoices.error as Error).message}</p>}

          <AnimatePresence mode="wait">
            {!invoices.data && invoices.isFetching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: easeSmooth }}
              >
                <div style={{ padding: "16px 20px" }}>
                  <SyncProgress progress={progress} label="Reading invoice events from the chain, 1,000 blocks at a time…" />
                </div>
                <InvoiceSkeleton />
              </motion.div>
            ) : invoices.data && rows.length === 0 && !invoices.isFetching ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: easeSmooth }}
              >
                <div className="empty">
                  <VivusDraw className="motif">
                    <ReceiptIcon />
                  </VivusDraw>
                  <p>
                    No invoices yet in blocks {invoices.data.from.toString()}–{invoices.data.head.toString()}.{" "}
                    <Link href="/invoices/new">Send your first one</Link>.
                  </p>
                </div>
              </motion.div>
            ) : shown.length > 0 ? (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: easeSmooth }}
              >
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Merchant</th>
                        <th className="right">Amount</th>
                        <th>Status</th>
                        <th>Due</th>
                        <th>Memo</th>
                        <th>Links</th>
                      </tr>
                    </thead>
                    <motion.tbody key={filter} variants={staggerParent} {...enter}>
                      {shown.map((r) => {
                        const status = statusOf(r.inv);
                        return (
                          <motion.tr key={r.id} variants={fadeUpChild}>
                            <td className="mono">
                              <Link href={`/invoices/${r.id}`}>{invoiceLabel(r.id)}</Link>
                            </td>
                            <td className="mono">{short(r.inv.merchant)}</td>
                            <td className="right num">
                              {formatUnits(r.inv.amount, token.decimals)} {token.symbol}
                            </td>
                            <td>
                              <StatusBadge status={status} />
                            </td>
                            <td>{formatDueDate(r.inv.dueDate)}</td>
                            <td style={{ whiteSpace: "normal", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {r.inv.memo || "—"}
                            </td>
                            <td style={{ display: "flex", gap: 14 }}>
                              <Link href={`/invoices/${r.id}`}>{status === "paid" ? "Receipt" : "Pay"}</Link>
                              {status === "paid" && r.paidTx && hasExplorer && (
                                <a href={txUrl(r.paidTx)} target="_blank" rel="noreferrer">
                                  Tx
                                </a>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </motion.tbody>
                  </table>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
        </>
      )}
    </main>
  );
}
