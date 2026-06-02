"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores";


export default function NavClient() {
  const signout = useAuthStore((state)=> state.signout);
  const isAuthed = useAuthStore((state)=> state.isAuthed);
  const isLoading = useAuthStore((state)=> state.isLoading);

  const handleSignout = () => {
    signout();
  }

  if(isLoading) return null;


  return (
    <nav className="flex gap-4 p-4">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/mypage">Mypage</Link>
        <Link href="/post/list">Post</Link>
        {!isAuthed ? (
            <>
                <Link href="/signup">Signup</Link>
                <Link href="/signin">Signin</Link>
            </>
        ) : (
            <button onClick={handleSignout}>Signout</button>
        )}
    </nav>
  )
}