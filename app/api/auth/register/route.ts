import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

import {Prisma} from "@/app/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";

export async function POST(request : Request) {
    try {
        const body = await request.json();
        const {username, email, password} = body;

        if(!username || !password) {
            return NextResponse.json(
                { message: "아이디와 비밀번호는 필수입니다." },
                { status: 400 }
            )
        }
        if(!email) {
            return NextResponse.json(
                { message: "이메일은 필수입니다." },
                { status: 400 }
            )
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const {token, expires} = createVerificationToken(); // 이메일 인증 토큰 생성

        // 데이터베이스에 저장
        const user = await prisma.user.create({
            data : {
                username,
                email,
                password : hashedPassword,
                emailVerificationToken : token, // 이메일 인증 토큰
                emailVerificationExpires : expires, // 이메일 인증 토큰 만료 시간
            }
        })

        const emailSent = await sendVerificationEmail(email, token); // 이메일 인증 토큰 전송

        // 이메일 인증 토큰 전송 실패
        if(!emailSent.success) {
            return NextResponse.json(
                { message: "이메일 인증 토큰 전송 실패", error : emailSent.message },
                { status: 500 }
            )
        }

        // 회원가입 성공
        return NextResponse.json(
            { message: "회원가입 성공", user : {id : user.id, username : user.username}},
            { status: 201 }
        );
    } catch (error) {
        if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {

            const target = error.meta?.target;
            if(Array.isArray(target) && target.includes("username")) {
                return NextResponse.json(
                    { message: "이미 존재하는 아이디입니다." },
                    { status: 409 }
                )
            }
            if(Array.isArray(target) && target.includes("email")) {
                return NextResponse.json(
                    { message: "이미 존재하는 이메일입니다." },
                    { status: 409 }
                )
            }
            
            return NextResponse.json(
                { message: "이미 사용 중인 값입니다." },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { message: "서버 오류 발생", error: error },
            { status: 500 }
        );
    }
}