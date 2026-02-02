import { AxiosInstance } from 'axios';
import { RateLimiter } from '../utils/rate-limiter';
import {
  User,
  UserActionResponse,
  FollowParams,
  PaginatedResponse,
  Tweet,
  TimelineParams
} from '../types';

export class UserEndpoints {
  constructor(
    private axios: AxiosInstance,
    private rateLimiter: RateLimiter
  ) {}

  async getById(userId: string): Promise<User> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/user/${userId}`);
      return this.mapResponseToUser(response.data);
    });
  }

  async getByUsername(username: string): Promise<User> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/user/username/${username}`);
      return this.mapResponseToUser(response.data);
    });
  }

  async getMultiple(userIds: string[]): Promise<User[]> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.post('/twitter/users/bulk', {
        user_ids: userIds
      });
      return response.data.users.map((user: any) => this.mapResponseToUser(user));
    });
  }

  async follow(params: FollowParams): Promise<UserActionResponse> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.post('/twitter/follow_user_v2', {
        user_id: params.userId,
        enable_notifications: params.notifications
      });

      return {
        success: response.data.success,
        userId: params.userId,
        message: response.data.message
      };
    });
  }

  async unfollow(userId: string): Promise<UserActionResponse> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.post('/twitter/unfollow_user_v2', {
        user_id: userId
      });

      return {
        success: response.data.success,
        userId: userId,
        message: response.data.message
      };
    });
  }

  async block(userId: string): Promise<UserActionResponse> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.post('/twitter/user/block', {
        user_id: userId
      });

      return {
        success: response.data.success,
        userId: userId,
        message: response.data.message
      };
    });
  }

  async unblock(userId: string): Promise<UserActionResponse> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.post('/twitter/user/unblock', {
        user_id: userId
      });

      return {
        success: response.data.success,
        userId: userId,
        message: response.data.message
      };
    });
  }

  async mute(userId: string): Promise<UserActionResponse> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.post('/twitter/user/mute', {
        user_id: userId
      });

      return {
        success: response.data.success,
        userId: userId,
        message: response.data.message
      };
    });
  }

  async unmute(userId: string): Promise<UserActionResponse> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.post('/twitter/user/unmute', {
        user_id: userId
      });

      return {
        success: response.data.success,
        userId: userId,
        message: response.data.message
      };
    });
  }

  async getFollowers(
    userId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<User>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/user/${userId}/followers`, {
        params: {
          limit: params?.limit || 50,
          cursor: params?.cursor
        }
      });

      return {
        data: response.data.followers.map((user: any) => this.mapResponseToUser(user)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_more
      };
    });
  }

  async getFollowing(
    userId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<User>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/user/${userId}/following`, {
        params: {
          limit: params?.limit || 50,
          cursor: params?.cursor
        }
      });

      return {
        data: response.data.following.map((user: any) => this.mapResponseToUser(user)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_more
      };
    });
  }

  async getTweets(
    userId: string,
    params?: TimelineParams
  ): Promise<PaginatedResponse<Tweet>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/user/${userId}/tweets`, {
        params: {
          limit: params?.limit || 20,
          cursor: params?.cursor,
          include_replies: params?.includeReplies
        }
      });

      return {
        data: response.data.tweets.map((tweet: any) => this.mapResponseToTweet(tweet)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_more
      };
    });
  }

  async getLikedTweets(
    userId: string,
    params?: TimelineParams
  ): Promise<PaginatedResponse<Tweet>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/user/${userId}/likes`, {
        params: {
          limit: params?.limit || 20,
          cursor: params?.cursor
        }
      });

      return {
        data: response.data.tweets.map((tweet: any) => this.mapResponseToTweet(tweet)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_more
      };
    });
  }

  async getMediaTweets(
    userId: string,
    params?: TimelineParams
  ): Promise<PaginatedResponse<Tweet>> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.get(`/twitter/user/${userId}/media`, {
        params: {
          limit: params?.limit || 20,
          cursor: params?.cursor
        }
      });

      return {
        data: response.data.tweets.map((tweet: any) => this.mapResponseToTweet(tweet)),
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_more
      };
    });
  }

  async updateProfile(params: {
    name?: string;
    bio?: string;
    location?: string;
    website?: string;
  }): Promise<UserActionResponse> {
    return this.rateLimiter.execute(async () => {
      const response = await this.axios.post('/twitter/user/update_profile', params);

      return {
        success: response.data.success,
        message: response.data.message
      };
    });
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