'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { formatTime, shortenAddress } from '../components/PostCard';
import { MEMBER_MANAGER_ADDRESS, POST_MANAGER_ADDRESS } from '@/app/lib/constants';
import MemberABI from '@/app/abis/MemberABI.json' assert { type: 'json' };
import { selectedChain, config } from '@/app/lib/wagmi-config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faCompass, faPlus, faBell, faUser, 
  faExclamationCircle, faSpinner, faArrowLeft, faCopy, faCheck
} from '@fortawesome/free-solid-svg-icons';
import AuthGuard from '@/app/components/AuthGuard';

// 类型定义
type WalletAddress = `0x${string}`;
interface Member {
  address: WalletAddress;
  isRegistered: boolean;
  postCount: number;
  level: string; // "1"-"5"
  joinTime: Date;
  name: string; // 会员名称
}

// 定义合约错误类型（解决 Unexpected any）
type ContractError = Error & { code?: string; data?: any };

// 地址验证工具函数
const isValidAddress = (addr: unknown): addr is WalletAddress => {
  return typeof addr === 'string' 
    && addr.startsWith('0x') 
    && addr.length === 42 
    && /^0x[0-9a-fA-F]{40}$/.test(addr);
};

// 复制工具函数
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

export default function AdminMemberManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address: currentAddress, isConnected, chainId } = useAccount();
  const isCorrectChain = chainId === selectedChain.id;

  // 客户端就绪状态（避免服务器/客户端渲染不一致）
  const [isClientReady, setIsClientReady] = useState(false);

  // 授权功能相关状态
  const [currentAuthorizedAddr, setCurrentAuthorizedAddr] = useState<WalletAddress | null>(null);
  const [newPostContractAddr, setNewPostContractAddr] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizeError, setAuthorizeError] = useState<string | null>(null);

  // 会员管理状态
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [allMemberAddresses, setAllMemberAddresses] = useState<WalletAddress[]>([]);
  const [copyStatus, setCopyStatus] = useState<{id: string, text: string} | null>(null);
  const [contractCallLogs, setContractCallLogs] = useState<string[]>([]);
  const [loadStep, setLoadStep] = useState<'init' | 'admin-check' | 'member-list' | 'member-detail' | 'done'>('init');
  const [detailLoadingStatus, setDetailLoadingStatus] = useState<Record<string, 'loading' | 'error' | 'success'>>({});

  // 日志函数（错误类型明确，解决 any）
  const log = (message: string, error?: ContractError) => {
    const timestamp = new Date().toLocaleTimeString();
    let logMsg = `[${timestamp}] ${message}`;
    if (error) {
      logMsg += ` | 错误：${error.message} | 错误码：${error.code || '未知'}`;
    }
    setContractCallLogs(prev => [...prev.slice(-10), logMsg]);
    console.log(logMsg);
  };

  // 客户端就绪后再初始化
  useEffect(() => {
    setIsClientReady(true);
    log('客户端初始化完成');
  }, []);

  // 1. 获取管理员地址（泛型完整，错误类型明确）
  const { 
    data: contractAdmin, 
    isLoading: isLoadingAdmin,
    isError: isErrorAdmin,
    error: adminError, // 类型：ContractError
    refetch: refetchAdmin
  } = useReadContract<typeof MemberABI, 'admin', [], typeof config>({
    config,
    address: MEMBER_MANAGER_ADDRESS,
    abi: MemberABI,
    functionName: 'admin',
    query: { enabled: isClientReady && isConnected && isCorrectChain }
  });

  // 2. 查询当前授权的Post合约地址（泛型完整）
  const { 
    data: authorizedAddrData, 
    isLoading: isLoadingAuthorizedAddr,
    refetch: refetchAuthorizedAddr
  } = useReadContract<typeof MemberABI, 'authorizedPostContract', [], typeof config>({
    config,
    address: MEMBER_MANAGER_ADDRESS,
    abi: MemberABI,
    functionName: 'authorizedPostContract',
    query: { enabled: isClientReady && isAdmin === true && isConnected && isCorrectChain }
  });

  // 同步当前授权地址状态
  useEffect(() => {
    if (!isClientReady || isLoadingAuthorizedAddr) return;
    if (isValidAddress(authorizedAddrData)) {
      setCurrentAuthorizedAddr(authorizedAddrData);
      log(`当前授权的Post合约地址：${shortenAddress(authorizedAddrData)}`);
    } else if (authorizedAddrData === '0x0000000000000000000000000000000000000000') {
      setCurrentAuthorizedAddr(null);
      log('当前未授权任何Post合约');
    }
  }, [isClientReady, authorizedAddrData, isLoadingAuthorizedAddr]);

  // 监听管理员地址变化（错误类型明确，解决 any）
  useEffect(() => {
    if (!isClientReady) return;
    if (contractAdmin !== undefined && !isLoadingAdmin && !isErrorAdmin) {
      setLoadStep('admin-check');
      log('管理员地址获取成功');
    }
    if (isErrorAdmin && !isLoadingAdmin) {
      // 明确错误类型，避免 any
      log('管理员地址获取失败', adminError as ContractError);
    }
  }, [isClientReady, contractAdmin, isLoadingAdmin, isErrorAdmin, adminError]);

  // 3. 获取所有会员地址（错误类型明确）
  const { 
    data: allMembersData, 
    isLoading: isLoadingAllMembers, 
    isError: isErrorAllMembers,
    error: allMembersError, // 类型：ContractError
    refetch: refetchMemberList
  } = useReadContract<typeof MemberABI, 'getAllMembers', [], typeof config>({
    config,
    address: MEMBER_MANAGER_ADDRESS,
    abi: MemberABI,
    functionName: 'getAllMembers',
    query: { enabled: isClientReady && isAdmin === true }
  });

  // 监听会员列表变化（错误类型明确）
  useEffect(() => {
    if (!isClientReady || isAdmin !== true) return;
    if (allMembersData !== undefined && !isLoadingAllMembers && !isErrorAllMembers) {
      setLoadStep('member-list');
      log(`会员地址列表获取成功，原始数据：${JSON.stringify(allMembersData)}`);
    }
    if (isErrorAllMembers && !isLoadingAllMembers) {
      log('会员列表获取失败', allMembersError as ContractError);
    }
  }, [isClientReady, allMembersData, isLoadingAllMembers, isErrorAllMembers, allMembersError, isAdmin]);

  // 4. 批量查询会员详情（catch 错误类型改为 unknown，避免 any）
  const memberQueries = useQueries({
    queries: allMemberAddresses.map((memberAddr) => ({
      queryKey: ['memberInfo', memberAddr],
      queryFn: async (): Promise<[boolean, bigint, string, bigint, string]> => {
        setDetailLoadingStatus(prev => ({ ...prev, [memberAddr]: 'loading' }));
        log(`开始获取会员 ${shortenAddress(memberAddr)} 详情（含名称字段）`);

        try {
          const res = await readContract(
            config,
            {
              abi: MemberABI,
              address: MEMBER_MANAGER_ADDRESS,
              functionName: 'getMemberInfo',
              args: [memberAddr] as [WalletAddress],
              chainId: selectedChain.id,
            }
          );

          if (!Array.isArray(res) || res.length !== 5) {
            throw new Error(`返回数据格式错误，期望5个值（含name），实际：${JSON.stringify(res)}`);
          }

          const [isRegistered, postCount, level, joinTime, name] = res as [boolean, bigint, string, bigint, string];
          setDetailLoadingStatus(prev => ({ ...prev, [memberAddr]: 'success' }));
          log(`成功获取会员 ${shortenAddress(memberAddr)} 详情，名称：${name || '未设置'}`);
          return [isRegistered, postCount, level, joinTime, name];
        } 
        catch (err: unknown) { // 改为 unknown，避免 any
          const error = err as ContractError;
          setDetailLoadingStatus(prev => ({ ...prev, [memberAddr]: 'error' }));
          log(`获取会员 ${shortenAddress(memberAddr)} 详情失败`, error);
          throw error;
        }
      },
      enabled: isClientReady && allMemberAddresses.length > 0 && isAdmin === true && isCorrectChain,
      staleTime: 30000,
      retry: 1,
      retryDelay: 2000,
      onError: (err: unknown) => { // 改为 unknown，避免 any
        const error = err as ContractError;
        log('会员详情查询失败', error);
      },
    })),
  });

  // 授权操作相关合约调用（错误类型明确）
  const { writeContract, data: authorizeTxHash, isPending: isAuthorizePending } = useWriteContract();
  const { 
    isLoading: isWaitingAuthorizeTx, 
    isSuccess: isAuthorizeSuccess, 
    isError: isAuthorizeTxError, 
    error: authorizeTxError // 类型：ContractError
  } = useWaitForTransactionReceipt({
    hash: authorizeTxHash,
    query: { enabled: isClientReady && !!authorizeTxHash }
  });

  // 授权按钮点击事件（catch 错误类型改为 unknown）
  const handleAuthorize = async () => {
    if (!isClientReady) return;
    setAuthorizeError(null);
    if (!isConnected || !currentAddress || !isAdmin) {
      setAuthorizeError('仅管理员可执行授权操作');
      return;
    }
    if (!isCorrectChain) {
      setAuthorizeError(`请切换到 ${selectedChain.name} 网络`);
      return;
    }
    const trimmedAddr = newPostContractAddr.trim();
    if (!isValidAddress(trimmedAddr)) {
      setAuthorizeError('请输入有效的以太坊地址（0x开头，42位字符）');
      return;
    }
    if (currentAuthorizedAddr === trimmedAddr) {
      setAuthorizeError('该地址已被授权，无需重复操作');
      return;
    }

    try {
      setIsAuthorizing(true);
      log(`开始授权Post合约：${shortenAddress(trimmedAddr)}`);
      await writeContract({
        address: MEMBER_MANAGER_ADDRESS,
        abi: MemberABI,
        functionName: 'authorizePostContract',
        args: [trimmedAddr as WalletAddress],
        gas: BigInt(2000000),
      });
    } catch (err: unknown) { // 改为 unknown，避免 any
      setIsAuthorizing(false);
      const error = err as ContractError;
      let errorMsg = '授权发起失败';
      if (error.message.includes('user rejected')) {
        errorMsg = '您已拒绝授权交易，请重新尝试';
      } else if (error.message.includes('insufficient funds')) {
        errorMsg = '钱包余额不足，无法支付gas费用';
      } else {
        errorMsg = `错误详情：${error.message.slice(0, 60)}...`;
      }
      setAuthorizeError(errorMsg);
      log(`授权发起失败：${errorMsg}`, error);
    }
  };

  // 监听授权交易结果（错误类型明确）
  useEffect(() => {
    if (!isClientReady) return;
    if (isWaitingAuthorizeTx) {
      setIsAuthorizing(true);
      log('授权交易已发送，等待区块确认...');
      return;
    }

    if (isAuthorizeSuccess) {
      setIsAuthorizing(false);
      setNewPostContractAddr('');
      log('授权交易成功！Post合约已获得修改发帖数权限');
      refetchAuthorizedAddr();
      setContractCallLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 授权成功：${shortenAddress(currentAuthorizedAddr || '未知地址')}`]);
      return;
    }

    if (isAuthorizeTxError && authorizeTxHash) {
      setIsAuthorizing(false);
      const error = authorizeTxError as ContractError;
      const errorMsg = `授权交易失败：${error.message.slice(0, 60)}...`;
      setAuthorizeError(errorMsg);
      log(errorMsg, error);
    }
  }, [isClientReady, isWaitingAuthorizeTx, isAuthorizeSuccess, isAuthorizeTxError, authorizeTxHash, authorizeTxError, refetchAuthorizedAddr, currentAuthorizedAddr]);

  // 聚合查询就绪状态
  const allQueriesReady = useMemo(() => 
    memberQueries.every(q => !q.isLoading && !q.isError && q.data !== undefined), 
  [memberQueries]);

  // 管理员验证逻辑（无 any 类型）
  useEffect(() => {
    if (!isClientReady) return;
    if (!isConnected || !currentAddress) {
      setIsAdmin(null);
      setLoadStep('init');
      log('未连接钱包或无地址');
      return;
    }

    if (!isCorrectChain) {
      setIsAdmin(null);
      setLoadStep('init');
      log(`链不匹配，当前链ID：${chainId}，期望链ID：${selectedChain.id}`);
      return;
    }

    if (contractAdmin === undefined || contractAdmin === null) {
      setIsAdmin(null);
      log('等待管理员地址...');
      return;
    }

    const adminAddr = isValidAddress(contractAdmin) 
      ? contractAdmin 
      : (typeof contractAdmin === 'string' ? contractAdmin : '');
    
    if (adminAddr === '') {
      setIsAdmin(false);
      log('无效管理员地址');
      return;
    }

    const isAdminResult = currentAddress.toLowerCase() === adminAddr.toLowerCase();
    setIsAdmin(isAdminResult);
    log(`管理员验证${isAdminResult ? '通过' : '失败'}`);
  }, [isClientReady, isConnected, currentAddress, isCorrectChain, contractAdmin, chainId]);

  // 会员地址列表更新（无 any 类型）
  useEffect(() => {
    if (!isClientReady || isAdmin !== true) return;
    if (isLoadingAllMembers) {
      log('会员列表加载中...');
      return;
    }

    if (isErrorAllMembers) {
      setAllMemberAddresses([]);
      log('会员列表获取失败，清空地址列表');
      return;
    }

    if (!Array.isArray(allMembersData)) {
      setAllMemberAddresses([]);
      log(`会员列表数据不是数组，原始数据：${JSON.stringify(allMembersData)}`);
      return;
    }

    const validAddresses = allMembersData.filter(addr => {
      const isValid = isValidAddress(addr);
      if (!isValid) {
        log(`过滤无效会员地址：${JSON.stringify(addr)}`);
      }
      return isValid;
    });
    
    setAllMemberAddresses(validAddresses);
    log(`会员地址列表更新：有效地址数${validAddresses.length}`);
  }, [isClientReady, isAdmin, isLoadingAllMembers, isErrorAllMembers, allMembersData]);

  // 会员详情解析（无 any 类型）
  useEffect(() => {
    if (!isClientReady || isAdmin !== true || isLoadingAllMembers || isErrorAllMembers || allMemberAddresses.length === 0) {
      if (members.length > 0) setMembers([]);
      return;
    }

    if (!allQueriesReady) {
      if (loadStep !== 'member-detail') {
        setLoadStep('member-detail');
        log('会员详情加载中...');
      }
      return;
    }

    const parsedMembers: Member[] = [];
    allMemberAddresses.forEach((addr, index) => {
      const data = memberQueries[index].data;
      if (data) {
        const [isRegistered, postCount, level, joinTime, name] = data;
        parsedMembers.push({
          address: addr,
          isRegistered,
          postCount: Number(postCount),
          level: ['1', '2', '3', '4', '5'].includes(level) ? level : '1',
          joinTime: new Date(Number(joinTime) * 1000),
          name: name || '未设置名称'
        });
      } else {
        log(`会员 ${shortenAddress(addr)} 详情数据为空`);
      }
    });

    parsedMembers.sort((a, b) => b.joinTime.getTime() - a.joinTime.getTime());
    if (JSON.stringify(parsedMembers) !== JSON.stringify(members)) {
      setMembers(parsedMembers);
      if (loadStep !== 'done') {
        setLoadStep('done');
        log(`会员数据解析完成：共${parsedMembers.length}个会员`);
      }
    }
  }, [isClientReady, isAdmin, isLoadingAllMembers, isErrorAllMembers, allMemberAddresses, memberQueries, allQueriesReady, members, loadStep]);

  // 聚合加载状态
  const isLoading = useMemo(() => {
    const stepPending = loadStep !== 'done';
    const stepsLoading = isLoadingAdmin || isLoadingAllMembers || memberQueries.some(q => q.isLoading);
    const adminPending = isAdmin === null;
    return stepPending && (stepsLoading || adminPending);
  }, [loadStep, isLoadingAdmin, isLoadingAllMembers, memberQueries, isAdmin]);

  // 错误状态聚合
  const isError = useMemo(() => {
    return isErrorAdmin || isErrorAllMembers || memberQueries.some(q => q.isError);
  }, [isErrorAdmin, isErrorAllMembers, memberQueries]);

  // 单条会员详情重试函数
  const retrySingleMemberDetail = (memberAddr: WalletAddress) => {
    log(`手动重试获取会员 ${shortenAddress(memberAddr)} 详情`);
    queryClient.invalidateQueries({ queryKey: ['memberInfo', memberAddr] });
  };

  // 整体重试函数
  const handleRetryAll = () => {
    log('手动重试所有数据加载');
    setLoadStep('init');
    refetchAdmin();
    if (isAdmin === true) refetchMemberList();
    queryClient.invalidateQueries({ queryKey: ['memberInfo'] });
  };

  // 复制状态处理
  useEffect(() => {
    if (copyStatus) {
      const timer = setTimeout(() => setCopyStatus(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  // 导航函数
  const handleGoToAddMember = () => {
    if (isClientReady && isConnected && isCorrectChain && isAdmin) {
      router.push('/members/add_member');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white">
      {/* 顶部导航栏 */}
      <header className="glass-effect border border-border fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" 
              style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <i className="fa fa-connectdevelop text-white text-xl relative z-10"></i>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r text-gradient pl-1">SZUBALab</h1>
          </div>
          <AuthGuard>
            {currentAddress && (
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border hover:bg-white/5 transition"
              >
                <FontAwesomeIcon icon={faUser} />
                <span className="text-sm">{shortenAddress(currentAddress)}</span>
              </Link>
            )}
          </AuthGuard>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 pt-16 pb-24 relative z-10 max-w-5xl">
        {/* 页面标题与返回按钮 */}
        <div className="flex flex-row items-center justify-between mb-3 mt-1 gap-4">
          <h1 className="text-2xl font-bold text-[#EAE6F2]">会员管理</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="mb-6 mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect border border-border text-purple-400 hover:bg-white/5 hover:text-white transition"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
              <span>返回</span>
            </button>
          </div>
        </div>

        {/* 非管理员提示 */}
        {isClientReady && isAdmin === false && (
          <div className="mb-8 glass-effect border border-red-800/30 rounded-xl p-6 bg-red-900/20 text-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400 text-3xl mb-4" />
            <h2 className="text-xl font-bold text-[#EAE6F2] mb-2">无管理员权限</h2>
            <p className="text-[#EAE6F2]/80 mb-6">仅合约管理员可访问此页面，请使用管理员钱包连接</p>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
            >
              返回首页
            </button>
          </div>
        )}

        {/* 未连接钱包/链不匹配提示 */}
        {isClientReady && isAdmin === null && (
          <div className="mb-8 glass-effect border border-orange-800/30 rounded-xl p-6 bg-orange-900/20 text-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-orange-400 text-3xl mb-4" />
            <h2 className="text-xl font-bold text-[#EAE6F2] mb-2">请完成前置准备</h2>
            <p className="text-[#EAE6F2]/80 mb-4">
              {!isConnected ? '请先连接钱包' : `请切换到 ${selectedChain.name} 网络`}
            </p>
            <button
              onClick={() => router.refresh()}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition"
            >
              刷新状态
            </button>
          </div>
        )}

        {/* 管理员功能区 */}
        {isClientReady && isAdmin === true && (
          <>
            {/* 加载进度提示 */}
            <div className="glass-effect border border-gray-700/30 rounded-xl p-4 mb-6 bg-[#1A182E]/60 text-xs text-[#EAE6F2]/80 flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#EAE6F2]">加载进度：</span>
              <span>初始化 {loadStep !== 'init' && <span className="text-green-400">✅</span>}</span>
              <span>→</span>
              <span>管理员验证 {loadStep === 'admin-check' ? <span className="text-blue-400">🔄</span> : loadStep >= 'member-list' && <span className="text-green-400">✅</span>}</span>
              <span>→</span>
              <span>会员列表 {loadStep === 'member-list' ? <span className="text-blue-400">🔄</span> : loadStep >= 'member-detail' && <span className="text-green-400">✅</span>}</span>
              <span>→</span>
              <span>会员详情 {loadStep === 'member-detail' ? <span className="text-blue-400">🔄</span> : loadStep === 'done' && <span className="text-green-400">✅</span>}</span>
              
              {isError && (
                <button 
                  onClick={handleRetryAll}
                  className="ml-auto text-purple-400 hover:underline flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin text-xs" />
                  重试全部
                </button>
              )}
            </div>

            {/* 地址显示区域 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="glass-effect border border-gray-700/30 rounded-xl p-4 bg-[#1A182E]/60 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-[#EAE6F2]/60">当前钱包地址</h3>
                  {currentAddress && isValidAddress(currentAddress) && (
                    <button
                      onClick={() => {
                        copyToClipboard(currentAddress);
                        setCopyStatus({ id: 'current', text: '已复制!' });
                      }}
                      className="text-xs text-purple-400 hover:text-white flex items-center gap-1"
                    >
                      {copyStatus?.id === 'current' ? (
                        <>
                          <FontAwesomeIcon icon={faCheck} className="text-xs" />
                          已复制
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCopy} className="text-xs" />
                          复制
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="font-mono text-sm text-[#EAE6F2]">
                  {!isConnected ? (
                    <span className="text-orange-400">未连接钱包</span>
                  ) : !currentAddress ? (
                    <span className="text-[#EAE6F2]/60">获取地址中...</span>
                  ) : isValidAddress(currentAddress) ? (
                    shortenAddress(currentAddress)
                  ) : (
                    <span className="text-red-400">无效地址: {currentAddress}</span>
                  )}
                </div>
              </div>

              <div className="glass-effect border border-gray-700/30 rounded-xl p-4 bg-[#1A182E]/60 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-[#EAE6F2]/60">合约管理员地址</h3>
                  {isValidAddress(contractAdmin) && (
                    <button
                      onClick={() => {
                        copyToClipboard(contractAdmin);
                        setCopyStatus({ id: 'admin', text: '已复制!' });
                      }}
                      className="text-xs text-purple-400 hover:text-white flex items-center gap-1"
                    >
                      {copyStatus?.id === 'admin' ? (
                        <>
                          <FontAwesomeIcon icon={faCheck} className="text-xs" />
                          已复制
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCopy} className="text-xs" />
                          复制
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="font-mono text-sm text-[#EAE6F2]">
                {/* 使用更清晰的条件渲染结构 */}
                {isLoadingAdmin ? (
                  <div className="h-4 bg-[#1A182E]/80 animate-pulse rounded w-3/4"></div>
                ) : isErrorAdmin ? (
                  // 确保 adminError 是一个 Error 对象再访问 message
                  <span className="text-red-400">
                    获取失败：{(adminError as Error).message.slice(0, 40)}...
                  </span>
                ) : typeof contractAdmin === 'string' ? (
                  // **核心修复**: 先检查 contractAdmin 是否为 string，解决 unknown 类型问题
                  isValidAddress(contractAdmin) ? (
                    shortenAddress(contractAdmin)
                  ) : (
                    <span className="text-red-400">无效地址: {contractAdmin}</span>
                  )
                ) : (
                  <span className="text-[#EAE6F2]/60">未知地址</span>
                )}
              </div>
              </div>
            </div>

            {/* Post合约授权模块 */}
            <div className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-8 bg-[#1A182E]/60">
              <h2 className="text-xl font-bold text-[#EAE6F2] mb-4 flex items-center gap-2">
                <span>🔒 Post合约授权管理</span>
                {isLoadingAuthorizedAddr && <span className="text-xs text-[#EAE6F2]/60">（加载中...）</span>}
              </h2>

              {/* 当前授权状态 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#EAE6F2]/60 mb-2">当前授权状态</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {isLoadingAuthorizedAddr ? (
                    <div className="h-4 bg-[#1A182E]/80 animate-pulse rounded w-48"></div>
                  ) : currentAuthorizedAddr ? (
                    <span className="text-green-400 font-medium">
                      已授权：{shortenAddress(currentAuthorizedAddr)}
                    </span>
                  ) : (
                    <span className="text-orange-400">未授权任何Post合约（需授权后才能正常发帖）</span>
                  )}
                  {currentAuthorizedAddr && (
                    <button
                      onClick={() => {
                        copyToClipboard(currentAuthorizedAddr);
                        setCopyStatus({ id: 'authorized', text: '已复制!' });
                      }}
                      className="text-xs text-purple-400 hover:text-white flex items-center gap-1"
                    >
                      {copyStatus?.id === 'authorized' ? (
                        <>
                          <FontAwesomeIcon icon={faCheck} className="text-xs" />
                          已复制
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCopy} className="text-xs" />
                          复制地址
                        </>
                      )}
                    </button>
                  )}
                </div>
                {/* 修复未转义引号：将双引号改为单引号 */}
                <p className="text-xs text-[#EAE6F2]/60 mt-1">
                  说明：仅授权的Post合约可调用「增加/减少发帖数」功能，默认推荐地址：{shortenAddress(POST_MANAGER_ADDRESS as string)}
                </p>
              </div>

              {/* 授权操作表单 */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-[#EAE6F2]/60 mb-3">执行授权操作</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#EAE6F2]/80 mb-1">
                      新Post合约地址
                    </label>
                    <input
                      type="text"
                      value={newPostContractAddr}
                      // 核心修改：为事件参数 e 指定类型 React.ChangeEvent<HTMLInputElement>，消除 any
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPostContractAddr(e.target.value)}
                      // 同时修复未转义引号：将双引号改为单引号
                      placeholder='输入要授权的Post合约地址（0x开头）'
                      className={`w-full p-2 bg-[#1A182E]/80 border rounded-lg text-[#EAE6F2] focus:outline-none focus:ring-2 transition ${
                        authorizeError && authorizeError.includes('地址') 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-600 focus:ring-purple-500'
                      }`}
                      disabled={isAuthorizing || isAuthorizePending || isWaitingAuthorizeTx}
                    />
                  </div>

                  <button
                    onClick={handleAuthorize}
                    className={`w-full py-2 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      isAuthorizing || isAuthorizePending || isWaitingAuthorizeTx
                        ? 'bg-purple-700/50 text-white/80'
                        : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:shadow-lg hover:shadow-purple-700/20'
                    }`}
                    disabled={isAuthorizing || isAuthorizePending || isWaitingAuthorizeTx}
                  >
                    {isAuthorizing || isAuthorizePending || isWaitingAuthorizeTx ? (
                      <span className="flex items-center justify-center gap-1">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-xs" />
                        授权中...
                      </span>
                    ) : (
                      '确认授权'
                    )}
                  </button>
                </div>

                {/* 授权提示 */}
                {authorizeError && (
                  <div className="mt-3 text-sm text-red-400 glass-effect border border-red-800/30 bg-red-900/20 p-2 rounded-lg flex items-center gap-1">
                    <FontAwesomeIcon icon={faExclamationCircle} className="text-xs" />
                    {authorizeError}
                  </div>
                )}

                {isAuthorizeSuccess && (
                  <div className="mt-3 text-sm text-green-400 glass-effect border border-green-800/30 bg-green-900/20 p-2 rounded-lg flex items-center gap-1">
                    <FontAwesomeIcon icon={faCheck} className="text-xs" />
                    授权成功！Post合约已获得操作权限
                  </div>
                )}
              </div>
            </div>

            {/* 调试信息与日志 */}
            <div className="glass-effect border border-gray-700/30 rounded-xl p-4 mb-8 bg-[#1A182E]/60">
              <h3 className="font-medium text-[#EAE6F2] mb-3">调试信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4 text-xs text-[#EAE6F2]/80">
                <div>合约地址: {shortenAddress(MEMBER_MANAGER_ADDRESS as string)}</div>
                <div>当前链ID: <span className={isCorrectChain ? 'text-green-400' : 'text-red-400'}>{chainId}</span></div>
                <div>管理员状态: <span className={isAdmin === true ? 'text-green-400' : isAdmin === false ? 'text-red-400' : 'text-[#EAE6F2]/60'}>
                  {isAdmin === true ? '是' : isAdmin === false ? '否' : '验证中'}
                </span></div>
                <div>会员地址数: {allMemberAddresses.length}</div>
                <div>详情加载成功: {Object.values(detailLoadingStatus).filter(s => s === 'success').length}</div>
                <div>详情加载失败: {Object.values(detailLoadingStatus).filter(s => s === 'error').length}</div>
                {currentAuthorizedAddr && (
                  <div>已授权Post合约: {shortenAddress(currentAuthorizedAddr)}</div>
                )}
                {members.length > 0 && (
                  <div>已设置名称会员数: {members.filter(m => m.name !== '未设置名称').length}</div>
                )}
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-medium text-[#EAE6F2]/60 mb-2">操作日志:</h4>
                <div className="font-mono text-xs bg-[#1A182E]/80 p-3 rounded-lg h-24 overflow-y-auto text-[#EAE6F2]/80">
                  {contractCallLogs.length === 0 ? (
                    <span className="text-[#EAE6F2]/40">暂无日志</span>
                  ) : (
                    contractCallLogs.map((log, i) => <div key={i}>{log}</div>)
                  )}
                </div>
              </div>
            </div>

            {/* 会员统计卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="glass-effect border border-gray-700/30 rounded-xl p-4 sm:p-6 bg-[#1A182E]/60">
                <p className="text-sm text-[#EAE6F2]/60 mb-1">总会员数</p>
                <p className="text-3xl font-bold text-[#EAE6F2]">
                  {isLoading ? '加载中...' : members.length}
                </p>
              </div>
              <div className="glass-effect border border-gray-700/30 rounded-xl p-4 sm:p-6 bg-[#1A182E]/60">
                <p className="text-sm text-[#EAE6F2]/60 mb-1">活跃会员数（等级≥2）</p>
                <p className="text-3xl font-bold text-green-400">
                  {isLoading ? '加载中...' : members.filter(m => Number(m.level) >= 2).length}
                </p>
              </div>
              <div className="glass-effect border border-gray-700/30 rounded-xl p-4 sm:p-6 bg-[#1A182E]/60">
                <p className="text-sm text-[#EAE6F2]/60 mb-1">普通会员数（等级1）</p>
                <p className="text-3xl font-bold text-blue-400">
                  {isLoading ? '加载中...' : members.filter(m => m.level === '1').length}
                </p>
              </div>
            </div>
            <div className="mb-8 flex justify-end">
              <button
                onClick={handleGoToAddMember}
                disabled={!isClientReady || !isConnected || !isCorrectChain || !isAdmin}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  !isClientReady || !isConnected || !isCorrectChain || !isAdmin
                    ? 'bg-purple-700/50 text-white/80'
                    : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:shadow-lg hover:shadow-purple-700/20'
                }`}
              >
                <FontAwesomeIcon icon={faPlus} className="text-sm" />
                添加新会员
              </button>
            </div>

            {/* 会员详情加载状态 */}
            {isLoading && loadStep === 'member-detail' ? (
              <div className="glass-effect border border-gray-700/30 rounded-xl p-6 mb-8 bg-[#1A182E]/60">
                <div className="text-center mb-6">
                  <div className="animate-spin h-10 w-10 border-4 border-gray-600 border-t-purple-500 rounded-full mx-auto mb-4"></div>
                  <p className="text-[#EAE6F2]/80">获取会员详情中...</p>
                  <p className="text-xs text-[#EAE6F2]/60 mt-2">
                    已成功加载 {Object.values(detailLoadingStatus).filter(s => s === 'success').length}/{allMemberAddresses.length} 条数据
                  </p>
                </div>

                <div className="mt-4 border-t border-gray-700/30 pt-4">
                  <h4 className="text-sm font-medium text-[#EAE6F2]/80 mb-3">加载明细：</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {/* 修复未使用的变量：若有_改为()，当前代码无_，故无需修改 */}
                    {allMemberAddresses.map(addr => (
                      <div key={addr} className="flex items-center gap-2 p-2 rounded-lg bg-[#1A182E]/80 border border-gray-700/30">
                        <span className="text-[#EAE6F2]/80">{shortenAddress(addr)}</span>
                        {detailLoadingStatus[addr] === 'loading' && <span className="text-blue-400"><FontAwesomeIcon icon={faSpinner} className="fa-spin text-xs" /></span>}
                        {detailLoadingStatus[addr] === 'success' && <span className="text-green-400"><FontAwesomeIcon icon={faCheck} className="text-xs" /></span>}
                        {detailLoadingStatus[addr] === 'error' && (
                          <button 
                            onClick={() => retrySingleMemberDetail(addr)}
                            className="text-red-400 hover:text-white flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faExclamationCircle} className="text-xs" />
                            重试
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : isError && loadStep === 'member-detail' ? (
              <div className="glass-effect border border-red-800/30 rounded-xl p-6 mb-8 bg-red-900/20">
                <div className="text-center mb-6">
                  <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400 text-2xl mb-2" />
                  <p className="text-[#EAE6F2]/80">部分会员详情获取失败</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button 
                    onClick={handleRetryAll}
                    className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full hover:shadow-lg hover:shadow-purple-700/20 transition text-sm"
                  >
                    重试全部
                  </button>
                  <button 
                    onClick={() => {
                      Object.entries(detailLoadingStatus)
                        .filter(([_, status]) => status === 'error') // 此处_未使用，改为[addr, status]
                        .forEach(([addr]) => retrySingleMemberDetail(addr as WalletAddress));
                    }}
                    className="px-4 py-2 glass-effect border border-border text-[#EAE6F2] rounded-full hover:bg-white/5 transition text-sm"
                  >
                    只重试失败项
                  </button>
                </div>
              </div>
            ) : members.length === 0 ? (
              <div className="glass-effect border border-gray-700/30 rounded-xl p-8 mb-8 bg-[#1A182E]/60 text-center">
                <h3 className="text-lg font-bold text-[#EAE6F2] mb-2">暂无会员数据</h3>
                <p className="text-[#EAE6F2]/80 mb-6">请点击"添加新会员"按钮，添加首个会员</p>
              </div>
            ) : (
              // 会员列表表格
              <div className="overflow-x-auto glass-effect border border-gray-700/30 rounded-xl bg-[#1A182E]/60">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[#EAE6F2]/60 uppercase bg-[#1A182E]/80">
                    <tr>
                      <th scope="col" className="px-6 py-3">会员名称</th>
                      <th scope="col" className="px-6 py-3">会员地址</th>
                      <th scope="col" className="px-6 py-3">注册时间</th>
                      <th scope="col" className="px-6 py-3">发帖数</th>
                      <th scope="col" className="px-6 py-3">会员等级</th>
                      <th scope="col" className="px-6 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.address} className="border-t border-gray-700/30 hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-medium text-[#EAE6F2]">
                          {member.name || '未设置名称'}
                        </td>
                        <td className="px-6 py-4 font-medium text-[#EAE6F2]">
                          <Link
                            href={`/profile/${member.address}`}
                            className="text-purple-400 hover:text-white hover:underline"
                          >
                            {shortenAddress(member.address)}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-[#EAE6F2]/80">{formatTime(member.joinTime)}</td>
                        <td className="px-6 py-4 text-[#EAE6F2]/80">{member.postCount}</td>
                        <td className="px-6 py-4">{member.level}</td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/profile/${member.address}`}
                            className="text-xs text-purple-400 hover:text-white hover:underline flex items-center gap-1"
                          >
                            查看详情
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* 底部导航栏 */}
      <nav className="glass-effect border-t border-gray-700/30 fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-[#1A182E]/60">
        <div className="flex justify-around items-center py-3">
          <Link
            href="/"
            className="flex flex-col items-center text-purple-400 hover:text-white transition"
          >
            <FontAwesomeIcon icon={faHome} className="text-lg mb-1" />
            <span className="text-xs">首页</span>
          </Link>
          <Link
            href="/explore"
            className="flex flex-col items-center text-[#EAE6F2]/60 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faCompass} className="text-lg mb-1" />
            <span className="text-xs">发现</span>
          </Link>
          <Link
            href="/posts/create"
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full 
                  bg-gradient-to-r from-[#6B46C1] to-[#A05AD5]
                  -mt-8 shadow-lg shadow-[#6B46C1]/30"
          >
            <FontAwesomeIcon icon={faPlus} className="text-lg scale-110" />
          </Link>
          <Link
            href="/notifications"
            className="flex flex-col items-center text-[#EAE6F2]/60 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faBell} className="text-lg mb-1" />
            <span className="text-xs">通知</span>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center text-[#EAE6F2]/60 hover:text-purple-400 transition"
          >
            <FontAwesomeIcon icon={faUser} className="text-lg mb-1" />
            <span className="text-xs">我的</span>
          </Link>
        </div>
      </nav>

      {/* 全局样式 */}
      <style>
        {`
          .glass-effect {
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          .border-border {
            border-color: rgba(255, 255, 255, 0.2);
          }
          .text-gradient {
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-image: linear-gradient(to right, #EAE6F2, #A05AD5);
          }
        `}
      </style>
    </div>
  );
}
