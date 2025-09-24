import React from 'react';

interface IconButtonProps {
  icon: 'thumbs-up' | 'thumbs-down'; // 图标类型
  isActive?: boolean;                // 是否激活（高亮）
  onClick?: () => void;              // 点击回调
}

export default function IconButton({ icon, isActive = false, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-full ${
        isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
      }`}
    >
      {icon === 'thumbs-up' ? (
        // 点赞SVG
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.682 13.682a4.5 4.5 0 009.08 0M12 20.25a7.5 7.5 0 00-7.5-7.5h15a3.75 3.75 0 01-7.5 0 3.75 3.75 0 00-3.75 3.75z"
          />
        </svg>
      ) : (
        // 点踩SVG
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18.75V10.5zm-12 0a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H6.75V10.5z"
          />
        </svg>
      )}
    </button>
  );
}