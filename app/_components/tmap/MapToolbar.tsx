"use client";

import MapModeToggle from "@/app/_components/tmap/MapModeToggle";
import MapPipButton from "@/app/_components/tmap/MapPipButton";
import MapTtsButton from "@/app/_components/tmap/MapTtsButton";
import MyLocationButton from "@/app/_components/tmap/MyLocationButton";

type MapToolbarProps = {
  mapReady: boolean;
  onLocated: (lng: number, lat: number) => void;
};

export default function MapToolbar({ mapReady, onLocated }: MapToolbarProps) {
  return (
    <div className="absolute top-2 right-2 z-10 flex items-start gap-2">
      <MapTtsButton disabled={!mapReady} />
      <MapPipButton disabled={!mapReady} />
      <MyLocationButton disabled={!mapReady} onLocated={onLocated} />
      <MapModeToggle />
    </div>
  );
}
