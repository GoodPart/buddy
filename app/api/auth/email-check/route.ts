import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request : Request) {
    try {
        const body = await request.json();
        const {email} = body;
        if(!email) {
            return NextResponse.json({ success : false, message: "이메일은 필수입니다." }, { status: 400 });
        }
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if(user) {
            return NextResponse.json({ success : false, message: "이미 존재하는 이메일입니다." }, { status: 409 });
        }

        return NextResponse.json({ success : true, message: "사용 가능한 이메일입니다." }, { status: 200 });
    } catch(error) {
        return NextResponse.json({ success : false, message: "서버 오류 발생", error: error }, { status: 500 });
    }
}