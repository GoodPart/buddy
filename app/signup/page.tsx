"use client";

import {useRouter} from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function Signup() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const router = useRouter();
    useEffect(() => {
        console.log(username, password);
    }, [username, password, email]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({ username, password, email }),
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
    
            if(!response.ok) {
                alert(data.message || "회원가입 실패");
                return ;
            }
            
            alert("이메일을 확인해주세요.")
            router.push("/signin")
        } catch (error) {
            alert("회원가입 실패");
            return;
        }

    }

    return (
        <div>
            <h2>signup page</h2>
            <form onSubmit={handleSubmit}>
                <br />
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button type="submit">Signup</button>
            </form>
        </div>
    )
}