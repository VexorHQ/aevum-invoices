"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { networks, repoUrl } from "@/lib/env";
import { springSnappy } from "@/lib/motion";
import { GitHubIcon, ReceiptMark } from "./Icons";
import { useNetwork } from "@/lib/network";

const links = [
  { href: "/", label: "Invoices" },
  { href: "/invoices/new", label: "New invoice" },
  { href: "/activity", label: "Activity" },
  { href: "/setup", label: "Setup" },
  { href: "/docs", label: "Docs" },
];

export function Header() {
  const pathname = usePathname();
  const { isConnected, chainId } = useAccount();
  const { net, select, switchingTo, switchError } = useNetwork();
  const wrongNetwork = isConnected && chainId !== net.chain.id && !switchingTo;
  // Sticky glass: once the page scrolls, the header gains backdrop blur, a
  // stronger hairline and a soft shadow (see .topbar.scrolled in globals.css).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`topbar${scrolled ? " scrolled" : ""}`}>
        <div className="shell">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <ReceiptMark />
            </span>
            <span className="brand-name">Aevum Invoices</span>
          </Link>
          <nav className="nav" aria-label="Main">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
                  {active && <motion.span layoutId="nav-pill" className="nav-pill" transition={springSnappy} aria-hidden="true" />}
                  <span className="nav-label">{l.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="topbar-end">
            <a className="gh-link" href={repoUrl} target="_blank" rel="noreferrer" title="Source code on GitHub">
              <GitHubIcon />
              <span>GitHub</span>
            </a>
            {networks.length > 1 && (
              <div className="net-switch" role="radiogroup" aria-label="Network">
                {networks.map((n) => (
                  <button
                    key={n.key}
                    type="button"
                    role="radio"
                    aria-checked={n.key === net.key}
                    disabled={Boolean(switchingTo)}
                    title={`${n.chain.name} · chain ${n.chain.id}`}
                    onClick={() => select(n.key)}
                  >
                    {n.key === net.key && (
                      <motion.span layoutId="net-pill" className="net-pill" transition={springSnappy} aria-hidden="true" />
                    )}
                    <span className="net-dot-wrap">
                      <span className={`net-dot ${n.key}`} aria-hidden="true" />
                    </span>
                    <span className="net-label">{n.label}</span>
                  </button>
                ))}
              </div>
            )}
            <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
          </div>
        </div>
      </header>
      {switchingTo && (
        <div className="banner info" role="status">
          <div className="shell">
            <span>
              Confirm the switch to <strong>{switchingTo.chain.name}</strong> in your wallet. If no window opened, click the wallet icon in your
              browser toolbar.
            </span>
          </div>
        </div>
      )}
      {switchError && !switchingTo && (
        <div className="banner" role="alert">
          <div className="shell">
            <span>{switchError}</span>
          </div>
        </div>
      )}
      {wrongNetwork && (
        <div className="banner" role="alert">
          <div className="shell">
            <span>
              Your wallet is on another network. This app is set to <strong>{net.chain.name} ({net.chain.id})</strong>.
            </span>
            <button type="button" className="btn warn small" onClick={() => select(net.key)}>
              Switch network
            </button>
          </div>
        </div>
      )}
    </>
  );
}
