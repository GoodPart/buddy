import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

import {Prisma} from "@/app/generated/prisma/client";
import {prisma} from "@/lib/prisma";

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
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 데이터베이스에 저장
        const user = await prisma.user.create({
            data : {
                username,
                password : hashedPassword,
            }
        })

        return NextResponse.json(
            { message: "회원가입 성공", user : {id : user.id, username : user.username}},
            { status: 201 }
        );
    } catch (error) {
        if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { message: "이미 존재하는 아이디입니다." },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { message: "서버 오류 발생", error: error },
            { status: 500 }
        );
    }
}