"use client";

import { addressUrl, getLogsChunked, invoiceAbi, txUrl } from "@aevum-kit/aevum";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatUnits, getAbiItem, isHash, isHex, parseEventLogs, type Hex, type PublicClient } from "viem";
import { useReadContract, usePublicClient, useTransactionReceipt } from "wagmi";
import { useToken } from "@/components/useToken";
import { networkByChainId } from "@/lib/env";
import { useNetwork } from "@/lib/network";
import { invoiceExists, invoiceLabel, parseInvoiceData } from "@/lib/invoice";

function ReceiptBody() {
  const { net: appNet } = useNetwork();
  const params = useParams<{ invoiceId: string }>();
  const search = useSearchParams();
  // Receipt links carry their chain, so they still work after you switch networks.
  const net = networkByChainId(Number(search.get("chain"))) ?? appNet;
  const appChain = net.chain;
  const invoiceAddress = net.invoice;
  const hasExplorer = net.hasExplorer;
  const invoiceId = params.invoiceId;
  const rawTx = search.get("tx");
  // Anything else in ?tx= is ignored, never shown: a receipt must not display text from the URL.
  const tx = rawTx && isHash(rawTx) ? rawTx : undefined;
  const validId = isHex(invoiceId) && invoiceId.length === 66;
  const token = useToken();
  const client = usePublicClient({ chainId: appChain.id }) as PublicClient | undefined;

  const invoice = useReadContract({
    address: invoiceAddress,
    abi: invoiceAbi,
    functionName: "getInvoice",
    args: validId ? [invoiceId as Hex] : undefined,
    chainId: appChain.id,
    query: { enabled: validId && Boolean(invoiceAddress) },
  });
  const receipt = useTransactionReceipt({ hash: tx, chainId: appChain.id, query: { enabled: Boolean(tx) } });

  if (!validId) {
    return (
      <main className="shell">
        <h1>Receipt not found</h1>
        <p className="lede">That invoice id isn&apos;t valid. Invoice ids are 32-byte hex values (0x + 64 characters).</p>
      </main>
    );
  }

  const inv = parseInvoiceData(invoice.data);
  const paid = Boolean(inv?.paid);
  // Only show transaction details if that transaction really emitted InvoicePaid for this invoice.
  const paidLog =
    receipt.data && invoiceAddress
      ? parseEventLogs({ abi: invoiceAbi, logs: receipt.data.logs, eventName: "InvoicePaid" }).find(
          (l) => l.address.toLowerCase() === invoiceAddress.toLowerCase() && l.args.invoiceId.toLowerCase() === invoiceId.toLowerCase(),
        )
      : undefined;
  const txMatches = Boolean(paidLog);

  return (
    <main className="shell" style={{ maxWidth: 760 }}>
      <div>
        <p className="eyebrow">Receipt · read from {appChain.name}</p>
        <h1>Invoice {invoiceLabel(invoiceId as Hex)}</h1>
      </div>

      <section className="card stack receipt">
        {!invoiceAddress ? (
          <div className="stack">
            <span className="status warn">Can&apos;t check</span>
            <p style={{ color: "var(--text-muted)" }}>No Invoice contract is configured for {appChain.name} in this app.</p>
          </div>
        ) : invoice.isLoading ? (
          <p className="empty">Reading Invoice.getInvoice…</p>
        ) : invoice.isError || !inv || !invoiceExists(inv) ? (
          <div className="stack">
            <span className="status warn">Can&apos;t check</span>
            <p style={{ color: "var(--text-muted)" }}>
              {inv && !invoiceExists(inv)
                ? `No invoice with this id exists on ${appChain.name}.`
                : `Couldn't read the invoice from ${appChain.name}. It may not exist on this network, or the RPC is busy.`}{" "}
              <button type="button" className="btn small" onClick={() => invoice.refetch()}>
                Try again
              </button>
            </p>
          </div>
        ) : !paid ? (
          <div className="stack">
            <span className="status warn">Not paid</span>
            <p style={{ color: "var(--text-muted)" }}>
              No payment is recorded for this invoice on {appChain.name}. If you just paid, wait a few seconds and refresh.
            </p>
            <Link className="btn" href={`/invoices/${invoiceId}`}>
              Open the invoice to pay
            </Link>
          </div>
        ) : (
          <>
            <div className="check-top" style={{ alignItems: "center" }}>
              <span className="status good">Paid</span>
              <span className="fine">{inv.paidAt ? new Date(Number(inv.paidAt) * 1000).toLocaleString() : ""}</span>
            </div>
            <div className="receipt-amount">
              {formatUnits(inv.amount, token.decimals)} <small style={{ fontSize: "0.4em", color: "var(--text-muted)" }}>{token.symbol}</small>
            </div>
            <dl className="kv">
              <dt>Invoice id</dt>
              <dd>{invoiceId}</dd>
              <dt>Merchant</dt>
              <dd>{hasExplorer ? <a href={addressUrl(inv.merchant)} target="_blank" rel="noreferrer">{inv.merchant}</a> : inv.merchant}</dd>
              <dt>Payer</dt>
              <dd>{hasExplorer ? <a href={addressUrl(inv.paidBy)} target="_blank" rel="noreferrer">{inv.paidBy}</a> : inv.paidBy}</dd>
              <dt>Invoice contract</dt>
              <dd>{invoiceAddress}</dd>
              {inv.memo && (
                <>
                  <dt>Memo</dt>
                  <dd>{inv.memo}</dd>
                </>
              )}
              {txMatches && receipt.data && (
                <>
                  <dt>Block</dt>
                  <dd>{receipt.data.blockNumber.toString()}</dd>
                  <dt>Gas used</dt>
                  <dd>{receipt.data.gasUsed.toString()}</dd>
                  <dt>Submitted by</dt>
                  <dd>{receipt.data.from}</dd>
                  <dt>Transaction</dt>
                  <dd>{hasExplorer ? <a href={txUrl(tx!)} target="_blank" rel="noreferrer">{tx}</a> : tx}</dd>
                </>
              )}
            </dl>
            {tx && receipt.data && !txMatches && (
              <p className="fine">The transaction in this link isn&apos;t the payment for this invoice, so it isn&apos;t shown.</p>
            )}
            {txMatches && receipt.data && receipt.data.from.toLowerCase() !== inv.paidBy.toLowerCase() && (
              <p className="fine">The payer didn&apos;t send this transaction: a relayer submitted the payer&apos;s signature (gasless mode).</p>
            )}
            {!tx && <ChainReceiptNote invoiceId={invoiceId as Hex} client={client} invoiceAddress={invoiceAddress} />}
          </>
        )}
      </section>

      <p className="fine">
        This page trusts nothing but the chain: it calls <code>Invoice.getInvoice(invoiceId)</code> and checks the paid flag and amount.{" "}
        <Link href="/">Back to invoices</Link>
      </p>
    </main>
  );
}

