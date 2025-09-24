import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import WagmiProviderWrapper from './components/WagmiProviderWrapper';
import './globals.css';
import DarkVeil from '../components/DarkVeil';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '深圳大学区块链协会论坛',
  description: '基于区块链的校园论坛',
};

// 定义明确的样式类型，避免any类型
const backgroundStyle = { 
  backgroundColor: '#0F172A',
  position: 'fixed' as const,  // 使用as const确保类型更精确
  inset: 0,
  zIndex: 0
};
const backgroundStyle2 = { 
  backgroundColor: '#020713ff',
  position: 'fixed' as const,  // 使用as const确保类型更精确
  inset: 0,
  zIndex: 0,
  top: '13rem',
  bottom: 0,
  borderRadius: '2rem',

  minHeight: 'calc(100vh - 13rem)', // 确保至少填满屏幕剩余高度
  height: 'auto', // 内容超过屏幕时，高度自动延长
};

const contentWrapperStyle = {
  position: 'relative' as const,
  zIndex: 10,
  minHeight: '100vh' // 确保内容区域至少占满屏幕高度
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        
        {/* 加这行：提前加载 Font Awesome 字体，解决图标方框 */}
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css" 
        />
        {/* 其他原有 meta/title 等 */}
      </head>
      <body className={inter.className}>
        {/* 背景层 - 修复样式类型问题 */}
        <div style={backgroundStyle}>
          {/* 如果需要启用DarkVeil，确保它已正确标记为客户端组件 */}
          <DarkVeil />
        </div>
        <div style={backgroundStyle2}>
          {/* 如果需要启用DarkVeil，确保它已正确标记为客户端组件 */}
        </div>
        
        {/* 内容层 - 修复z-index层级问题 */}
        <div style={contentWrapperStyle}>
          <WagmiProviderWrapper>
            {children}
          </WagmiProviderWrapper>
        </div>
      </body>
    </html>
  );
}
