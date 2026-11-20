import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { PageTransition } from "@/components/motion/PageTransition";
import { Providers } from "./providers";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Aevum Invoices", template: "%s · Aevum Invoices" },
  description: "Send invoices and get paid in tUSD8 on QDay Aevum testnet, standard or gasless.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <Providers>
          <SmoothScroll />
          <Header />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
