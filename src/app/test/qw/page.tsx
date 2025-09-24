import React from 'react';
import GradientBackground from '../../components/GradientBackground';
import PageIndicator from '../../components/PageIndicator';

// 分类数据（可从接口获取）
interface Category {
  name: string;
  image: string;
}
const categories: Category[] = [
  { name: 'Pasta', image: 'https://picsum.photos/seed/pasta/200/200' },
  { name: 'Healthy', image: 'https://picsum.photos/seed/healthy/200/200' },
  { name: 'Hamburger', image: 'https://picsum.photos/seed/hamburger/200/200' },
  { name: 'Meat', image: 'https://picsum.photos/seed/meat/200/200' },
  { name: 'Dessert', image: 'https://picsum.photos/seed/dessert/200/200' },
  { name: 'Pasta', image: 'https://picsum.photos/seed/pasta2/200/200' },
];

export default function CategoriesPage() {
  return (
    <GradientBackground fromColor="#859964ff" toColor="#051522ff">
      <div className="w-full max-w-md px-6">
        {/* 搜索栏 */}
        <div className="relative w-full mb-8">
          <input
            type="text"
            placeholder="Search"
            className="w-full py-3 pl-10 pr-4 rounded-lg bg-white/90 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-6">Categories</h2>
        {/* 分类卡片网格 */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          {categories.map((category, idx) => (
            <div key={idx} className="relative group">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg flex items-end">
                <span className="text-white font-medium p-2">{category.name}</span>
              </div>
            </div>
          ))}
        </div>
        <PageIndicator currentPage={3} totalPages={3} />
      </div>
    </GradientBackground>
  );
}