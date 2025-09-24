import React from 'react';
import GradientBackground from '../../components/GradientBackground';
import PageIndicator from '../../components/PageIndicator';
import IconButton from '../../components/IconButton';

export default function SignupPage() {
  return (
    <GradientBackground fromColor="#a855f7" toColor="#8b5cf6">
      <div className="w-full max-w-md px-6">
        <h2 className="text-[clamp(1.2rem,4vw,1.8rem)] font-bold text-white text-center mb-6">
          Order food<br />at your door
        </h2>
        {/* 食品图标 */}
        <div className="flex justify-center space-x-8 mb-8">
          <img
            src="https://picsum.photos/seed/burger/80/80"
            alt="Burger"
            className="w-16 h-16 rounded-full"
          />
          <img
            src="https://picsum.photos/seed/donut/80/80"
            alt="Donut"
            className="w-16 h-16 rounded-full"
          />
          <img
            src="https://picsum.photos/seed/hotdog/80/80"
            alt="Hotdog"
            className="w-16 h-16 rounded-full"
          />
        </div>
        {/* 注册表单 */}
        <form className="bg-white rounded-xl p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Sign up</h3>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Create account
            </button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account? <a href="#" className="text-purple-600 hover:underline">Sign in</a>
          </p>
        </form>
        {/* 点赞/点踩按钮 */}
        <div className="flex justify-center space-x-4">
          <IconButton icon="thumbs-up" isActive={true} />
          <IconButton icon="thumbs-down" />
        </div>
        <PageIndicator currentPage={2} totalPages={3} />
      </div>
    </GradientBackground>
  );
}