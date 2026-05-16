# Space Mission Simulator

Browser-based space mission game with **Python (FastAPI)** simulation and **React + Phaser** visuals.

## Monorepo layout

```
Space-Mission-Simulator/
├── package.json          # root scripts — build/dev from here
├── frontend/             React + Vite + Phaser
├── backend/              FastAPI + simulation engine
├── docs/sds.md
└── docker-compose.yml
```

## Quick start (from repo root)

### Prerequisites

- Python 3.12+
- Node.js 20+

### Install everything

```bash
npm run install:all
```

### Development (API + frontend together)

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173) (proxies `/api` and `/ws` to the API)
- API: [http://localhost:8000](http://localhost:8000)

### Build (from root)

```bash
npm run build
```

| Script | What it does |
|--------|----------------|
| `npm run build` | Frontend production build + backend compile check |
| `npm run build:web` | `frontend/dist` only |
| `npm run build:api` | `compileall` on `backend/app` |
| `npm test` | Backend pytest + frontend build |
| `npm run test:api` | Backend tests only |
| `npm run seed` | Load YAML missions into the database |

### Run production API only

```bash
npm run start:api
```

Serve the built frontend separately (`npm run preview:web` after `npm run build:web`).

## Docker (full stack)

```bash
docker-compose up --build
```

- Web UI: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:8000](http://localhost:8000)

## Features

| Phase | Delivered |
|-------|-----------|
| **0 — Scaffold** | Monorepo, Docker, GitHub CI, Phaser boot starfield |
| **1 — Core loop** | Guest session, WebSocket sim @ 20Hz, HUD, debrief |
| **2 — Polish** | Galaxy map, hangar loadout → sim, medals, particles |
| **3 — Accounts** | Register/login, guest progress merge, replay keyframes |
| **4 — Scale** | 5 missions, crafting bay, daily challenge |

## Missions

| Mission | Objective |
|---------|-----------|
| Tutorial: First Ignition | Hold ≥ 80 km for 5 s |
| Low Earth Insertion | Orbit 200–280 km for 5 s |
| Debris Field | Reach beacon |
| Asteroid Survey | Survey orbit 150–220 km for 6 s |
| Moon Landing | Soft-land on lunar beacon |

## Game flow

Main menu → Galaxy map → Briefing → Hangar → Flight → Debrief → Crafting / Account

**Controls:** W or ↑ thrust · A/D rotate · on-screen buttons for touch

## Architecture

- Server-authoritative physics (duck-typed components)
- Mission YAML in `backend/content/missions/`
- See [docs/sds.md](docs/sds.md)
