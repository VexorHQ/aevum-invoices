"use client";

import { authorizationWindow, erc20Abi, invoiceAbi, invoiceTypedData, txUrl } from "@aevum-kit/aevum";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatUnits, isHex, type Hash, type Hex } from "viem";
import { useAccount, useConfig, useReadContract } from "wagmi";
import { readContract, signTypedData, simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { CheckIcon } from "@/components/Icons";
import { useToken } from "@/components/useToken";
import { useNetwork } from "@/lib/network";
import { explain } from "@/lib/errors";
import { formatDueDate, invoiceExists, invoiceLabel, isOpenTo, parseInvoiceData, short, statusOf, ZERO_ADDRESS } from "@/lib/invoice";

type Mode = "gasless" | "standard";
type Phase = "idle" | "working" | "done" | "error";

const STEPS: Record<Mode, { title: string; who: string }[]> = {
  gasless: [
    { title: "Sign payment authorization", who: "EIP-3009 · your wallet signs, no gas" },
    { title: "Relayer submits transaction", who: "payWithAuthorization · the relayer pays gas" },
    { title: "Confirmed on Aevum", who: "The InvoicePaid event is your receipt" },
  ],
  standard: [
    { title: "Approve tUSD8", who: "approve(Invoice, exact amount) · you pay gas" },
    { title: "Pay invoice", who: "Invoice.pay(invoiceId, amount) · you pay gas" },
    { title: "Confirmed on Aevum", who: "The InvoicePaid event is your receipt" },
  ],
};

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const validId = isHex(invoiceId) && invoiceId.length === 66;
  const { net } = useNetwork();
  const appChain = net.chain;
  const invoiceAddress = net.invoice;
  const hasExplorer = net.hasExplorer;
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const onChain = isConnected && chainId === appChain.id;
  const token = useToken();

  const [mode, setMode] = useState<Mode>("gasless");
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [block, setBlock] = useState<bigint | null>(null);

  const invoice = useReadContract({
    address: invoiceAddress,
    abi: invoiceAbi,
    functionName: "getInvoice",
    args: validId ? [invoiceId as Hex] : undefined,
    chainId: appChain.id,
    query: { enabled: validId && Boolean(invoiceAddress) },
  });
  const inv = parseInvoiceData(invoice.data);
  const amount = inv?.amount;
  const status = inv ? statusOf(inv) : null;

  const relay = useQuery({
    queryKey: ["relay-status", appChain.id],
    queryFn: async () => (await fetch(`/api/relay?chainId=${appChain.id}`)).json() as Promise<{ enabled: boolean; relayer: string | null }>,
  });
  const gaslessAvailable = relay.data?.enabled ?? false;
  useEffect(() => {
    if (relay.data) setMode(relay.data.enabled ? "gasless" : "standard");
  }, [relay.data]);

  const balance = useReadContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: appChain.id,
    query: { enabled: onChain && Boolean(token.address) },
  });

  const enoughBalance = amount === undefined || balance.data === undefined || balance.data >= amount;
  const busy = phase === "working";
  const notYourInvoice = inv !== null && !isOpenTo(address, inv);

  function reset(nextMode = mode) {
    setMode(nextMode);
    setStep(0);
    setPhase("idle");
    setError(null);
    setTxHash(null);
    setBlock(null);
  }

  /** Stop before any signature or gas is spent if this invoice can't be paid by this wallet. */
  async function assertPayable(id: Hex) {
    if (!invoiceAddress || !inv) return;
    const paid = await readContract(config, { address: invoiceAddress, abi: invoiceAbi, functionName: "isPaid", args: [id], chainId: appChain.id });
    if (paid) throw new Error("This invoice is already paid.");
    if (!isOpenTo(address, inv)) throw new Error("This invoice is addressed to a different wallet.");
  }

  async function payGasless() {
    if (!address || !invoiceAddress || !token.address || !validId || amount === undefined) return;
    await assertPayable(invoiceId as Hex);
    // 1. Sign. The nonce comes from the contract and ties this signature to this invoice.
    const nonce = await readContract(config, { address: invoiceAddress, abi: invoiceAbi, functionName: "authorizationNonce", args: [invoiceId as Hex], chainId: appChain.id });
    const { validAfter, validBefore } = authorizationWindow(600);
    const signature = await signTypedData(config, {
      account: address,
      ...invoiceTypedData(appChain.id, token.address, { from: address, to: invoiceAddress, value: amount, validAfter, validBefore, nonce }),
    });
    setStep(1);
    // 2. Hand it to the relayer (web/src/app/api/relay/route.ts).
    const res = await fetch("/api/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId: appChain.id,
        invoiceId,
        from: address,
        amount: amount.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        signature,
      }),
    });
    const data = (await res.json()) as { hash?: Hash; error?: string };
    if (!res.ok || !data.hash) throw new Error(data.error ?? "The relayer didn't accept the payment.");
    setTxHash(data.hash);
    setStep(2);
    return data.hash;
  }

  async function payStandard() {
    if (!address || !invoiceAddress || !token.address || !validId || amount === undefined) return;
    await assertPayable(invoiceId as Hex);
    // 1. Approve exactly the invoice amount, never an unlimited amount.
    const allowance = await readContract(config, { address: token.address, abi: erc20Abi, functionName: "allowance", args: [address, invoiceAddress], chainId: appChain.id });
    if (allowance < amount) {
      const approveHash = await writeContract(config, { address: token.address, abi: erc20Abi, functionName: "approve", args: [invoiceAddress, amount], chainId: appChain.id });
      await waitForTransactionReceipt(config, { hash: approveHash, chainId: appChain.id });
    }
    setStep(1);
    // 2. Pay.
    // Simulate first: a revert shows up here with its reason, before the wallet asks for gas.
    const { request } = await simulateContract(config, { account: address, address: invoiceAddress, abi: invoiceAbi, functionName: "pay", args: [invoiceId as Hex, amount], chainId: appChain.id });
    const hash = await writeContract(config, request);
    setTxHash(hash);
    setStep(2);
    return hash;
  }

  async function onPay() {
    setError(null);
    setPhase("working");
    setStep(0);
    try {
      const hash = mode === "gasless" ? await payGasless() : await payStandard();
      if (!hash) throw new Error("Connect your wallet first.");
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: appChain.id });
      if (receipt.status !== "success") throw new Error("The transaction reverted on chain. Nothing was charged.");
      setBlock(receipt.blockNumber);
      setStep(3);
      setPhase("done");
      balance.refetch();
      invoice.refetch();
    } catch (e) {
      setError(explain(e));
      setPhase("error");
    }
  }

  if (!validId) {
    return (
      <main className="shell">
        <h1>Invoice not found</h1>
        <p className="lede">That invoice id isn&apos;t valid. Invoice ids are 32-byte hex values (0x + 64 characters).</p>
      </main>
    );
  }

  const cta = (() => {
    if (!isConnected) return "Connect a wallet to pay";
    if (!onChain) return "Switch network to pay";
    if (!invoiceAddress) return "Deploy the Invoice contract first";
    if (status === "paid") return "Already paid";
    if (notYourInvoice) return "This invoice isn't addressed to you";
    if (phase === "done") return "Paid";
    if (phase === "error") return mode === "gasless" ? "Sign again" : "Try again";
    if (busy) return ["Check your wallet…", mode === "gasless" ? "Waiting for relayer…" : "Check your wallet…", "Confirming…"][step] ?? "Working…";
    return mode === "gasless"
      ? `Sign & pay ${amount !== undefined ? formatUnits(amount, token.decimals) : "…"} ${token.symbol}`
      : `Approve & pay ${amount !== undefined ? formatUnits(amount, token.decimals) : "…"} ${token.symbol}`;
  })();
  const ctaDisabled = !onChain || !invoiceAddress || busy || status === "paid" || notYourInvoice || (!enoughBalance && phase !== "done");

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="eyebrow">Invoice · {appChain.name}</p>
          <h1>Invoice {invoiceLabel(invoiceId as Hex)}</h1>
          <p className="lede">
            {inv?.memo ? inv.memo : "An invoice on Aevum Invoices, settled in tUSD8."}
          </p>
        </div>
        {status && (
          <span className={`status-pill ${status === "paid" ? "good" : status === "overdue" ? "warn" : ""}`} style={{ fontSize: 15, padding: "8px 16px" }}>
            {status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : "Open"}
          </span>
        )}
      </div>

      {!invoiceAddress ? (
        <div className="card empty">
          No Invoice contract configured for {net.label}. See the <Link href="/setup">Setup</Link> page.
        </div>
      ) : invoice.isLoading ? (
        <p className="empty">Reading the invoice from {appChain.name}…</p>
      ) : invoice.isError || !inv || !invoiceExists(inv) ? (
        <div className="card empty">
          {inv && !invoiceExists(inv) ? (
            <>
              No invoice with this id exists on {appChain.name}. Check the link, or{" "}
              <Link href="/invoices/new">create a new invoice</Link>.
            </>
          ) : (
            <>
              Couldn&apos;t read this invoice on {appChain.name}. It may not exist on this network, or the RPC is busy.{" "}
              <button type="button" className="btn small" onClick={() => invoice.refetch()}>
                Try again
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="row">
          <section className="card stack" aria-label="Invoice" style={{ flex: "1 1 340px" }}>
            <div className="receipt-amount">
              {formatUnits(inv.amount, token.decimals)}{" "}
              <small style={{ fontSize: "0.4em", color: "var(--text-muted)" }}>{token.symbol}</small>
            </div>
            <dl className="kv" style={{ fontSize: 13 }}>
              <dt>Invoice id</dt>
              <dd>{invoiceId}</dd>
              <dt>Merchant</dt>
              <dd>{inv.merchant}</dd>
              <dt>Payer</dt>
              <dd>{inv.payer === ZERO_ADDRESS ? "Anyone can pay" : inv.payer}</dd>
              <dt>Due</dt>
              <dd>{formatDueDate(inv.dueDate)}</dd>
              {inv.memo && (
                <>
                  <dt>Memo</dt>
                  <dd>{inv.memo}</dd>
                </>
              )}
              {inv.paid && (
                <>
                  <dt>Paid by</dt>
                  <dd>{inv.paidBy}</dd>
                  <dt>Paid at</dt>
                  <dd>{new Date(Number(inv.paidAt) * 1000).toLocaleString()}</dd>
                </>
              )}
              <dt>Your balance</dt>
              <dd>{balance.data !== undefined ? `${formatUnits(balance.data, token.decimals)} ${token.symbol}` : "—"}</dd>
            </dl>
            {status === "overdue" && (
              <p className="fine">Past due — but still payable in full. The contract doesn&apos;t add late fees; the overdue flag is just what the due date says.</p>
            )}
          </section>

          <section className="card stack" aria-label="Payment" style={{ flex: "1.3 1 420px" }}>
            {status === "paid" ? (
              <>
                <div className="notice good" role="status">
                  <strong>
                    Paid {formatUnits(inv.amount, token.decimals)} {token.symbol}
                    {inv.paidAt ? ` · ${new Date(Number(inv.paidAt) * 1000).toLocaleString()}` : ""}
                  </strong>
                  <span>
                    Paid by {short(inv.paidBy)}. The InvoicePaid event is the receipt.
                  </span>
                </div>
                <Link className="btn secondary block" href={`/receipts/${invoiceId}?chain=${appChain.id}`}>
                  View receipt
                </Link>
              </>
            ) : (
              <>
                <div className="modes" role="radiogroup" aria-label="Payment mode">
                  {(
                    [
                      { id: "gasless", title: "Gasless", tag: "EIP-3009", desc: gaslessAvailable ? "Sign once. A relayer submits it. You need no tQDAY." : "Off: set RELAYER_PRIVATE_KEY in web/.env.local to enable." },
                      { id: "standard", title: "Standard", tag: "approve + pay", desc: "Two wallet transactions. You pay gas in tQDAY." },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      className="mode"
                      aria-checked={mode === m.id}
                      disabled={busy || (m.id === "gasless" && !gaslessAvailable)}
                      onClick={() => reset(m.id)}
                    >
                      <span className="mode-top">
                        {m.title}
                        <span className="tag">{m.tag}</span>
                      </span>
                      <span className="mode-desc">{m.desc}</span>
                    </button>
                  ))}
                </div>

                <ol className="steps">
                  {STEPS[mode].map((s, i) => {
                    const done = step > i;
                    const active = busy && step === i;
                    return (
                      <li key={s.title} className={`step ${done ? "done" : active ? "active" : ""}`}>
                        <div className="step-dot">{done ? <CheckIcon /> : i + 1}</div>
                        <div className="step-body">
                          <div className="step-top">
                            <span className="step-title">{s.title}</span>
                            <span className="step-state">{done ? "Done" : active ? "In progress…" : "Waiting"}</span>
                          </div>
                          <p className="step-who">{s.who}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {notYourInvoice && (
                  <div className="notice warn" role="status">
                    <strong>This invoice is addressed to someone else</strong>
                    <span>
                      Only {short(inv.payer)} can pay it. If that&apos;s you, switch to that wallet.
                    </span>
                  </div>
                )}

                {!enoughBalance && phase !== "done" && !notYourInvoice && (
                  <div className="notice warn" role="status">
                    <strong>Not enough {token.symbol}</strong>
                    <span>
                      This invoice needs {formatUnits(inv.amount, token.decimals)} {token.symbol}. See the <Link href="/setup">Setup</Link> page
                      for how to get test tokens.
                    </span>
                  </div>
                )}

                {error && (
                  <div className="notice bad" role="alert">
                    <strong>Payment didn&apos;t go through</strong>
                    <span>{error}</span>
                  </div>
                )}

                {phase === "done" && txHash && (
                  <div className="notice good" role="status">
                    <div className="row-between">
                      <strong>
                        Paid {formatUnits(inv.amount, token.decimals)} {token.symbol}
                        {block !== null ? ` · confirmed in block ${block.toLocaleString("en-US")}` : ""}
                      </strong>
                      <span style={{ display: "flex", gap: 16 }}>
                        {hasExplorer && (
                          <a href={txUrl(txHash)} target="_blank" rel="noreferrer">
                            Explorer
                          </a>
                        )}
                        <Link href={`/receipts/${invoiceId}?tx=${txHash}&chain=${appChain.id}`}>View receipt</Link>
                      </span>
                    </div>
                  </div>
                )}

                <button type="button" className="btn big block" disabled={ctaDisabled} onClick={onPay}>
                  {cta}
                </button>
                <p className="fine">
                  {mode === "gasless"
                    ? "The signature is valid for 10 minutes, for this exact amount, and only for this invoice."
                    : "The approval is for the exact invoice amount, never unlimited."}
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
