/**
 * Agent Strategies for Eternum/Axis
 * 
 * Different play styles for different game states
 */

export type StrategyType = 'resource' | 'expansion' | 'defense' | 'war' | 'diplomat';

export interface StrategyDecision {
  action: string;
  params: Record<string, any>;
  priority: number;
  reason: string;
}

export interface GameAnalysis {
  gamePhase: 'early' | 'mid' | 'late';
  myRank: number;
  totalPlayers: number;
  threatLevel: 'low' | 'medium' | 'high';
  resourceAdvantage: 'poor' | 'balanced' | 'strong';
  territoryAdvantage: 'behind' | 'average' | 'ahead';
}

// Analyze game state and recommend strategy
export function analyzeGame(state: any): GameAnalysis {
  const playerCount = state.realms?.length || 0;
  const myRealms = state.realms?.filter((r: any) => r.owner === state.myAddress) || [];
  const totalRealms = state.realms?.length || 1;
  
  const myShare = myRealms.length / totalRealms;
  
  // Game phase
  let gamePhase: 'early' | 'mid' | 'late';
  if (state.tick < 100) {
    gamePhase = 'early';
  } else if (state.tick < 500) {
    gamePhase = 'mid';
  } else {
    gamePhase = 'late';
  }
  
  // Rank approximation
  const sortedByRealms = [...state.realms].sort((a, b) => 
    (b.realmCount || 1) - (a.realmCount || 1)
  );
  const myRank = sortedByRealms.findIndex((r: any) => r.owner === state.myAddress) + 1;
  
  // Threat level
  const enemyArmies = state.armies?.filter((a: any) => a.owner !== state.myAddress) || [];
  const totalEnemyStrength = enemyArmies.reduce((sum: number, a: any) => sum + (a.size || 0), 0);
  const myStrength = state.armies?.filter((a: any) => a.owner === state.myAddress)
    .reduce((sum: number, a: any) => sum + (a.size || 0), 0) || 0;
  
  const threatLevel: 'low' | 'medium' | 'high' = 
    totalEnemyStrength > myStrength * 2 ? 'high' :
    totalEnemyStrength > myStrength ? 'medium' : 'low';
  
  // Resource advantage
  const myResources = state.resources || {};
  const avgResources = Object.values(myResources).reduce((a: number, b: number) => a + b, 0) / Object.keys(myResources).length;
  
  const resourceAdvantage: 'poor' | 'balanced' | 'strong' = 
    avgResources < 100 ? 'poor' :
    avgResources < 500 ? 'balanced' : 'strong';
  
  // Territory advantage
  const territoryAdvantage: 'behind' | 'average' | 'ahead' = 
    myShare < 0.1 ? 'behind' :
    myShare < 0.25 ? 'average' : 'ahead';
  
  return {
    gamePhase,
    myRank,
    totalPlayers: playerCount,
    threatLevel,
    resourceAdvantage,
    territoryAdvantage
  };
}

