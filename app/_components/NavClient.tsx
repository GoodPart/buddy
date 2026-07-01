"use client";

import Link from "next/link";
import { useAuthStore, useUIStore } from "@/stores";


export default function NavClient() {
  const isNavigationOpen = useUIStore((state)=> state.isNavigationOpen);
  const toggleNavigation = useUIStore((state)=> state.toggleNavigation);
  const signout = useAuthStore((state)=> state.signout);
  const isAuthed = useAuthStore((state)=> state.isAuthed);
  const isLoading = useAuthStore((state)=> state.isLoading);

  const handleSignout = () => {
    signout();
  }

  if(isLoading) return null;


  return (
    <>
    { isNavigationOpen ? (
       <nav className={"flex gap-4 p-4"}>
        <button className="absolute top-2 right-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800" onClick={toggleNavigation}>네비게이션 닫기</button>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/mypage">Mypage</Link>
        <Link href="/post/list">Post</Link>
        <Link href="/tmap">Tmap</Link>
        {!isAuthed ? (
            <>
                <Link href="/signup">Signup</Link>
                <Link href="/signin">Signin</Link>
            </>
        ) : (
            <button onClick={handleSignout}>Signout</button>
        )}
    </nav>
    ) : (
      <button className="absolute top-2 left-[50%] -translate-x-1/2 z-10 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800" onClick={toggleNavigation}>네비게이션 열기</button>
    )}
    </>
  )
}