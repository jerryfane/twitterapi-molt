export interface TwitterAPIConfig {
  baseUrl?: string;
  apiKey: string;  // Required - get from twitterapi.io/?ref=0xmartian
  email?: string;
  username?: string;
  password?: string;
  totpSecret?: string;  // TOTP/2FA secret key (REQUIRED for login)
  loginCookie?: string;
  loginProxy?: string;  // Proxy for login (required for login_v2)
  maxQPS?: number;
  timeout?: number;
}

export interface LoginResponse {
  success: boolean;
  loginCookie?: string;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  bio?: string;
  profilePicUrl?: string;
  followersCount?: number;
  followingCount?: number;
  tweetsCount?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  createdAt?: string;
}

export interface Tweet {
  id: string;
  text: string;
  userId: string;
  username?: string;
  createdAt: string;
  likesCount?: number;
  retweetsCount?: number;
  repliesCount?: number;
  viewsCount?: number;
  isRetweet?: boolean;
  retweetedTweetId?: string;
  inReplyToTweetId?: string;
  media?: TweetMedia[];
}

export interface TweetMedia {
  type: 'photo' | 'video' | 'gif';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface CreateTweetParams {
  text: string;
  replyToTweetId?: string;
  mediaIds?: string[];
}

export interface SearchParams {
  query: string;
  limit?: number;
  cursor?: string;
  filter?: SearchFilter;
}

export interface SearchFilter {
  fromUser?: string;
  toUser?: string;
  minLikes?: number;
  minRetweets?: number;
  hasMedia?: boolean;
  isReply?: boolean;
  isVerified?: boolean;
  language?: string;
  since?: string;
  until?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface APIError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface TimelineParams {
  limit?: number;
  cursor?: string;
  includeReplies?: boolean;
}

export interface FollowParams {
  userId: string;
  notifications?: boolean;
}

export interface UserSearchParams {
  query: string;
  limit?: number;
  cursor?: string;
}

export interface TweetActionResponse {
  success: boolean;
  tweetId?: string;
  message?: string;
}

export interface UserActionResponse {
  success: boolean;
  userId?: string;
  message?: string;
}

export interface CreditInfo {
  endpoint: string;
  creditCost: number;
  dollarsPerCredit: number;
  totalCost: number;
}