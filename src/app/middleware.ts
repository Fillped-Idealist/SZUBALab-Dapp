// app/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 生产环境配置严格 CSP，禁止 eval
  const cspHeader = `
    default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net; # 仅允许自身和可信 CDN 的脚本
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; # 允许 inline 样式（按需）
    img-src 'self' data:; # 允许自身和 data URL 图片
    font-src 'self' https://fonts.gstatic.com; # 允许字体加载
    connect-src 'self' https://rpc-amoy.polygon.technology; # 允许区块链 RPC 连接
    object-src 'none'; # 禁止 object 标签
    base-uri 'self';
    form-action 'self';
  `.replace(/\s+/g, ' '); // 去除多余空格

  // 设置 CSP 响应头（优先用 Content-Security-Policy，兼容 X-Content-Security-Policy）
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Security-Policy', cspHeader); // 兼容旧浏览器

  return response;
}

// 对所有页面生效
export const config = {
  matcher: ['/:path*'],
};