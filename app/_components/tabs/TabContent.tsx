// LatestContentsTabs.tsx
"use client";
import { useState } from "react";


type ParsedTitle = {
    title: string;
    lines: string[];  // description 줄 배열 (_ 기준)
};
  
function sliceTitle(text: string): ParsedTitle {
    const dashIndex = text.indexOf("-");
  
    // '-' 없으면 전체를 title로
    if (dashIndex === -1) {
      return { title: text, lines: [] };
    }
  
    const title = text.slice(0, dashIndex);
    const description = text.slice(dashIndex + 1);
  
    // '_' 없으면 한 줄, 있으면 줄바꿈
    const lines = description.includes("_")
      ? description.split("_")
      : [description];
  
    return { title, lines };
}

export function Card({ item }: { item: any }) {
    const { title, lines } = sliceTitle(item.title);
    return (
        <div className={`card flex flex-col justify-between bg-white ${item._uid === "330a29f3-3cbd-4977-aece-af43152afaad" ? "col-span-2" : ""}`}>
            <a href={item.link} className="text-black">
                {
                    item.img ? (
                        <img src={item.img} alt={item.title} className="w-full h-40 object-cover" />
                    ) : (
                        <div className="w-full h-40 bg-gray-300"></div>
                    )
                }
                <div className="p-4">
                    <h3 className="text-lg font-bold mb-2">{title}</h3>
                    {lines.map((line: string, index: number) => (
                        <p key={index} className="text-sm text-gray-500 mb-2">{line}</p>
                    ))}
                </div>
            </a>
        </div>
    )
}


export default function LatestContentsTabs({ tabs }: { tabs: any }) {
    const [activeIndex, setActiveIndex] = useState(0);
    return (
        <div className="w-[1156px] mx-auto">
            <h2 className="text-2xl font-bold mb-4">최신 컨텐츠</h2>

            <div className="tab-wrap ">
            <ol className="tab-list flex gap-4 mb-4">
                {tabs.map((tab: any, i: number) => (
                <li key={tab.sectionTitle}>
                    <button
                    type="button"
                    className={`${activeIndex === i ? "bg-black text-white font-bold rounded-md px-4 py-2" : ""} p-2 cursor-pointer`}
                    onClick={() => setActiveIndex(i)}
                    >
                    {tab.sectionTitle}
                    </button>
                </li>
                ))}
            </ol>
            </div>
            <div className="tab-content grid grid-cols-3 gap-8">
            {tabs[activeIndex].items.map((item: any) => (
                <Card key={item._uid} item={item} />
            ))}
            </div>
        </div>
    )
}