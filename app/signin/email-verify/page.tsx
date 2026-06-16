"use client";
import { useState } from "react";

export default function EmailVerifyPage() {
    const [email, setEmail] = useState("");
    
    return (
        <div>
            <h1>이메일 재전송 페이지</h1>
            {/* <form onSubmit={handleSubmit}> */}
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button type="submit">이메일 재전송</button>
            {/* </form> */}
        </div>
    )
}