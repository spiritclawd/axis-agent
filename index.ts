/**
 * Zaia's Axis Agent - Main Entry Point
 * 
 * Run with: bun run index.ts
 */

import { GameLoop, runFromEnv } from './game-loop';

// Configuration from environment
const AGENT_ADDRESS = process.env.AGENT_ADDRESS || '0x5Cde8717a484C7921CaC9065A424D6a49C4B7EC2';
const TICK_INTERVAL = parseInt(process.env.TICK_INTERVAL || '30000');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    ZAIA\'S AXIS AGENT                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ Agent Address: ${AGENT_ADDRESS}`);
  console.log(`║ Tick Interval: ${TICK_INTERVAL}ms`);
  console.log(`║ Log Level: ${LOG_LEVEL}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const loop = new GameLoop(AGENT_ADDRESS, {
    tickInterval: TICK_INTERVAL,
    logLevel: LOG_LEVEL as any,
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Main] Shutting down...');
    loop.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[Main] Shutting down...');
    loop.stop();
    process.exit(0);
  });

  // Start the game loop
  await loop.start();
}

main().catch((error) => {
  console.error('[Main] Fatal error:', error);
  process.exit(1);
});
