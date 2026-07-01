"use client";

import dynamic from "next/dynamic";
import SimulationLoop from "@/app/_components/tmap/SimulationLoop";
// import RoutePlanner from "@/app/_components/tmap/RoutePlanner";
// import RecommendDestination from "@/app/_components/tmap/RecommendDestination";
// import RadioPlayer from "@/app/_components/tmap/RadioPlayer";

const VWorldCanvas = dynamic(
  () => import("@/app/_components/tmap/VWorldCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-gray-100 animate-pulse ratio-16/9" />
    ),
  }
);

export default function TmapPage() {

  const passengers = [
    {
      name: "홍길동",
      image: "https://placehold.co/40x40",
    },
    {
      name: "이순신",
      image: "https://placehold.co/40x40",
    },
  ]
  return (
    <div className="flex flex-col">
      {/* <div>
        <h2>탑승자</h2>
        <div>
          <ul className="flex gap-4">
            {
              passengers.map((passenger) => (
                <li key={passenger.name} className="flex flex-col items-center gap-2">
                  <div className="w-[40px] h-[40px] border-1 border-gray-600 rounded-full overflow-hidden">
                    <img src={passenger.image} alt={passenger.name} className="w-full h-full object-cover" />
                  </div>
                  <h3>{passenger.name}</h3>
                </li>
              ))
            }
          </ul>
        </div>
      </div> */}
      <VWorldCanvas />
      {/* <section> */}
        {/* <h2 className="mb-3 font-semibold">추천 도착지</h2> */}
        {/* <RecommendDestination /> */}
      {/* </section> */}
      {/* <div className="flex gap-4"> */}
        {/* <RoutePlanner /> */}
        {/* <RadioPlayer /> */}
      {/* </div> */}
      <SimulationLoop />
    </div>
  );
}
