import { AxiosInstance } from 'axios';
import { RateLimiter } from '../utils/rate-limiter';
import {
  Tweet,
  User,
  UserSearchParams,
  PaginatedResponse,
  Trend,
  TrendsParams,
  AdvancedSearchParams
} from '../types';

export class SearchEndpoints {
  constructor(
    private axios: AxiosInstance,
    private rateLimiter: RateLimiter
  ) {}

  async users(params: UserSearchParams): Promise<PaginatedResponse<User>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get('/twitter/user/search', {
        params: {
          query: params.query,
          cursor: params.cursor || ''
        }
      });

      return {
        data: response.data.users.map((user: any) => this.mapResponseToUser(user)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_next_page
      };
    });
  }

  async trending(params: TrendsParams): Promise<Trend[]> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get('/twitter/trends', {
        params: {
          woeid: params.woeid,
          count: params.count || 30
        }
      });

      // Handle nested trend structure
      return response.data.trends.map((item: any) => {
        const trend = item.trend || item;
        return {
          name: trend.name,
          target: trend.target,
          rank: trend.rank,
          meta_description: trend.meta_description || ''
        };
      });
    });
  }

  async advancedSearch(params: AdvancedSearchParams): Promise<PaginatedResponse<Tweet>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get('/twitter/tweet/advanced_search', {
        params: {
          query: params.query,
          queryType: params.queryType || 'Latest',
          cursor: params.cursor || ''
        }
      });

      return {
        data: response.data.tweets.map((tweet: any) => this.mapResponseToTweet(tweet)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_next_page
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

  private mapResponseToUser(data: any): User {
    return {
      id: data.id || data.user_id,
      username: data.username || data.screen_name,
      name: data.name || data.display_name,
      bio: data.bio || data.description,
      profilePicUrl: data.profile_pic_url || data.profile_image_url,
      followersCount: data.followers_count,
      followingCount: data.following_count || data.friends_count,
      tweetsCount: data.tweets_count || data.statuses_count,
      isVerified: data.is_verified || data.verified,
      isPrivate: data.is_private || data.protected,
      createdAt: data.created_at
    };
  }
}