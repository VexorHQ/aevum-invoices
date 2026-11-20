import type { Address, Hex } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

/** One invoice, exactly as `Invoice.getInvoice` returns it. */
export interface InvoiceData {
  merchant: Address;
  amount: bigint;
  payer: Address;
  dueDate: bigint;
  memo: string;
  paid: boolean;
  paidBy: Address;
  paidAt: bigint;
}

/**
 * viem returns struct results as an array with named properties attached. Accept either
 * shape and normalize it, so callers never index into a raw tuple.
 */
export function parseInvoiceData(raw: unknown): InvoiceData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string | number, unknown>;
  const at = (i: number, key: string): unknown => (r[key] !== undefined ? r[key] : r[i]);
  const merchant = at(0, "merchant");
  const amount = at(1, "amount");
  const payer = at(2, "payer");
  const dueDate = at(3, "dueDate");
  const memo = at(4, "memo");
  const paid = at(5, "paid");
  const paidBy = at(6, "paidBy");
  const paidAt = at(7, "paidAt");
  if (typeof merchant !== "string" || typeof amount !== "bigint" || typeof payer !== "string") return null;
  return {
    merchant: merchant as Address,
    amount,
    payer: payer as Address,
    dueDate: typeof dueDate === "bigint" ? dueDate : 0n,
    memo: typeof memo === "string" ? memo : "",
    paid: paid === true,
    paidBy: typeof paidBy === "string" ? (paidBy as Address) : ZERO_ADDRESS,
    paidAt: typeof paidAt === "bigint" ? paidAt : 0n,
  };
}

export type InvoiceStatus = "open" | "paid" | "overdue";

/**
 * Overdue is a UI status only: the contract never blocks a late payment, it just records
 * the due date. An invoice is overdue when it is still unpaid and its due date has passed.
 */
export function statusOf(inv: InvoiceData, nowSeconds = Math.floor(Date.now() / 1000)): InvoiceStatus {
  if (inv.paid) return "paid";
  if (inv.dueDate > 0n && inv.dueDate < BigInt(nowSeconds)) return "overdue";
  return "open";
}

/**
 * `getInvoice` on an id that was never created returns a zero struct instead of
 * reverting, so a zero merchant is how you tell "no such invoice".
 */
export function invoiceExists(inv: InvoiceData): boolean {
  return inv.merchant !== ZERO_ADDRESS;
}

export function isOpenTo(address: string | undefined, inv: InvoiceData): boolean {
  if (inv.payer === ZERO_ADDRESS) return true;
  if (!address) return false;
  return inv.payer.toLowerCase() === address.toLowerCase();
}

/** Short, human-friendly label for a bytes32 invoice id. */
export function invoiceLabel(invoiceId: Hex | string): string {
  return `#${invoiceId.slice(2, 6).toUpperCase()}-${invoiceId.slice(-4).toUpperCase()}`;
}

export function short(value: string, head = 6, tail = 4): string {
  return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

export function formatDueDate(dueDate: bigint): string {
  if (dueDate === 0n) return "No due date";
  return new Date(Number(dueDate) * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `datetime-local` value (local time) for a unix-seconds due date, for prefilling the form. */
export function toLocalInputValue(dueDate: bigint): string {
  if (dueDate === 0n) return "";
  const d = new Date(Number(dueDate) * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
