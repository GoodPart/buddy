"use client";

import {useRouter} from "next/navigation";
import { FormEvent, useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/stores";

export default function Signup() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const inputRef = useRef(null);
    const [emailStatus, setEmailStatus] = useState({
        success : false,
        message : "",
    });
    const router = useRouter();
    const emailCheck = useAuthStore((state)=> state.emailCheck);
    
    useEffect(() => {
        console.log(username, password);
    }, [username, password, email]);

    const handleEmailCheck = async (e: FormEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const data = await emailCheck(email);

        if(data.success) {
            setEmailStatus({success : true, message : data.message});
        } else {
            setEmailStatus({success : false, message : data.message});
        }
        
    }

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
                id : <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <br />
                password :<input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <br />
                <div>email :<input type="email" className={`border-2 disabled:bg-gray-600 text-gray-500 ${emailStatus.success ? "border-green-500" : "border-red-500"}`} placeholder="Email" value={email} ref={inputRef} onChange={(e) => setEmail(e.target.value)} disabled={emailStatus.success}/>
                    {
                        emailStatus.success ? 
                            (
                            <button type="button" className={`text-white px-2 rounded-md ${!emailStatus.success ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500"}`} onClick={() => setEmailStatus({success : false, message : ""})}>
                                이메일 변경하기
                            </button>
                            )
                        : 
                            (
                            <button className={`text-white px-2 rounded-md ${email.length === 0 || emailStatus.success ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500"}`} onClick={handleEmailCheck} type="button"
                                disabled={email.length === 0 || emailStatus.success}>
                                중복확인
                            </button>
                            )
                    }
                <div className={emailStatus.success ? "text-green-500" : "text-red-500"}>{emailStatus.message}</div>
                </div>
                <br />
                <button type="submit" className={`text-white px-2 rounded-md ${!emailStatus.success ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500"}`} disabled={!emailStatus.success}>Signup</button>
            </form>
        </div>
    )
}