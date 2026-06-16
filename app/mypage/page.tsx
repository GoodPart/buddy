"use client";
import {useEffect, useState} from "react";
import { User } from "../generated/prisma/client";
export default function Mypage() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetch("/api/auth/me")
        .then((res) => {
            if(!res.ok) return;
            return res.json();
        })
        .then((data) => setUser(data.user));
    }, []);
    return (
        <div>
            <h1>Mypage</h1>
            <p>Username: {user?.username}</p>
            <p>Email: {user?.email}</p>
        </div>
    )
}