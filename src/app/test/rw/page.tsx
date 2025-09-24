import React from 'react';
import GradientBackground from '../../components/GradientBackground';
import PageIndicator from '../../components/PageIndicator';

export default function WelcomePage() {
  return (
    <GradientBackground fromColor="#6d5c7cff" toColor="#8b5cf6">
      <div className="text-center px-6">
        <h1 className="text-[clamp(1.5rem,5vw,2.5rem)] font-bold text-white mb-8">
          The fastest food<br />delivery service
        </h1>
        {/* 示例插画（可替换为本地图片） */}
        <img
          src="https://picsum.photos/seed/food-delivery-illustration/300/400"
          alt="Food delivery illustration"
          className="w-full max-w-xs mb-12"
        />
        <PageIndicator currentPage={1} totalPages={3} />
      </div>
    </GradientBackground>
  );
}