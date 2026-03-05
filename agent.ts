/**
 * Zaia's Axis Agent
 * 
 * An autonomous agent for playing Eternum/Realms onchain games
 * Built for the upcoming game jam
 * 
 * Strategy: Adaptive Resource Expansionist
 * - Prioritize resource generation early game
 * - Expand territory mid game
 * - Defend and optimize late game
 */

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Types
interface GameState {
  tick: number;
  realms: Realm[];
  armies: Army[];
  resources: Resources;
  enemies: Enemy[];
  worldConfig: WorldConfig;
}

interface Realm {
  id: number;
  owner: string;
  position: [number, number];
  resources: Resources;
  structures: Structure[];
  defense: number;
}

interface Army {
  id: number;
  owner: string;
  position: [number, number];
  size: number;
  type: 'infantry' | 'cavalry' | 'archers';
  morale: number;
}

interface Resources {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  gold: number;
  lords?: number;
}

interface Structure {
  type: 'farm' | 'mine' | 'barracks' | 'fortress';
  level: number;
  production: Resources;
}

interface Enemy {
  id: string;
  realmCount: number;
  armySize: number;
  threat: 'low' | 'medium' | 'high';
}

interface WorldConfig {
  tickInterval: number;
  mapSize: [number, number];
  resourceRates: Record<string, number>;
}

interface AgentMemory {
  strategy: Strategy;
  goals: Goal[];
  tickHistory: TickRecord[];
  relationships: Relationship[];
  lastUpdate: number;
}

interface Strategy {
  current: 'expansion' | 'defense' | 'resource' | 'war';
  reason: string;
  sinceTick: number;
}

interface Goal {
  id: string;
  description: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  deadline?: number;
}

interface TickRecord {
  tick: number;
  actions: Action[];
  result: 'success' | 'partial' | 'failed';
  stateChange: Partial<GameState>;
}

interface Action {
  type: string;
  params: Record<string, any>;
  result?: 'success' | 'failed';
  txHash?: string;
}

interface Relationship {
  agentId: string;
  type: 'ally' | 'enemy' | 'neutral';
  trust: number;
  interactions: number;
}

// The Agent
export class AxisAgent {
  private memory: AgentMemory;
  private address: string;
  private tickCount: number = 0;

  constructor(address: string) {
    this.address = address;
    this.memory = this.initializeMemory();
  }

  private initializeMemory(): AgentMemory {
    return {
      strategy: {
        current: 'resource',
        reason: 'Early game - build resource base',
        sinceTick: 0
      },
      goals: [
        {
          id: 'initial_resources',
          description: 'Accumulate 1000 food and 500 wood',
          priority: 10,
          status: 'in_progress'
        },
        {
          id: 'expand_territory',
          description: 'Claim 3 additional realms',
          priority: 8,
          status: 'pending'
        }
      ],
      tickHistory: [],
      relationships: [],
      lastUpdate: Date.now()
    };
  }

  /**
   * Main tick function - called every game tick
   */
  async tick(state: GameState): Promise<Action[]> {
    this.tickCount++;
    
    // Update strategy based on state
    this.updateStrategy(state);
    
    // Evaluate goals
    this.evaluateGoals(state);
    
    // Generate actions
    const actions = this.decideActions(state);
    
    // Record this tick
    this.recordTick(actions, state);
    
    return actions;
  }

  private updateStrategy(state: GameState): void {
    const realmCount = state.realms.filter(r => r.owner === this.address).length;
    const totalResources = this.sumResources(state.resources);
    
    // Early game: focus on resources
    if (realmCount <= 1 && totalResources < 2000) {
      this.memory.strategy = {
        current: 'resource',
        reason: `Early game: ${realmCount} realms, ${totalResources} total resources`,
        sinceTick: this.tickCount
      };
      return;
    }
    
    // Mid game: expand
    if (totalResources >= 2000 && realmCount < 5) {
      this.memory.strategy = {
        current: 'expansion',
        reason: `Mid game: sufficient resources, expanding territory`,
        sinceTick: this.tickCount
      };
      return;
    }
    
    // Check for threats
    const highThreats = state.enemies.filter(e => e.threat === 'high');
    if (highThreats.length > 0) {
      this.memory.strategy = {
        current: 'defense',
        reason: `${highThreats.length} high-threat enemies detected`,
        sinceTick: this.tickCount
      };
      return;
    }
    
    // Late game: war or optimize
    if (realmCount >= 5) {
      this.memory.strategy = {
        current: 'war',
        reason: `Dominant position: ${realmCount} realms, ready for conquest`,
        sinceTick: this.tickCount
      };
    }
  }

  private evaluateGoals(state: GameState): void {
    for (const goal of this.memory.goals) {
      if (goal.status !== 'in_progress') continue;
      
      // Check completion conditions
      switch (goal.id) {
        case 'initial_resources':
          if (state.resources.food >= 1000 && state.resources.wood >= 500) {
            goal.status = 'completed';
            this.addGoal('build_army', 'Recruit 100 infantry', 9);
          }
          break;
        case 'expand_territory':
          const myRealms = state.realms.filter(r => r.owner === this.address).length;
          if (myRealms >= 4) {
            goal.status = 'completed';
          }
          break;
      }
    }
  }

