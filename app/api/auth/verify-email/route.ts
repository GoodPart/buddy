// 이메일 링크 클릭용 GET API
import { NextResponse } from "next/server";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";

function signinRedirect(query : string) {
    redirect(`/signin?${query}`);
}

export async function GET(request : Request) {
    const token = new URL(request.url).searchParams.get("token");

    if(!token) {
        signinRedirect("error=missing");
    }

    const user = await prisma.user.findUnique({
        where : {
            emailVerificationToken : token!,
        },
    });

    // 이메일 인증 토큰 만료
    if(!user) {
        signinRedirect("error=invalid");
    }

    // 이미 이메일 인증된 경우
    if (user!.emailVerified) {
        signinRedirect("verified=already");
    }

    // 이메일 인증 토큰 만료
    if(user!.emailVerificationExpires && user!.emailVerificationExpires < new Date()) {
        return signinRedirect(`error=expired`);
    }

    await prisma.user.update({
        where: { id: user!.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
    });

    signinRedirect("verified=1");
}