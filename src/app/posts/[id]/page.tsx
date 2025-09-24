'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Post } from '@/app/types';
import { POST_MANAGER_ADDRESS, PostABI } from '@/app/lib/constants';
import { formatAddress, formatTime } from '@/app/components/PostCard';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faCompass, faPlus, faBell, faUser, 
  faExclamationCircle, faSpinner, faCheckCircle, faArrowLeft,
  faEdit, faTrash 
} from '@fortawesome/free-solid-svg-icons';
import AuthGuard from '@/app/components/AuthGuard';

// 彻底解决ABI类型问题：强制转换为unknown再转为数组（绕过TypeScript检查）
const safeAbi = PostABI as unknown as readonly unknown[];

// 定义参数和返回值类型
type GetPostByIdArgs = [bigint];
type DeletePostArgs = [bigint]; // 删除帖子的参数类型（仅postId）

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address: currentAddress, isConnected } = useAccount(); // 获取当前连接的钱包地址
  const postIdStr = params.id as string;
  const postId = Number(postIdStr);
  const postIdBigInt = BigInt(postIdStr); // 合约调用用BigInt

  // 新增：删除功能相关状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 删除确认弹窗
  const [isDeleting, setIsDeleting] = useState(false); // 删除操作加载中
  const [deleteError, setDeleteError] = useState<string | null>(null); // 删除错误信息

  // 无效ID处理
  if (isNaN(postId) || postId < 1) {
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
            返回
          </button>
        </div>
      </div>
    );
  }

  // 核心修复：使用类型绕过+运行时验证
  const {
    data: postContractData,
    isLoading: isLoadingPost,
    isError: isPostError,
    error: postError,
  } = useReadContract({
    address: POST_MANAGER_ADDRESS,
    abi: safeAbi, // 使用处理后的ABI
    functionName: 'getPostById' as const, // 强制指定函数名类型
    args: [postIdBigInt] as GetPostByIdArgs, // 强制参数类型（用BigInt）
  });

  // 新增：删除帖子合约调用
  const { writeContract, data: deleteTxHash, isPending: isDeletePending } = useWriteContract();
  const {
    isLoading: isWaitingDeleteTx,
    isSuccess: isDeleteSuccess,
    isError: isDeleteTxError,
    error: deleteTxError
  } = useWaitForTransactionReceipt({
    hash: deleteTxHash,
    query:{ enabled: !!deleteTxHash }
  });

  const [post, setPost] = useState<Post | null>(null);
  const [loadError, setLoadError] = useState('');
  // 判断当前用户是否为帖子作者
  const isAuthor = post && currentAddress 
    ? currentAddress.toLowerCase() === post.author.toLowerCase() 
    : false;

  // 运行时验证ABI有效性
  useEffect(() => {
    if (!Array.isArray(safeAbi)) {
      setLoadError('ABI格式错误：必须是数组类型');
      console.error('无效的ABI格式:', PostABI);
    }
  }, []);

  // 解析合约数据
  useEffect(() => {
    if (isLoadingPost || isPostError || !postContractData || !Array.isArray(postContractData)) {
      setLoadError(isPostError ? '合约调用失败' : loadError || '');
      setPost(null);
      return;
    }

    try {
      if (postContractData.length !== 6) {
        throw new Error(`数据格式错误：预期6个字段，实际${postContractData.length}个`);
      }

      const [id, author, title, content, createTime] = postContractData;
      setPost({
        id: Number(id),
        author: String(author) || '未知作者',
        title: String(title) || `未命名帖子 #${Number(id)}`,
        content: String(content) || '无内容',
        timestamp: new Date(Number(createTime) * 1000),
      });
      setLoadError('');
    } catch (err) {
      setLoadError(`解析失败：${err instanceof Error ? err.message : '未知错误'}`);
      setPost(null);
    }
  }, [postContractData, isLoadingPost, isPostError, loadError]);

  // 新增：处理删除确认
  const handleDeleteClick = () => {
    if (!isConnected || !currentAddress) {
      alert('请先连接钱包');
      return;
    }
    if (!isAuthor) {
      alert('您不是帖子作者，无删除权限');
      return;
    }
    setShowDeleteConfirm(true);
    setDeleteError(null);
  };

  // 新增：取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteError(null);
  };

  // 新增：确认删除（调用合约）
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await writeContract({
        address: POST_MANAGER_ADDRESS,
        abi: safeAbi,
        functionName: 'deletePost' as const, // 需确保合约中有deletePost函数
        args: [postIdBigInt] as DeletePostArgs,
        gas: BigInt(2000000) // 足够的gas
      });
    } catch (err: unknown) {
      setIsDeleting(false);
      const errMsg = err instanceof Error 
        ? err.message.includes('user rejected') 
          ? '您已拒绝删除交易' 
          : `删除失败：${err.message.slice(0, 60)}...`
        : '删除失败，请重试';
      setDeleteError(errMsg);
    }
  };

  // 新增：监听删除交易结果
  useEffect(() => {
    if (isWaitingDeleteTx) {
      setIsDeleting(true);
      return;
    }

    if (isDeleteSuccess) {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      // 确认跳转目标是首页，并保留刷新
      const timer = setTimeout(() => {
        router.push('/'); // 跳主页
        router.refresh(); // 刷新主页，立即移除已删除的帖子
      }, 2000); // 2秒延迟，让用户看到“删除成功”提示
      return () => clearTimeout(timer);
    }

    // 错误处理
    if (isDeleteTxError && deleteTxError) {
      setIsDeleting(false);
      setDeleteError(`交易失败：${(deleteTxError as Error).message.slice(0, 60)}...`);
    }
  }, [isWaitingDeleteTx, isDeleteSuccess, isDeleteTxError, deleteTxHash, deleteTxError, router]);

  // 优化删除成功后的提示（在弹窗关闭后显示临时提示）
  useEffect(() => {
    if (isDeleteSuccess) {
      // 显示“删除成功，跳主页”的临时提示
      alert('帖子删除成功！即将返回首页');
    }
  }, [isDeleteSuccess]);

  // 页面渲染
  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white">
      {/* 顶部导航栏（与CreatePostPage完全一致） */}
      <header className="glass-effect border border-border fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" 
              style={{ 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
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

      {/* 主内容区（玻璃态容器+统一排版） */}
      <main className="container mx-auto px-4 pt-16 pb-24 relative z-10 max-w-2xl">
        {/* 返回按钮（优化为玻璃态风格） */}
        <button
          onClick={() => router.back()}
          className="mb-6 mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border text-purple-400 hover:bg-white/5 hover:text-white transition"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          <span>返回</span>
        </button>

        {/* ABI错误提示（与CreatePostPage错误提示风格统一） */}
        {loadError === 'ABI格式错误：必须是数组类型' && (
          <div className="mb-6 glass-effect border border-red-800/30 rounded-xl p-6 bg-red-900/20">
            <h2 className="text-xl font-bold text-[#EAE6F2] mb-4">
              <FontAwesomeIcon icon={faExclamationCircle} className="mr-2 text-red-400" />
              致命错误：ABI配置错误
            </h2>
            <p className="text-[#EAE6F2]/80 mb-4">
              请检查 @/app/lib/constants.ts 中的 PostABI 定义，必须为数组格式。
            </p>
            <p className="text-[#EAE6F2]/80 text-sm mb-4">正确示例：</p>
            <pre className="bg-[#0F0D1B]/80 text-[#EAE6F2]/90 p-3 rounded-lg text-xs mb-4 overflow-x-auto">
{`export const PostABI = [
  {
    "inputs": [{ "name": "postId", "type": "uint256" }],
    "name": "getPostById",
    "outputs": [
      { "type": "uint256" },
      { "type": "address" },
      { "type": "string" },
      { "type": "string" },
      { "type": "uint256" },
      { "type": "uint256" }
    ],
    "type": "function"
  },
  {
    "inputs": [{"name":"postId","type":"uint256"},{"name":"newTitle","type":"string"},{"name":"newContent","type":"string"}],
    "name":"updatePost",
    "outputs":[],
    "type":"function"
  },
  {
    "inputs": [{"name":"postId","type":"uint256"}],
    "name":"deletePost",
    "outputs":[],
    "type":"function"
  }
] as const;`}
            </pre>
          </div>
        )}

        {/* 加载中（玻璃态风格） */}
        {isLoadingPost && !loadError && (
          <div className="mb-6 glass-effect border border-gray-700/30 rounded-xl p-8 text-center bg-[#1A182E]/60">
            <div className="animate-spin h-10 w-10 border-4 border-gray-600 border-t-purple-500 rounded-full mx-auto mb-4"></div>
            <p className="text-[#EAE6F2]/80">加载帖子详情中...</p>
          </div>
        )}

        {/* 其他错误（统一错误提示风格） */}
        {(isPostError || loadError) && loadError !== 'ABI格式错误：必须是数组类型' && (
          <div className="mb-6 glass-effect border border-red-800/30 rounded-xl p-6 bg-red-900/20">
            <h2 className="text-xl font-bold text-[#EAE6F2] mb-2">
              <FontAwesomeIcon icon={faExclamationCircle} className="mr-2 text-red-400" />
              加载失败
            </h2>
            <p className="text-[#EAE6F2]/80 mb-6">
              {loadError || (postError instanceof Error ? postError.message.slice(0, 80) : '未知错误')}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => router.back()} 
                className="px-4 py-2 rounded-full glass-effect border border-border text-[#EAE6F2] hover:bg-white/5 transition"
              >
                返回列表
              </button>
              <button 
                onClick={() => router.refresh()} 
                className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* 帖子内容（玻璃态容器+清晰层级） */}
        {!isLoadingPost && !isPostError && !loadError && post && (
          <article className="mb-6 glass-effect border border-gray-700/30 rounded-xl p-6 sm:p-8 bg-[#1A182E]/60">
            {/* 操作入口区域（编辑+删除）- 优化样式 */}
            {isAuthor && (
              <div className="mb-6 flex justify-end gap-3">
                <Link
                  href={`/posts/edit/${post.id}`}
                  className="px-4 py-2 rounded-full glass-effect border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faEdit} className="text-xs" />
                  编辑
                </Link>
                <button
                  onClick={handleDeleteClick}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full hover:shadow-lg hover:shadow-red-600/20 transition text-sm flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  删除
                </button>
              </div>
            )}

            {/* 帖子标题（主标题样式） */}
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-[#EAE6F2]">{post.title}</h1>
            
            {/* 帖子元信息（浅色调+统一间距） */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#EAE6F2]/60 mb-8">
              <span>
                作者：
                <Link 
                  href={`/profile/${post.author}`}
                  className="text-purple-400 hover:underline ml-1"
                >
                  {formatAddress(post.author)}
                </Link>
              </span>
              <span>发布时间：{formatTime(post.timestamp)}</span>
              <span>帖子ID：{post.id}</span>
            </div>
            
            {/* 帖子内容（行高优化+易读性） */}
            <div className="text-[#EAE6F2]/80 leading-relaxed whitespace-pre-line break-words">
              {post.content}
            </div>
          </article>
        )}

        {/* 帖子不存在（统一提示风格） */}
        {!isLoadingPost && !isPostError && !loadError && !post && (
          <div className="mb-6 glass-effect border border-orange-800/30 rounded-xl p-8 text-center bg-orange-900/20">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-orange-400 text-3xl mb-4" />
            <h2 className="text-xl font-bold text-[#EAE6F2] mb-2">帖子不存在</h2>
            <p className="text-[#EAE6F2]/80 mb-6">该帖子可能已被删除或ID错误</p>
            <button 
              onClick={() => router.push('/')} 
              className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
            >
              返回首页
            </button>
          </div>
        )}

        {/* 新增：删除确认弹窗（玻璃态模态框+统一风格） */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="glass-effect border border-gray-700/30 rounded-xl bg-[#1A182E]/90 max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-bold text-[#EAE6F2] mb-4">
                  <FontAwesomeIcon icon={faTrash} className="mr-2 text-red-400" />
                  确认删除帖子？
                </h3>
                <p className="text-[#EAE6F2]/80 mb-6">
                  此操作不可撤销，删除后帖子将永久消失。请确认您是该帖子的作者。
                </p>

                {/* 删除错误提示 */}
                {deleteError && (
                  <div className="mb-4 glass-effect border border-red-800/30 rounded-lg p-3 bg-red-900/20 text-[#EAE6F2]/80 text-sm">
                    <FontAwesomeIcon icon={faExclamationCircle} className="mr-1 text-red-400" />
                    {deleteError}
                  </div>
                )}

                {/* 加载中提示 */}
                {(isDeleting || isDeletePending || isWaitingDeleteTx) && !deleteError && (
                  <div className="mb-4 glass-effect border border-yellow-800/30 rounded-lg p-3 bg-yellow-900/20 text-[#EAE6F2]/80 text-sm flex items-center">
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2 text-yellow-400" />
                    {isWaitingDeleteTx ? '交易处理中...请在钱包确认' : '准备删除操作...'}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelDelete}
                    className="px-4 py-2 rounded-full glass-effect border border-border text-[#EAE6F2] hover:bg-white/5 transition"
                    disabled={isDeleting || isDeletePending || isWaitingDeleteTx}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full hover:shadow-lg hover:shadow-red-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDeleting || isDeletePending || isWaitingDeleteTx}
                  >
                    {isDeleting || isDeletePending || isWaitingDeleteTx 
                      ? '删除中...' 
                      : '确认删除'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部导航（与CreatePostPage完全一致） */}
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

      {/* 全局样式（与CreatePostPage统一） */}
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