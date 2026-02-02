export { TwitterAPIClient } from './client';
export { TwitterAPIError } from './utils/error-handler';
export { RateLimiter } from './utils/rate-limiter';
export { Authenticator } from './auth/authenticator';

export * from './types';
export { WOEID, SEARCH_OPERATORS } from './types';

import { TwitterAPIClient } from './client';
import { TwitterAPIConfig } from './types';

export function createClient(config: TwitterAPIConfig): TwitterAPIClient {
  return new TwitterAPIClient(config);
}

export default TwitterAPIClient;