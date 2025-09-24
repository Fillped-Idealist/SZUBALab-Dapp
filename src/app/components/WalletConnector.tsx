'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useReadContract } from 'wagmi';
import Link from 'next/link'; // 最小改动1: 导入Next.js的Link组件

// 修复1：导入正确的会员合约ABI（替代ForumABI）
import MemberABI from '../abis/MemberABI.json';
// 修复2：替换为实际存在的合约地址（POST_MANAGER_ADDRESS或MEMBER_MANAGER_ADDRESS）
import { MEMBER_MANAGER_ADDRESS } from '../lib/constants';

export default function WalletConnector() {
  const { isConnected, address, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  // 修复3：使用会员合约查询注册状态（匹配MemberManager合约的getMemberInfo方法）
  const { data: memberInfo } = useReadContract({
    address: MEMBER_MANAGER_ADDRESS, // 会员管理合约地址
    abi: MemberABI as readonly unknown[], // 会员合约ABI
    functionName: 'getMemberInfo', // 合约中查询会员信息的方法名
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address, // 只有address存在时才执行查询
    },
  });

  // 从会员信息中提取是否注册（按合约返回值顺序：[isRegistered, postCount, ...]）
  const isRegistered = Array.isArray(memberInfo) ? (memberInfo[0] as boolean) : false;

  // 处理连接钱包
  const handleConnect = () => {
    connect({ connector: connectors[0] });
  };

  // 处理断开连接
  const handleDisconnect = () => {
    disconnect();
    router.push('/');
  };

  // 显示地址缩写
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        {isPending ? '连接中...' : '连接钱包'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1 border rounded-md hover:bg-gray-100 transition"
      >
        <span>{formatAddress(address!)}</span>
        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
          {chain?.name || '未知网络'}
        </span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg py-1 z-50">
          {!isRegistered ? ( // 修复4：使用处理后的isRegistered状态
            // 最小改动2: 将 <a> 标签替换为 <Link> 组件
            <Link
              href="/register"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              未注册，点击注册
            </Link>
          ) : (
            // 最小改动3: 将 <a> 标签替换为 <Link> 组件
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              个人中心
            </Link>
          )}
          <button
            onClick={handleDisconnect}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            断开连接
          </button>
        </div>
      )}
    </div>
  );
}
