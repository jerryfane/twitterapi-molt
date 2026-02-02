import PQueue from 'p-queue';
import { RateLimitInfo } from '../types';

export class RateLimiter {
  private queue: PQueue;
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();

  constructor(maxQPS: number = 200) {
    this.queue = new PQueue({
      concurrency: maxQPS,
      interval: 1000,
      intervalCap: maxQPS
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.queue.add(fn) as Promise<T>;
  }

  updateRateLimitInfo(endpoint: string, headers: any): void {
    const limit = parseInt(headers['x-rate-limit-limit'] || '0');
    const remaining = parseInt(headers['x-rate-limit-remaining'] || '0');
    const resetTime = parseInt(headers['x-rate-limit-reset'] || '0');

    if (limit && resetTime) {
      this.rateLimitInfo.set(endpoint, {
        limit,
        remaining,
        resetTime: new Date(resetTime * 1000)
      });
    }
  }

  getRateLimitInfo(endpoint: string): RateLimitInfo | undefined {
    return this.rateLimitInfo.get(endpoint);
  }

  isRateLimited(endpoint: string): boolean {
    const info = this.getRateLimitInfo(endpoint);
    if (!info) return false;

    const now = new Date();
    if (now >= info.resetTime) {
      this.rateLimitInfo.delete(endpoint);
      return false;
    }

    return info.remaining === 0;
  }

  getTimeUntilReset(endpoint: string): number {
    const info = this.getRateLimitInfo(endpoint);
    if (!info) return 0;

    const now = new Date();
    const diff = info.resetTime.getTime() - now.getTime();
    return Math.max(0, diff);
  }

  async waitForRateLimit(endpoint: string): Promise<void> {
    const waitTime = this.getTimeUntilReset(endpoint);
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  get size(): number {
    return this.queue.size;
  }

  get pending(): number {
    return this.queue.pending;
  }

  async onIdle(): Promise<void> {
    return this.queue.onIdle();
  }

  clear(): void {
    this.queue.clear();
    this.rateLimitInfo.clear();
  }

  pause(): void {
    this.queue.pause();
  }

  start(): void {
    this.queue.start();
  }
}