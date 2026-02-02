import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { TwitterAPIConfig } from './types';
import { Authenticator } from './auth/authenticator';
import { TweetEndpoints } from './endpoints/tweets';
import { UserEndpoints } from './endpoints/users';
import { SearchEndpoints } from './endpoints/search';
import { RateLimiter } from './utils/rate-limiter';
import { handleAxiosError, withRetry } from './utils/error-handler';

export class TwitterAPIClient {
  private axios: AxiosInstance;
  private authenticator: Authenticator;
  private rateLimiter: RateLimiter;

  public tweets: TweetEndpoints;
  public users: UserEndpoints;
  public search: SearchEndpoints;

  constructor(config: TwitterAPIConfig) {
    // Validate required API key
    if (!config.apiKey) {
      throw new Error('API key is required. Get one from https://twitterapi.io/?ref=0xmartian');
    }

    const baseURL = config.baseUrl || 'https://api.twitterapi.io';

    // Initialize authenticator and rate limiter first
    this.authenticator = new Authenticator(config);
    this.rateLimiter = new RateLimiter(config.maxQPS);

    this.axios = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      }
    });

    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        if (response.headers && response.config.url) {
          this.rateLimiter.updateRateLimitInfo(response.config.url, response.headers);
        }
        return response;
      },
      (error: any) => {
        if (axios.isAxiosError(error)) {
          handleAxiosError(error);
        }
        return Promise.reject(error);
      }
    );

    // Pass getLoginCookie and getProxy functions to endpoints
    const getLoginCookie = () => this.authenticator.getLoginCookie();
    const getProxy = () => this.authenticator['config'].loginProxy;
    this.tweets = new TweetEndpoints(this.axios, this.rateLimiter, getLoginCookie, getProxy);
    this.users = new UserEndpoints(this.axios, this.rateLimiter);
    this.search = new SearchEndpoints(this.axios, this.rateLimiter);
  }

  async login(credentials?: {
    email: string;
    username: string;
    password: string;
    loginProxy: string;
    totpSecret?: string;
  }) {
    if (credentials) {
      const config: TwitterAPIConfig = {
        apiKey: this.authenticator['config'].apiKey,
        email: credentials.email,
        username: credentials.username,
        password: credentials.password,
        loginProxy: credentials.loginProxy,
        totpSecret: credentials.totpSecret
      };
      this.authenticator = new Authenticator({ ...config, baseUrl: this.axios.defaults.baseURL as string });
    }

    return await this.authenticator.login();
  }

  setLoginCookie(cookie: string): void {
    this.authenticator.setLoginCookie(cookie);
  }

  getLoginCookie(): string | undefined {
    return this.authenticator.getLoginCookie();
  }

  isAuthenticated(): boolean {
    return this.authenticator.isAuthenticated();
  }

  async verifyAuthentication(): Promise<boolean> {
    return await this.authenticator.verifyAuthentication();
  }

  logout(): void {
    this.authenticator.clearAuthentication();
  }

  getRateLimitInfo(endpoint: string) {
    return this.rateLimiter.getRateLimitInfo(endpoint);
  }

  async waitForRateLimit(endpoint: string): Promise<void> {
    return this.rateLimiter.waitForRateLimit(endpoint);
  }

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    return withRetry(fn, maxRetries);
  }

  get queueSize(): number {
    return this.rateLimiter.size;
  }

  get pendingRequests(): number {
    return this.rateLimiter.pending;
  }

  async waitForIdle(): Promise<void> {
    return this.rateLimiter.onIdle();
  }

  pauseRequests(): void {
    this.rateLimiter.pause();
  }

  resumeRequests(): void {
    this.rateLimiter.start();
  }

  clearQueue(): void {
    this.rateLimiter.clear();
  }
}