"use client";

import { invoiceAbi } from "@aevum-kit/aevum";
import Link from "next/link";
import { useState } from "react";
import { isAddress, parseEventLogs, parseUnits, type Hash, type Hex } from "viem";
import { useAccount, useConfig } from "wagmi";
import { simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { useToken } from "@/components/useToken";
import { useNetwork } from "@/lib/network";
import { explain } from "@/lib/errors";
import { invoiceLabel, toLocalInputValue, ZERO_ADDRESS } from "@/lib/invoice";

type Phase = "idle" | "working" | "done" | "error";

function defaultDue(): string {
  return toLocalInputValue(BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600));
}

export default function NewInvoicePage() {
  const { net } = useNetwork();
  const appChain = net.chain;
  const invoiceAddress = net.invoice;
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const onChain = isConnected && chainId === appChain.id;
  const token = useToken();

  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [due, setDue] = useState(defaultDue);
  const [memo, setMemo] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<Hex | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  function validate(): string | null {
    if (!amount.trim()) return "Enter an amount.";
    let value: bigint;
    try {
      value = parseUnits(amount.trim(), token.decimals);
    } catch {
      return `That amount doesn't parse. Use up to ${token.decimals} decimals.`;
    }
    if (value <= 0n) return "The amount must be more than zero.";
    if (payer.trim() && !isAddress(payer.trim())) return "That payer address isn't valid. Leave it blank for anyone to pay.";
    if (due) {
      const ts = Math.floor(new Date(due).getTime() / 1000);
      if (Number.isNaN(ts)) return "That due date doesn't parse.";
      if (ts <= Math.floor(Date.now() / 1000)) return "The due date is already past. Pick a future date.";
    }
    if (memo.length > 280) return "Keep the memo under 280 characters.";
    return null;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      setPhase("error");
      return;
    }
    if (!invoiceAddress || !address) return;
    setPhase("working");
    try {
      const value = parseUnits(amount.trim(), token.decimals);
      const payerAddr = payer.trim() ? (payer.trim() as Hex) : ZERO_ADDRESS;
      const dueTs = due ? BigInt(Math.floor(new Date(due).getTime() / 1000)) : 0n;
      // Simulate first: a revert shows up here with its reason, before the wallet asks for gas.
      const { request } = await simulateContract(config, {
        account: address,
        address: invoiceAddress,
        abi: invoiceAbi,
        functionName: "createInvoice",
        args: [value, payerAddr, dueTs, memo.trim()],
        chainId: appChain.id,
      });
      const hash = await writeContract(config, request);
      setTxHash(hash);
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: appChain.id });
      if (receipt.status !== "success") throw new Error("The transaction reverted on chain. Nothing was created.");
      const created = parseEventLogs({ abi: invoiceAbi, logs: receipt.logs, eventName: "InvoiceCreated" }).find(
        (l) => l.address.toLowerCase() === invoiceAddress.toLowerCase(),
      );
      if (!created) throw new Error("Created, but the InvoiceCreated event wasn't in the receipt. Check the transaction on the explorer.");
      setInvoiceId(created.args.invoiceId);
      setPhase("done");
    } catch (err) {
      setError(explain(err));
      setPhase("error");
    }
  }

  const busy = phase === "working";
  const cta = !isConnected
    ? "Connect a wallet to create an invoice"
    : !onChain
      ? "Switch network to create an invoice"
      : !invoiceAddress
        ? "Deploy the Invoice contract first"
        : busy
          ? "Check your wallet…"
          : phase === "done"
            ? "Create another invoice"
            : `Create invoice for ${amount.trim() || "…"} ${token.symbol}`;
  const ctaDisabled = !onChain || !invoiceAddress || busy;

  if (phase === "done" && invoiceId) {
    return (
      <main className="shell" style={{ maxWidth: 760 }}>
        <p className="eyebrow">Invoice created</p>
        <h1>Invoice {invoiceLabel(invoiceId)} is live</h1>
        <p className="lede">
          {amount.trim()} {token.symbol}
          {payer.trim() ? ` · payable only by ${payer.trim()}` : " · anyone can pay it"}. Share the link below with your client.
        </p>
        <section className="card stack">
          <dl className="kv">
            <dt>Invoice id</dt>
            <dd>{invoiceId}</dd>
            <dt>Amount</dt>
            <dd>
              {amount.trim()} {token.symbol}
            </dd>
            <dt>Due</dt>
            <dd>{due ? new Date(due).toLocaleString() : "No due date"}</dd>
            {memo.trim() && (
              <>
                <dt>Memo</dt>
                <dd>{memo.trim()}</dd>
              </>
            )}
            {txHash && (
              <>
                <dt>Transaction</dt>
                <dd>{txHash}</dd>
              </>
            )}
          </dl>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn" href={`/invoices/${invoiceId}`}>
              Open the invoice
            </Link>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setPhase("idle");
                setInvoiceId(null);
                setTxHash(null);
                setAmount("");
                setPayer("");
                setMemo("");
                setDue(defaultDue());
              }}
            >
              Create another
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell" style={{ maxWidth: 760 }}>
      <div>
        <p className="eyebrow">New invoice · {appChain.name}</p>
        <h1>Bill a client in tUSD8</h1>
        <p className="lede">
          The invoice lives on-chain: the amount, who may pay it and when it&apos;s due are all in the contract, so there&apos;s nothing to
          argue about later.
        </p>
      </div>

      {!invoiceAddress ? (
        <div className="card empty">
          No Invoice contract configured for {net.label}. Deploy it first — see the <Link href="/setup">Setup</Link> page.
        </div>
      ) : (
        <form className="card stack" onSubmit={onCreate}>
          <div className="field-group">
            <label htmlFor="amount">Amount ({token.symbol})</label>
            <input
              id="amount"
              className="field"
              inputMode="decimal"
              placeholder="25.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
            />
            <p className="field-hint">What the client owes, in tUSD8 (6 decimals). They must pay this exact amount — not a cent more or less.</p>
          </div>

          <div className="field-group">
            <label htmlFor="payer">Payer address (optional)</label>
            <input
              id="payer"
              className="field"
              placeholder="0x… (leave blank and anyone can pay)"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              disabled={busy}
            />
            <p className="field-hint">Fill this in when the bill is for one specific wallet. Blank means anyone can settle it.</p>
          </div>

          <div className="field-group">
            <label htmlFor="due">Due date</label>
            <input
              id="due"
              type="datetime-local"
              className="field"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              disabled={busy}
            />
            <p className="field-hint">Defaults to a week from now. Clear it for no due date. The date is informational — the contract never blocks a late payment, the invoice just shows as overdue.</p>
          </div>

          <div className="field-group">
            <label htmlFor="memo">Memo</label>
            <textarea
              id="memo"
              className="field"
              rows={3}
              placeholder="e.g. Logo design — final delivery, March"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={busy}
            />
            <p className="field-hint">What the payment is for. Stored on-chain with the invoice.</p>
          </div>

          {error && (
            <div className="notice bad" role="alert">
              <strong>Couldn&apos;t create the invoice</strong>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn big block" disabled={ctaDisabled}>
            {cta}
          </button>
          <p className="fine">Creating an invoice costs a little gas in tQDAY. Your client pays the invoice itself — in tUSD8, to your wallet.</p>
        </form>
      )}
    </main>
  );
}
