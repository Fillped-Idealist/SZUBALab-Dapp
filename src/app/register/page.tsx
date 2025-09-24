'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useAccount, 
  useSwitchChain, 
  useConnect, 
  useDisconnect 
} from 'wagmi';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Connector } from 'wagmi';
import { MEMBER_MANAGER_ADDRESS } from '../lib/constants';
import MemberABI from '../abis/MemberABI.json';
import { selectedChain } from '../lib/wagmi-config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faCompass, faPlus, faBell, faUser, 
  faExclamationCircle, faSpinner, faCheck, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

// 扩展Window类型
declare global {
  interface Window {
    connectors?: Connector[];
  }
}

export default function RegisterPage() {
  // --- 所有状态和逻辑保持不变 ---
  const [errorMsg, setErrorMsg] = useState('');
  const [userName, setUserName] = useState('');
  const router = useRouter();
  
  const { connect, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected, address, chainId } = useAccount();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const isCorrectChain = chainId === selectedChain.id;

  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const { 
    isLoading: isRegistering, 
    isSuccess: isRegisterSuccess, 
    isError: isRegisterError,
    error: registerError
  } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (connectError) {
      setErrorMsg(`钱包连接失败：${(connectError as Error).message}`);
    }
  }, [connectError]);

  // --- 注册成功后的UI已更新 ---
  if (isRegisterSuccess) {
    return (
      <div className="min-h-screen bg-[#0F0D1B] text-white flex flex-col">
        {/* 顶部导航栏 */}
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
          </div>
        </header>

        {/* 主内容区 - 成功提示 */}
        <main className="flex-1 container mx-auto px-4 pt-24 pb-24 flex flex-col items-center justify-center">
          <div className="glass-effect border border-green-800/30 bg-green-900/20 rounded-xl p-8 text-center max-w-md w-full animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-900/40 flex items-center justify-center">
              <FontAwesomeIcon icon={faCheck} className="text-green-400 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-[#EAE6F2] mb-4">🎉 注册成功！</h2>
            <p className="text-[#EAE6F2]/80 mb-6">
              您已成功注册为会员，欢迎加入我们的社区！
            </p>
            <p className="text-xs text-[#EAE6F2]/60 mb-8">
              您的会员名称：<span className="text-green-400">{userName}</span>
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
              >
                返回首页
              </button>
              <Link
                href="/profile"
                className="px-6 py-2.5 glass-effect border border-border text-[#EAE6F2] rounded-full hover:bg-white/5 transition"
              >
                查看我的资料
              </Link>
            </div>
          </div>
        </main>

        {/* 底部导航栏 */}
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

        {/* 全局样式 */}
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
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
              animation: fadeInUp 0.5s ease-out forwards;
            }
          `}
        </style>
      </div>
    );
  }

  // --- 所有处理函数保持不变 ---
  const handleSwitchChain = async () => {
    if (!selectedChain.id) return;
    try {
      await switchChain({ chainId: selectedChain.id });
    } catch (err) {
      setErrorMsg(`切换链失败：${(err as Error).message || '请手动在钱包中切换'}`);
    }
  };

  const handleConnectWallet = () => {
    if (window.connectors && window.connectors.length > 0) {
      connect({ connector: window.connectors[0] });
    } else {
      setErrorMsg('未检测到钱包连接器，请刷新页面重试');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!userName.trim()) {
      setErrorMsg('请输入您的名称');
      return;
    }
    if (userName.length > 20) {
      setErrorMsg('名称长度不能超过20个字符');
      return;
    }

    if (!isConnected) {
      setErrorMsg('请先点击"连接钱包"按钮');
      return;
    }
    if (!address) {
      setErrorMsg('无法获取钱包地址，请重新连接');
      return;
    }
    if (!isCorrectChain || !chainId) {
      setErrorMsg(`请先切换到 ${selectedChain.name} 网络`);
      return;
    }

    try {
      await writeContract({
        address: MEMBER_MANAGER_ADDRESS,
        abi: MemberABI as readonly unknown[],
        functionName: 'registerMember',
        args: [address as `0x${string}`, userName.trim()],
        gas: BigInt(200000),
      });
    } catch (err) {
      setErrorMsg(`注册失败：${(err as Error).message || '未知错误'}`);
    }
  };

  // --- 页面UI已全面改造 ---
  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white flex flex-col">
      {/* 1. 顶部导航栏 (与其他页面统一) */}
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
        </div>
      </header>

      {/* 2. 主内容区 (玻璃态卡片布局) */}
      <main className="flex-1 container mx-auto px-4 pt-24 pb-24">
        <div className="max-w-md mx-auto">
          {/* 页面标题卡片 */}
          <div className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-8 bg-[#1A182E]/60 text-center">
            <h1 className="text-2xl font-bold text-[#EAE6F2] mb-2">会员注册</h1>
            <p className="text-sm text-[#EAE6F2]/60">
              完成注册后，您将获得社区发帖和互动的全部权限
            </p>
          </div>

          {/* 错误提示 (玻璃态) */}
          {errorMsg && (
            <div className="glass-effect border border-red-800/30 bg-red-900/20 p-3 rounded-xl mb-6 text-sm text-red-400 flex items-center gap-1 animate-fade-in-up">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-xs" />
              {errorMsg}
            </div>
          )}

          {/* 钱包连接卡片 (玻璃态) */}
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
                className={`w-full py-2 rounded-full transition disabled:opacity-50 ${
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
                    <FontAwesomeIcon icon={faUser} className="text-sm" />
                    连接MetaMask钱包
                  </span>
                )}
              </button>
            )}
          </div>

          {/* 网络状态卡片 (玻璃态) */}
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
              <p>当前：{chainId ? `${selectedChain.name} (链ID: ${chainId})` : '未检测到网络'}</p>
              {isConnected && !isCorrectChain && chainId && (
                <button
                  onClick={handleSwitchChain}
                  disabled={isSwitchingChain}
                  className="mt-2 px-3 py-1 bg-gradient-to-r from-purple-700 to-indigo-700 text-white text-xs rounded-full hover:shadow hover:shadow-purple-700/20 transition"
                >
                  {isSwitchingChain ? (
                    <span className="flex items-center justify-center gap-1">
                      <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                      切换中...
                    </span>
                  ) : (
                    `切换到 ${selectedChain.name}`
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 注册表单卡片 (玻璃态) */}
          {isConnected && isCorrectChain && address && (
            <form onSubmit={handleRegister} className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-6 bg-[#1A182E]/60 space-y-5 animate-fade-in-up">
              <h3 className="text-sm font-medium text-[#EAE6F2]/80 mb-2 flex items-center gap-1">
                <FontAwesomeIcon icon={faUser} className="text-xs" />
                设置您的会员信息
              </h3>

              <div>
                <label className="block text-sm font-medium text-[#EAE6F2]/80 mb-1">
                  请设置您的名称
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  maxLength={20}
                  placeholder="最多20个字符"
                  className={`w-full px-3 py-2 bg-[#1A182E]/80 border rounded-lg text-[#EAE6F2] focus:outline-none focus:ring-2 transition ${
                    errorMsg?.includes('名称') 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:ring-purple-500'
                  }`}
                />
                <p className="text-xs text-[#EAE6F2]/40 mt-1">
                  该名称将显示在您的个人主页和帖子中
                </p>
              </div>

              <button
                type="submit"
                disabled={isRegistering || isWriting || !userName.trim()}
                className={`w-full py-2.5 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRegistering || isWriting
                    ? 'bg-purple-700/50 text-white/80'
                    : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:shadow-lg hover:shadow-purple-700/20'
                }`}
              >
                {isRegistering || isWriting ? (
                  <span className="flex items-center justify-center gap-1">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    注册中...（请在钱包确认）
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <FontAwesomeIcon icon={faCheck} className="text-sm" />
                    确认注册（免费，需钱包签名）
                  </span>
                )}
              </button>
            </form>
          )}

          {/* 返回链接 */}
          <div className="text-center mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-[#EAE6F2]/60 hover:text-purple-400 transition hover:underline"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
              返回首页
            </Link>
          </div>
        </div>
      </main>

      {/* 3. 底部导航栏 (与其他页面统一) */}
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

      {/* 4. 全局样式 (与其他页面统一) */}
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
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.3s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
}