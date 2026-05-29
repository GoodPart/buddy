import { NextResponse } from "next/server";
import { cookies } from "next/headers";
// import jwt from "jsonwebtoken"; // edge runtime 에서 사용 불가
import {jwtVerify} from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request : Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if(!token) {
        return NextResponse.json(
            { message: "로그인이 필요합니다." },
            { status: 401 }
        )
    }
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const {payload} = await jwtVerify(token, secret);

        const user = await prisma.user.findUnique({
            where: {
                id: payload.userId as string,
            },
        });
        
        return NextResponse.json(
            { message: "로그인 성공", user : user, payload : payload},
            { status: 200 },
        )
    } catch (error) {
        return NextResponse.json(
            { message: "유효하지 않은 토큰입니다." },
            { status: 401 }
        )
    }
}