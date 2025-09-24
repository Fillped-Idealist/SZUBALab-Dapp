'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Connector } from 'wagmi';
import Link from 'next/link';
import { MEMBER_MANAGER_ADDRESS } from '../../lib/constants';
import MemberABI from '../../abis/MemberABI.json';
import { selectedChain } from '../../lib/wagmi-config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faCompass, faPlus, faBell, faUser, 
  faExclamationCircle, faSpinner, faArrowLeft, faCheck
} from '@fortawesome/free-solid-svg-icons';
import AuthGuard from '@/app/components/AuthGuard';

// 扩展Window类型，兼容钱包连接器
declare global {
  interface Window {
    connectors?: Connector[];
  }
}

// 有效ETH地址正则校验
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export default function AdminAddMemberPage() {
  // 核心状态：保留原有逻辑
  const [isClientReady, setIsClientReady] = useState(false);
  const [targetAddress, setTargetAddress] = useState(''); // 待添加的用户钱包地址
  const [memberName, setMemberName] = useState(''); // 会员名称
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // 当前用户是否为合约管理员
  const [errorMsg, setErrorMsg] = useState(''); // 错误提示
  const [successMsg, setSuccessMsg] = useState(''); // 成功提示
  const router = useRouter();

  // 钱包连接相关Hook：保留原有逻辑
  const { connect, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected, address, chainId } = useAccount();
  const isCorrectChain = chainId === selectedChain.id;

  // 1. 读取合约中的管理员地址：保留原有逻辑
  const { 
    data: contractAdmin, 
    isLoading: isLoadingAdmin, 
    isError: isAdminError,
    error: adminError
  } = useReadContract({
    address: MEMBER_MANAGER_ADDRESS,
    abi: MemberABI as readonly unknown[],
    functionName: 'admin',
    query: {
      enabled: isClientReady && isConnected && isCorrectChain,
    }
  });

  // 2. 调用合约的"添加会员"函数：保留原有逻辑
  const { 
    writeContract, 
    data: txHash, 
    isPending: isWriting 
  } = useWriteContract();

  // 3. 等待交易确认：保留原有逻辑
  const { 
    isLoading: isRegistering, 
    isSuccess: isRegisterSuccess, 
    isError: isRegisterError,
    error: registerError
  } = useWaitForTransactionReceipt({ 
    hash: txHash,
    query: {
      enabled: isClientReady && !!txHash
    }
  });

  // 客户端初始化：保留原有逻辑
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  // 验证当前用户是否为管理员：保留原有逻辑
  useEffect(() => {
    if (!isClientReady || !isConnected || !address || !contractAdmin) return;

    const currentAddrLower = address.toLowerCase();
    const adminAddrLower = (contractAdmin as `0x${string}`).toLowerCase();
    setIsAdmin(currentAddrLower === adminAddrLower);
  }, [isClientReady, isConnected, address, contractAdmin]);

  // 错误与成功状态监听：保留原有逻辑
  useEffect(() => {
    if (!isClientReady) return;

    if (!isConnected) {
      setErrorMsg('');
      setSuccessMsg('');
      return;
    }

    if (connectError) {
      setErrorMsg(`钱包连接失败：${(connectError as Error).message}`);
      setSuccessMsg('');
      return;
    }

    if (isAdminError) {
      setErrorMsg(`读取管理员信息失败：${(adminError as Error).message}`);
      setSuccessMsg('');
      return;
    }

    if (isRegisterError) {
      const errMsg = (registerError as Error).message;
      const revertReason = errMsg.includes("'") 
        ? errMsg.split("'")[1] 
        : "添加失败，请检查地址或重试";
      setErrorMsg(`添加会员失败：${revertReason}`);
      setSuccessMsg('');
      return;
    }

    if (isRegisterSuccess) {
      setSuccessMsg(`✅ 成功添加会员：${memberName || targetAddress.slice(0, 8)}...`);
      setErrorMsg('');
      setTargetAddress('');
      setMemberName('');
    }
  }, [
    isClientReady,
    isConnected, connectError, isAdminError, adminError,
    isRegisterError, registerError, isRegisterSuccess,
    targetAddress, memberName
  ]);

  // 事件处理函数：保留原有逻辑
  const handleConnectWallet = () => {
    if (!isClientReady) return;
    
    if (window.connectors && window.connectors.length > 0) {
      connect({ connector: window.connectors[0] });
      setErrorMsg('');
    } else {
      setErrorMsg('未检测到钱包连接器，请刷新页面或安装MetaMask');
    }
  };

  /** 提交添加会员表单：保留原有逻辑 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isClientReady) return;
    
    if (!isConnected) {
      setErrorMsg('请先点击"连接钱包"按钮');
      return;
    }
    if (!isCorrectChain) {
      setErrorMsg(`请切换到 ${selectedChain.name} 网络（当前链ID：${chainId || '未知'}）`);
      return;
    }
    if (isAdmin === false) {
      setErrorMsg('❌ 您不是合约管理员，无权限添加会员');
      return;
    }
    if (!ETH_ADDRESS_REGEX.test(targetAddress)) {
      setErrorMsg('请输入有效的ETH钱包地址（格式：0x开头，共42位字符）');
      return;
    }
    if (!memberName.trim()) {
      setErrorMsg('请输入会员名称（不能为空）');
      return;
    }
    if (memberName.length > 20) {
      setErrorMsg('会员名称长度不能超过20个字符');
      return;
    }
    if (targetAddress.toLowerCase() === address?.toLowerCase()) {
      setErrorMsg('无需添加自己（管理员默认具备会员权限）');
      return;
    }

    try {
      await writeContract({
        address: MEMBER_MANAGER_ADDRESS,
        abi: MemberABI as readonly unknown[],
        functionName: 'registerMember',
        args: [
          targetAddress as `0x${string}`,
          memberName.trim()
        ],
        gas: BigInt(300000),
      });
    } catch (err) {
      setErrorMsg(`交易发起失败：${(err as Error).message || '未知错误'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white">
      {/* 顶部导航栏（与其他页面完全一致） */}
      <header className="glass-effect border border-border fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" 
              style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <i className="fa fa-connectdevelop text-white text-xl relative z-10"></i>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r text-gradient pl-1">SZUBALab</h1>
          </div>
          <AuthGuard>
            {address && (
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border hover:bg-white/5 transition"
              >
                <FontAwesomeIcon icon={faUser} />
                <span className="text-sm">{address.slice(0, 6)}...{address.slice(-4)}</span>
              </Link>
            )}
          </AuthGuard>
        </div>
      </header>

      {/* 主内容区（统一宽度+避开导航） */}
      <main className="container mx-auto px-4 pt-16 pb-24 relative z-10 max-w-md">
        {/* 页面标题区域（玻璃态风格） */}
        <div className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-8 mt-5 bg-[#1A182E]/60 text-center">
          <h1 className="text-2xl font-bold text-[#EAE6F2] mb-2">管理员添加会员</h1>
          <p className="text-sm text-[#EAE6F2]/60 mb-2">仅合约部署者（管理员）可添加新用户为会员</p>
          <p className="text-xs text-[#EAE6F2]/40">添加后用户将获得发帖权限</p>
        </div>

        {/* 动态内容：客户端就绪后渲染 */}
        {isClientReady && (
          <>
            {/* 提示信息区域（玻璃态风格） */}
            {errorMsg && (
              <div className="glass-effect border border-red-800/30 bg-red-900/20 p-3 rounded-xl mb-6 text-sm text-red-400 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationCircle} className="text-xs" />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="glass-effect border border-green-800/30 bg-green-900/20 p-3 rounded-xl mb-6 text-sm text-green-400 flex items-center gap-1">
                <FontAwesomeIcon icon={faCheck} className="text-xs" />
                {successMsg}
              </div>
            )}

            {/* 钱包连接区域（玻璃态风格） */}
            <div className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-6 bg-[#1A182E]/60">
              <h3 className="text-sm font-medium text-[#EAE6F2]/80 mb-3 flex items-center gap-1">
                <FontAwesomeIcon icon={faUser} className="text-xs" />
                钱包状态
              </h3>
              {isConnected ? (
                <div className="flex items-center justify-between bg-green-900/20 p-3 rounded-lg">
                  <div>
                    <p className="text-sm text-green-400">已连接</p>
                    <p className="text-xs text-[#EAE6F2]/60 mt-1">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="text-xs text-red-400 hover:text-white hover:underline transition"
                  >
                    断开连接
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className={`w-full py-2 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    isConnecting
                      ? 'bg-purple-700/50 text-white/80'
                      : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:shadow-lg hover:shadow-purple-700/20'
                  }`}
                >
                  {isConnecting ? (
                    <span className="flex items-center justify-center gap-1">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      连接中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <FontAwesomeIcon icon={faPlus} className="text-sm" />
                      连接MetaMask钱包
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* 网络状态区域（玻璃态风格） */}
            {isConnected && (
              <div className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-6 bg-[#1A182E]/60">
                <h3 className="text-sm font-medium text-[#EAE6F2]/80 mb-3 flex items-center gap-1">
                  <FontAwesomeIcon icon={faCompass} className="text-xs" />
                  网络状态
                </h3>
                <div className={`p-3 rounded-lg text-sm ${
                  isCorrectChain 
                    ? 'bg-green-900/20 text-green-400 border border-green-800/30' 
                    : 'bg-yellow-900/20 text-yellow-400 border border-yellow-800/30'
                }`}>
                  <p>当前网络：{chainId ? `${selectedChain.name}（链ID：${chainId}）` : '未检测到网络'}</p>
                  {!isCorrectChain && (
                    <p className="text-xs mt-1 text-[#EAE6F2]/60">请在钱包中手动切换到目标网络</p>
                  )}
                </div>
              </div>
            )}

            {/* 管理员身份验证区域（玻璃态风格） */}
            {isConnected && isCorrectChain && (
              <div className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-6 bg-[#1A182E]/60">
                <h3 className="text-sm font-medium text-[#EAE6F2]/80 mb-3 flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  管理员身份验证
                </h3>
                {isLoadingAdmin ? (
                  <div className="bg-[#1A182E]/80 p-3 rounded-lg text-sm text-[#EAE6F2]/80 flex items-center gap-2">
                    <span className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-purple-500 rounded-full inline-block"></span>
                    正在验证管理员身份...
                  </div>
                ) : isAdmin === true ? (
                  <div className="bg-green-900/20 p-3 rounded-lg text-sm text-green-400 border border-green-800/30">
                    ✅ 验证通过，您是合约管理员
                  </div>
                ) : isAdmin === false ? (
                  <div className="bg-red-900/20 p-3 rounded-lg text-sm text-red-400 border border-red-800/30">
                    ❌ 验证失败，您不是合约管理员（仅部署者可操作）
                  </div>
                ) : null}
              </div>
            )}

            {/* 管理员操作表单（玻璃态风格） */}
            {isConnected && isCorrectChain && isAdmin === true && (
              <form onSubmit={handleSubmit} className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-6 bg-[#1A182E]/60 space-y-5">
                <h3 className="text-sm font-medium text-[#EAE6F2]/80 mb-2 flex items-center gap-1">
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  会员信息表单
                </h3>

                {/* 钱包地址输入框 */}
                <div>
                  <label className="block text-sm font-medium text-[#EAE6F2]/80 mb-1">
                    待添加会员的钱包地址
                  </label>
                  <input
                    type="text"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value.trim())}
                    placeholder="示例：0x1234567890abcdef1234567890abcdef12345678"
                    className={`w-full p-2 bg-[#1A182E]/80 border rounded-lg text-[#EAE6F2] focus:outline-none focus:ring-2 transition ${
                      errorMsg?.includes('地址') 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-600 focus:ring-purple-500'
                    }`}
                    disabled={isWriting || isRegistering}
                  />
                  <p className="text-xs text-[#EAE6F2]/40 mt-1">
                    提示：确保地址正确，添加后不可撤销
                  </p>
                </div>

                {/* 会员名称输入框 */}
                <div>
                  <label className="block text-sm font-medium text-[#EAE6F2]/80 mb-1">
                    会员名称
                  </label>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value.trim())}
                    placeholder="请输入会员显示名称（最多20个字符）"
                    maxLength={20}
                    className={`w-full p-2 bg-[#1A182E]/80 border rounded-lg text-[#EAE6F2] focus:outline-none focus:ring-2 transition ${
                      errorMsg?.includes('名称') 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-600 focus:ring-purple-500'
                    }`}
                    disabled={isWriting || isRegistering}
                  />
                  <p className="text-xs text-[#EAE6F2]/40 mt-1">
                    提示：该名称将显示在会员资料中，不可重复修改
                  </p>
                </div>

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={isWriting || isRegistering || !targetAddress || !memberName.trim()}
                  className={`w-full py-2.5 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    isWriting || isRegistering
                      ? 'bg-purple-700/50 text-white/80'
                      : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:shadow-lg hover:shadow-purple-700/20'
                  }`}
                >
                  {isWriting || isRegistering ? (
                    <span className="flex items-center justify-center gap-1">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      处理中...（请在钱包确认）
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <FontAwesomeIcon icon={faPlus} className="text-sm" />
                      确认添加会员
                    </span>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* 返回按钮区域（玻璃态风格） */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => router.push('/members')}
            className="inline-flex items-center gap-1 px-4 py-2 glass-effect border border-border text-[#EAE6F2] rounded-full hover:bg-white/5 transition text-sm"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            返回会员管理
          </button>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 px-4 py-2 glass-effect border border-border text-[#EAE6F2] rounded-full hover:bg-white/5 transition text-sm"
          >
            返回首页
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs fa-rotate-180" />
          </button>
        </div>
      </main>

      {/* 底部导航栏（与其他页面完全一致） */}
      <nav className="glass-effect border-t border-gray-700/30 fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-[#1A182E]/60">
        <div className="flex justify-around items-center py-3">
          <Link
            href="/"
            className="flex flex-col items-center text-purple-400 hover:text-white transition"
          >
            <FontAwesomeIcon icon={faHome} className="text-lg mb-1" />
            <span className="text-xs">首页</span>
          </Link>
          <Link
            href="/explore"
            className="flex flex-col items-center text-[#EAE6F2]/60 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faCompass} className="text-lg mb-1" />
            <span className="text-xs">发现</span>
          </Link>
          <Link
            href="/posts/create"
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full 
                  bg-gradient-to-r from-[#6B46C1] to-[#A05AD5]
                  -mt-8 shadow-lg shadow-[#6B46C1]/30"
          >
            <FontAwesomeIcon icon={faPlus} className="text-lg scale-110" />
          </Link>
          <Link
            href="/notifications"
            className="flex flex-col items-center text-[#EAE6F2]/60 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faBell} className="text-lg mb-1" />
            <span className="text-xs">通知</span>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center text-[#EAE6F2]/60 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faUser} className="text-lg mb-1" />
            <span className="text-xs">我的</span>
          </Link>
        </div>
      </nav>

      {/* 全局样式（与其他页面统一） */}
      <style>
        {`
          .glass-effect {
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          .border-border {
            border-color: rgba(255, 255, 255, 0.2);
          }
          .text-gradient {
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-image: linear-gradient(to right, #EAE6F2, #A05AD5);
          }
        `}
      </style>
    </div>
  );
}