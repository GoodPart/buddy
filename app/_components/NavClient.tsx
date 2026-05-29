"use client";

import Link from "next/link";
import { useEffect, useState } from "react";


export default function NavClient() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(false);
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/signup", label: "Signup" },
    { href: "/signin", label: "Signin" },
    { href: "/mypage", label: "Mypage" }
  ];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => setIsAuthed(res.ok))
      .catch(() => setIsAuthed(false));
  }, []);

  const handleSignout = () => {
    fetch("/api/auth/signout", {
        method: "POST",
    })
    .then(() => setIsAuthed(false))
    .catch(() => setIsAuthed(false));
  }

  if(isAuthed === null) return null;


  return (
    <nav className="flex gap-4 p-4">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/mypage">Mypage</Link>
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