import nodemailer from "nodemailer";

type SendResult = {
    success : boolean;
    message : string;
    email : string;
    token : string;
}

export async function sendVerificationEmail(email: string, token: string): Promise<SendResult> {
    const link = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? "localhost",
        port: Number(process.env.SMTP_PORT ?? 1025),
        secure: false, // Mailpit은 1025, TLS 없음
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });

      try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM ?? "Buddy <noreply@buddy.com>",
            to: email,
            subject: "[Buddy] 이메일 인증을 완료해 주세요",
            text: `아래 링크를 클릭해 이메일 인증을 완료해 주세요.\n\n${link}\n\n24시간 내에 유효합니다.`,
            html: `
                <p>아래 버튼을 클릭해 이메일 인증을 완료해 주세요.</p>
                <p><a href="${link}">이메일 인증하기</a></p>
                <p>링크는 24시간 동안 유효합니다.</p>
            `,
        });
        return {
            success : true,
            message : "이메일 인증 토큰 전송 성공",
            email,
            token
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "이메일 전송 실패";
        return {
            success : false,
            message,
            email,
            token
        }
    }
}