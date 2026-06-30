"use client";

import { useCallback, useState } from "react";
import { hasLbsConsent, setLbsConsent } from "@/lib/geolocation/lbs-consent";
import { getCurrentGeoPosition } from "@/lib/geolocation/get-current-position";
import LbsConsentDialog from "@/app/_components/tmap/LbsConsentDialog";

type MyLocationButtonProps = {
  disabled?: boolean;
  onLocated: (lng: number, lat: number) => void;
};

export default function MyLocationButton({
  disabled = false,
  onLocated,
}: MyLocationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [error, setError] = useState("");

  const locate = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const pos = await getCurrentGeoPosition();
      onLocated(pos.lng, pos.lat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "위치를 가져오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onLocated]);

  const handleClick = () => {
    if (disabled || loading) return;
    setError("");

    if (hasLbsConsent()) {
      void locate();
      return;
    }

    setShowConsent(true);
  };

  const handleConsent = (granted: boolean) => {
    setShowConsent(false);
    setLbsConsent(granted);
    if (granted) {
      void locate();
    }
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || loading}
          className="flex h-[34px] items-center gap-1.5 rounded-md border border-gray-600 bg-gray-900/90 px-3 text-xs font-medium text-gray-200 shadow-lg transition-colors hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="내 위치 찾기"
          title="내 위치 찾기"
        >
          <LocateIcon spinning={loading} />
          <span className="hidden sm:inline">
            {loading ? "찾는 중…" : "내 위치"}
          </span>
        </button>
        {error ? (
          <p className="max-w-[220px] rounded-md border border-red-500/40 bg-red-950/90 px-2 py-1 text-right text-[11px] leading-snug text-red-200 shadow">
            {error}
          </p>
        ) : null}
      </div>

      {showConsent ? (
        <LbsConsentDialog onConsent={handleConsent} />
      ) : null}
    </>
  );
}

function LocateIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 ${spinning ? "animate-spin" : ""}`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
