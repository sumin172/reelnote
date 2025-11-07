import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 최적화 설정
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // 성능 최적화
  compress: true,

  // 실험적 기능 (안정성을 위해 제거)
  // experimental: {
  //   optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  // },

  // MSW는 환경 변수로 제어하므로 webpack 설정 불필요

  // 개발 환경 설정
  devIndicators: {
    position: "bottom-right",
  },

  // 보안 헤더
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // 환경 변수는 .env 파일에서 관리
};

export default nextConfig;
