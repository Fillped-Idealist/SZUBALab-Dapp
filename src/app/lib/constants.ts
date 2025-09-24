// 从环境变量获取合约地址
// export const FORUM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FORUM_CONTRACT_ADDRESS as `0x${string}`;

export const MEMBER_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_MEMBER_CONTRACT_ADDRESS as `0x${string}`; // 替换为你的会员合约地址
// 2. PostManager 合约地址（帖子合约，用于发帖、查帖子）
export const POST_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_POST_CONTRACT_ADDRESS as `0x${string}`; // 替换为你的帖子合约部署地址（必须新增）
export const LOCAL_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID

// 分别导入两个合约的ABI
export { default as MemberABI } from '../abis/MemberABI.json'; // 原会员合约ABI
export { default as PostABI } from '../abis/PostABI.json'; // 帖子合约ABI（从Solidity编译后获取）

// 等级名称映射（与合约逻辑对应）
export const LEVEL_NAMES = [
  '新手上路', 
  '区块链爱好者', 
  '区块链达人', 
  '区块链专家',
  '区块链大师'
];

export const LEVEL_NAMES_EN = [
  'Newcomer',
  'Blockchain Enthusiast',
  'Blockchain Aficionado',
  'Blockchain Expert',
  'Blockchain Master'
];

// 每页显示帖子数量
export const POSTS_PER_PAGE = 5;
