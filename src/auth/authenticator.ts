import axios, { AxiosInstance } from 'axios';
import { LoginResponse, TwitterAPIConfig } from '../types';
import { handleAxiosError } from '../utils/error-handler';
import { stateManager } from '../utils/state-manager';

export class Authenticator {
  private axios: AxiosInstance;
  private loginCookie?: string;

  constructor(private config: TwitterAPIConfig) {
    this.axios = axios.create({
      baseURL: config.baseUrl || 'https://api.twitterapi.io',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      }
    });

    // Try to load cookie from state file first, fallback to config
    this.loginCookie = stateManager.getCookie() || config.loginCookie;
  }

  async login(): Promise<LoginResponse> {
    if (!this.config.email || !this.config.username || !this.config.password) {
      return {
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Email, username, and password are required for login'
      };
    }

    if (!this.config.loginProxy) {
      return {
        success: false,
        error: 'MISSING_PROXY',
        message: 'A proxy is required for login. Please provide loginProxy in config'
      };
    }

    try {
      if (!this.config.totpSecret) {
        return {
          success: false,
          error: 'MISSING_TOTP',
          message: 'TOTP secret is required. Enable 2FA on Twitter and provide the secret.'
        };
      }

      const response = await this.axios.post('/twitter/user_login_v2', {
        user_name: this.config.username,
        email: this.config.email,
        password: this.config.password,
        proxy: this.config.loginProxy,
        totp_secret: this.config.totpSecret
      });

      if (response.data.status === 'success' && response.data.login_cookies) {
        this.loginCookie = response.data.login_cookies;
        // Save cookie to state file
        stateManager.saveCookie(response.data.login_cookies);
        return {
          success: true,
          loginCookie: this.loginCookie,
          message: response.data.message || 'Login successful'
        };
      }

      return {
        success: false,
        error: response.data.error || 'LOGIN_FAILED',
        message: response.data.message || 'Login failed'
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error);
      }
      throw error;
    }
  }

  getLoginCookie(): string | undefined {
    return this.loginCookie;
  }

  setLoginCookie(cookie: string): void {
    this.loginCookie = cookie;
    stateManager.saveCookie(cookie);
  }

  isAuthenticated(): boolean {
    return !!this.loginCookie;
  }

  async verifyAuthentication(): Promise<boolean> {
    if (!this.loginCookie) {
      return false;
    }

    try {
      const response = await this.axios.get('/twitter/verify_auth', {
        headers: {
          'login_cookie': this.loginCookie
        }
      });

      return response.data.success === true;
    } catch {
      return false;
    }
  }

  clearAuthentication(): void {
    this.loginCookie = undefined;
    stateManager.clearCookie();
  }

  getAuthHeaders(): Record<string, string> {
    if (this.loginCookie) {
      return {
        'login_cookies': this.loginCookie  // v2 endpoints use 'login_cookies' (plural)
      };
    }
    return {};
  }
}