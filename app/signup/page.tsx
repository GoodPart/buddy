"use client";

import { FormEvent, useEffect, useState } from "react";

export default function Signup() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        console.log(username, password);
    }, [username, password]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const response = await fetch("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        const data = await response.json();
        console.log('signup response -->',data);
    }

    return (
        <div>
            <h2>signup page</h2>
            <form onSubmit={handleSubmit}>
                <br />
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit">Signup</button>
            </form>
        </div>
    )
}