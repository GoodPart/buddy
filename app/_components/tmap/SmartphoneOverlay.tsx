"use client";
import { useUIStore } from "@/stores";
import RecommendDestination from "./RecommendDestination";
import RoutePlanner from "./RoutePlanner";

const PHONE_FRAME_SRC = "/assets/images/ip2.png";

export default function SmartphoneOverlay() {
    const isSmartphoneOpen = useUIStore((state)=> state.isSmartphoneOpen);
    const toggleSmartphone = useUIStore((state)=> state.toggleSmartphone);
  return (
    <div className={`fixed ${isSmartphoneOpen ? "bottom-2" : "bottom-[-600px]"} transition-all duration-300 right-2 z-10 w-[330px] h-[600px]`}>
        <button className="absolute top-[-50px] left-[50%] -translate-x-1/2 z-10 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 z-100" onClick={toggleSmartphone}>Smartphone</button>
        {/* 화면 영역 — 클릭·입력 등 실제 UI */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between overflow-y-auto mx-7.5 mb-3 px-3 pt-16 bg-white" style={{ borderRadius : '40px', overflow : 'hidden'}}>
            <RoutePlanner />
            <RecommendDestination />
        </div>

        {/* 베젤 프레임 — 시각용만, 이벤트는 아래로 통과 */}
        <img
            src={PHONE_FRAME_SRC}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-contain"
        />
        {/* <button className="absolute bottom-2 right-2 z-10 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800" onClick={toggleSmartphone}>Smartphone</button> */}
    </div>
  );
}
