"use client";
import { useEffect } from "react";
import { useSimulationStore } from "@/stores";
export default function SimulationLoop() {
  const status = useSimulationStore((s) => s.status);
  const tick = useSimulationStore((s) => s.tick);
  useEffect(() => {
    if (status !== "running") return;
    let rafId = 0;
    let last = performance.now();
    const loop = (now: number) => {
      tick(now - last);
      last = now;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [status, tick]);
  return null;
}