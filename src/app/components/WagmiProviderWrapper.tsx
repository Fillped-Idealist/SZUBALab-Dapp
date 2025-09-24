// app/components/WagmiProviderWrapper.tsx
'use client'; // 这里加客户端标记，不影响根布局

import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi'; // 导入 WagmiConfig
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../lib/wagmi-config'; // 导入 wagmi 配置

// 初始化 React Query 客户端（复用之前的逻辑）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 窗口聚焦不重复请求
      retry: 1, // 请求失败重试1次
      staleTime: 60 * 1000, // 数据1分钟内视为“新鲜”，不重复请求
    },
  },
});

// 接收 children，包裹上下文后传递下去
export default function WagmiProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        {children} {/* 所有子页面会继承 Wagmi 上下文 */}
      </WagmiProvider>
    </QueryClientProvider>
  );
}