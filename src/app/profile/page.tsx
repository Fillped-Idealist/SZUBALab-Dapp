'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import Link from 'next/link';
import { formatTime, shortenAddress } from '../components/PostCard';
import { MEMBER_MANAGER_ADDRESS, MemberABI, LEVEL_NAMES, LEVEL_NAMES_EN } from '../lib/constants';
import { selectedChain } from '../lib/wagmi-config';
import ProfileCard from '../../components/ProfileCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faCompass, faPlus, faBell, faUser, 
  faExclamationCircle, faSpinner, faArrowLeft 
} from '@fortawesome/free-solid-svg-icons';
import AuthGuard from '@/app/components/AuthGuard';

// 扩展MemberInfo接口：保留原有结构
interface MemberInfo {
  isRegistered: boolean;
  postCount: number;
  level: string; // "1" | "2" | "3" | "4" | "5"
  joinTime: Date;
  name: string; // 用户自定义名称
}

export default function UserProfilePage() {
  // 状态管理：保留原有逻辑
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isClientReady, setIsClientReady] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [pageTitle, setPageTitle] = useState('个人主页'); // 水合兼容标题

  // 路由与钱包信息
  const router = useRouter();
  const params = useParams<{ address?: string }>();
  const { address: currentUserAddress, isConnected, chainId } = useAccount();

  // 确定目标地址
  const targetAddress = params.address 
    ? (params.address as `0x${string}`) 
    : (currentUserAddress as `0x${string}` | undefined);

  // 合约交互：保留原有逻辑
  const { writeContract } = useWriteContract();
  const { data: memberData, isError, error, refetch } = useReadContract({
    address: MEMBER_MANAGER_ADDRESS,
    abi: MemberABI as readonly unknown[],
    functionName: 'getMemberInfo',
    args: targetAddress ? [targetAddress] : [],
    chainId: selectedChain.id,
    query: {
      enabled: isClientReady && !!targetAddress && chainId === selectedChain.id,
    },
  });

  // 客户端就绪后更新标题
  useEffect(() => {
    if (isClientReady && targetAddress && currentUserAddress && memberInfo) {
      const isCurrentUser = targetAddress.toLowerCase() === currentUserAddress.toLowerCase();
      const finalTitle = isCurrentUser 
        ? '我的个人主页' 
        : `${memberInfo.name ? memberInfo.name : '用户'}的主页`;
      setPageTitle(finalTitle);
    }
  }, [isClientReady, targetAddress, currentUserAddress, memberInfo]);

  // 客户端就绪标记
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  // 解析合约数据：保留原有逻辑
  useEffect(() => {
    if (!isClientReady) return;
    setIsLoading(true);
    setErrorMsg('');

    if (!targetAddress) {
      setErrorMsg('请连接钱包或通过正确链接访问用户主页');
      setIsLoading(false);
      return;
    }

    if (chainId !== selectedChain.id) {
      setErrorMsg(`请切换到 ${selectedChain.name} 网络`);
      setIsLoading(false);
      return;
    }

    if (memberData && !isError) {
      try {
        const [isRegistered, postCount, level, joinTimeBigInt, name] = memberData as [
          boolean, bigint, string, bigint, string
        ];

        setMemberInfo({
          isRegistered,
          postCount: Number(postCount),
          level,
          joinTime: new Date(Number(joinTimeBigInt) * 1000),
          name: name || ''
        });
        setNewName(name || '');
      } catch (err) {
        setErrorMsg('解析用户数据失败，请重试');
        console.error('数据解析错误:', err);
      }
    }

    if (isError) {
      setErrorMsg(`获取用户信息失败：${(error as Error).message.slice(0, 100)}`);
    }

    setIsLoading(false);
  }, [isClientReady, targetAddress, memberData, isError, error, chainId]);

  // 提交名称修改：保留逻辑，优化按钮样式
  const handleSaveName = async () => {
    if (!targetAddress || !newName.trim() || newName.length > 20) return;
    setIsUpdatingName(true);

    try {
      await writeContract({
        address: MEMBER_MANAGER_ADDRESS,
        abi: MemberABI as readonly unknown[],
        functionName: 'setMemberName',
        args: [newName.trim()],
        chainId: selectedChain.id,
      });
      await refetch();
      setIsEditingName(false);
    } catch (err) {
      setErrorMsg(`名称修改失败：${(err as Error).message.slice(0, 60)}`);
      console.error('名称修改错误:', err);
    } finally {
      setIsUpdatingName(false);
    }
  };

  // 渲染等级徽章：适配深色风格
  const renderLevelBadge = (level: string) => {
    let badgeClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    let displayText = level;

    switch (level) {
      case '1':
        badgeClass += ' bg-gray-800 text-gray-300';
        displayText = '📌 等级1 ' + LEVEL_NAMES[0];
        break;
      case '2':
        badgeClass += ' bg-blue-900/50 text-blue-300';
        displayText = '🔥 等级2 ' + LEVEL_NAMES[1];
        break;
      case '3':
        badgeClass += ' bg-purple-900/50 text-purple-300';
        displayText = '✨ 等级3 ' + LEVEL_NAMES[2];
        break;
      case '4':
        badgeClass += ' bg-yellow-900/50 text-yellow-300';
        displayText = '🌟 等级4 ' + LEVEL_NAMES[3];
        break;
      case '5':
        badgeClass += ' bg-red-900/50 text-red-300';
        displayText = '👑 等级5 ' + LEVEL_NAMES[4];
        break;
      default:
        badgeClass += ' bg-gray-800 text-gray-300';
    }

    return <span className={badgeClass}>{displayText}</span>;
  };

  // 计算升级进度：保留原有逻辑
  const getLevelProgress = (postCount: number, level: string) => {
    let start = 0;
    let end = 5;

    switch (level) {
      case '1':
        start = 0;
        end = 5;
        break;
      case '2':
        start = 5;
        end = 10;
        break;
      case '3':
        start = 10;
        end = 20;
        break;
      case '4':
        start = 20;
        end = 30;
        break;
      case '5':
        return { progress: 100, text: '已达最高等级' };
    }

    const range = end - start;
    const current = Math.max(0, postCount - start);
    const progress = range > 0 ? (current / range) * 100 : 100;

    return {
      progress: Math.min(100, progress),
      text: `${current}/${range} 帖升级`,
    };
  };

  // 加载/错误/用户信息渲染：适配玻璃态风格
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="mb-6 glass-effect border border-gray-700/30 rounded-xl p-8 text-center bg-[#1A182E]/60">
          <div className="animate-spin h-10 w-10 border-4 border-gray-600 border-t-purple-500 rounded-full mx-auto mb-4"></div>
          <p className="text-[#EAE6F2]/80">加载用户信息中...</p>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className="mb-6 glass-effect border border-red-800/30 rounded-xl p-4 bg-red-900/20">
          <div className="flex items-center gap-2 text-[#EAE6F2]/80">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => router.refresh()}
            className="mt-3 inline-flex items-center text-sm text-purple-400 hover:underline"
          >
            点击重试
          </button>
        </div>
      );
    }

    if (memberInfo?.isRegistered === false) {
      return (
        <div className="mb-6 glass-effect border border-yellow-800/30 rounded-xl p-4 bg-yellow-900/20">
          <div className="flex items-center gap-2 text-[#EAE6F2]/80">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-yellow-400" />
            <span>该用户尚未注册为会员</span>
          </div>
          {/* 客户端就绪后渲染注册链接 */}
          {isClientReady && targetAddress === currentUserAddress && (
            <Link 
              href="/register" 
              className="mt-3 inline-flex items-center text-sm text-purple-400 hover:underline"
            >
              去注册 →
            </Link>
          )}
        </div>
      );
    }

    if (memberInfo) {
      return (
        <div className="space-y-6">
          {/* 🌟 保留ProfileCard，适配深色玻璃态风格 */}
          {isClientReady && (
            <div className="flex justify-center items-center min-h-[400px]">
              <ProfileCard
                name={memberInfo.name || shortenAddress(targetAddress as string)}
                title={LEVEL_NAMES_EN[1]}
                handle={memberInfo.name || shortenAddress(targetAddress as string)}
                status="Online"
                contactText="thumbs-up"
                avatarUrl="/23.png"
                showUserInfo={true}
                enableTilt={true}
                enableMobileTilt={false}
                onContactClick={() => console.log('Contact clicked')}
                // 适配深色背景的渐变
                behindGradient="linear-gradient(135deg, rgba(26,24,46,0.8) 0%, rgba(15,13,27,0.8) 100%)" 
                innerGradient=""
                miniAvatarUrl="/23.png"
              />
            </div>
          )}

          {/* 用户信息卡片：玻璃态重构 */}
          <div className="glass-effect border border-gray-700/30 rounded-xl p-6 bg-[#1A182E]/60">
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-4">
              {/* 头像区域 */}
              <div className="relative">
                <img
                  src="/24.webp"
                  alt="用户默认头像"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                />
              </div>

              {/* 用户名称与基本信息 */}
              <div className="flex-1 text-center sm:text-left">
                {isEditingName ? (
                  <div className="flex flex-col sm:flex-row gap-2 items-center justify-center sm:justify-start">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={20}
                      placeholder="输入名称（1-20字）"
                      className="flex-1 p-2 bg-[#1A182E]/80 border border-gray-600 rounded-lg text-[#EAE6F2] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isUpdatingName || !newName.trim()}
                      className="px-3 py-1 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg hover:shadow-green-600/20 disabled:opacity-50 text-sm"
                    >
                      {isUpdatingName ? (
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faSpinner} className="fa-spin text-xs" />
                          保存中...
                        </span>
                      ) : '保存'}
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      disabled={isUpdatingName}
                      className="px-3 py-1 glass-effect border border-border text-[#EAE6F2] rounded-lg hover:bg-white/5 disabled:opacity-50 text-sm"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-[#EAE6F2]">
                      {memberInfo.name ? memberInfo.name : shortenAddress(targetAddress as string)}
                    </h2>
                    {!memberInfo.name && (
                      <p className="text-xs text-[#EAE6F2]/60 mt-1">未设置名称，点击编辑可添加</p>
                    )}
                    <p className="text-sm text-[#EAE6F2]/80 mt-2">
                      钱包地址：{shortenAddress(targetAddress as string)}
                    </p>
                    {/* 客户端就绪后渲染时间 */}
                    {isClientReady && (
                      <p className="text-sm text-[#EAE6F2]/80 mt-1">
                        注册时间：{formatTime(memberInfo.joinTime)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* 等级徽章 */}
              {renderLevelBadge(memberInfo.level)}
            </div>

            {/* 编辑名称按钮 */}
            {isClientReady && targetAddress === currentUserAddress && !isEditingName && (
              <button
                onClick={() => setIsEditingName(true)}
                className="mt-2 text-sm text-purple-400 hover:underline"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="fa-rotate-270 inline-block mr-1" />
                编辑名称
              </button>
            )}

            {/* 统计卡片区域：玻璃态子卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {/* 发帖总数 */}
              <div className="glass-effect border border-gray-700/30 bg-[#1A182E]/80 rounded-lg p-4 text-center">
                <p className="text-sm text-[#EAE6F2]/60">发帖总数</p>
                <p className="text-2xl font-bold text-[#EAE6F2] mt-1">
                  {memberInfo.postCount}
                </p>
              </div>
              {/* 当前等级 */}
              <div className="glass-effect border border-gray-700/30 bg-[#1A182E]/80 rounded-lg p-4 text-center">
                <p className="text-sm text-[#EAE6F2]/60">当前等级</p>
                <p className="text-lg font-semibold text-[#EAE6F2] mt-1 capitalize">
                   {LEVEL_NAMES[Number(memberInfo.level)-1]}
                </p>
              </div>
              {/* 升级进度 */}
              <div className="glass-effect border border-gray-700/30 bg-[#1A182E]/80 rounded-lg p-4 text-center">
                <p className="text-sm text-[#EAE6F2]/60">升级进度</p>
                {memberInfo.level !== '5' && (
                  <>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2 mx-auto">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${getLevelProgress(memberInfo.postCount, memberInfo.level).progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-[#EAE6F2]/60 mt-1">
                      {getLevelProgress(memberInfo.postCount, memberInfo.level).text}
                    </p>
                  </>
                )}
                {memberInfo.level === '5' && (
                  <p className="text-xs text-[#EAE6F2]/60 mt-3">已达最高等级，恭喜！</p>
                )}
              </div>
              {/* 网络环境 */}
              <div className="glass-effect border border-gray-700/30 bg-[#1A182E]/80 rounded-lg p-4 text-center">
                <p className="text-sm text-[#EAE6F2]/60">网络环境</p>
                <p className="text-sm font-medium text-[#EAE6F2] mt-1">
                  {selectedChain.name}（链ID：{selectedChain.id}）
                </p>
              </div>
            </div>
          </div>

        </div>
      );
    }

    return null;
  };

  // 页面主渲染：统一布局+导航
  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white">
      {/* 顶部导航栏：与其他页面完全一致 */}
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
            {currentUserAddress && (
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border hover:bg-white/5 transition"
              >
                <FontAwesomeIcon icon={faUser} />
                <span className="text-sm">{shortenAddress(currentUserAddress)}</span>
              </Link>
            )}
          </AuthGuard>
        </div>
      </header>

      {/* 主内容区：统一宽度+避开导航 */}
      <main className="container mx-auto px-4 pt-16 pb-24 relative z-10 max-w-3xl">
        {/* 页面标题与返回按钮 */}
        <div className="flex items-center justify-between mb-8 mt-4">
          <h1 className="text-2xl font-bold text-[#EAE6F2]">
            {pageTitle}
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full glass-effect border border-border text-purple-400 hover:bg-white/5 hover:text-white transition text-sm"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            返回首页
          </Link>
        </div>

        {renderContent()}
      </main>

      {/* 底部导航栏：与其他页面完全一致 */}
      <nav className="glass-effect border-t border-gray-700/30 fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-[#1A182E]/60">
        <div className="flex justify-around items-center py-3">
          <Link
            href="/"
            className="flex flex-col items-center text-[#EAE6F2]/60 hover:text-purple-400 transition"
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
            className="flex flex-col items-center text-purple-400 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faUser} className="text-lg mb-1" />
            <span className="text-xs">我的</span>
          </Link>
        </div>
      </nav>

      {/* 全局样式：与其他页面统一 */}
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
          /* 确保ProfileCard在深色背景下不透明 */
          .profile-card {
            background-color: rgba(26,24,46,0.8) !important;
            border-color: rgba(255,255,255,0.1) !important;
          }
        `}
      </style>
    </div>
  );
}