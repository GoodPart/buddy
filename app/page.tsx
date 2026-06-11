// "use client";

// import { useEffect, useState } from "react";
// import { User } from "./generated/prisma/client";

// storyblok
import { getStoryblokApi } from "@/lib/storyblok";
import Banner from "./_components/storybloks/Banner";
import LendingBrand from "./_components/storybloks/LendingBrand";
import LatestContents from "./_components/storybloks/LatestContents";
import HeaderLogo from "./_components/storybloks/HeaderLogo";
import Header from "./_components/storybloks/Header";
const getRemainingSec = (exp: number) => {
  const remainingMs = exp * 1000 - Date.now();
  return Math.max(0, Math.floor(remainingMs / 1000));
};
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`; // 예: 59:30
};

export async function fetchData() {
  const storyblokApi = getStoryblokApi();
  return await storyblokApi.get(`cdn/stories/banner/main-banner`, { version: 'draft' });
}

export async function fetchLendingBrand() {
  const storyblokApi = getStoryblokApi();
  return await storyblokApi.get(`cdn/stories/lending-brand/lending`, { version: 'draft' });
}

export async function fetchLatestContents() {
  const storyblokApi = getStoryblokApi();
  return await storyblokApi.get(`cdn/stories/lending/latest-contents`, { version: 'draft' });
}

export async function fetchHeader() {
  const storyblokApi = getStoryblokApi();
  return await storyblokApi.get(`cdn/stories/global/header`, { version: 'draft' });
}

export default async function Home() {
  const { data: banner } = await fetchData();
  const { data: lendingBrand } = await fetchLendingBrand();
  const { data: latestContents } = await fetchLatestContents();
  const { data: header } = await fetchHeader();
  console.log(header);
  // const [user, setUser] = useState<User | null>(null);
  // const [exp, setExp] = useState(null);
  // const [remainingSec, setRemainingSec] = useState(0);

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     const res = await fetch("/api/auth/me");

  //     if(!res.ok) return;

  //     const data = await res.json();
  //     setUser(data.user);
  //     setExp(data.payload.exp);
  //     setRemainingSec(getRemainingSec(data.payload.exp));
      
  //   };
  //   fetchUser();
  // }, []);

  // useEffect(() => {
  //   if(exp === null) return;

  //   const timer = setInterval(() => {
  //     setRemainingSec(getRemainingSec(exp));
  //   }, 1000)

  //   return () => clearInterval(timer);
  // }, [exp])


  return (
    <div className="">
      {/* <Header blok={header.story.content.body[0]} /> */}
      {/* <HeaderLogo blok={header.story.content.body[0]} /> */}
      <Banner blok={banner.story.content.body[0]} />
      {/* <LendingBrand blok={lendingBrand} />
      <LatestContents blok={latestContents} /> */}
      {/* <StoryblokStory story={data.story} /> */}
      {/* hellow {user?.username ||"world"} {exp !== null && ( - <span className="text-sm text-gray-500">로그인 유효 시간 {formatTime(remainingSec)} 남음</span>)} */}
      hello
    </div>
  );
}
