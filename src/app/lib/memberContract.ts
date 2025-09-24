'use client';

// 统一导入顺序：Wagmi 钩子 → 项目常量 → ABI
import { useReadContract, useWriteContract } from 'wagmi';
import { MEMBER_MANAGER_ADDRESS } from './constants';
import MemberABI from '../abis/MemberABI.json';

/**
 * 校验指定地址是否为已注册会员
 * @param address - 待校验的钱包地址（可选，未传时不触发查询）
 * @returns 会员状态（isMember）、关联数据（发帖数/等级等）及查询状态（加载/错误）
 */
export function useCheckIsMember(address?: string) {
  // 调用会员合约的 getMemberInfo 方法查询数据
  const { data: memberInfo, isLoading, isError } = useReadContract({
    address: MEMBER_MANAGER_ADDRESS, // 会员合约地址
    abi: MemberABI as readonly unknown[], // 适配低版本 Wagmi，无需 Abi 类型
    functionName: 'getMemberInfo', // 合约中查询会员信息的方法名
    args: address ? [address as `0x${string}`] : undefined, // 地址类型断言，匹配合约要求
    query: {
      enabled: !!address, // 仅当地址存在时触发查询（避免无地址查空）
      refetchOnWindowFocus: true, // 窗口聚焦时重新查询，防止状态过期
      refetchInterval: 0, // 禁用自动轮询，减少不必要的合约调用
    },
  });

  // 安全解析合约返回值：确保是数组才处理，避免非数组类型导致的索引错误
  const memberData = Array.isArray(memberInfo) ? (memberInfo as unknown[]) : undefined;

  return {
    // 核心修复：初始值为 undefined（表示“未验证完成”），而非 false（避免误判非会员）
    isMember: memberData ? (memberData[0] as boolean) : undefined,
    postCount: memberData ? Number(memberData[1]) : 0, // 合约返回 bigint → 转前端常用 number
    level: memberData ? (memberData[2] as string) : '新手上路', // 会员等级默认值
    joinTime: memberData ? Number(memberData[3]) * 1000 : 0, // 秒级时间戳 → 转毫秒级（适配 Date）
    isLoading, // 查询加载中状态（用于前端显示“验证中”）
    isError, // 查询错误状态（用于前端显示“验证失败”）
  };
}

/**
 * 调用会员合约，增加指定用户的发帖数
 * @returns 增加发帖数的函数（需传入会员地址）
 */
export function useIncreasePostCount() {
  const { writeContract } = useWriteContract(); // 获取 Wagmi 合约写入钩子

  // 返回封装后的函数，供外部调用
  return (memberAddr: string) => {
    // 前端预校验：避免无效地址导致合约 revert
    if (!memberAddr.startsWith('0x') || memberAddr.length !== 42) {
      throw new Error('无效的钱包地址格式，请检查地址是否正确');
    }

    // 调用合约的 increasePostCount 方法
    return writeContract({
      address: MEMBER_MANAGER_ADDRESS,
      abi: MemberABI as readonly unknown[],
      functionName: 'increasePostCount', // 合约中增加发帖数的方法名
      args: [memberAddr as `0x${string}`], // 地址类型断言，匹配合约要求
      gas: BigInt(100000), // 手动设置 Gas 限额（bigint 类型，适配低版本 Wagmi）
    });
  };
}