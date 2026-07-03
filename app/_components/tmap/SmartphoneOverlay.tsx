"use client";
import { useUIStore, useRadioStore } from "@/stores";
import RecommendDestination from "./RecommendDestination";
import RoutePlanner from "./RoutePlanner";
import RadioPlayer from "./RadioPlayer";
import { MapPinned, AudioLines, Settings } from "lucide-react";

const PHONE_FRAME_SRC = "/assets/images/ip2.png";

const RECORDING_BAR_COUNT = 5;

function RecordingBars({ active }: { active: boolean }) {
  return (
    <>
      <style>{`
        @keyframes buddy-recording-bar {
          0%, 100% { transform: scaleY(0.3); opacity: 0.55; }
          50% { transform: scaleY(0.7); opacity: 1; }
        }
        .buddy-recording-bar {
          transform-origin: bottom center;
          animation: buddy-recording-bar 0.75s ease-in-out infinite;
        }
        .buddy-recording-bar-idle {
          transform: scaleY(0.3);
          opacity: 0.55;
        }
      `}</style>
      <span
        className="flex h-4 items-end justify-center gap-[2px]"
        aria-hidden
      >
        {Array.from({ length: RECORDING_BAR_COUNT }, (_, i) => (
          <span
            key={i}
            className={`block h-full w-[2px] rounded-full bg-orange-500 ${
              active ? "buddy-recording-bar" : "buddy-recording-bar-idle"
            }`}
            style={active ? { animationDelay: `${i * 0.12}s` } : undefined}
          />
        ))}
      </span>
    </>
  );
}

export default function SmartphoneOverlay() {
    const isSmartphoneOpen = useUIStore((state)=> state.isSmartphoneOpen);
    const toggleSmartphone = useUIStore((state)=> state.toggleSmartphone);
    const currentScreen = useUIStore((state)=> state.currentScreen);
    const setCurrentScreen = useUIStore((state)=> state.setCurrentScreen);
    const isRadioPlaying = useRadioStore(
      (state) =>
        state.activeStationId != null || state.loadingStationId != null
    );
  return (
    <div className={`fixed  ${isSmartphoneOpen ? "bottom-2" : "bottom-[-600px]"} transition-all duration-300 right-2 z-10 w-[330px] h-[600px]`}>
        <div>
          <button className="absolute top-[-50px] left-[50%] -translate-x-1/2 z-10 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 z-100" onClick={toggleSmartphone}>Smartphone</button>
          <button
            type="button"
            className={`absolute top-[-50px] left-[70%] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 z-100 transition-all duration-400 transition-transform cubic-bezier(0.68, -0.6, 0.32, 1.6) ${isRadioPlaying ? "scale-110" : "scale-0"}`}
            aria-label={isRadioPlaying ? "라디오 재생 중" : "라디오 대기"}
            onClick={() => {
              if(isSmartphoneOpen) {
                return;
              }
              toggleSmartphone();
              setCurrentScreen("radio")
            }}
          >
            <RecordingBars active={isRadioPlaying} />
          </button>
        </div>
        
        {
          currentScreen !== "main" && isSmartphoneOpen && (<button type="button" className="absolute top-[-50px] left-[15%] z-10 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 z-100" onClick={() => setCurrentScreen("main")}>⬅</button>)
        }
        <div>
          {currentScreen === "main" && <SmartphoneScreenMain />}
          {currentScreen === "map" && <SmartphoneScreenMap />}
          {currentScreen === "radio" && <SmartphoneScreenRadio />}
        </div>
        {/* 베젤 프레임 — 시각용만, 이벤트는 아래로 통과 */}
        <img
            src={PHONE_FRAME_SRC}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-contain"
        />
        {/* <div className="absolute top-0 left-0 w-full flex justify-between items-center text-black px-4 text-[12px] pt-6.5 text-black z-10">
          <div>12:00</div>
          <div>베터리</div>
        </div> */}
    </div>
  );
}


const SmartphoneScreenMain = () => {
  const setCurrentScreen = useUIStore((state)=> state.setCurrentScreen);
  const appList = [
    {
      name: "Map",
      icon: <MapPinned className="w-6 h-6 text-black" />,
      screen: "map",
    },
    {
      name: "Radio",
      icon: <AudioLines className="w-6 h-6 text-black" />,
      screen: "radio",
    },
    {
      name: "setting",
      icon: <Settings className="w-6 h-6 text-black" />,
      screen: "setting",
    },
  ]
  return (
    <div className="bg-gray-500 absolute inset-0 z-10 flex flex-col justify-between overflow-y-auto mx-7.5 mb-3 px-3 pt-6.5" style={{ borderRadius : '40px', overflow : 'hidden'}}>
      <div className="mt-10">
        <ol className="grid grid-cols-3 gap-4">
          {appList.map((app) => (
            <li key={app.name} className="flex flex-col items-center justify-center text-white text-[12px] gap-1 hover:bg-gray-300 rounded-md p-2 cursor-pointer" onClick={() => setCurrentScreen(app.screen as "main" | "map" | "radio")}>
              <div className="bg-white rounded-md p-2 w-10 h-10 flex items-center justify-center">
                {app.icon}
              </div>
              {app.name}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

const SmartphoneScreenMap = () => {
  return (
    <div className="bg-white absolute inset-0 z-10 flex flex-col justify-between overflow-y-auto mx-7.5 mb-3 px-3 pt-6.5" style={{ borderRadius : '40px', overflow : 'hidden'}}>
        <RoutePlanner />
        <RecommendDestination />
    </div>
  )
}
const SmartphoneScreenRadio = () => {
  return (
    <div className="bg-white absolute inset-0 z-10 flex flex-col justify-between overflow-y-auto mx-7.5 mb-3 px-3 pt-6.5" style={{ borderRadius : '40px', overflow : 'hidden'}}>
      <RadioPlayer /> 
    </div>
  )
}