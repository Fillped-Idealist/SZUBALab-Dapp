'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useReadContract, useConfig, useAccount, useConnect, useDisconnect, type Config } from 'wagmi';
import { readContract } from '@wagmi/core'; 
import Link from 'next/link';
import PostCard from './components/PostCard';
import AuthGuard from './components/AuthGuard';
import { Post } from './types';
import { 
  POST_MANAGER_ADDRESS, 
  PostABI, 
  POSTS_PER_PAGE,
  MEMBER_MANAGER_ADDRESS,
  MemberABI
} from './lib/constants';

// 工具函数保持不变
const shortenAddress = (address: string): string => {
  if (!address?.startsWith('0x') || address.length < 10) return '未知地址';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
const formatTime = (timestamp: Date): string => {
  if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) return '未知时间';
  return timestamp.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const fetchMemberName = async (address: string, config: Config) => { // 核心：config: Config 替代 config: any
  try {
    const memberInfo = await readContract(config, {
      address: MEMBER_MANAGER_ADDRESS,
      abi: MemberABI as readonly unknown[], // 保持不变（最小化修改）
      functionName: 'getMemberInfo',
      args: [address as `0x${string}`],
    });
    const [isRegistered, , , , name] = memberInfo as [
      boolean, bigint, string, bigint, string
    ];
    if (!isRegistered) return `未注册用户(${shortenAddress(address)})`;
    if (name && typeof name === 'string' && name.trim()) return name.trim();
    return `匿名用户(${shortenAddress(address)})`;
  } catch (error) {
    console.error(`获取会员 ${shortenAddress(address)} 信息失败:`, error);
    return `未知用户(${shortenAddress(address)})`;
  }
};


// HomePage 组件完全保持不变
export default function HomePage() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [allPosts, setAllPosts] = useState<(Post & { authorName: string })[]>([]);
  const [posts, setPosts] = useState<(Post & { authorName: string })[]>([]);
  const [loadError, setLoadError] = useState<string>('');
  const [isLoadingNames, setIsLoadingNames] = useState(false);

  const { address: currentAddress } = useAccount();
  const { data: contractAdmin } = useReadContract({
    address: MEMBER_MANAGER_ADDRESS,
    abi: MemberABI as readonly unknown[],
    functionName: 'admin',
    query: { enabled: !!currentAddress },
  });
  const { data: postCountBigInt } = useReadContract({
    address: POST_MANAGER_ADDRESS,
    abi: PostABI as readonly unknown[],
    functionName: 'getPostTotal',
    query: { enabled: true },
  });
  const {
    data: postData,
    isLoading: isLoadingPosts,
    refetch: refetchPosts,
  } = useReadContract({
    address: POST_MANAGER_ADDRESS,
    abi: PostABI as readonly unknown[],
    functionName: 'getAllPosts',
    query: { enabled: true },
  });
  const config = useConfig();

  const isAdmin = useMemo(() => {
    if (!currentAddress || !contractAdmin) return false;
    return currentAddress.toLowerCase() === (contractAdmin as `0x${string}`).toLowerCase();
  }, [currentAddress, contractAdmin]);

  useEffect(() => {
    if (isLoadingPosts || !postData) {
      setLoadError('');
      setAllPosts([]);
      return;
    }
    const loadAuthorNames = async () => {
      try {
        setIsLoadingNames(true);
        const [ids, authors, titles, contents, times] = postData as [
          bigint[], string[], string[], string[], bigint[]
        ];
        if (
          !ids || !authors || !titles || !contents || !times ||
          ids.length !== authors.length ||
          ids.length !== titles.length ||
          ids.length !== contents.length ||
          ids.length !== times.length
        ) {
          throw new Error('帖子数据结构错误：字段数量不匹配');
        }
        const uniqueAuthors = [...new Set(authors)];
        const authorNameMap: Record<string, string> = {};
        for (const author of uniqueAuthors) {
          authorNameMap[author] = await fetchMemberName(author, config);
        }
        const parsedPosts = ids.map((id, index) => ({
          id: Number(id),
          author: authors[index] || '0x0000000000000000000000000000000000000000',
          authorName: authorNameMap[authors[index]] || `未知用户(${shortenAddress(authors[index] || '')})`,
          title: titles[index] || `未命名帖子 #${Number(id)}`,
          content: contents[index] || '无内容',
          timestamp: new Date(Number(times[index]) * 1000),
        }));
        setAllPosts(parsedPosts);
        setLoadError('');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '未知错误';
        setLoadError(`加载失败：${errorMsg}`);
        setAllPosts([]);
      } finally {
        setIsLoadingNames(false);
      }
    };
    loadAuthorNames();
  }, [postData, isLoadingPosts, config, refetchPosts]);

  useEffect(() => {
    if (allPosts.length === 0) return;
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    setPosts(allPosts.slice(startIndex, endIndex));
  }, [allPosts, currentPage]);

  const totalPages = useMemo(() => {
    const totalPosts = postCountBigInt ? Number(postCountBigInt) : 0;
    return Math.max(Math.ceil(totalPosts / POSTS_PER_PAGE), 1);
  }, [postCountBigInt]);

  const renderContent = () => {
    if ((isLoadingPosts || isLoadingNames) && !loadError) {
      return (
        <div className="glass-effect border border-border rounded-2xl p-10 text-center shadow-lg">
          <div className="animate-spin h-10 w-10 border-4 border-white/10 border-t-primary rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">
            {isLoadingPosts ? '加载帖子列表中...' : '获取作者信息中...'}
          </p>
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="glass-effect border border-red-500/20 rounded-2xl p-10 text-center shadow-lg">
          <p className="text-red-400 mb-6">⚠️ {loadError}</p>
          <button
            onClick={() => refetchPosts?.()}
            disabled={!refetchPosts || isLoadingPosts || isLoadingNames}
            className="px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            <i className="fa fa-refresh"></i> 点击重试
          </button>
        </div>
      );
    }
    if (allPosts.length === 0) {
      return (
        <div className="glass-effect border border-border rounded-2xl p-10 text-center shadow-lg">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa fa-file-text-o text-primary text-3xl"></i>
          </div>
          <p className="text-gray-300 mb-6">暂无帖子数据</p>
          <AuthGuard>
            <Link
              href="/posts/create"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary text-white rounded-full hover:shadow-lg hover:shadow-primary/20 transition hover:scale-105"
              target="_self"
            >
              <i className="fa fa-plus"></i> 立即发布第一篇帖子
            </Link>
          </AuthGuard>
        </div>
      );
    }
    return (
      <>
        <div className="space-y-6 mb-10">
          {posts.map((post) => (
            <div key={post.id}>
              <PostCard
                post={post}
                cardStyle={{ padding: '1.5rem', color: 'white' }}
                titleStyle={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}
                metaStyle={{ color: 'gray-400', fontSize: '0.875rem' }}
              />
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isLoadingPosts || isLoadingNames}
              className="px-5 py-2 rounded-full glass-effect border border-border text-gray-300 hover:bg-white/5 transition disabled:opacity-30 flex items-center gap-1"
            >
              <i className="fa fa-chevron-left text-xs"></i> 上一页
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = currentPage > 3 && totalPages > 5 
                  ? Math.min(currentPage - 2 + i, totalPages) 
                  : i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={isLoadingPosts || isLoadingNames}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                      pageNum === currentPage 
                        ? 'bg-gradient-to-r from-[#302781] to-[#302781] text-white' 
                        : 'glass-effect border border-border text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <span className="text-gray-400 px-1">...</span>
              )}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || isLoadingPosts || isLoadingNames}
              className="px-5 py-2 rounded-full glass-effect border border-border text-gray-300 hover:bg-white/5 transition disabled:opacity-30 flex items-center gap-1"
            >
              下一页 <i className="fa fa-chevron-right text-xs"></i>
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-dark text-white">
      <div
        className="fixed inset-0 bg-gradient-to-br from-primary/30 to-secondary/20 bg-noise"
        style={{ animation: 'gradientShift 30s ease infinite alternate' }}
      ></div>
      <header className="glass-effect border border-border fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" 
              style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <i className="fa fa-connectdevelop text-white text-xl relative z-10"></i>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-secondary text-gradient pl-1">SZUBALab</h1>
          </div>
          <AuthGuard>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border hover:bg-white/5 transition"
            >
              <i className="fa fa-user"></i>
              <span className="text-sm">{currentAddress ? shortenAddress(currentAddress) : '我的账号'}</span>
            </Link>
          </AuthGuard>
        </div>
      </header>
      <main className="container mx-auto px-4 pt-24 pb-24 relative z-10">
        <div className="mb-5">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索话题、帖子或用户..."
              className="w-full px-4 py-3 rounded-full glass-effect border border-border pl-12 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-gray-400 text-sm"
            />
            <i className="fa fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <button className="absolute right-5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-primary/80 text-white text-sm">
              搜索
            </button>
          </div>
        </div>
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            <button className="px-4 py-2 rounded-full bg-primary text-white text-sm flex items-center gap-1">
              <i className="fa fa-fire"></i> 全部
            </button>
            <button className="px-4 py-2 rounded-full glass-effect border border-border text-sm hover:bg-primary/20 transition flex items-center gap-1">
              <i className="fa fa-link"></i> 区块链
            </button>
            <button className="px-4 py-2 rounded-full glass-effect border border-border text-sm hover:bg-primary/20 transition flex items-center gap-1">
              <i className="fa fa-picture-o"></i> NFT
            </button>
            <button className="px-4 py-2 rounded-full glass-effect border border-border text-sm hover:bg-primary/20 transition flex items-center gap-1">
              <i className="fa fa-globe"></i> 投研
            </button>
            <button className="px-4 py-2 rounded-full glass-effect border border-border text-sm hover:bg-primary/20 transition flex items-center gap-1">
              <i className="fa fa-lightbulb-o"></i> 技术讨论
            </button>
          </div>
        </div>
        <div className="flex flex-wrap justify-between items-center mb-5 gap-4">
          <h2 className="text-xl font-bold text-[#F0F0F2]">
            最新帖子
          </h2>
          <div className="flex gap-3">
            <AuthGuard>
              <Link
                href="/posts/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-full hover:shadow-lg hover:shadow-primary/20 transition hover:scale-105"
                target="_self"
              >
                <i className="fa fa-plus"></i> 发布帖子
              </Link>
            </AuthGuard>
            {isAdmin && (
              <Link
                href="/members"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-effect border border-primary/30 text-white hover:bg-primary/20 transition"
                target="_self"
              >
                <i className="fa fa-users"></i> 会员管理
              </Link>
            )}
          </div>
        </div>
        {renderContent()}
        {/* <div className="text-center mt-12">
          <Link
            href="/test/qe"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-effect border border-border text-gray-300 hover:bg-white/5 transition"
            target="_self"
          >
            <i className="fa fa-code"></i> 测试功能入口
          </Link>
        </div> */}
      </main>

      <nav className="glass-effect border-t border-border fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="flex justify-around items-center py-3">
          <Link
            href="/"
            className="flex flex-col items-center text-purple-100 hover:text-white transition"
          >
            <i className="fa fa-home text-lg mb-1 scale-110"></i>
            <span className="text-xs">首页</span>
          </Link>
          <Link
            href="/explore"
            className="flex flex-col items-center text-gray-400 hover:text-primary transition"
          >
            <i className="fa fa-compass text-lg mb-1 scale-110"></i>
            <span className="text-xs">发现</span>
          </Link>
          <AuthGuard>
            <Link
              href="/posts/create"
              className="flex flex-col items-center justify-center w-14 h-14 rounded-full 
                    bg-gradient-to-r from-[#6B46C1] to-[#A05AD5]
                    -mt-8 shadow-lg shadow-[#6B46C1]/30"
            >
              <i className="fa fa-plus text-lg scale-110"></i>
            </Link>
          </AuthGuard>
          <Link
            href="/notifications"
            className="flex flex-col items-center text-gray-400 hover:text-primary transition"
          >
            <i className="fa fa-bell text-lg mb-1 scale-110"></i>
            <span className="text-xs">通知</span>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center text-gray-400 hover:text-primary transition"
          >
            <i className="fa fa-user text-lg mb-1 scale-110"></i>
            <span className="text-xs">我的</span>
          </Link>
        </div>
      </nav>

      {/* 全局样式保持不变 */}
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
          }
          .bg-dark { background-color: rgba(15, 23, 42, 0); }
          .bg-noise {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            background-blend-mode: overlay;
            background-size: 200px;
            opacity: 0.05;
          }
          .glass-effect {
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            background-color: rgba(130, 77, 204, 0.32);
          }
          .text-gradient {
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .border-border {
            border-color: rgba(255, 255, 255, 0.2);
          }
          .primary { color: #8800ffff; background-color: #7E22CE; }
          .secondary { color: #EC4899; background-color: #EC4899; }
        `}
      </style>
    </div>
  );
}
