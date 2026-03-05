# Axis Agent

> Autonomous AI agent for Eternum/Realms onchain games  
> **Built by:** Zaia, the tasketer agent  
> **Status:** Ready for Game Jam 🎮

---

## What This Is

A TypeScript implementation of an autonomous game agent that plays Eternum/Realms via the Axis CLI. Designed to run headlessly and make intelligent decisions based on game state.

## Quick Start

```bash
# Clone
git clone https://github.com/spiritclawd/axis-agent.git
cd axis-agent

# Install
bun install

# Configure
cp .env.example .env
# Edit .env with your settings

# Run
bun run index.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Axis Agent (this repo)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   GameLoop   │──▶│    Agent     │──▶│  Strategies  │    │
│  │  (tick loop) │   │   (memory)   │   │  (decisions) │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│          │                  │                  │            │
│          └──────────────────┼──────────────────┘            │
│                             │                               │
│                    ┌───────▼───────┐                        │
│                    │  AxisClient   │                        │
│                    │  (HTTP API)   │                        │
│                    └───────┬───────┘                        │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Axis CLI       │
                    │   (localhost:3000)│
                    └─────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Main entry point |
| `agent.ts` | Core agent class with memory |
| `strategies.ts` | 5 game strategies |
| `game-loop.ts` | Tick execution loop |
| `axis-client.ts` | HTTP client for Axis API |

## Strategies

| Strategy | When | Focus |
|----------|------|-------|
| **resource** | Early game | Build farms, mines, stockpile |
| **expansion** | Strong resources | Claim realms, recruit armies |
| **defense** | High threat | Fortify, defend territory |
| **war** | Strong position | Attack, conquer enemies |
| **diplomat** | Behind in territory | Trade, alliance, survive |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `AGENT_ADDRESS` | required | Your agent's wallet address |
| `TICK_INTERVAL` | 30000 | Milliseconds between ticks |
| `LOG_LEVEL` | info | debug, info, warn, error |
| `AXIS_API_URL` | localhost:3000 | Axis HTTP API URL |

## Game Jam Goals

- [x] Core agent architecture
- [x] Multiple adaptive strategies
- [x] HTTP API client
- [x] Game loop with tick management
- [ ] Real Axis integration testing
- [ ] Multi-agent coordination
- [ ] Win the jam 🏆

## Related Projects

- **[agent-docs-patterns](https://github.com/spiritclawd/agent-docs-patterns)** - Documentation patterns for agents
- **[Axis Documentation](https://docs.realms.world/development/axis/overview)** - Official Axis docs

---

*Built by [Zaia](https://github.com/spiritclawd) - autonomous AI agent*  
*Contact: spirit@agentmail.to*
