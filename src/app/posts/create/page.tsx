'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { ChangeEvent } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faCompass, faPlus, faBell, faUser, 
  faExclamationCircle, faSpinner, faCheckCircle, faSignOut 
} from '@fortawesome/free-solid-svg-icons';
import { POST_MANAGER_ADDRESS, PostABI, MEMBER_MANAGER_ADDRESS, MemberABI } from '../../lib/constants';
import { useCheckIsMember } from '../../lib/memberContract';
import AuthGuard from '@/app/components/AuthGuard';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function CreatePostPage() {
  // 核心状态：客户端就绪、表单、交易状态
  const [isClientReady, setIsClientReady] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSuccessWaiting, setIsSuccessWaiting] = useState(false);
  
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isMember, isLoading: isMemberLoading, isError: isMemberError } = useCheckIsMember(
    isClientReady ? address : undefined
  );

  // 合约交互与交易等待
  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isPosting, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: isClientReady && !!txHash }
  });

  // 表单校验
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const titleCharCount = trimmedTitle.length;
  const contentCharCount = trimmedContent.length;
  const isTitleValid = titleCharCount >= 1 && titleCharCount <= 20;
  const isContentValid = contentCharCount >= 1 && contentCharCount <= 500;
  const isFormValid = isTitleValid && isContentValid;

  // 授权合约读取
  const { data: authorizedPostAddr, isLoading: isAuthLoading } = useReadContract({
    address: MEMBER_MANAGER_ADDRESS,
    abi: MemberABI,
    functionName: 'authorizedPostContract',
    query: { enabled: isClientReady }
  });

  // 按钮禁用逻辑
  const getDisabledState = () => {
    if (!isClientReady || isWriting || isPosting || isSuccessWaiting || !isConnected || !isFormValid) {
      return { disabled: true, reason: '基础条件未满足' };
    }
    if (isMemberLoading) return { disabled: true, reason: 'member_loading' };
    if (isMemberError) return { disabled: true, reason: 'member_error' };
    if (isMember === false) return { disabled: true, reason: 'not_member' };
    return { disabled: false, reason: 'ok' };
  };

  const { disabled: isDisabled, reason } = getDisabledState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled || !isClientReady) return;

    try {
      await writeContract({
        address: POST_MANAGER_ADDRESS,
        abi: PostABI as readonly unknown[],
        functionName: 'createPost',
        args: [trimmedTitle, trimmedContent],
        gas: BigInt(2000000),
      });
    } catch (err: unknown) {
      let errorMsg = '发帖失败';
      if (err instanceof Error) {
        if (err.message.includes('reverted with reason string')) {
          const reason = err.message.split("'")[1];
          errorMsg = `合约拒绝：${reason || '未知原因'}`;
        } else if (err.message.includes('insufficient funds')) {
          errorMsg = '账户余额不足（gas费用不够）';
        } else {
          errorMsg = `错误详情：${err.message}`;
        }
      }
      alert(errorMsg);
      console.error('提交错误:', err);
    }
  };

  // 交易成功后跳转
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isClientReady && isSuccess) {
      setIsSuccessWaiting(true);
      timer = setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [isClientReady, isSuccess, router]);

  // 客户端初始化
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  // 会员验证失败页面
  if (isClientReady && isMemberError) {
    return (
      <div className="min-h-screen bg-[#0F0D1B] flex items-center justify-center">
        <div className="glass-effect border border-gray-700/30 rounded-xl p-6 text-center max-w-md w-full">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400 text-3xl mb-4" />
          <h2 className="text-xl font-bold text-[#EAE6F2] mb-2">会员身份验证失败</h2>
          <p className="text-gray-300 mb-6">请刷新页面重试</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white">
      {/* 顶部导航栏（深灰玻璃态 + 亮紫标题） */}
      {/* 玻璃态顶部导航（和之前一致） */}
      <header className="glass-effect border border-border fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" 
              style={{ 
                // backgroundImage: 'url(/24.webp)', // 关键：路径以 / 开头，指向 public/24.webp
                backgroundSize: 'cover', // 让图片覆盖容器
                backgroundPosition: 'center' // 图片居中
              }}
            >
              <i className="fa fa-connectdevelop text-white text-xl relative z-10"></i>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r text-gradient pl-1">SZUBALab</h1>
          </div>
          <AuthGuard>
            {isClientReady && address && (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border hover:bg-white/5 transition"
            >
              <i className="fa fa-user"></i>
              <span className="text-sm">{address.slice(0, 8)}...</span>
            </Link>
            )}
          </AuthGuard>
        </div>
      </header>

      {/* 主内容区（深灰玻璃态容器 + 分层提示） */}
      <main className="container mx-auto px-4 pt-16 pb-24 relative z-10">
        <button
            onClick={() => router.back()}
            className="mb-6 mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border text-purple-400 hover:bg-white/5 hover:text-white transition"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          <span>返回</span>
        </button>
        <div className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-8 bg-[#1A182E]/60">
          <h1 className="text-xl font-bold text-[#EAE6F2] mb-6">发布新帖子</h1>

          {isClientReady && (
            <>
              {/* 授权状态提示（浅紫半透） */}
              {isAuthLoading && (
                <div className="mb-4 p-3 bg-purple-900/20 text-purple-300 rounded flex items-center border border-purple-800/30">
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" />
                  检查合约授权状态中...
                </div>
              )}
              {/* 授权错误提示（深红半透） */}
              {!isAuthLoading && authorizedPostAddr !== POST_MANAGER_ADDRESS && (
                <div className="mb-4 p-3 bg-red-900/20 text-red-300 rounded font-bold flex items-center border border-red-800/30">
                  <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
                  ⚠️ 帖子合约未被授权！请联系管理员执行授权操作
                </div>
              )}

              {/* 交易状态提示（加载黄/成功绿） */}
              {isWriting && (
                <div className="mb-4 p-3 bg-yellow-900/20 text-yellow-300 rounded flex items-center border border-yellow-800/30">
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" />
                  准备交易...
                </div>
              )}
              {isPosting && (
                <div className="mb-4 p-3 bg-yellow-900/20 text-yellow-300 rounded flex items-center border border-yellow-800/30">
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" />
                  交易处理中...请在钱包确认
                </div>
              )}
              {isSuccess && (
                <div className="mb-4 p-3 bg-green-900/20 text-green-300 rounded flex items-center border border-green-800/30">
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                  帖子发布成功！即将返回首页...
                </div>
              )}
              {isError && (
                <div className="mb-4 p-3 bg-red-900/20 text-red-300 rounded flex items-center border border-red-800/30">
                  <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
                  发布失败: {(error as Error)?.message || '未知错误'}
                </div>
              )}

              {/* 禁用原因提示（深紫半透 + 米白文字） */}
              {isDisabled && reason !== 'ok' && (
                <div className="mb-4 p-3 bg-purple-900/20 text-[#EAE6F2]/80 rounded text-sm border border-purple-800/30">
                  发布按钮暂时不可用：
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {isSuccessWaiting && <li>帖子已发布成功，正在跳转首页...</li>}
                    {reason === 'member_loading' && <li>正在验证您的会员身份...</li>}
                    {reason === 'member_error' && <li>会员验证失败，请刷新重试</li>}
                    {reason === 'not_member' && <li>您不是会员，请先<Link href="/register" className="text-purple-400 underline">注册</Link></li>}
                    {!isConnected && <li>请先连接钱包</li>}
                    {!isTitleValid && <li>请输入1-20个字符的标题（当前{titleCharCount}个）</li>}
                    {!isContentValid && <li>请输入1-500个字符的内容（当前{contentCharCount}个）</li>}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 标题输入框（深灰底 + 米白边框 + 亮紫聚焦） */}
                <div>
                  <label className="block mb-2 font-medium text-[#EAE6F2]">帖子标题</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    className={`w-full p-3 bg-[#1A182E] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                      isTitleValid ? 'border-gray-600 focus:ring-purple-500' : 'border-red-500 focus:ring-red-400'
                    }`}
                    placeholder="请输入帖子标题（1-20字符）"
                    disabled={isWriting || isPosting || isSuccessWaiting || isMemberLoading}
                    maxLength={20}
                  />
                  <p className={`text-right text-sm mt-1 ${isTitleValid ? 'text-gray-400' : 'text-red-400'}`}>
                    标题字符数: {titleCharCount}/20
                  </p>
                </div>

                {/* 内容输入框（深灰底 + 米白边框 + 亮紫聚焦） */}
                <div>
                  <label className="block mb-2 font-medium text-[#EAE6F2]">帖子内容</label>
                  <textarea
                    value={content}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                    className={`w-full p-3 bg-[#1A182E] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                      isContentValid ? 'border-gray-600 focus:ring-purple-500' : 'border-red-500 focus:ring-red-400'
                    }`}
                    placeholder="请输入帖子内容（1-500字符）"
                    rows={6}
                    disabled={isWriting || isPosting || isSuccessWaiting || isMemberLoading}
                    maxLength={500}
                  />
                  <p className={`text-right text-sm mt-1 ${isContentValid ? 'text-gray-400' : 'text-red-400'}`}>
                    内容字符数: {contentCharCount}/500
                  </p>
                </div>

                {/* 发布按钮（紫渐变 + 亮紫hover阴影） */}
                <button
                  type="submit"
                  disabled={isDisabled}
                  className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-lg hover:bg-gradient-to-r from-purple-800 to-indigo-800 hover:shadow-lg hover:shadow-purple-700/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSuccessWaiting 
                    ? '发布成功，跳转中...' 
                    : isWriting || isPosting 
                      ? '发布中...' 
                      : isMemberLoading 
                        ? '验证会员中...' 
                        : '发布帖子'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {/* 底部导航（深灰玻璃态 + 亮紫选中） */}
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
            className="flex flex-col items-center text-gray-400 hover:text-purple-400 transition"
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
              <i className="fa fa-plus text-lg scale-110"></i>
            </Link>
          <Link
            href="/notifications"
            className="flex flex-col items-center text-gray-400 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faBell} className="text-lg mb-1" />
            <span className="text-xs">通知</span>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center text-gray-400 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faUser} className="text-lg mb-1" />
            <span className="text-xs">我的</span>
          </Link>
        </div>
      </nav>

      {/* 全局样式（玻璃态、中性色边框） */}
      <style>
        {`
          .glass-effect {
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          .border-border {
            border-color: rgba(255, 255, 255, 0.2);
          }
        `}
      </style>
    </div>
  );
}