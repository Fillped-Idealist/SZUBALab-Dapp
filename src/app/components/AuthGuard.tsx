'use client';

import { ReactNode, useEffect, useState } from 'react'; // 新增 useState
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { useReadContract } from 'wagmi';
import { metaMask } from 'wagmi/connectors';
import { MEMBER_MANAGER_ADDRESS, MemberABI } from '../lib/constants'; 
import { useChainId } from 'wagmi';
import { selectedChain } from '../lib/wagmi-config';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const isCorrectChain = chainId === selectedChain.id;
  const { connect, isPending: isConnecting } = useConnect({
    mutation: {
      onError: (error) => {
        console.error('连接钱包失败：', error);
        alert('连接钱包失败，请检查MetaMask是否正常安装');
      },
    },
  });
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain({
    mutation: {
      onError: (error) => {
        console.error('切换网络失败：', error);
        alert(`请手动在MetaMask中切换到 ${selectedChain.name} 网络`);
      },
    },
  });

  // 检查注册状态
  const { data: isRegistered, isLoading: isCheckLoading } = useReadContract({
    address: MEMBER_MANAGER_ADDRESS,
    abi: MemberABI,
    functionName: 'isRegistered',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && isCorrectChain,
    },
  });

  // 新增：标记客户端是否已初始化
  const [clientInitialized, setClientInitialized] = useState(false);
  useEffect(() => {
    // 客户端环境准备就绪后标记
    setClientInitialized(true);
  }, []);

  // 服务端渲染时，返回一个占位元素（与客户端初始状态匹配）
  if (!clientInitialized) {
    return (
      <div className="inline-block px-4 py-2 border rounded text-gray-600">
        加载中...
      </div>
    );
  }

  // 客户端初始化完成后，再执行原逻辑
  if (isCheckLoading) {
    return (
      <div className="inline-block px-4 py-2 border rounded text-gray-600">
        验证身份中...
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: metaMask() })}
        disabled={isConnecting}
        className="inline-flex items-center px-4 py-2.5 border border-purple-800/50 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 text-purple-200 rounded-lg hover:from-purple-800/50 hover:to-indigo-800/50 hover:shadow-lg hover:shadow-purple-900/20 transition-all duration-300 disabled:opacity-60 disabled:shadow-none"
      >
        {isConnecting ? '连接中...' : '连接钱包'}
      </button>
    );
  }

  if (!isCorrectChain) {
    return (
      <div className="inline-block px-4 py-2 border rounded text-gray-700">
        <p className="mb-2">请切换到正确的网络</p>
        <button
          onClick={() => switchChain({ chainId: selectedChain.id })}
          disabled={isSwitchingChain}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isSwitchingChain ? '切换中...' : `切换到 ${selectedChain.name}`}
        </button>
      </div>
    );
  }

  if (isRegistered === false) {
    return (
      <a
        href="/register"
        className="inline-block px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition"
      >
        未注册，请先注册
      </a>
    );
  }

  return <>{children}</>;
}