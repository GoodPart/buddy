import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ message: "로그아웃 성공" }, { status: 200 });

    res.cookies.set("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/",
    });

    return res;
}