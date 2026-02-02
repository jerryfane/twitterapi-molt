import { AxiosInstance } from 'axios';
import { RateLimiter } from '../utils/rate-limiter';
import {
  Tweet,
  CreateTweetParams,
  TweetActionResponse,
  TimelineParams,
  MentionsParams,
  RepliesParams,
  PaginatedResponse
} from '../types';

export class TweetEndpoints {
  constructor(
    private axios: AxiosInstance,
    private rateLimiter: RateLimiter,
    private getLoginCookie: () => string | undefined,
    private getProxy?: () => string | undefined
  ) {}

  async create(params: CreateTweetParams): Promise<TweetActionResponse> {
    return this.rateLimiter.execute(async () => {
      const loginCookie = this.getLoginCookie();
      if (!loginCookie) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.axios.post('/twitter/create_tweet_v2', {
        login_cookies: loginCookie,
        tweet_text: params.text,
        proxy: this.getProxy ? this.getProxy() : undefined,
        reply_to_tweet_id: params.replyToTweetId,
        media_ids: params.mediaIds
      });

      return {
        success: response.data.status === 'success',
        tweetId: response.data.tweet_id,
        message: response.data.msg || response.data.message
      };
    });
  }

  async delete(tweetId: string): Promise<TweetActionResponse> {
    return this.rateLimiter.execute(async () => {
      const loginCookie = this.getLoginCookie();
      if (!loginCookie) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.axios.post('/twitter/tweet/delete', {
        login_cookies: loginCookie,
        tweet_id: tweetId
      });

      return {
        success: response.data.status === 'success',
        tweetId: tweetId,
        message: response.data.msg || response.data.message
      };
    });
  }

  async like(tweetId: string): Promise<TweetActionResponse> {
    return this.rateLimiter.execute(async () => {
      const loginCookie = this.getLoginCookie();
      if (!loginCookie) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.axios.post('/twitter/like_tweet_v2', {
        login_cookies: loginCookie,
        tweet_id: tweetId,
        proxy: this.getProxy ? this.getProxy() : undefined
      });

      return {
        success: response.data.status === 'success',
        tweetId: tweetId,
        message: response.data.msg || response.data.message
      };
    });
  }

  async unlike(tweetId: string): Promise<TweetActionResponse> {
    return this.rateLimiter.execute(async () => {
      const loginCookie = this.getLoginCookie();
      if (!loginCookie) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.axios.post('/twitter/unlike_tweet_v2', {
        login_cookies: loginCookie,
        tweet_id: tweetId,
        proxy: this.getProxy ? this.getProxy() : undefined
      });

      return {
        success: response.data.status === 'success',
        tweetId: tweetId,
        message: response.data.msg || response.data.message
      };
    });
  }

  async retweet(tweetId: string): Promise<TweetActionResponse> {
    return this.rateLimiter.execute(async () => {
      const loginCookie = this.getLoginCookie();
      if (!loginCookie) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.axios.post('/twitter/retweet_tweet_v2', {
        login_cookies: loginCookie,
        tweet_id: tweetId,
        proxy: this.getProxy ? this.getProxy() : undefined
      });

      return {
        success: response.data.status === 'success',
        tweetId: response.data.retweet_id || tweetId,
        message: response.data.msg || response.data.message
      };
    });
  }

  async unretweet(tweetId: string): Promise<TweetActionResponse> {
    return this.rateLimiter.execute(async () => {
      const loginCookie = this.getLoginCookie();
      if (!loginCookie) {
        throw new Error('Not authenticated. Please login first.');
      }

      const response = await this.axios.post('/twitter/unretweet_tweet_v2', {
        login_cookies: loginCookie,
        tweet_id: tweetId,
        proxy: this.getProxy ? this.getProxy() : undefined
      });

      return {
        success: response.data.status === 'success',
        tweetId: tweetId,
        message: response.data.msg || response.data.message
      };
    });
  }

  async getById(tweetId: string): Promise<Tweet> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/tweet/${tweetId}`);
      return this.mapResponseToTweet(response.data);
    });
  }

  async getReplies(params: RepliesParams): Promise<PaginatedResponse<Tweet>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get('/twitter/tweet/replies/v2', {
        params: {
          tweetId: params.tweetId,
          cursor: params.cursor || '',
          queryType: params.queryType || 'Relevance'
        }
      });

      return {
        data: response.data.replies.map((tweet: any) => this.mapResponseToTweet(tweet)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_next_page
      };
    });
  }

  async getQuotes(
    tweetId: string,
    params?: TimelineParams
  ): Promise<PaginatedResponse<Tweet>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/tweet/${tweetId}/quotes`, {
        params: {
          limit: params?.limit || 20,
          cursor: params?.cursor
        }
      });

      return {
        data: response.data.quotes.map((tweet: any) => this.mapResponseToTweet(tweet)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_more
      };
    });
  }

  async getLikers(
    tweetId: string,
    limit: number = 100
  ): Promise<string[]> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/tweet/${tweetId}/likers`, {
        params: { limit }
      });

      return response.data.user_ids;
    });
  }

  async getRetweeters(
    tweetId: string,
    limit: number = 100
  ): Promise<string[]> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/tweet/${tweetId}/retweeters`, {
        params: { limit }
      });

      return response.data.user_ids;
    });
  }


  async getMentions(params: MentionsParams): Promise<PaginatedResponse<Tweet>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get('/twitter/user/mentions', {
        params: {
          userName: params.userName,
          cursor: params.cursor || '',
          sinceTime: params.sinceTime,
          untilTime: params.untilTime
        }
      });

      return {
        data: response.data.mentions.map((tweet: any) => this.mapResponseToTweet(tweet)),
        nextCursor: response.data.cursor,
        hasMore: !!response.data.cursor  // Has more if cursor is returned
      };
    });
  }

  private mapResponseToTweet(data: any): Tweet {
    return {
      id: data.id || data.tweet_id,
      text: data.text || data.content,
      userId: data.user_id || data.author_id,
      username: data.username || data.author_username,
      createdAt: data.created_at || data.timestamp,
      likesCount: data.likes_count || data.favorite_count,
      retweetsCount: data.retweets_count || data.retweet_count,
      repliesCount: data.replies_count || data.reply_count,
      viewsCount: data.views_count || data.impression_count,
      isRetweet: data.is_retweet || false,
      retweetedTweetId: data.retweeted_tweet_id,
      inReplyToTweetId: data.in_reply_to_tweet_id,
      media: data.media || []
    };
  }
}