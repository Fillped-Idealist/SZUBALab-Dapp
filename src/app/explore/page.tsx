'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faCompass, faPlus, faBell, faUser,
  faArrowLeft, faUsers, faHashtag,
  faInfoCircle, faCheck, faExternalLink
} from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import AuthGuard from '@/app/components/AuthGuard';
import { formatAddress } from '@/app/components/PostCard';

// 1. 模拟数据（全部为静态）
const STATS = [
  { title: "帖子总数", value: "1,286"   },
  { title: "会员总数", value: "523" },
  { title: "热门标签", value: "42" },
];

const FEATURED_CONTENTS = [
  {
    id: 1,
    title: "区块链开发入门到精通",
    description: "从 Solidity 基础到 DeFi 项目实战，一篇文章带你全面了解区块链开发。",
    image: "https://picsum.photos/id/180/800/400", // 技术感图片
    author: "0xDevMaster",
  },
  {
    id: 2,
    title: "Layer 2 解决方案全景对比",
    description: "深入分析 Optimism, Arbitrum, zkSync 等主流 Layer 2 方案的技术原理与优劣。",
    image: "https://picsum.photos/id/48/800/400", // 抽象科技感图片
    author: "0xLayer2Guru",
  },
  {
    id: 3,
    title: "NFT 艺术与价值捕获",
    description: "探讨 NFT 作为数字艺术的新形态，以及其背后的价值逻辑和市场趋势。",
    image: "https://picsum.photos/id/96/800/400", // 艺术感图片
    author: "0xNFTArtist",
  },
];

const TRENDING_TAGS = [
  { name: "区块链", count: 328, color: "from-purple-500 to-indigo-500" },
  { name: "以太坊", count: 287, color: "from-blue-500 to-cyan-500" },
  { name: "DeFi", count: 245, color: "from-green-500 to-emerald-500" },
  { name: "NFT", count: 212, color: "from-pink-500 to-rose-500" },
  { name: "Layer2", count: 189, color: "from-amber-500 to-orange-500" },
  { name: "智能合约", count: 156, color: "from-red-500 to-rose-500" },
  { name: "Web3", count: 145, color: "from-violet-500 to-fuchsia-500" },
  { name: "安全", count: 132, color: "from-gray-500 to-slate-500" },
];

const COMMUNITY_GUIDELINES = [
  { id: 1, title: "保持尊重", description: "对所有社区成员保持礼貌和尊重，禁止任何形式的歧视或骚扰。" },
  { id: 2, title: "内容原创", description: "鼓励发布原创内容，引用他人作品时请注明出处。" },
  { id: 3, title: "禁止广告", description: "禁止发布无关的商业广告或推广链接。" },
  { id: 4, title: "技术讨论为主", description: "本社区专注于区块链技术讨论，请尽量保持话题相关。" },
];

export default function DiscoverPage() {
  const router = useRouter();
  const { address: currentAddress } = useAccount();
  const [activeSlide, setActiveSlide] = useState(0);

  // 2. 简单的轮播效果（纯前端）
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % FEATURED_CONTENTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white">
      {/* 顶部导航栏（与 PostDetailPage 完全一致） */}
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

      {/* 主内容区 */}
      <main className="container mx-auto px-4 pt-16 pb-24 relative z-10 max-w-2xl">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="mb-6 mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border text-purple-400 hover:bg-white/5 hover:text-white transition"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          <span>返回</span>
        </button>

        <h1 className="text-2xl font-bold text-[#EAE6F2] mb-8">发现</h1>


        {/* 2. 精选内容轮播 */}
        <div className="mb-8 overflow-hidden rounded-xl glass-effect border border-gray-700/30">
          <div className="relative h-[220px] md:h-[300px]">
            {FEATURED_CONTENTS.map((content, index) => (
              <div
                key={content.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === activeSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0D1B] via-transparent to-transparent z-10"></div>
                <Image
                  src={content.image}
                  alt={content.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <h3 className="text-xl font-bold text-white mb-2">{content.title}</h3>
                  <p className="text-sm text-white/80 line-clamp-2 mb-4">{content.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-xs text-purple-400">{content.author.slice(2, 4)}</span>
                      </div>
                      <span className="text-xs text-white/80">{content.author}</span>
                    </div>
                    <Link
                      href={`/posts/${content.id}`}
                      className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-full text-xs flex items-center gap-1 transition"
                    >
                      <span>查看详情</span>
                      <FontAwesomeIcon icon={faExternalLink} className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {/* 轮播指示器 */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30">
              {FEATURED_CONTENTS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeSlide ? 'bg-white w-6' : 'bg-white/40'
                  }`}
                  aria-label={`查看第 ${index + 1} 个内容`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 3. 热门标签 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#EAE6F2]">热门标签</h2>
            <Link
              href="/tags"
              className="text-xs text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>查看全部</span>
              <FontAwesomeIcon icon={faExternalLink} className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING_TAGS.map((tag) => (
              <Link
                key={tag.name}
                href={`/tags/${tag.name}`}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                  `bg-gradient-to-r ${tag.color} bg-opacity-20 text-white`
                }`}
              >
                <FontAwesomeIcon icon={faHashtag} className="h-3 w-3" />
                <span>{tag.name}</span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  {tag.count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 4. 社区指南 */}
        <div className="mb-8 glass-effect border border-gray-700/30 rounded-xl p-6 bg-[#1A182E]/60">
          <div className="flex items-center gap-2 mb-4">
            <FontAwesomeIcon icon={faInfoCircle} className="text-purple-400" />
            <h2 className="text-lg font-bold text-[#EAE6F2]">社区指南</h2>
          </div>
          <ul className="space-y-3">
            {COMMUNITY_GUIDELINES.map((guideline) => (
              <li key={guideline.id} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#EAE6F2]">{guideline.title}</h3>
                  <p className="text-xs text-[#EAE6F2]/60 mt-1">{guideline.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 5. 活跃话题（静态） */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#EAE6F2]">活跃话题</h2>
          </div>
          <div className="space-y-3">
            <div className="glass-effect border border-gray-700/30 rounded-xl p-4 bg-[#1A182E]/60 hover:shadow-lg hover:shadow-purple-700/10 transition cursor-pointer">
              <h3 className="text-sm font-medium text-[#EAE6F2]">2024年最值得期待的Layer2项目有哪些？</h3>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#EAE6F2]/60">
                <span>42人参与讨论</span>
                <span>28条回复</span>
              </div>
            </div>
            <div className="glass-effect border border-gray-700/30 rounded-xl p-4 bg-[#1A182E]/60 hover:shadow-lg hover:shadow-purple-700/10 transition cursor-pointer">
              <h3 className="text-sm font-medium text-[#EAE6F2]">如何看待DeFi的安全挑战与未来发展？</h3>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#EAE6F2]/60">
                <span>35人参与讨论</span>
                <span>21条回复</span>
              </div>
            </div>
            <div className="glass-effect border border-gray-700/30 rounded-xl p-4 bg-[#1A182E]/60 hover:shadow-lg hover:shadow-purple-700/10 transition cursor-pointer">
              <h3 className="text-sm font-medium text-[#EAE6F2]">NFT除了头像，还有哪些有价值的应用场景？</h3>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#EAE6F2]/60">
                <span>58人参与讨论</span>
                <span>33条回复</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 底部导航（与 PostDetailPage 完全一致） */}
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
            href="/discover"
            className="flex flex-col items-center text-purple-400 hover:text-white transition" // 当前页高亮
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

      {/* 全局样式（与 PostDetailPage 完全统一） */}
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
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}
      </style>
    </div>
  );
}