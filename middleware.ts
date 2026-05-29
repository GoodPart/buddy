import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// import jwt from "jsonwebtoken"; // edge runtime 에서 사용 불가
import {jwtVerify} from "jose";

const AUTH_PAGES = ["/signin", "/signup"];
const PROTECTED_PAGES = ["/about", "/mypage"];

// 헬퍼 (middleware.ts 상단에 추가)
function signinUrl(request: NextRequest, returnPath: string) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("next", returnPath);
    return url;
}

export async function middleware(request : NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("token")?.value;

    const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));
    const isProtectedPage = PROTECTED_PAGES.some((page) => pathname.startsWith(page));

    // 토큰 없음
    if(!token) {
        // 로그인/회원가입 페이지 허용
        if(isAuthPage) return NextResponse.next();

        // 보호 페이지는 로그인 페이지로
        if(isProtectedPage) return NextResponse.redirect(signinUrl(request, pathname));
        // if(isProtectedPage) return NextResponse.redirect(new URL("/signin", request.url));

        // 인증된 페이지 접근 허용
        return NextResponse.next()
    }

    // 토큰 있음
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        await jwtVerify(token, secret); // exp(만료) 포함

        // 로그인/회원가입 페이지는 메인 페이지로
        if(isAuthPage) {
            // return NextResponse.redirect(new URL("/", request.url));
            return NextResponse.redirect(signinUrl(request, pathname));
        }

        return NextResponse.next();
    } catch (error) {
        // 토큰 만료 또는 유효하지 않음
        // return NextResponse.redirect(new URL("/signin", request.url));
        const returnPath = isProtectedPage ? pathname : "/";
        return NextResponse.redirect(signinUrl(request, returnPath));
    }
}

export const config = {
    matcher : [
        "/about/:path*",
        "/signin",
        "/signup",
        "/mypage"
    ]
}
