"use client";

import { useEffect, useState } from "react";
import { User } from "./generated/prisma/client";

const getRemainingSec = (exp: number) => {
  const remainingMs = exp * 1000 - Date.now();
  return Math.max(0, Math.floor(remainingMs / 1000));
};
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`; // 예: 59:30
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [exp, setExp] = useState(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [strapiData, setStrapiData] = useState([]);
  useEffect(() => {

    const fetchStrapi = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/articles/?populate=*`);

      if(!res.ok) return;

      const data = await res.json();
      console.log(data)
      setStrapiData(data.data);
    }

    const fetchUser = async () => {
      const res = await fetch("/api/auth/me");

      if(!res.ok) return;

      const data = await res.json();
      setUser(data.user);
      setExp(data.payload.exp);
      setRemainingSec(getRemainingSec(data.payload.exp));
      
    };
    fetchUser();
    fetchStrapi();
  }, []);

  useEffect(() => {
    if(exp === null) return;

    const timer = setInterval(() => {
      setRemainingSec(getRemainingSec(exp));
    }, 1000)

    return () => clearInterval(timer);
  }, [exp])


  return (
    <div className="">
      hellow {user?.username ||"world"} {exp !== null && ( - <span className="text-sm text-gray-500">로그인 유효 시간 {formatTime(remainingSec)} 남음</span>)}

      <hr />
    
      <h2>strapi data</h2>
      <ul className="flex gap-2">
        {strapiData.map((item: any) => (
          <li key={item.id} className="">
            <div className="flex flex-col ">
              <img
                src={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${item.cover.url}`}
                alt={item.cover.alternativeText || item.title}
                width={300}
              />
              {item.title}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}