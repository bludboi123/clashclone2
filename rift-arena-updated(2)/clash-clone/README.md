# Rift Arena

A small original real-time arena battler prototype built with Phaser, TypeScript, Vite, and Colyseus. It uses a tiled arena, two lanes/bridges, tower objectives, elixir, a rotating four-card hand, a deck workshop, and a matchmaking queue.

## Requirements

- Node.js 20+
- npm

## Run locally

From this folder:

```bash
npm install
npm run build
```

Open two terminals in this folder:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Open the Vite URL shown by the client terminal. The multiplayer server must be reachable by both players. For Codespaces or hosting, set `VITE_SERVER_URL` to the public WebSocket URL of the server (for example `wss://your-server.example`).

## Current prototype notes

- Cards are original variants, are treated as max level, and have no evolution system.
- The deck workshop lets you choose eight cards from the roster; deck choice is sent to the match server.
- Matchmaking is room-based and works when two clients connect to the same running server.
- The Clubs page currently demonstrates four-digit code entry in the client UI. Persistent clubs, membership, and club chat still need server-side storage and endpoints.
- Combat and visuals are a prototype, not a production-balanced or feature-complete commercial game.
