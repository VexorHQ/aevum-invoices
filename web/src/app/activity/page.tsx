"use client";

import { getLogsChunked, invoiceAbi, txUrl } from "@aevum-kit/aevum";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { formatUnits, getAbiItem, type PublicClient } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { AnimatePresence, motion } from "motion/react";
import { easeSmooth } from "@/lib/motion";
import { useToken } from "@/components/useToken";
import { ReceiptIcon } from "@/components/Icons";
import { CountUp } from "@/components/CountUp";
import { StatusBadge } from "@/components/motion/StatusBadge";
import { SyncProgress, TimelineSkeleton } from "@/components/motion/SyncProgress";
import { VivusDraw } from "@/components/VivusDraw";
import { fadeUpChild, staggerParent, useEnter } from "@/components/Reveal";
import { useNetwork } from "@/lib/network";
import { invoiceLabel, short } from "@/lib/invoice";

const WINDOWS = [
  { blocks: 1_000n, label: "Last 1k blocks" },
  { blocks: 5_000n, label: "Last 5k blocks" },
  { blocks: 20_000n, label: "Last 20k blocks" },
];

type FeedItem = {
  key: string;
  kind: "created" | "paid";
  invoiceId: `0x${string}`;
  merchant?: string;
  payer?: string;
  amount: bigint;
  blockNumber: bigint;
  tx: `0x${string}` | null;
};

