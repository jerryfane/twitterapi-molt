import { TwitterAPIClient } from '../src/client';
import { TwitterAPIError } from '../src/utils/error-handler';

describe('TwitterAPIClient', () => {
  let client: TwitterAPIClient;

  beforeEach(() => {
    client = new TwitterAPIClient({
      apiKey: 'test_api_key',
      baseUrl: 'https://api.twitterapi.io',
      maxQPS: 10
    });
  });

  describe('initialization', () => {
    it('should create a client instance', () => {
      expect(client).toBeInstanceOf(TwitterAPIClient);
    });

    it('should throw error when apiKey is missing', () => {
      expect(() => {
        new TwitterAPIClient({
          baseUrl: 'https://api.twitterapi.io'
        } as any);
      }).toThrow('API key is required. Get one from https://twitterapi.io/?ref=0xmartian');
    });

    it('should have tweets endpoints', () => {
      expect(client.tweets).toBeDefined();
      expect(client.tweets.create).toBeDefined();
      expect(client.tweets.delete).toBeDefined();
      expect(client.tweets.like).toBeDefined();
    });

    it('should have users endpoints', () => {
      expect(client.users).toBeDefined();
      expect(client.users.getById).toBeDefined();
      expect(client.users.follow).toBeDefined();
      expect(client.users.unfollow).toBeDefined();
    });

    it('should have search endpoints', () => {
      expect(client.search).toBeDefined();
      expect(client.search.advancedSearch).toBeDefined();
      expect(client.search.users).toBeDefined();
      expect(client.search.trending).toBeDefined();
    });
  });

  describe('authentication', () => {
    it('should return false when not authenticated', () => {
      expect(client.isAuthenticated()).toBe(false);
    });

    it('should set and get login cookie', () => {
      const testCookie = 'test_cookie_value';
      client.setLoginCookie(testCookie);
      expect(client.getLoginCookie()).toBe(testCookie);
      expect(client.isAuthenticated()).toBe(true);
    });

    it('should clear authentication on logout', () => {
      client.setLoginCookie('test_cookie');
      expect(client.isAuthenticated()).toBe(true);

      client.logout();
      expect(client.isAuthenticated()).toBe(false);
      expect(client.getLoginCookie()).toBeUndefined();
    });
  });

  describe('rate limiting', () => {
    it('should have rate limiter methods', () => {
      expect(client.queueSize).toBeDefined();
      expect(client.pendingRequests).toBeDefined();
      expect(client.pauseRequests).toBeDefined();
      expect(client.resumeRequests).toBeDefined();
      expect(client.clearQueue).toBeDefined();
    });

    it('should pause and resume requests', () => {
      client.pauseRequests();
      client.resumeRequests();
      expect(client.queueSize).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle TwitterAPIError', () => {
      const error = new TwitterAPIError({
        code: 'TEST_ERROR',
        message: 'Test error message',
        statusCode: 400
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TwitterAPIError);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
    });
  });
});