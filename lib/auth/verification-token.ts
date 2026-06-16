import crypto from "crypto";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function createVerificationToken() {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TTL_MS);

    return {token, expires};
}