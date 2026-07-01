"use client";

import { useState } from "react";
import type { Place } from "@/lib/tmap/types";

type Props = {
  label: string;
  query: string;
  onQueryChange: (q: string) => void;
  selected: Place | null;
  onSelect: (place: Place | null) => void;
  geocode: (query: string) => Promise<Place[]>;
};

export default function PlaceSearch({
  label,
  query,
  onQueryChange,
  selected,
  onSelect,
  geocode,
}: Props) {
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError("");
    setResults([]);
    onSelect(null);

    try {
      const list = await geocode(query.trim());
      setResults(list);
      if (list.length === 0) {
        setError("검색 결과가 없습니다.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 실패");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium">{label}</label>
      <div className="flex gap-2 h-8">
        <input
          type="text"
          className="flex-1 border border-gray-400 rounded-md px-3 placeholder:text-[12px] text-[12px]"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="주소 검색"
        />
        <button
          type="button"
          className="bg-gray-700 text-white px-3 rounded-md disabled:opacity-50 text-[10px]"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? "검색중" : "검색"}
        </button>
      </div>
      {selected && (
        <p className="text-sm text-green-700">
          선택: {selected.name}
          {selected.address ? ` (${selected.address})` : ""}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {results.length > 0 && (
        <ul className="border border-gray-300 rounded-md max-h-40 overflow-y-auto">
          {results.map((place, i) => (
            <li key={`${place.lng}-${place.lat}-${i}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                onClick={() => {
                  onSelect(place);
                  setResults([]);
                }}
              >
                {place.address || place.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
