import React from 'react';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
}

export default function PageIndicator({ currentPage, totalPages }: PageIndicatorProps) {
  return (
    <div className="flex space-x-2 mt-8">
      {Array.from({ length: totalPages }, (_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i + 1 === currentPage ? 'bg-white' : 'bg-white/30'
          }`}
        />
      ))}
    </div>
  );
}