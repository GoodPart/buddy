"use client";

import { useRef, useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { hasLbsConsent, setLbsConsent } from "@/lib/geolocation/lbs-consent";
import { useRoutePlannerStore, useSimulationStore } from "@/stores";
import LbsConsentDialog from "./LbsConsentDialog";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

type RecommendedDestination = {
  name: string;
  address: string;
  time: string;
  distance: string;
};

const DESTINATIONS: RecommendedDestination[] = [
  {
    name: "광명동굴",
    address: "경기 광명시 가학로85번길 142",
    time: "44분",
    distance: "25km",
  },
  {
    name: "롯데월드",
    address: "서울 송파구 올림픽로 240",
    time: "34분",
    distance: "17km",
  },
  {
    name: "공덕역",
    address: "서울 마포구 마포대로 100",
    time: "7분",
    distance: "2.3km",
  }
];



export default function RecommendDestination() {
  const status = useSimulationStore((s) => s.status);
  const isLoading = useRoutePlannerStore((s) => s.isLoading);
  const error = useRoutePlannerStore((s) => s.error);
  const fetchRouteFromMyLocation = useRoutePlannerStore(
    (s) => s.fetchRouteFromMyLocation
  );
  const clearError = useRoutePlannerStore((s) => s.clearError);

  const [pending, setPending] = useState<RecommendedDestination | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const swiperRef = useRef<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const syncNavState = (swiper: SwiperType) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  };

  const isLocked = status === "running" || status === "paused";
  const disabled = isLoading || isLocked;

  const runSearch = async (destination: RecommendedDestination) => {
    clearError();
    await fetchRouteFromMyLocation(destination.name, destination.address);
  };

  const handleCardClick = (destination: RecommendedDestination) => {
    if (disabled) return;

    if (hasLbsConsent()) {
      void runSearch(destination);
      return;
    }

    setPending(destination);
    setShowConsent(true);
  };

  const handleConsent = (granted: boolean) => {
    setShowConsent(false);
    setLbsConsent(granted);

    const destination = pending;
    setPending(null);

    if (granted && destination) {
      void runSearch(destination);
    }
  };

  const handleSlideTap = (swiper: SwiperType) => {
    const index = swiper.clickedIndex;
    if (index == null || index < 0) return;

    const destination = DESTINATIONS[index];
    if (destination) handleCardClick(destination);
  };

  return (
    <section className="flex min-w-0 flex-col gap-1 mb-5">
      <h2 className="text-lg font-bold text-black">추천 도착지</h2>

      <div className="relative">
        <Swiper
          className="w-full"
          slidesPerView={1.1}
          spaceBetween={10}
          grabCursor
          preventClicks
          preventClicksPropagation
          threshold={8}
          onTap={handleSlideTap}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            syncNavState(swiper);
          }}
          onSlideChange={syncNavState}
          onReachBeginning={(swiper) => syncNavState(swiper)}
          onReachEnd={(swiper) => syncNavState(swiper)}
        >
          {DESTINATIONS.map((destination) => (
            <SwiperSlide key={destination.name} className="!h-auto">
              <button
                type="button"
                disabled={disabled}
                className="cursor-pointer h-full w-full rounded-md border border-gray-600 p-2 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <h3 className="font-medium text-black text-[14px]">{destination.name}</h3>
                <p className="mt-1 text-sm text-gray-600 text-[12px]">{destination.address}</p>
                <p className="mt-2 text-xs text-gray-500 text-[12px]">
                  약 {destination.time} · {destination.distance}
                </p>
                {isLoading ? (
                  <p className="mt-2 text-xs text-blue-600">경로 탐색 중…</p>
                ) : (
                  <p className="mt-2 text-xs text-blue-600">
                    탭하여 내 위치에서 경로 탐색
                  </p>
                )}
              </button>
            </SwiperSlide>
          ))}
        </Swiper>

        <button
          type="button"
          aria-label="이전 추천 도착지"
          disabled={isBeginning}
          onClick={() => swiperRef.current?.slidePrev()}
          className="absolute left-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-400 bg-white text-base leading-none text-gray-800 shadow-sm disabled:pointer-events-none disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="다음 추천 도착지"
          disabled={isEnd}
          onClick={() => swiperRef.current?.slideNext()}
          className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-400 bg-white text-base leading-none text-gray-800 shadow-sm disabled:pointer-events-none disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {showConsent ? <LbsConsentDialog onConsent={handleConsent} /> : null}
    </section>
  );
}
