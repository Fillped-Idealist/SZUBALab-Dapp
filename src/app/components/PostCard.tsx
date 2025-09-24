'use client';

import Link from 'next/link';
import { Post } from '../types';
import React from 'react'; // 确保导入React，用于CSSProperties类型

// 1. 扩展Post类型（保留原有逻辑）
interface ExtendedPost extends Post {
  authorName: string;
  viewCount?: number;
  commentCount?: number;
}

// 2. 扩展Props类型：添加样式属性（关键！解决类型错误）
interface PostCardProps {
  post: ExtendedPost;
  cardStyle?: React.CSSProperties; // 卡片外层样式
  titleStyle?: React.CSSProperties; // 标题样式
  metaStyle?: React.CSSProperties;  // 元信息样式
}

// 保留原有工具函数（无修改）
export const shortenAddress = (address: string): string => {
  return address?.startsWith('0x') && address.length >= 10
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '未知地址';
};

export const formatAddress = (addr: string): string => {
  if (!addr || addr.length < 10) return '未知地址';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const formatTime = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '未知时间';
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// 3. 组件内部接收并应用样式Props
export default function PostCard({ 
  post, 
  cardStyle = {}, // 默认值：空对象（避免undefined）
  titleStyle = {}, 
  metaStyle = {} 
}: PostCardProps) {
  const { 
    id, 
    author = '未知作者', 
    authorName = shortenAddress(author), 
    title = '无标题', 
    content = '无内容', 
    timestamp = new Date(),
    viewCount = 17, 
    commentCount = 5 
  } = post;

  return (
    // 4. 应用cardStyle到外层容器
    <div 
      className="glass-effect border border-border rounded-2xl hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
      style={cardStyle} // 样式优先级：props传入的style > 类名（确保HomePage能覆盖样式）
    >
      <Link href={`/posts/${id}`} className="block mb-4">
      {/* 5. 应用titleStyle到标题 */}
        
      <div 
        className="text-sm -mt-3 mb-0 -ml-2 flex gap-3 flex-wrap"
        style={metaStyle}
      >
        <div 
              className="w-10 h-10 rounded-full flex  justify-center overflow-hidden" 
              style={{ 
                backgroundImage: 'url(/24.webp)', // 关键：路径以 / 开头，指向 public/24.webp
                // backgroundSize: '100%',
                backgroundSize: 'cover', // 让图片覆盖容器
                backgroundPosition: 'center' // 图片居中
              }}
            ></div>
        <div 
          className="text-sm flex items-start gap-3 flex-col "
          style={metaStyle}
        >
          <span className="flex mt-1 items-center text-base" >
            <span className="font-semibold text-white">@{authorName}</span>
          </span>
          <span className="flex -mt-3 text-xs items-center text-gray-300">
            {formatTime(timestamp)}
          </span>
        </div>
      </div>

      <h2 
          className="font-semibold hover:underline line-clamp-1 text-white hover:text-primary"
          style={titleStyle}
        >
          {title}
      </h2>

      <div className="text-gray-300 mt-1 mb-8 line-clamp-3 text-sm">
        {content.length > 150 ? `${content.slice(0, 150)}...` : content}
      </div>

      {/* 6. 应用metaStyle到元信息 */}
      <div 
        className="text-sm -mb-6 flex items-center gap-4 flex-wrap"
        style={metaStyle}
      >
        <span className="flex text-xs items-center gap-1.5">
          <i className="fa fa-thumbs-up text-white"></i>
          {viewCount}
        </span>
        <span className="flex text-xs items-center gap-1.5">
          <i className="fa fa-comment-o text-white"></i>
          {commentCount}
        </span>
      </div>



      {/* <Link 
        href={`/posts/${id}`}
        className="inline-flex items-center gap-1.5 text-[#ffffff] hover:text-secondary transition-colors text-sm font-medium"
      >
        <span>查看详情</span>
        <i className="fa fa-chevron-right text-xs"></i>
      </Link> */}
      </Link>
    </div>
  );
}