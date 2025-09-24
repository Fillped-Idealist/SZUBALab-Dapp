'use client';

// 1. 导入核心依赖（按功能分类，便于查找）
import { createConfig, http } from 'wagmi';
import { polygonAmoy } from 'viem/chains'; // Polygon Amoy 测试链（viem 内置）
import type { Chain } from 'viem'; // 统一链类型标注
import { metaMask } from 'wagmi/connectors';

// 2. 自定义 31337 本地链（替换 viem 默认的 localhost(1337)，避免链ID冲突）
const local31337: Chain = {
  id: 31337,
  name: 'Localhost 31337',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
  blockExplorers: { default: { name: 'Local Explorer', url: 'http://localhost:8545' } },
  testnet: true,
};

// 3. 配置支持的链：用「只读元组」替代普通数组（核心修复！）
// 类型为 readonly [Chain, Chain]，满足 Wagmi 要求的「至少一个链的只读元组」
const supportedChains: readonly [Chain, Chain] = [
  local31337,    // 第一个元素：本地链（确保非空）
  polygonAmoy    // 第二个元素：Polygon Amoy 测试链
];

// 4. 从环境变量获取默认链ID（优先级：环境变量 > 31337）
const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 31337;

// 5. 确定当前默认链（从支持的链中查找，避免无效配置）
const selectedChain = supportedChains.find(chain => chain.id === DEFAULT_CHAIN_ID) 
  || supportedChains[0]; // 兜底：默认用第一个链（local31337）

// 6. 创建 Wagmi 配置（chains 类型匹配）
export const config = createConfig({
  // 此时 supportedChains 是 readonly [Chain, Chain]，完全匹配「readonly [Chain, ...Chain[]]」类型
  chains: supportedChains,
  connectors: [metaMask()], // 连接器配置不变
  transports: {
    // 确保 transports 的 key 与 supportedChains 中的链ID完全对应
    [local31337.id]: http(local31337.rpcUrls.default.http[0]),
    [polygonAmoy.id]: http(polygonAmoy.rpcUrls.default.http[0]),
  }
});

// 7. 导出关键变量，供其他组件（如注册页、发帖页）使用
export { 
  selectedChain, // 当前默认链（根据环境变量动态切换）
  local31337,    // 31337 本地链配置（单独导出，便于特殊场景使用）
  polygonAmoy    // Polygon Amoy 配置（单独导出，便于特殊场景使用）
};


