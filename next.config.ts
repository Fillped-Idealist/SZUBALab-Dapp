// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = 'source-map';
    }
    return config;
  },
  // 用 as any 断言，绕过类型检查
  experimental: {
    turbopack: {
      enabled: false,
      warnings: false,
    },
  } as any, // 关键：将 experimental 断言为 any，避免类型报错
  reactStrictMode: true,
  
  // 👇 添加或修改 images 配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        // 你可以根据需要添加 port 和 pathname
        // port: '',
        // pathname: '/account123/**',
      },
    ],
  },
};

export default nextConfig;