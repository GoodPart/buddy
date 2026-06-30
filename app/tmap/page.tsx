"use client";

import dynamic from "next/dynamic";
import SimulationLoop from "@/app/_components/tmap/SimulationLoop";
import RoutePlanner from "@/app/_components/tmap/RoutePlanner";
import RouteControls from "@/app/_components/tmap/RouteControls";

const VWorldCanvas = dynamic(
  () => import("@/app/_components/tmap/VWorldCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] rounded-md border border-gray-300 bg-gray-100 animate-pulse" />
    ),
  }
);

export default function TmapPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto p-4">
      <VWorldCanvas />
      <RoutePlanner />
      <SimulationLoop />
      <RouteControls />
    </div>
  );
}
