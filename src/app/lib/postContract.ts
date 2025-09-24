'use client';

import { 
  useWriteContract, 
  useReadContract, 
  useWaitForTransactionReceipt, 
  useWatchContractEvent 
} from 'wagmi';
import { decodeEventLog } from 'viem';
import { POST_MANAGER_ADDRESS, PostABI } from './constants';

// 1. 发布帖子
export function useCreatePost() {
  const { writeContract, data: txHash, isPending } = useWriteContract();

  const createPost = (content: string) => {
    if (content.trim().length === 0) throw new Error('内容不能为空');
    if (content.length > 500) throw new Error('内容不能超过500字符');

    return writeContract({
      address: POST_MANAGER_ADDRESS,
      abi: PostABI as readonly unknown[],
      functionName: 'createPost',
      args: [content.trim()],
      gas: BigInt(300000),
    });
  };

  const { isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  return { createPost, isPending, isSuccess, isError, error };
}

// 2. 获取所有帖子
export function useGetAllPosts() {
  const { data: postData, isLoading, isError } = useReadContract({
    address: POST_MANAGER_ADDRESS,
    abi: PostABI as readonly unknown[],
    functionName: 'getAllPosts',
  });

  const formatPosts = () => {
    if (!postData) return [];
    const [ids, authors, contents, times] = postData as [
      bigint[],
      string[],
      string[],
      bigint[]
    ];

    return ids.map((_: bigint, index: number) => ({
      id: Number(ids[index]),
      author: authors[index],
      content: contents[index],
      createTime: Number(times[index]) * 1000,
    }));
  };

  return { posts: formatPosts(), isLoading, isError };
}

// 3. 获取帖子总数
export function useGetPostTotal() {
  const { data: total, isLoading } = useReadContract({
    address: POST_MANAGER_ADDRESS,
    abi: PostABI as readonly unknown[],
    functionName: 'getPostTotal',
  });
  return { total: total ? Number(total) : 0, isLoading };
}

// 4. 监听帖子创建事件（修复类型转换错误）
export function useListenPostCreated(onNewPost: (postId: number) => void) {
  // 筛选PostCreated事件的ABI
  const getPostCreatedAbi = () => {
    const eventAbi = (PostABI as Array<{ type: string; name: string }>).find(
      (item) => item.type === 'event' && item.name === 'PostCreated'
    );
    if (!eventAbi) throw new Error('ABI中未找到PostCreated事件');
    return eventAbi;
  };

  useWatchContractEvent({
    address: POST_MANAGER_ADDRESS,
    abi: PostABI as readonly unknown[],
    eventName: 'PostCreated',
    onLogs: (logs) => {
      const postCreatedAbi = getPostCreatedAbi();

      for (const log of logs) {
        try {
          // 关键修复：先转为unknown，再转为目标类型（TypeScript允许这种转换）
          const decoded = decodeEventLog({
            abi: [postCreatedAbi] as readonly unknown[],
            data: log.data,
            topics: log.topics,
          }) as unknown as { args: { postId: bigint } };

          // 运行时校验：确保postId存在且为bigint类型
          if (decoded?.args?.postId != null && typeof decoded.args.postId === 'bigint') {
            onNewPost(Number(decoded.args.postId));
            break;
          } else {
            console.warn('解析到事件，但未找到有效的postId');
          }
        } catch (err) {
          console.error('解析事件失败：', err);
        }
      }
    },
    onError: (error) => {
      console.error('监听事件失败：', error);
    },
  });
}