  private decideActions(state: GameState): Action[] {
    const actions: Action[] = [];
    const maxActions = 5; // Limit actions per tick
    
    switch (this.memory.strategy.current) {
      case 'resource':
        actions.push(...this.resourceActions(state));
        break;
      case 'expansion':
        actions.push(...this.expansionActions(state));
        break;
      case 'defense':
        actions.push(...this.defenseActions(state));
        break;
      case 'war':
        actions.push(...this.warActions(state));
        break;
    }
    
    return actions.slice(0, maxActions);
  }

  private resourceActions(state: GameState): Action[] {
    const actions: Action[] = [];
    const myRealms = state.realms.filter(r => r.owner === this.address);
    
    for (const realm of myRealms) {
      // Build farms if low on food
      if (state.resources.food < 500 && realm.resources.wood >= 50) {
        actions.push({
          type: 'build_structure',
          params: { realm_id: realm.id, structure_type: 'farm' }
        });
      }
      
      // Build mines if we have wood to spare
      if (realm.resources.wood >= 100 && realm.structures.filter(s => s.type === 'mine').length < 3) {
        actions.push({
          type: 'build_structure',
          params: { realm_id: realm.id, structure_type: 'mine' }
        });
      }
    }
    
    return actions;
  }

  private expansionActions(state: GameState): Action[] {
    const actions: Action[] = [];
    
    // Find unclaimed realms nearby
    const myRealmPositions = state.realms
      .filter(r => r.owner === this.address)
      .map(r => r.position);
    
    const unclaimedRealms = state.realms.filter(r => !r.owner);
    
    // Sort by distance to my realms
    const nearestUnclaimed = unclaimedRealms
      .map(realm => ({
        realm,
        distance: this.minDistanceTo(realm.position, myRealmPositions)
      }))
      .sort((a, b) => a.distance - b.distance);
    
    if (nearestUnclaimed.length > 0 && state.resources.gold >= 100) {
      actions.push({
        type: 'claim_realm',
        params: { realm_id: nearestUnclaimed[0].realm.id }
      });
    }
    
    // Move armies towards unclaimed territory
    const myArmies = state.armies.filter(a => a.owner === this.address);
    for (const army of myArmies) {
      if (nearestUnclaimed.length > 0) {
        actions.push({
          type: 'move_army',
          params: { 
            army_id: army.id, 
            destination: nearestUnclaimed[0].realm.position 
          }
        });
      }
    }
    
    return actions;
  }

  private defenseActions(state: GameState): Action[] {
    const actions: Action[] = [];
    const myRealms = state.realms.filter(r => r.owner === this.address);
    
    // Fortify all realms
    for (const realm of myRealms) {
      if (state.resources.stone >= 100) {
        actions.push({
          type: 'build_structure',
          params: { realm_id: realm.id, structure_type: 'fortress' }
        });
      }
    }
    
    // Recall armies to defend
    const myArmies = state.armies.filter(a => a.owner === this.address);
    for (const army of myArmies) {
      const nearestRealm = this.findNearestRealm(army.position, myRealms);
      if (nearestRealm) {
        actions.push({
          type: 'move_army',
          params: { army_id: army.id, destination: nearestRealm.position }
        });
      }
    }
    
    return actions;
  }

  private warActions(state: GameState): Action[] {
    const actions: Action[] = [];
    const myArmies = state.armies.filter(a => a.owner === this.address);
    const enemyRealms = state.realms.filter(r => r.owner !== this.address && r.owner);
    
    // Find weakest enemy realm
    const weakestEnemy = enemyRealms
      .sort((a, b) => a.defense - b.defense)[0];
    
    if (weakestEnemy && myArmies.length > 0) {
      // Move army to attack position
      actions.push({
        type: 'move_army',
        params: { 
          army_id: myArmies[0].id, 
          destination: weakestEnemy.position 
        }
      });
      
      // Attack if close enough
      const distance = this.distance(myArmies[0].position, weakestEnemy.position);
      if (distance < 10) {
        actions.push({
          type: 'attack_realm',
          params: { 
            army_id: myArmies[0].id, 
            target_realm: weakestEnemy.id 
          }
        });
      }
    }
    
    return actions;
  }

  // Utility functions
  private sumResources(resources: Resources): number {
    return Object.values(resources).reduce((sum, val) => sum + (val || 0), 0);
  }

  private distance(a: [number, number], b: [number, number]): number {
    return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
  }

  private minDistanceTo(point: [number, number], points: [number, number][]): number {
    if (points.length === 0) return Infinity;
    return Math.min(...points.map(p => this.distance(point, p)));
  }

  private findNearestRealm(point: [number, number], realms: Realm[]): Realm | null {
    if (realms.length === 0) return null;
    return realms.sort((a, b) => 
      this.distance(point, a.position) - this.distance(point, b.position)
    )[0];
  }

  private addGoal(id: string, description: string, priority: number): void {
    this.memory.goals.push({
      id,
      description,
      priority,
      status: 'pending'
    });
  }

  private recordTick(actions: Action[], state: GameState): void {
    this.memory.tickHistory.push({
      tick: this.tickCount,
      actions,
      result: 'success', // Will be updated after execution
      stateChange: {}
    });
    
    // Keep only last 100 ticks
    if (this.memory.tickHistory.length > 100) {
      this.memory.tickHistory = this.memory.tickHistory.slice(-100);
    }
    
    this.memory.lastUpdate = Date.now();
  }

  // Public getters
  getMemory(): AgentMemory {
    return this.memory;
  }

  getStrategy(): Strategy {
    return this.memory.strategy;
  }

  getTickCount(): number {
    return this.tickCount;
  }
}

// Export a factory function
export function createAgent(address: string): AxisAgent {
  return new AxisAgent(address);
}
