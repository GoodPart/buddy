import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const {id} = await params;

    const post = await prisma.post.findUnique({where : {id}});

    if(!post) {
        return NextResponse.json({error : "게시글을 찾을 수 없습니다."}, {status : 404});
    }
    return NextResponse.json(post);
}