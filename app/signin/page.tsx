"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores";

const ErrorMessage = ({message} : {message : string}) => {
    switch(message) {
        case "이메일 인증이 필요합니다.":
            return <p className="text-red-500">이메일 인증이 필요합니다.</p>;
        case "이메일 인증 토큰 전송 실패":
            return <p className="text-red-500">이메일 인증 토큰 전송 실패</p>;
        case "이메일 인증 토큰 만료":
            return <p className="text-red-500">이메일 인증 토큰 만료</p>;
    }
    return <p className="text-red-500">{message}</p>;
}

export default function Signin() {
    const signin = useAuthStore((state)=> state.signin);
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/";

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        try {
            await signin(username, password);
            router.push(next);
            router.refresh();
        } catch (error) {
            setError((error as {message : string}).message || "로그인 실패");
            return;
        }
    }
    return (
        <div>
            <h2>signin page</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit">Login</button>
            </form>
            <div>
                회원가입 이메일을 받지 못했나요?
            </div>
            {error && <ErrorMessage message={error} />}
        </div>
    )
}