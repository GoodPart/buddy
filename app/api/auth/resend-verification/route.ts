import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import { ca } from "zod/locales";

const OK_MESSAGE = "인증 메일을 발송했습니다.";

export async function POST(request : Request) {
    try {
        const { email } = await request.json();

        if(!email) {
            return NextResponse.json({ message: "이메일은 필수입니다." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        // 유저가 없음
        // 계정노출 여부 방지
        if(!user || user.emailVerified) {
            return NextResponse.json({ message: OK_MESSAGE }, { status: 200 });
        }

        // 이메일 인증 토큰 생성
        const {token, expires} = createVerificationToken();
        
        // 이메일 인증 토큰 업데이트
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerificationToken: token, emailVerificationExpires: expires },
        });

        const emailSent = await sendVerificationEmail(email, token); // 이메일 인증 토큰 전송
        if(!emailSent.success) {
            return NextResponse.json({ message: "이메일 인증 토큰 정송 실패", error : emailSent.message }, { status: 500 });
        }

        return NextResponse.json({ message: OK_MESSAGE }, { status: 200 });
        
    } catch (error) {
        return NextResponse.json({ message: "이메일 재전송 실패", error : (error as {message : string}).message }, { status: 500 });
    }
}