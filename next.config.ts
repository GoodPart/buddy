import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images : {
    remotePatterns : [
      {
        protocol : "http",
        hostname : "localhost",
        port : "1337",
        pathname : "/**",
      },
    ],
    // Next.js 16+ : 로컬 IP/localhost 이미지 최적화 허용    dangerouslyAllowLocalIP: true,
  }
};

export default nextConfig;
