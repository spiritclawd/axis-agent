/**
 * Axis HTTP Client
 * 
 * Interface with the Axis CLI's headless HTTP API
 */

import { createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';

const AXIS_API_URL = 'http://localhost:3000';

export interface AxisStatus {
  status: 'running' | 'paused' | 'error';
  world: string;
  tick: number;
  agent_address: Address;
  last_action: string;
  last_action_time: string;
  pending_actions: number;
  resources: Record<string, number>;
  realms_owned: number;
  armies: number;
}

export interface AxisCommand {
  command: 'execute' | 'pause' | 'resume' | 'set_strategy';
  params?: Record<string, any>;
}

export interface AxisMemory {
  strategy: string;
  current_goal: string;
  priority_actions: string[];
  threats: Array<{ type: string; location: number[]; size: number }>;
  allies: string[];
  tick_history: Array<{ tick: number; action: string; result: string }>;
}

export interface ActionResponse {
  status: 'queued' | 'error';
  command_id?: string;
  estimated_execution?: string;
  error?: {
    code: string;
    message: string;
    action: string;
  };
}

/**
 * Axis HTTP Client
 */
export class AxisClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = AXIS_API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get current agent status
   */
  async getStatus(): Promise<AxisStatus> {
    const response = await fetch(`${this.baseUrl}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Send a command to the agent
   */
  async sendCommand(command: AxisCommand): Promise<ActionResponse> {
    const response = await fetch(`${this.baseUrl}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    return response.json();
  }

  /**
   * Get agent memory
   */
  async getMemory(): Promise<AxisMemory> {
    const response = await fetch(`${this.baseUrl}/memory`);
    if (!response.ok) {
      throw new Error(`Failed to get memory: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Update agent memory
   */
  async updateMemory(updates: Partial<AxisMemory>): Promise<{ status: string; memory_size: number }> {
    const response = await fetch(`${this.baseUrl}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    return response.json();
  }

  /**
   * Get recent actions
   */
  async getActions(limit: number = 20): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/actions?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to get actions: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get game state snapshot
   */
  async getGameState(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/state`);
    if (!response.ok) {
      throw new Error(`Failed to get game state: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Execute a specific game action
   */
  async executeAction(action: string, params: Record<string, any>): Promise<ActionResponse> {
    return this.sendCommand({
      command: 'execute',
      params: { action, ...params }
    });
  }

  /**
   * Pause the agent
   */
  async pause(): Promise<ActionResponse> {
    return this.sendCommand({ command: 'pause' });
  }

  /**
   * Resume the agent
   */
  async resume(): Promise<ActionResponse> {
    return this.sendCommand({ command: 'resume' });
  }

  /**
   * Set agent strategy
   */
  async setStrategy(strategy: string): Promise<ActionResponse> {
    return this.sendCommand({
      command: 'set_strategy',
      params: { strategy }
    });
  }
}

// Export singleton
export const axisClient = new AxisClient();