// Strategy implementations
export const strategies = {
  
  resource: {
    name: 'Resource Optimizer',
    description: 'Maximize resource production and efficiency',
    
    decide(state: any, analysis: GameAnalysis): StrategyDecision[] {
      const decisions: StrategyDecision[] = [];
      
      // Build farms if food is low
      if (state.resources?.food < 200) {
        decisions.push({
          action: 'build_structure',
          params: { type: 'farm' },
          priority: 10,
          reason: 'Food below threshold'
        });
      }
      
      // Build mines if resources balanced
      if (state.resources?.iron < 100) {
        decisions.push({
          action: 'build_structure',
          params: { type: 'mine' },
          priority: 8,
          reason: 'Need iron for military'
        });
      }
      
      // Upgrade existing structures
      const structures = state.structures || [];
      const farms = structures.filter((s: any) => s.type === 'farm');
      if (farms.length > 0 && farms[0].level < 3) {
        decisions.push({
          action: 'upgrade_structure',
          params: { structure_id: farms[0].id },
          priority: 7,
          reason: 'Upgrade farm for more production'
        });
      }
      
      return decisions;
    }
  },
  
  expansion: {
    name: 'Expansionist',
    description: 'Aggressively claim territory',
    
    decide(state: any, analysis: GameAnalysis): StrategyDecision[] {
      const decisions: StrategyDecision[] = [];
      
      // Find unclaimed realms
      const unclaimedRealms = state.realms?.filter((r: any) => !r.owner) || [];
      
      if (unclaimedRealms.length > 0) {
        // Claim nearest unclaimed realm
        const nearest = unclaimedRealms[0];
        decisions.push({
          action: 'claim_realm',
          params: { realm_id: nearest.id },
          priority: 10,
          reason: 'Expand territory'
        });
      }
      
      // Recruit armies for expansion
      if (state.resources?.food > 100 && state.armies?.length < 3) {
        decisions.push({
          action: 'recruit_army',
          params: { type: 'infantry', size: 50 },
          priority: 9,
          reason: 'Build military for expansion'
        });
      }
      
      // Move armies to border
      if (state.armies?.length > 0) {
        const borderPositions = [100, 200]; // Simplified
        decisions.push({
          action: 'move_army',
          params: { 
            army_id: state.armies[0].id,
            destination: borderPositions
          },
          priority: 7,
          reason: 'Position for expansion'
        });
      }
      
      return decisions;
    }
  },
  
  defense: {
    name: 'Turtle',
    description: 'Heavy defense, fortify positions',
    
    decide(state: any, analysis: GameAnalysis): StrategyDecision[] {
      const decisions: StrategyDecision[] = [];
      
      // Build fortresses
      const myRealms = state.realms?.filter((r: any) => r.owner === state.myAddress) || [];
      
      for (const realm of myRealms.slice(0, 2)) {
        if (!realm.structures?.find((s: any) => s.type === 'fortress')) {
          decisions.push({
            action: 'build_structure',
            params: { realm_id: realm.id, type: 'fortress' },
            priority: 10,
            reason: 'Fortify realm against attacks'
          });
        }
      }
      
      // Recruit defenders
      if (state.armies?.length < myRealms.length) {
        decisions.push({
          action: 'recruit_army',
          params: { type: 'infantry', size: 30 },
          priority: 8,
          reason: 'Defenders needed for each realm'
        });
      }
      
      // Stockpile resources
      decisions.push({
        action: 'set_production',
        params: { focus: 'food' },
        priority: 6,
        reason: 'Stockpile for siege scenarios'
      });
      
      return decisions;
    }
  },
  
  war: {
    name: 'Warmonger',
    description: 'Aggressive military campaigns',
    
    decide(state: any, analysis: GameAnalysis): StrategyDecision[] {
      const decisions: StrategyDecision[] = [];
      
      const myArmies = state.armies?.filter((a: any) => a.owner === state.myAddress) || [];
      const enemies = state.realms?.filter((r: any) => r.owner !== state.myAddress && r.owner) || [];
      
      if (myArmies.length > 0 && enemies.length > 0) {
        // Find weakest enemy
        const weakest = enemies.sort((a: any, b: any) => 
          (a.defense || 0) - (b.defense || 0)
        )[0];
        
        // Move army to attack
        decisions.push({
          action: 'move_army',
          params: { 
            army_id: myArmies[0].id,
            destination: weakest.position 
          },
          priority: 10,
          reason: `Approach enemy realm ${weakest.id}`
        });
        
        // Attack if close
        const distance = Math.sqrt(
          Math.pow(myArmies[0].position[0] - weakest.position[0], 2) +
          Math.pow(myArmies[0].position[1] - weakest.position[1], 2)
        );
        
        if (distance < 10) {
          decisions.push({
            action: 'attack_realm',
            params: { 
              army_id: myArmies[0].id,
              target_realm: weakest.id 
            },
            priority: 9,
            reason: 'Attack while we have advantage'
          });
        }
      }
      
      // Recruit more units
      if (state.resources?.food > 200) {
        decisions.push({
          action: 'recruit_army',
          params: { type: 'cavalry', size: 20 },
          priority: 8,
          reason: 'Fast units for raids'
        });
      }
      
      return decisions;
    }
  },
  
  diplomat: {
    name: 'Diplomat',
    description: 'Form alliances, trade, avoid conflict',
    
    decide(state: any, analysis: GameAnalysis): StrategyDecision[] {
      const decisions: StrategyDecision[] = [];
      
      // Offer trade to neighbors
      const neighbors = state.realms?.slice(0, 3) || [];
      for (const neighbor of neighbors) {
        if (neighbor.owner && neighbor.owner !== state.myAddress) {
          decisions.push({
            action: 'propose_trade',
            params: { 
              partner: neighbor.owner,
              offer: { food: 50 },
              request: { iron: 30 }
            },
            priority: 8,
            reason: 'Build economic relationships'
          });
        }
      }
      
      // Propose alliance to weakest player
      const players = [...new Set(state.realms?.map((r: any) => r.owner) || [])];
      if (players.length > 2) {
        decisions.push({
          action: 'propose_alliance',
          params: { partner: players[players.length - 1] },
          priority: 7,
          reason: 'Alliance with underdog'
        });
      }
      
      // Minimal military, focus economy
      decisions.push({
        action: 'set_production',
        params: { focus: 'gold' },
        priority: 6,
        reason: 'Economic power over military'
      });
      
      return decisions;
    }
  }
};

// Choose best strategy based on game analysis
export function chooseStrategy(analysis: GameAnalysis): StrategyType {
  // Early game: always resource focus
  if (analysis.gamePhase === 'early') {
    return 'resource';
  }
  
  // High threat: defense
  if (analysis.threatLevel === 'high') {
    return 'defense';
  }
  
  // Strong position: war or expansion
  if (analysis.resourceAdvantage === 'strong' && analysis.territoryAdvantage !== 'behind') {
    return analysis.myRank <= 3 ? 'war' : 'expansion';
  }
  
  // Weak position: diplomat
  if (analysis.territoryAdvantage === 'behind') {
    return 'diplomat';
  }
  
  // Default: balanced expansion
  return 'expansion';
}

// Merge decisions from multiple strategies
export function mergeDecisions(
  primary: StrategyDecision[],
  secondary: StrategyDecision[],
  maxActions: number = 3
): StrategyDecision[] {
  const all = [...primary, ...secondary];
  
  // Sort by priority
  all.sort((a, b) => b.priority - a.priority);
  
  // Take top N actions
  return all.slice(0, maxActions);
}
