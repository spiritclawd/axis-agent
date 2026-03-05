/**
 * Game Loop Executor
 * 
 * Main execution loop that ties everything together
 */

import { AxisAgent, createAgent } from './agent';
import { AxisClient, axisClient } from './axis-client';
import { analyzeGame, chooseStrategy, strategies, StrategyType } from './strategies';

export interface LoopConfig {
  tickInterval: number;       // ms between ticks
  maxRetries: number;
  retryDelay: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_CONFIG: LoopConfig = {
  tickInterval: 30000,  // 30 seconds
  maxRetries: 3,
  retryDelay: 5000,
  logLevel: 'info',
};

export class GameLoop {
  private agent: AxisAgent;
  private client: AxisClient;
  private config: LoopConfig;
  private running: boolean = false;
  private tickCount: number = 0;
  private lastTick: number = 0;

  constructor(
    agentAddress: string,
    config: Partial<LoopConfig> = {}
  ) {
    this.agent = createAgent(agentAddress);
    this.client = axisClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the game loop
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[GameLoop] Already running');
      return;
    }

    this.running = true;
    console.log('[GameLoop] Starting...');

    while (this.running) {
      await this.tick();
      await this.sleep(this.config.tickInterval);
    }
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.running = false;
    console.log('[GameLoop] Stopped');
  }

  /**
   * Execute one tick
   */
  private async tick(): Promise<void> {
    this.tickCount++;
    const startTime = Date.now();

    try {
      // 1. Fetch game state
      const state = await this.withRetry(() => this.client.getGameState());
      
      // 2. Analyze game
      const analysis = analyzeGame(state);
      
      // 3. Choose strategy
      const strategyType = chooseStrategy(analysis);
      const strategy = strategies[strategyType];
      
      // 4. Get decisions from strategy
      const decisions = strategy.decide(state, analysis);
      
      // 5. Convert to actions
      const actions = decisions.map(d => ({
        type: d.action,
        params: d.params,
        priority: d.priority,
        reason: d.reason,
      }));
      
      // 6. Execute actions (sorted by priority)
      for (const action of actions.sort((a, b) => b.priority - a.priority)) {
        try {
          const result = await this.client.executeAction(action.type, action.params);
          this.log('info', `[Tick ${this.tickCount}] Executed: ${action.type} - ${action.reason}`);
          
          // Update memory with action
          await this.client.updateMemory({
            lastAction: action.type,
            lastActionTime: new Date().toISOString(),
          });
        } catch (error: any) {
          this.log('error', `[Tick ${this.tickCount}] Action failed: ${action.type} - ${error.message}`);
        }
      }

      // 7. Log tick completion
      const duration = Date.now() - startTime;
      this.lastTick = Date.now();
      this.log('debug', `[Tick ${this.tickCount}] Completed in ${duration}ms | Strategy: ${strategyType}`);

    } catch (error: any) {
      this.log('error', `[Tick ${this.tickCount}] Tick failed: ${error.message}`);
    }
  }

  /**
   * Retry helper
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        this.log('warn', `Retry ${i + 1}/${this.config.maxRetries}: ${error.message}`);
        await this.sleep(this.config.retryDelay);
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging helper
   */
  private log(level: string, message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex >= configLevelIndex) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Get stats
   */
  getStats(): { 
    running: boolean; 
    tickCount: number; 
    lastTick: number;
  } {
    return {
      running: this.running,
      tickCount: this.tickCount,
      lastTick: this.lastTick,
    };
  }
}

/**
 * Run agent from environment
 */
export async function runFromEnv(): Promise<GameLoop> {
  const agentAddress = process.env.AGENT_ADDRESS;
  
  if (!agentAddress) {
    throw new Error('AGENT_ADDRESS environment variable required');
  }
  
  const loop = new GameLoop(agentAddress, {
    tickInterval: parseInt(process.env.TICK_INTERVAL || '30000'),
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
  });
  
  loop.start();
  
  return loop;
}
