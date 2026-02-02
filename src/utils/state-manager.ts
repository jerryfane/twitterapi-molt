import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = '.twitter-bot-state.json';

export interface BotState {
  cookie?: string;
  cookieExpiry?: string;
  lastHeartbeat?: string;
  conversations?: Record<string, any>;
}

export class StateManager {
  private statePath: string;

  constructor(customPath?: string) {
    this.statePath = customPath || path.join(process.cwd(), STATE_FILE);
  }

  saveState(state: BotState): void {
    try {
      const currentState = this.loadState();
      const mergedState = { ...currentState, ...state };
      fs.writeFileSync(this.statePath, JSON.stringify(mergedState, null, 2));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  loadState(): BotState {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = fs.readFileSync(this.statePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
    return {
      cookie: undefined,
      cookieExpiry: undefined,
      lastHeartbeat: undefined,
      conversations: {}
    };
  }

  getCookie(): string | undefined {
    const state = this.loadState();
    return state.cookie;
  }

  saveCookie(cookie: string): void {
    this.saveState({
      cookie,
      cookieExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    });
  }

  clearCookie(): void {
    this.saveState({
      cookie: undefined,
      cookieExpiry: undefined
    });
  }

  updateHeartbeat(): void {
    this.saveState({
      lastHeartbeat: new Date().toISOString()
    });
  }

  shouldHeartbeat(intervalHours: number = 4): boolean {
    const state = this.loadState();
    if (!state.lastHeartbeat) return true;

    const hoursSince = (Date.now() - new Date(state.lastHeartbeat).getTime()) / 3600000;
    return hoursSince >= intervalHours;
  }

  isExpired(): boolean {
    const state = this.loadState();
    if (!state.cookieExpiry) return false;
    return new Date(state.cookieExpiry) < new Date();
  }

  deleteState(): void {
    try {
      if (fs.existsSync(this.statePath)) {
        fs.unlinkSync(this.statePath);
      }
    } catch (error) {
      console.error('Failed to delete state file:', error);
    }
  }
}

export const stateManager = new StateManager();