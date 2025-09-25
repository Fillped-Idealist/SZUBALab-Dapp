// src/app/auth/login/page.tsx

// 'use client' 在这里是可选的，因为这个组件没有使用任何 React hooks
// 'use client'; 

/**
 * 一个最小化的“哑”登录页面组件。
 * 此页面存在的唯一目的是满足项目的类型验证和构建要求，
 * 它不包含任何实际的登录功能。
 */
export default function DummyLoginPage() {
  // 返回一个空的 div，它不会在页面上渲染任何内容
  // 但它是一个有效的 React 组件
  return <div className="hidden"></div>;
}
