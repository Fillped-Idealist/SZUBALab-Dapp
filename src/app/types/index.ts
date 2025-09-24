// app/types/index.ts
// 帖子类型接口（跨组件复用：首页、PostCard、帖子详情页等）
export interface Post {
  id: number;          // 帖子ID（合约返回uint256，前端转number）
  author: string;      // 作者钱包地址
  title: string;       // 帖子标题
  content: string;     // 帖子内容
  timestamp: Date;     // 发布时间（合约返回秒级时间戳，前端转Date）
}