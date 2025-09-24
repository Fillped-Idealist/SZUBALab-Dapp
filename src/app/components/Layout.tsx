import Link from 'next/link';
import { ReactNode } from 'react';
import WalletConnector from './WalletConnector';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 导航栏 */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-blue-600">
            深大区块链协会论坛
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link href="/" className="hover:text-blue-600 transition">
              首页
            </Link>
            <Link href="/posts/create" className="hover:text-blue-600 transition">
              发布帖子
            </Link>
            <Link href="/profile" className="hover:text-blue-600 transition">
              个人中心
            </Link>
            <WalletConnector />
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      {/* 页脚 */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>深圳大学区块链协会 © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
