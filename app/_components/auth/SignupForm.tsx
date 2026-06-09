"use client";

import { FormEvent, useEffect, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useAuthStore } from "@/stores";
import { useRouter } from "next/navigation";


type SignupBlok = {
    title?: string;
    description?: string;
    username?: string;
    password?: string;
    submit?: string;
}

export default function SignupForm({ blok }: { blok: SignupBlok }) {
    const signup = useAuthStore((s) => s.signup);
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        console.log(username, password);
    }, [username, password]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await signup(username, password);
            router.push('/signin');
            router.refresh();
        } catch (error) {
            console.error(error);
            setError(error instanceof Error ? error.message : "회원가입 실패");
        }


    }

    return (
        <div >
            <h2>{blok.title}</h2>
            <p>{blok.description}</p>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                    {/* <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="submit">Signup</button> */}
                    <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button type="submit">{blok.submit}</Button>
                </div>
            </form>
        </div>
    )
}