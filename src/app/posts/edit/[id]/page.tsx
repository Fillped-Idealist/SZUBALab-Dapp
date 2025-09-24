'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { Post } from '@/app/types';
import { POST_MANAGER_ADDRESS, PostABI } from '@/app/lib/constants';
import { formatTime, formatAddress } from '@/app/components/PostCard';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faCompass, faPlus, faBell, faUser, 
  faExclamationCircle, faSpinner, faArrowLeft, faCheckCircle 
} from '@fortawesome/free-solid-svg-icons';
import AuthGuard from '@/app/components/AuthGuard';

// 解决ABI类型问题：强制转换为unknown再转为数组
const safeAbi = PostABI as unknown as readonly unknown[];

// 定义合约函数参数类型
type GetPostByIdArgs = [bigint];
type UpdatePostArgs = [bigint, string, string]; // postId, newTitle, newContent


export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const { address: currentAddress, isConnected } = useAccount();
  const postIdStr = params.id as string;
  const postId = BigInt(postIdStr); // 合约中postId为uint256，用BigInt处理
  const [isValidId, setIsValidId] = useState(true);

  // 表单状态
  const [form, setForm] = useState({
    title: '',
    content: '',
    originalTitle: '', // 存储原始标题，用于对比是否修改
    originalContent: '' // 存储原始内容
  });

  // 状态管理
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false); // 是否为帖子作者

  // 1. 加载原始帖子数据（用于表单初始化和权限验证）
  const {
    data: postData,
    isLoading: isLoadingPost,
    isError: isPostError,
    error: postError
  } = useReadContract({
    address: POST_MANAGER_ADDRESS,
    abi: safeAbi,
    functionName: 'getPostById' as const,
    args: [postId] as GetPostByIdArgs,
    query: { enabled: isValidId }// 仅当ID有效时加载
  });

  // 2. 编辑帖子：调用合约updatePost函数
  const { writeContract, data: updateTxHash, isPending: isUpdatePending } = useWriteContract();
  const {
    isLoading: isWaitingUpdateTx,
    isSuccess: isUpdateSuccess,
    isError: isUpdateTxError,
    error: updateTxError
  } = useWaitForTransactionReceipt({
    hash: updateTxHash,
    query: { enabled: !!updateTxHash }
  });

  // 初始化：验证ID有效性 + 填充表单 + 验证作者权限
  useEffect(() => {
    // 验证ID有效性
    if (isNaN(Number(postIdStr)) || Number(postIdStr) < 1) {
      setIsValidId(false);
      return;
    }

    // 加载帖子数据后填充表单
    if (!isLoadingPost && !isPostError && postData && Array.isArray(postData) && postData.length === 6) {
      const [_id, author, title, content, createTime] = postData;
      const post: Post = {
        id: Number(_id),
        author: String(author),
        title: String(title),
        content: String(content),
        timestamp: new Date(Number(createTime) * 1000)
      };

      // 填充表单（存储原始值用于对比）
      setForm({
        title: post.title,
        content: post.content,
        originalTitle: post.title,
        originalContent: post.content
      });

      // 验证作者权限（当前连接地址 === 帖子作者）
      if (currentAddress) {
        setIsAuthor(currentAddress.toLowerCase() === post.author.toLowerCase());
      } else {
        setIsAuthor(false);
      }
    }
  }, [postIdStr, postData, isLoadingPost, isPostError, currentAddress]);

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // 输入时清空错误提示
    if (error) setError(null);
  };

  // 提交编辑（调用合约）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // 基础校验
    if (!isConnected || !currentAddress) {
      setError('请先连接钱包');
      setIsSubmitting(false);
      return;
    }
    if (!isAuthor) {
      setError('您不是帖子作者，无编辑权限');
      setIsSubmitting(false);
      return;
    }
    const trimmedTitle = form.title.trim();
    const trimmedContent = form.content.trim();
    if (trimmedTitle === '' || trimmedContent === '') {
      setError('标题和内容不能为空');
      setIsSubmitting(false);
      return;
    }
    if (trimmedTitle === form.originalTitle && trimmedContent === form.originalContent) {
      setError('未修改任何内容');
      setIsSubmitting(false);
      return;
    }

    try {
      // 调用合约更新帖子
      await writeContract({
        address: POST_MANAGER_ADDRESS,
        abi: safeAbi,
        functionName: 'editPost' as const, // 需确保合约中有editPost函数
        args: [postId, trimmedTitle, trimmedContent] as UpdatePostArgs,
        gas: BigInt(3000000) // 足够的gas，避免执行失败
      });
    } catch (err: unknown) {
      setIsSubmitting(false);
      const errMsg = err instanceof Error 
        ? err.message.includes('user rejected') 
          ? '您已拒绝交易，请重新尝试' 
          : `提交失败：${err.message.slice(0, 60)}...`
        : '提交失败，请重试';
      setError(errMsg);
    }
  };

  // 监听编辑交易结果
  useEffect(() => {
    if (isWaitingUpdateTx) {
      setIsSubmitting(true);
      return;
    }

    if (isUpdateSuccess) {
      setIsSubmitting(false);
      setSuccess(true);
      // 跳转到首页（与需求一致）
      const timer = setTimeout(() => {
        router.push('/'); // 跳主页
        router.refresh(); // 刷新主页确保数据最新
      }, 1500);
      return () => clearTimeout(timer);
    }

    // 交易错误处理
    if (isUpdateTxError && updateTxError && !success) {
      setIsSubmitting(false);
      setError(`交易失败：${(updateTxError as Error).message.slice(0, 60)}...`);
    }
  }, [isWaitingUpdateTx, isUpdateSuccess, isUpdateTxError, updateTxHash, updateTxError, router, success]);

  // 无效ID处理（统一玻璃态风格）
  if (!isValidId) {
    return (
      <div className="min-h-screen bg-[#0F0D1B] flex items-center justify-center p-4">
        <div className="glass-effect border border-gray-700/30 rounded-xl p-6 text-center max-w-md w-full bg-[#1A182E]/60">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400 text-3xl mb-4" />
          <h1 className="text-xl font-bold text-[#EAE6F2] mb-2">无效的帖子 ID</h1>
          <p className="text-[#EAE6F2]/80 mb-6">请检查帖子ID是否正确</p>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

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
            {currentAddress && (
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border hover:bg-white/5 transition"
              >
                <FontAwesomeIcon icon={faUser} />
                <span className="text-sm">{formatAddress(currentAddress)}</span>
              </Link>
            )}
          </AuthGuard>
        </div>
      </header>

      {/* 主内容区（统一布局：max-w-2xl + 避开导航） */}
      <main className="container mx-auto px-4 pt-16 pb-24 relative z-10 max-w-2xl">
        {/* 页面标题栏（返回按钮+标题） */}
        <div className="mb-6 mt-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border text-purple-400 hover:bg-white/5 hover:text-white transition"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold text-[#EAE6F2]">编辑帖子</h1>
          <div className="w-24"></div> {/* 占位，保持标题居中 */}
        </div>

        {/* 加载中（玻璃态容器） */}
        {isLoadingPost && (
          <div className="mb-6 glass-effect border border-gray-700/30 rounded-xl p-8 text-center bg-[#1A182E]/60">
            <div className="animate-spin h-10 w-10 border-4 border-gray-600 border-t-purple-500 rounded-full mx-auto mb-4"></div>
            <p className="text-[#EAE6F2]/80">加载帖子数据中...</p>
          </div>
        )}

        {/* 帖子加载失败（错误提示风格） */}
        {isPostError && !isLoadingPost && (
          <div className="mb-6 glass-effect border border-red-800/30 rounded-xl p-6 bg-red-900/20">
            <h2 className="text-xl font-bold text-[#EAE6F2] mb-2">
              <FontAwesomeIcon icon={faExclamationCircle} className="mr-2 text-red-400" />
              加载帖子失败
            </h2>
            <p className="text-[#EAE6F2]/80 mb-6">
              {postError instanceof Error ? postError.message.slice(0, 80) : '未知错误'}
            </p>
            <button 
              onClick={() => router.back()} 
              className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
            >
              返回上一页
            </button>
          </div>
        )}

        {/* 无编辑权限（提示风格统一） */}
        {!isLoadingPost && !isPostError && !isAuthor && (
          <div className="mb-6 glass-effect border border-orange-800/30 rounded-xl p-8 text-center bg-orange-900/20">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-orange-400 text-3xl mb-4" />
            <h2 className="text-xl font-bold text-[#EAE6F2] mb-2">无编辑权限</h2>
            <p className="text-[#EAE6F2]/80 mb-6">您不是该帖子的作者，无法编辑</p>
            <button 
              onClick={() => router.back()} 
              className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
            >
              返回帖子详情
            </button>
          </div>
        )}

        {/* 编辑表单（仅作者可见，玻璃态风格） */}
        {!isLoadingPost && !isPostError && isAuthor && (
          <div className="mb-6 glass-effect border border-gray-700/30 rounded-xl p-6 sm:p-8 bg-[#1A182E]/60">
            {/* 成功提示（统一成功风格） */}
            {success && (
              <div className="mb-6 glass-effect border border-green-800/30 rounded-lg p-3 bg-green-900/20 text-[#EAE6F2]/80 flex items-center">
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-green-400" />
                帖子编辑成功！即将返回首页...
              </div>
            )}

            {/* 错误提示（统一错误风格） */}
            {error && !success && (
              <div className="mb-6 glass-effect border border-red-800/30 rounded-lg p-3 bg-red-900/20 text-[#EAE6F2]/80 flex items-center">
                <FontAwesomeIcon icon={faExclamationCircle} className="mr-2 text-red-400" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 标题输入（玻璃态输入框） */}
              <div>
                <label 
                  htmlFor="title" 
                  className="block text-sm font-medium text-[#EAE6F2] mb-1"
                >
                  帖子标题
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-lg transition ${
                    success || isSubmitting 
                      ? 'bg-[#1A182E]/80 border border-gray-600 text-[#EAE6F2]/60 cursor-not-allowed' 
                      : 'bg-[#1A182E]/80 border border-gray-600 text-[#EAE6F2] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                  }`}
                  placeholder="请输入标题"
                  disabled={isSubmitting || success}
                  maxLength={100} // 限制标题长度
                />
                <p className={`text-xs mt-1 ${
                  form.title.length > 80 ? 'text-yellow-400' : form.title.length > 100 ? 'text-red-400' : 'text-[#EAE6F2]/60'
                }`}>
                  字符数：{form.title.length}/100
                </p>
              </div>

              {/* 内容输入（玻璃态文本框） */}
              <div>
                <label 
                  htmlFor="content" 
                  className="block text-sm font-medium text-[#EAE6F2] mb-1"
                >
                  帖子内容
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={form.content}
                  onChange={handleInputChange}
                  rows={8}
                  className={`w-full p-3 rounded-lg transition ${
                    success || isSubmitting 
                      ? 'bg-[#1A182E]/80 border border-gray-600 text-[#EAE6F2]/60 cursor-not-allowed' 
                      : 'bg-[#1A182E]/80 border border-gray-600 text-[#EAE6F2] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                  }`}
                  placeholder="请输入内容"
                  disabled={isSubmitting || success}
                  maxLength={2000} // 限制内容长度
                />
                <p className={`text-xs mt-1 ${
                  form.content.length > 1800 ? 'text-yellow-400' : form.content.length > 2000 ? 'text-red-400' : 'text-[#EAE6F2]/60'
                }`}>
                  字符数：{form.content.length}/2000
                </p>
              </div>

              {/* 原始信息提示（辅助提示风格） */}
              <div className="glass-effect border border-purple-800/30 rounded-lg p-3 bg-purple-900/20 text-[#EAE6F2]/80 text-sm">
                <p>提示：仅修改有变化的内容，提交后不可撤销</p>
              </div>

              {/* 提交按钮组（统一按钮风格） */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 rounded-full glass-effect border border-border text-[#EAE6F2] hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || success}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    success || isSubmitting 
                      ? 'bg-purple-700/50 text-white/80' 
                      : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:shadow-lg hover:shadow-purple-700/20'
                  }`}
                  disabled={isSubmitting || success}
                >
                  {isSubmitting || isWaitingUpdateTx 
                    ? <span className="flex items-center gap-1"><FontAwesomeIcon icon={faSpinner} className="fa-spin text-xs" /> 提交中...</span> 
                    : '确认编辑'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* 底部导航（与其他页面完全一致） */}
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