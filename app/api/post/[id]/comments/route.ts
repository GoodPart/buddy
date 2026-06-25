import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const {id} = await params;
    const post = await prisma.post.findUnique({where : {id}});
    const author = await prisma.user.findUnique({
        where: { id: post?.authorId },
    });
    const comments = await prisma.postComment.findMany({
        where: {
            postId: id,
        },
    });
    const commentsWithAuthor = await Promise.all(comments.map(async (comment) => {
        const author = await prisma.user.findUnique({
            where: { id: comment.authorId },
        });
        return { ...comment, author };
    }));

    return NextResponse.json(commentsWithAuthor);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if(!token) {
        return NextResponse.json({
            message: "로그인이 필요합니다.",
        }, {status: 401});
    }
    try {
        const {payload} = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        const userId = payload.userId as string;

        const {id} = await params;
        const body = await request.json();

        const comment = await prisma.postComment.create({
            data: {
                content: body.content,
                postId: id,
                authorId: userId,
                parentId: body.parentId || null,
            },
        });

        return NextResponse.json({
            comment: comment,
            message: "댓글이 생성되었습니다.",
        }, {status: 201});
    } catch {
        return NextResponse.json({
            message: "댓글 생성 실패",
            error: "댓글 생성 실패",
        }, {status: 500});
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const body = await request.json();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if(!token) {
        return NextResponse.json({
            message: "로그인이 필요합니다.",
        }, {status: 401});
    }
    try {
        const commentId = body.id;
        const comment = await prisma.postComment.delete({
            where: {
                id: commentId
            },
        });
        if(!comment) {
            return NextResponse.json({
                message: "댓글을 찾을 수 없습니다.",
            }, {status: 404});
        }
        return NextResponse.json({
            message: "댓글이 삭제되었습니다.",
        }, {status: 200});
    } catch {
        return NextResponse.json({
            message: "댓글 삭제 실패",
        }, {status: 500});
    }
}