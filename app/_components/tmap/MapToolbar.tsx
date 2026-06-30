"use client";

import MapModeToggle from "@/app/_components/tmap/MapModeToggle";
import MyLocationButton from "@/app/_components/tmap/MyLocationButton";

type MapToolbarProps = {
  mapReady: boolean;
  onLocated: (lng: number, lat: number) => void;
};

export default function MapToolbar({ mapReady, onLocated }: MapToolbarProps) {
  return (
    <div className="absolute top-2 right-2 z-10 flex items-start gap-2">
      <MyLocationButton disabled={!mapReady} onLocated={onLocated} />
      <MapModeToggle />
    </div>
  );
}
