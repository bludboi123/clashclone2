// Arena is laid out in a grid of logical tiles, matching the classic
// 18x32 Clash Royale arena proportions (we use a slightly smaller grid
// for simplicity). Origin (0,0) is top-left, y increases downward.
// Player A defends the bottom, Player B defends the top.

export const ARENA_WIDTH = 18; // tiles across
export const ARENA_HEIGHT = 32; // tiles top to bottom
export const RIVER_ROW = 16; // tile row where the river sits (middle)

export const TICK_RATE = 20; // simulation ticks per second
export const TICK_MS = 1000 / TICK_RATE;

export const MATCH_DURATION_MS = 3 * 60 * 1000; // 3 minute match
export const OVERTIME_DURATION_MS = 60 * 1000;

export const ELIXIR_MAX = 10;
export const ELIXIR_REGEN_MS_NORMAL = 2800; // ms per +1 elixir
export const ELIXIR_REGEN_MS_DOUBLE = 1400; // after 2x elixir kicks in (last 60s)
export const DOUBLE_ELIXIR_AT_MS = 2 * 60 * 1000;
export const ELIXIR_START = 5;

// Lane x-centers (left lane / right lane) used for simple pathing
export const LEFT_LANE_X = 4;
export const RIGHT_LANE_X = 14;
export const CENTER_X = 9;

// Tower tile positions, mirrored for both players
export const TOWER_POSITIONS = {
  playerA: {
    king: { x: CENTER_X, y: 30 },
    left: { x: LEFT_LANE_X, y: 27 },
    right: { x: RIGHT_LANE_X, y: 27 },
  },
  playerB: {
    king: { x: CENTER_X, y: 1 },
    left: { x: LEFT_LANE_X, y: 4 },
    right: { x: RIGHT_LANE_X, y: 4 },
  },
} as const;
