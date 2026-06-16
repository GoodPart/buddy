import { NextResponse } from "next/server";

import {prisma} from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; // edge runtime 에서 사용 불가
import { SignJWT } from "jose";


export async function POST(request : Request) {
    try {
        const body = await request.json();
        const {username, password} = body;
        
        if(!username || !password) {
            return NextResponse.json(
                { message: "아이디와 비밀번호는 필수입니다." },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where : {username}
        })

        const invalidCredentials = () => NextResponse.json(
            { message: "아이디 또는 비밀번호가 일치하지 않습니다." },
            { status: 401 }
        )
        
        if(!user) return invalidCredentials();
        
        // bcrypt 비밀번호 비교
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid) return invalidCredentials();

        // 이메일 인증 안된 경우
        if(!user.emailVerified) {
            return NextResponse.json(
                { message: "이메일 인증이 필요합니다." },
                { status: 403 }
            )
        }

        const token = await new SignJWT({userId : user.id})
            .setProtectedHeader({alg : "HS256"})
            .setExpirationTime("1h")
            .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

        // const token = jwt.sign({userId : user.id}, process.env.JWT_SECRET!, {expiresIn : "1h"});

        

        const response = NextResponse.json(
            { message: "로그인 성공", user : {id : user!.id, username : user!.username}},
            { status: 200 }
        );
        /*
            secure 속성: 쿠키 전송 여부 결정

            개발(localhost/http): false → 쿠키 전송됨
            운영(https): true → 보안 유지
        */
        response.cookies.set("token", token, {
            httpOnly : true,
            secure: process.env.NODE_ENV === "production",
            maxAge : 3600,
            path : "/"
        });
        return response;

    }catch (error) {
        
        return NextResponse.json(
            { message: "서버 오류 발생", error: error },
            { status: 500 }
        );
    }
}