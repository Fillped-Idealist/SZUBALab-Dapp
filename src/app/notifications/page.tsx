'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faCompass, faPlus, faBell, faUser,
  faExclamationCircle, faSpinner, faCheckCircle, faArrowLeft,
  faTrash, faEnvelope, faCircleXmark
} from '@fortawesome/free-solid-svg-icons';
import AuthGuard from '@/app/components/AuthGuard';
import { formatAddress } from '@/app/components/PostCard';

// 1. 定义通知类型接口（TS类型安全）
interface NotificationItem {
  id: number;
  type: 'like' | 'comment' | 'system' | 'warning'; // 通知类型
  title: string;
  message: string;
  time: string; // 格式化后的时间（如"10分钟前"）
  read: boolean; // 是否已读
  relatedAddress?: string; // 关联用户地址（如点赞/评论者）
  relatedPostId?: number; // 关联帖子ID（如帖子被点赞）
}

// 2. 模拟通知数据（可后续替换为后端/合约数据）
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    type: 'like',
    title: '帖子获得点赞',
    message: '用户点赞了你的帖子《区块链开发入门指南》',
    time: '10分钟前',
    read: false,
    relatedAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    relatedPostId: 12
  },
  {
    id: 2,
    type: 'comment',
    title: '帖子收到新评论',
    message: '用户评论了你的帖子《Polygon Amoy测试网部署教程》',
    time: '1小时前',
    read: false,
    relatedAddress: '0xA4D21793D2a01eDc53898f66F56E53C66D00c7cE',
    relatedPostId: 8
  },
  {
    id: 3,
    type: 'system',
    title: '会员等级提升',
    message: '恭喜！你的发帖数达到5篇，会员等级提升至Lv.2',
    time: '昨天',
    read: true,
  },
  {
    id: 4,
    type: 'warning',
    title: '内容审核提醒',
    message: '你的帖子《某代币分析》因包含敏感信息，已临时隐藏，请修改后重新提交',
    time: '3天前',
    read: true,
    relatedPostId: 5
  },
  {
    id: 5,
    type: 'system',
    title: '社区公告',
    message: '平台将于2024-06-10 20:00进行服务器维护，预计1小时',
    time: '1周前',
    read: true,
  },
  {
    id: 6,
    type: 'like',
    title: '帖子获得点赞',
    message: '用户点赞了你的帖子《Solidity常见漏洞总结》',
    time: '2周前',
    read: true,
    relatedAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    relatedPostId: 3
  }
];

// 3. 根据通知类型获取对应图标（统一视觉）
const getNotificationIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'like':
      return <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 text-lg" />;
    case 'comment':
      return <FontAwesomeIcon icon={faEnvelope} className="text-blue-400 text-lg" />;
    case 'system':
      return <FontAwesomeIcon icon={faBell} className="text-purple-400 text-lg" />;
    case 'warning':
      return <FontAwesomeIcon icon={faExclamationCircle} className="text-amber-400 text-lg" />;
  }
};

