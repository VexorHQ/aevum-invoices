"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { ToastProvider } from "@/components/motion/Toast";
import { NetworkProvider, useNetwork } from "@/lib/network";
import { wagmiConfig } from "@/lib/wagmi";

const theme = lightTheme({ accentColor: "#1E3A5F", borderRadius: "medium" });

/** Connect the wallet straight to the network picked in the header, not always the first one. */
function RainbowKit({ children }: { children: ReactNode }) {
  const { net } = useNetwork();
  return (
    <RainbowKitProvider initialChain={net.chain} locale="en-US" theme={theme} appInfo={{ appName: "Aevum Invoices" }}>
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          {/* MotionConfig reducedMotion="user": every Motion animation in the
              app honors the OS prefers-reduced-motion setting. */}
          <MotionConfig reducedMotion="user">
            <ToastProvider>
              <RainbowKit>{children}</RainbowKit>
            </ToastProvider>
          </MotionConfig>
        </NetworkProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
