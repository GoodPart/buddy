import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(request : Request) {
    try {
        const posts = await prisma.post.findMany();
        return NextResponse.json({
            posts : posts,
            message : "정상적으로 게시글이 조회되었습니다.",
        }, {status : 200});
    } catch (error) {
        return NextResponse.json({
            error : "게시글 조회 실패",
            message : "게시글 조회 실패",
        }, {status : 500});
    }
}   

export async function POST(request : Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if(!token) {
        return NextResponse.json({
            message : "로그인이 필요합니다.",
        }, {status : 401});
    }

    try {
        const {payload} = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        const userId = payload.userId as string; // <- 이것이 authorId

        const body = await request.json();
        const {title, content} = body;

        const post = await prisma.post.create({
            data : {
                title,
                content,
                authorId : userId,
            }
        })        

        return NextResponse.json({
            post : post,
            message : "정상적으로 게시글이 생성되었습니다.",
        }, {status : 201});
    }catch {
        return NextResponse.json({
            error : "포스트 생성 실패",
            message : "포스트 생성 실패",
        }, {status : 500});
    }
}