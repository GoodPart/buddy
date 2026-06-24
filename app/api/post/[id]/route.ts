import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const {id} = await params;

    const post = await prisma.post.findUnique({where : {id}});
    const author = await prisma.user.findUnique({
        where: { id: post?.authorId },
    });

    if(!post) {
        return NextResponse.json({error : "게시글을 찾을 수 없습니다."}, {status : 404});
    }
    return NextResponse.json({...post, author});
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if(!token) {
        return NextResponse.json({
            message : "로그인이 필요합니다.",
        }, {status : 401});
    }

    try {
        // 1. jwtVerify 함수를 사용하여 토큰을 검증합니다.
        const {id} = await params;
        // 2. 게시글을 찾습니다.
        const post  = await prisma.post.findUnique({where : {id}});

        if(!post) {
            return NextResponse.json({error : "게시글을 찾을 수 없습니다."}, {status : 404});
        }

        // 3. 게시글을 업데이트합니다.
        const {title, content} = await request.json();
        const updatedPost = await prisma.post.update({where : {id}, data : {title, content}});
        return NextResponse.json({...updatedPost, success : true}, {status : 200});
    } catch(error) {
        return NextResponse.json({error : "게시글 수정 실패", success : false}, {status : 500});
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if(!token) {
        return NextResponse.json({
            message : "로그인이 필요합니다.",
        }, {status : 401});
    }
    try {
        const {id} = await params;
        const post = await prisma.post.findUnique({where : {id}});

        if(!post) {
            return NextResponse.json({error : "게시글을 찾을 수 없습니다."}, {status : 404});
        }

        await prisma.post.delete({where : {id}});
        return NextResponse.json({success : true}, {status : 200});
    } catch(error) {
        return NextResponse.json({error : "게시글 삭제 실패", success : false}, {status : 500});
    }
}