export default function ActivityPage() {
  const { net } = useNetwork();
  const appChain = net.chain;
  const invoiceAddress = net.invoice;
  const deployBlock = net.deployBlock;
  const hasExplorer = net.hasExplorer;
  const client = usePublicClient({ chainId: appChain.id }) as PublicClient | undefined;
  const { address } = useAccount();
  const token = useToken();
  const [windowSize, setWindowSize] = useState(5_000n);
  const [onlyMine, setOnlyMine] = useState(false);
  const [progress, setProgress] = useState(0);
  const enter = useEnter();

  const logs = useQuery({
    queryKey: ["invoice-activity", appChain.id, invoiceAddress, windowSize.toString(), onlyMine ? address : null],
    enabled: Boolean(client && invoiceAddress),
    queryFn: async () => {
      const c = client!;
      const head = await c.getBlockNumber();
      let from = head > windowSize ? head - windowSize + 1n : 0n;
      if (deployBlock !== undefined && deployBlock > from) from = deployBlock;
      setProgress(0);
      const created = await getLogsChunked(c, {
        address: invoiceAddress!,
        event: getAbiItem({ abi: invoiceAbi, name: "InvoiceCreated" }),
        args: onlyMine && address ? { merchant: address } : undefined,
        fromBlock: from,
        toBlock: head,
        onProgress: (done, total) => setProgress(total ? Number((done * 50n) / total) : 50),
      });
      const paid = await getLogsChunked(c, {
        address: invoiceAddress!,
        event: getAbiItem({ abi: invoiceAbi, name: "InvoicePaid" }),
        args: onlyMine && address ? { payer: address } : undefined,
        fromBlock: from,
        toBlock: head,
        onProgress: (done, total) => setProgress(50 + (total ? Number((done * 50n) / total) : 50)),
      });
      const items: FeedItem[] = [
        ...created.map((l) => ({
          key: `c-${l.transactionHash}-${l.logIndex}`,
          kind: "created" as const,
          invoiceId: l.args.invoiceId!,
          merchant: l.args.merchant,
          amount: l.args.amount ?? 0n,
          blockNumber: l.blockNumber ?? 0n,
          tx: (l.transactionHash ?? null) as FeedItem["tx"],
        })),
        ...paid.map((l) => ({
          key: `p-${l.transactionHash}-${l.logIndex}`,
          kind: "paid" as const,
          invoiceId: l.args.invoiceId!,
          payer: l.args.payer,
          amount: l.args.amount ?? 0n,
          blockNumber: l.blockNumber ?? 0n,
          tx: (l.transactionHash ?? null) as FeedItem["tx"],
        })),
      ];
      items.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));
      return { from, head, items };
    },
  });

  const paidTotal = logs.data?.items.filter((i) => i.kind === "paid").reduce((sum, i) => sum + i.amount, 0n) ?? 0n;

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="eyebrow">On-chain feed</p>
          <h1>Invoice activity</h1>
          <p className="lede">
            Every <code>InvoiceCreated</code> and <code>InvoicePaid</code> event from your Invoice contract. Aevum serves at most 1,000 blocks
            per <code>eth_getLogs</code> call, so the app reads in chunks.
          </p>
        </div>
        {logs.data && (
          <div className="score">
            <span className="score-num">
              <CountUp value={BigInt(logs.data.items.length)} decimals={0} />
            </span>
            <span className="fine">
              events · {formatUnits(paidTotal, token.decimals)} {token.symbol} paid
            </span>
          </div>
        )}
      </div>

      {!invoiceAddress ? (
        <div className="card empty">
          No Invoice contract configured for {net.label}. Set <code>NEXT_PUBLIC_CHECKOUT_{net.key.toUpperCase()}</code> in <code>web/.env.local</code>.
        </div>
      ) : (
        <section className="card flush">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            {WINDOWS.map((w) => (
              <button
                key={w.label}
                type="button"
                className="filter-btn"
                aria-pressed={windowSize === w.blocks}
                onClick={() => setWindowSize(w.blocks)}
              >
                {w.label}
              </button>
            ))}
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginLeft: "auto", fontSize: 14, color: "var(--text-muted)" }}>
              <input type="checkbox" checked={onlyMine} disabled={!address} onChange={(e) => setOnlyMine(e.target.checked)} />
              Only my invoices
            </label>
          </div>

          {logs.error && <p className="empty">Couldn&apos;t read events: {(logs.error as Error).message}</p>}

          <AnimatePresence mode="wait">
            {!logs.data && logs.isFetching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: easeSmooth }}
              >
                <div style={{ padding: "16px 20px" }}>
                  <SyncProgress progress={progress} label={`Scanning ${windowSize.toLocaleString("en-US")} blocks, 1,000 at a time…`} />
                </div>
                <TimelineSkeleton />
              </motion.div>
            ) : logs.data && logs.data.items.length === 0 && !logs.isFetching ? (
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
                    No invoice activity in blocks {logs.data.from.toString()}–{logs.data.head.toString()}.{" "}
                    <Link href="/invoices/new">Create an invoice</Link>.
                  </p>
                </div>
              </motion.div>
            ) : logs.data && logs.data.items.length > 0 ? (
              <motion.ul
                key={`${windowSize.toString()}-${onlyMine}`}
                className="timeline"
                variants={staggerParent}
                {...enter}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: easeSmooth }}
              >
                {logs.data.items.map((l) => (
                  <motion.li key={l.key} className="tl-item" variants={fadeUpChild}>
                    <span className={`tl-dot ${l.kind}`} aria-hidden="true" />
                    <div className="tl-body">
                      <div className="tl-top">
                        <StatusBadge status={l.kind === "paid" ? "paid" : "created"} />
                        <Link href={`/invoices/${l.invoiceId}`} className="mono">
                          {invoiceLabel(l.invoiceId)}
                        </Link>
                        <span className="tl-amount num">
                          {formatUnits(l.amount, token.decimals)} {token.symbol}
                        </span>
                      </div>
                      <p className="tl-meta fine">
                        {l.kind === "paid" ? (
                          <>from <span className="mono">{short(l.payer ?? "")}</span></>
                        ) : (
                          <>by <span className="mono">{short(l.merchant ?? "")}</span></>
                        )}{" "}
                        · block {l.blockNumber.toString()} ·{" "}
                        {l.kind === "paid" ? (
                          <Link href={`/receipts/${l.invoiceId}?tx=${l.tx}&chain=${appChain.id}`}>Receipt ↗</Link>
                        ) : (
                          <Link href={`/invoices/${l.invoiceId}`}>Open ↗</Link>
                        )}
                        {hasExplorer && l.tx && (
                          <>
                            {" · "}
                            <a href={txUrl(l.tx)} target="_blank" rel="noreferrer">
                              Tx ↗
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </section>
      )}
    </main>
  );
}
