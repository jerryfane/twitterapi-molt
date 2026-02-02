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

export interface MentionsParams {
  userName: string;  // Required - the username to get mentions for
  cursor?: string;
  limit?: number;
  sinceTime?: number;  // Unix timestamp in seconds
  untilTime?: number;  // Unix timestamp in seconds
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

export interface AccountInfo {
  recharge_credits: number;
}

export interface Trend {
  name: string;
  target: {
    query: string;
  };
  rank: number;
  meta_description: string;
}

export interface TrendsParams {
  woeid: number;  // Where On Earth ID - see https://gist.github.com/tedyblood/5bb5a9f78314cc1f478b3dd7cde790b9
  count?: number; // Default 30, min 30
}

// Common WOEID values for trending
export const WOEID = {
  WORLDWIDE: 1,
  USA: 23424977,
  UK: 23424975,
  CANADA: 23424775,
  AUSTRALIA: 23424748,
  JAPAN: 23424856,
  BRAZIL: 23424768,
  MEXICO: 23424900,
  INDIA: 23424848,
  NEW_YORK: 2459115,
  LOS_ANGELES: 2442047,
  CHICAGO: 2379574,
  LONDON: 44418,
  TOKYO: 1118370,
  PARIS: 615702,
  // Full list: https://gist.github.com/tedyblood/5bb5a9f78314cc1f478b3dd7cde790b9
} as const;

export interface AdvancedSearchParams {
  query: string;  // Advanced query syntax - see examples below and https://github.com/igorbrigadir/twitter-advanced-search
  queryType?: 'Latest' | 'Top';  // Default: Latest
  cursor?: string;
}

// Advanced Search Query Examples and Operators
export const SEARCH_OPERATORS = {
  // User filters
  FROM: 'from:',        // from:username - tweets from user
  TO: 'to:',           // to:username - replies to user
  MENTIONS: '@',       // @username - mentioning user

  // Date filters (format: YYYY-MM-DD or YYYY-MM-DD_HH:MM:SS_UTC)
  SINCE: 'since:',     // since:2021-12-31 - tweets since date
  UNTIL: 'until:',     // until:2024-01-01 - tweets until date

  // Engagement filters
  MIN_LIKES: 'min_faves:',      // min_faves:100
  MIN_RETWEETS: 'min_retweets:', // min_retweets:50
  MIN_REPLIES: 'min_replies:',   // min_replies:10

  // Content filters
  FILTER_MEDIA: 'filter:media',     // has images/videos
  FILTER_IMAGES: 'filter:images',   // has images
  FILTER_VIDEOS: 'filter:videos',   // has videos
  FILTER_LINKS: 'filter:links',     // has links
  FILTER_REPLIES: 'filter:replies', // is a reply
  FILTER_RETWEETS: 'include:retweets', // include retweets

  // Language
  LANG: 'lang:',       // lang:en - English tweets

  // Operators
  OR: 'OR',           // term1 OR term2
  AND: ' ',           // space acts as AND
  NOT: '-',           // -term excludes term
  EXACT: '""',        // "exact phrase"

  // Example queries:
  // '"AI" OR "machine learning" from:elonmusk since:2023-01-01'
  // 'crypto min_faves:100 -filter:replies lang:en'
  // '@OpenAI filter:media since:2024-01-01_00:00:00_UTC'
} as const;

export interface VerifiedFollowersParams {
  userId: string;
  cursor?: string;
}

export interface BatchUserParams {
  userIds: string[];  // Array of user IDs
}

export interface RepliesParams {
  tweetId: string;
  cursor?: string;
  queryType?: 'Relevance' | 'Latest' | 'Likes';  // Default: Relevance
}

export interface FollowersParams {
  userName: string;
  cursor?: string;
  pageSize?: number;  // Default 200, min 20, max 200
}

export interface FollowingParams {
  userName: string;
  cursor?: string;
  pageSize?: number;  // Default 200, min 20, max 200
}