/**
 * When the receipt link carries no ?tx=, find the InvoicePaid event on-chain so the
 * receipt can still show the transaction hash. Scanned in 1,000-block chunks.
 */
function ChainReceiptNote({ invoiceId, client, invoiceAddress }: { invoiceId: Hex; client: PublicClient | undefined; invoiceAddress: `0x${string}` }) {
  const { net } = useNetwork();
  const [tx, setTx] = useState<Hex | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!client || !invoiceAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const head = await client.getBlockNumber();
        const from = net.deployBlock !== undefined && net.deployBlock < head ? net.deployBlock : head > 20_000n ? head - 20_000n : 0n;
        const logs = await getLogsChunked(client, {
          address: invoiceAddress,
          event: getAbiItem({ abi: invoiceAbi, name: "InvoicePaid" }),
          args: { invoiceId },
          fromBlock: from,
          toBlock: head,
        });
        if (!cancelled && logs.length > 0 && logs[0].transactionHash) setTx(logs[0].transactionHash);
      } catch {
        // The receipt above already proves payment; the tx link is a bonus.
      } finally {
        if (!cancelled) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, invoiceAddress, invoiceId, net.deployBlock]);
  if (!done) return <p className="fine">Looking up the payment transaction…</p>;
  if (!tx) return null;
  return (
    <p className="fine">
      Payment transaction:{" "}
      {net.hasExplorer ? (
        <a href={txUrl(tx)} target="_blank" rel="noreferrer">
          {tx}
        </a>
      ) : (
        tx
      )}
    </p>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<main className="shell"><p className="empty">Loading receipt…</p></main>}>
      <ReceiptBody />
    </Suspense>
  );
}
