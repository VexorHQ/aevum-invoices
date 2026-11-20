"use client";

import { getLogsChunked, invoiceAbi, txUrl } from "@aevum-kit/aevum";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUnits, getAbiItem, type Hex, type PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { useToken } from "@/components/useToken";
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

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="eyebrow">Aevum testnet · tUSD8</p>
          <h1>Invoices</h1>
          <p className="lede">
            Bills you send as a freelancer or small shop, settled on-chain in tUSD8. A client pays the exact amount — or signs once and a
            relayer submits it, so they need no gas.
          </p>
        </div>
        <Link className="btn" href="/invoices/new">
          New invoice
        </Link>
      </div>

      {!invoiceAddress ? (
        <div className="card empty">
          No Invoice contract configured for {net.label}. Deploy it with <code>make deploy-aevum</code> (or <code>make deploy-fork</code>{" "}
          locally), then set <code>NEXT_PUBLIC_CHECKOUT_{net.key.toUpperCase()}</code> in <code>web/.env.local</code>. The{" "}
          <Link href="/setup">Setup</Link> page checks the rest.
        </div>
      ) : (
        <section className="card flush" aria-label="Invoices">
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`btn small ${filter === f.id ? "" : "secondary"}`}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label} · {counts[f.id]}
              </button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--text-muted)" }}>
              {counts.open + counts.overdue > 0
                ? `${formatUnits(openTotal, token.decimals)} ${token.symbol} still open`
                : rows.length > 0
                  ? "Nothing outstanding"
                  : ""}
            </span>
          </div>

          {invoices.isFetching && (
            <div style={{ padding: "16px 20px" }} aria-live="polite">
              <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="fine" style={{ marginTop: 8 }}>
                Reading invoice events from the chain, 1,000 blocks at a time… {progress}%
              </p>
            </div>
          )}

          {invoices.error && <p className="empty">Couldn&apos;t read invoices: {(invoices.error as Error).message}</p>}

          {invoices.data && rows.length === 0 && !invoices.isFetching && (
            <p className="empty">
              No invoices yet in blocks {invoices.data.from.toString()}–{invoices.data.head.toString()}.{" "}
              <Link href="/invoices/new">Send your first one</Link>.
            </p>
          )}

          {shown.length > 0 && (
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
                <tbody>
                  {shown.map((r) => {
                    const status = statusOf(r.inv);
                    return (
                      <tr key={r.id}>
                        <td className="mono">
                          <Link href={`/invoices/${r.id}`}>{invoiceLabel(r.id)}</Link>
                        </td>
                        <td className="mono">{short(r.inv.merchant)}</td>
                        <td className="right num">
                          {formatUnits(r.inv.amount, token.decimals)} {token.symbol}
                        </td>
                        <td>
                          <span className={`status-pill ${status === "paid" ? "good" : status === "overdue" ? "warn" : ""}`}>
                            {status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : "Open"}
                          </span>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
