export type PlayerSlot = "playerA" | "playerB";

export type TargetType = "ground" | "air" | "both";

export type CardKind = "troop" | "building" | "spell";

export interface CardDefinition {
  id: string;
  name: string;
  kind: CardKind;
  elixirCost: number;
  // Troop/building stats (unused for spells)
  hitpoints?: number;
  damage?: number;
  hitSpeedMs?: number; // time between attacks
  speed?: number; // tiles per second
  range?: number; // tiles
  targets?: TargetType;
  count?: number; // how many units spawn (e.g. skeleton army)
  flying?: boolean;
  // Spell stats
  spellRadius?: number;
  spellDamage?: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type EntityKind = "unit" | "tower";

export interface UnitState {
  id: string;
  owner: PlayerSlot;
  cardId: string;
  kind: EntityKind;
  pos: Vec2;
  hp: number;
  maxHp: number;
  targetId?: string;
  lastAttackAt: number;
}

export interface TowerState {
  id: string;
  owner: PlayerSlot;
  type: "king" | "left" | "right";
  pos: Vec2;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  activated: boolean; // king tower starts inactive until damaged or a princess tower falls
}

export interface PlayerState {
  slot: PlayerSlot;
  elixir: number;
  hand: string[]; // 4 card ids currently in hand
  nextCard: string; // the 5th, upcoming card
  deck: string[]; // remaining draw order
  towersLost: number;
  connected: boolean;
}

export type MatchPhase = "waiting" | "countdown" | "battle" | "overtime" | "ended";

export interface MatchState {
  phase: MatchPhase;
  elapsedMs: number;
  players: Record<PlayerSlot, PlayerState>;
  units: Record<string, UnitState>;
  towers: Record<string, TowerState>;
  winner?: PlayerSlot | "draw";
}

// Client -> server message when deploying a card
export interface DeployCardMessage {
  cardId: string;
  // Deploy position in tile coordinates, pre-validated server-side
  // against the player's own half of the arena (plus bridge once a
  // tower has fallen).
  pos: Vec2;
}
