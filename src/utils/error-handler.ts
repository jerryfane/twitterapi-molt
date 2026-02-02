import { APIError } from '../types';
import axios, { AxiosError } from 'axios';

export class TwitterAPIError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(error: APIError) {
    super(error.message);
    this.name = 'TwitterAPIError';
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.details = error.details;
  }
}

export function handleAxiosError(error: AxiosError): never {
  if (error.response) {
    const { status, data } = error.response;

    const apiError: APIError = {
      code: (data as any)?.code || 'API_ERROR',
      message: (data as any)?.message || error.message || 'An error occurred',
      statusCode: status,
      details: data
    };

    throw new TwitterAPIError(apiError);
  } else if (error.request) {
    throw new TwitterAPIError({
      code: 'NETWORK_ERROR',
      message: 'Network error - no response received',
      statusCode: 0,
      details: error.message
    });
  } else {
    throw new TwitterAPIError({
      code: 'REQUEST_ERROR',
      message: error.message || 'Failed to create request',
      statusCode: 0,
      details: error
    });
  }
}

export function isRetryableError(error: any): boolean {
  if (error instanceof TwitterAPIError) {
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.statusCode);
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const waitTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}