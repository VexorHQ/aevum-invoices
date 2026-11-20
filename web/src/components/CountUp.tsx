"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { formatUnits } from "viem";
import { easeSmooth } from "@/lib/motion";

// Counts a token amount up from 0 on first load (hero "Paid in", Setup
// score). Later value changes (refetch) jump straight to the new value —
// refetches must not replay the animation. Under reduced motion the final
// value renders immediately.
export function CountUp({ value, decimals, symbol }: { value: bigint; decimals: number; symbol?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => formatUnits(BigInt(Math.round(v)), decimals));
  const prev = useRef<bigint>(0n);

  useEffect(() => {
    if (value === prev.current) return;
    const from = prev.current;
    prev.current = value;
    if (reduce || from !== 0n) {
      mv.set(Number(value));
      return;
    }
    const controls = animate(mv, Number(value), { duration: 0.9, ease: easeSmooth });
    return () => controls.stop();
  }, [value, mv, reduce]);

  return (
    <>
      <motion.span>{text}</motion.span>
      {symbol ? <small> {symbol}</small> : null}
    </>
  );
}