export default function NotificationsPage() {
  const router = useRouter();
  const { address: currentAddress, isConnected } = useAccount();
  
  // 4. 通知状态管理（TS类型安全）
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null); // 单个删除加载中
  const [clearLoading, setClearLoading] = useState(false); // 清空全部加载中

  // 5. 初始化通知数据（模拟加载过程）
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(MOCK_NOTIFICATIONS);
      setIsLoading(false);
    }, 800); // 模拟接口加载延迟
    return () => clearTimeout(timer);
  }, []);

  // 6. 标记单个通知为已读
  const handleMarkAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(item => 
        item.id === id ? { ...item, read: true } : item
      )
    );
  };

  // 7. 删除单个通知（模拟加载状态）
  const handleDeleteNotification = async (id: number) => {
    setDeleteLoadingId(id); // 标记加载中
    try {
      // 模拟接口请求延迟
      await new Promise(resolve => setTimeout(resolve, 600));
      setNotifications(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('删除通知失败:', err);
    } finally {
      setDeleteLoadingId(null); // 取消加载中
    }
  };

  // 8. 标记全部为已读
  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(item => ({ ...item, read: true }))
    );
  };

  // 9. 清空全部通知（模拟加载状态）
  const handleClearAll = async () => {
    if (!confirm('确认清空所有通知？此操作不可撤销')) return;
    setClearLoading(true);
    try {
      // 模拟接口请求延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      setNotifications([]);
    } catch (err) {
      console.error('清空通知失败:', err);
    } finally {
      setClearLoading(false);
    }
  };

  // 10. 计算未读通知数量
  const unreadCount = notifications.filter(item => !item.read).length;

  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white">
      {/* 顶部导航栏（与PostDetailPage完全一致） */}
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

      {/* 主内容区（玻璃态容器+统一排版） */}
      <main className="container mx-auto px-4 pt-16 pb-24 relative z-10 max-w-2xl">
        {/* 返回按钮（与PostDetailPage风格一致） */}
        <button
          onClick={() => router.back()}
          className="mb-6 mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border text-purple-400 hover:bg-white/5 hover:text-white transition"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          <span>返回</span>
        </button>

        {/* 页面标题+操作栏（批量操作） */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBell} className="text-purple-400 text-2xl" />
            <h1 className="text-2xl font-bold text-[#EAE6F2]">通知中心</h1>
            {/* 未读数量徽章 */}
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {/* 批量操作按钮（玻璃态风格） */}
          <div className="flex gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 rounded-full glass-effect border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition text-sm flex items-center gap-1"
              >
                <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                全部已读
              </button>
            )}
            <button
              onClick={handleClearAll}
              disabled={clearLoading || notifications.length === 0}
              className="px-4 py-2 rounded-full glass-effect border border-red-500/30 text-red-400 hover:bg-red-500/10 transition text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin text-xs" />
                  清空ing
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  清空全部
                </>
              )}
            </button>
          </div>
        </div>

        {/* 加载中（与PostDetailPage玻璃态一致） */}
        {isLoading && (
          <div className="glass-effect border border-gray-700/30 rounded-xl p-8 text-center bg-[#1A182E]/60 h-[400px] flex flex-col items-center justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-gray-600 border-t-purple-500 rounded-full mb-4"></div>
            <p className="text-[#EAE6F2]/80">加载通知中...</p>
          </div>
        )}

        {/* 无通知状态（玻璃态空页面） */}
        {!isLoading && notifications.length === 0 && (
          <div className="glass-effect border border-gray-700/30 rounded-xl p-8 text-center bg-[#1A182E]/60 h-[400px] flex flex-col items-center justify-center">
            <FontAwesomeIcon icon={faBell} className="text-gray-600 text-5xl mb-4" />
            <h2 className="text-xl font-bold text-[#EAE6F2] mb-2">暂无通知</h2>
            <p className="text-[#EAE6F2]/60 max-w-md">
              当有新的互动（点赞/评论）或系统消息时，会在这里显示
            </p>
          </div>
        )}

        {/* 通知列表（玻璃态卡片+已读/未读区分） */}
        {!isLoading && notifications.length > 0 && (
            <div className="space-y-4">
                {notifications.map(item => (
                <div
                    key={item.id}
                    className={`glass-effect border ${
                    item.read 
                        ? 'border-gray-700/30 bg-[#1A182E]/60' 
                        : 'border-blue-500/30 bg-blue-900/10'
                    } rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-purple-700/5`}
                    onClick={() => !item.read && handleMarkAsRead(item.id)}
                >
                    <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                        {getNotificationIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-[#EAE6F2] mb-1 ${item.read ? 'opacity-80' : ''}`}>
                        {item.title}
                        </h3>
                        
                        {/* 👇👇👇 这是修正后的内容 👇👇👇 */}
                        <p className="text-[#EAE6F2]/80 text-sm mb-2 line-clamp-2">
                        {item.relatedAddress ? (
                            <>
                            {/* 1. 安全地处理关联地址 */}
                            {item.message.split('用户').map((part, index) => (
                                <React.Fragment key={index}>
                                {part}
                                {index === 0 && ( // 只在第一个分割点后插入链接
                                    <Link 
                                    href={`/profile/${item.relatedAddress}`}
                                    className="text-purple-400 hover:underline"
                                    >
                                    {formatAddress(item.relatedAddress || '')}
                                    </Link>
                                )}
                                </React.Fragment>
                            ))}

                            {/* 2. 安全地处理关联帖子 */}
                            {item.relatedPostId && (
                                <>
                                {' '}
                                <Link 
                                    href={`/posts/${item.relatedPostId}`}
                                    className="text-blue-400 hover:underline"
                                >
                                    [查看帖子]
                                </Link>
                                </>
                            )}
                            </>
                        ) : (
                            item.message
                        )}
                        </p>
                        {/* 👆👆👆 修正结束 👆👆👆 */}

                        <p className="text-[#EAE6F2]/40 text-xs">
                        {item.time}
                        </p>
                    </div>

                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(item.id);
                        }}
                        disabled={deleteLoadingId === item.id}
                        className="opacity-0 hover:opacity-100 transition-opacity text-[#EAE6F2]/60 hover:text-red-400"
                    >
                        {deleteLoadingId === item.id ? (
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-sm" />
                        ) : (
                        <FontAwesomeIcon icon={faCircleXmark} className="text-sm" />
                        )}
                    </button>
                    </div>
                </div>
                ))}
            </div>
            )}
      </main>

      {/* 底部导航（与PostDetailPage完全一致） */}
      <nav className="glass-effect border-t border-gray-700/30 fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-[#1A182E]/60">
        <div className="flex justify-around items-center py-3">
          <Link
            href="/"
            className="flex flex-col items-center text-[#EAE6F2]/60 hover:text-white transition"
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
            className="flex flex-col items-center text-purple-400 hover:text-white transition" // 当前页高亮
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

      {/* 全局样式（与PostDetailPage完全统一） */}
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