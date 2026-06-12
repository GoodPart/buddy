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

    let response: NextResponse;

    // 토큰 없음
    if(!token) {
        // 로그인/회원가입 페이지 허용
        if(isAuthPage) {
            response = NextResponse.next();
            response.headers.set(
                "Content-Security-Policy",
                "frame-ancestors 'self' http://localhost:1337"
            );
            return response;
        }

        // 보호 페이지는 로그인 페이지로
        if(isProtectedPage) {
            response = NextResponse.redirect(signinUrl(request, pathname));
            response.headers.set(
                "Content-Security-Policy",
                "frame-ancestors 'self' http://localhost:1337"
            );
            return response;
        }
        // 인증된 페이지 접근 허용
        response = NextResponse.next();
        response.headers.set(
            "Content-Security-Policy",
            "frame-ancestors 'self' http://localhost:1337"
        );
        return response;
    }

    // 토큰 있음
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        await jwtVerify(token, secret); // exp(만료) 포함

        // 로그인/회원가입 페이지는 메인 페이지로
        if(isAuthPage) {
            response = NextResponse.redirect(signinUrl(request, pathname));
            response.headers.set(
                "Content-Security-Policy",
                "frame-ancestors 'self' http://localhost:1337"
            );
            return response;
        }

        response = NextResponse.next();
        response.headers.set(
            "Content-Security-Policy",
            "frame-ancestors 'self' http://localhost:1337"
        );
        return response;
    } catch (error) {
        // 토큰 만료 또는 유효하지 않음
        // return NextResponse.redirect(new URL("/signin", request.url));
        const returnPath = isProtectedPage ? pathname : "/";
        response = NextResponse.redirect(signinUrl(request, returnPath));
        response.headers.set(
            "Content-Security-Policy",
            "frame-ancestors 'self' http://localhost:1337"
        );
        return response;
    }
}

export const config = {
    matcher : [
        "/about/:path*",
        "/signin",
        "/signup",
        "/mypage",
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ]
}
