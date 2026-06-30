export function getVWorldPublicApiKey(): string {
  const key =
    process.env.NEXT_PUBLIC_VWORLD_API_KEY ?? process.env.VWORLD_API_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_VWORLD_API_KEY (또는 VWORLD_API_KEY)가 설정되지 않았습니다."
    );
  }
  return key;
}

export function getVWorldPublicDomain(): string {
  return process.env.NEXT_PUBLIC_VWORLD_API_DOMAIN ?? "localhost";
}
