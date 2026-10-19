import { Room, Client } from "colyseus";
import {
  CARDS,
  TOWER_POSITIONS,
  ARENA_WIDTH,
  RIVER_ROW,
  ELIXIR_MAX,
  ELIXIR_START,
  ELIXIR_REGEN_MS_NORMAL,
  ELIXIR_REGEN_MS_DOUBLE,
  DOUBLE_ELIXIR_AT_MS,
  MATCH_DURATION_MS,
  OVERTIME_DURATION_MS,
  TICK_MS,
  CardDefinition,
  PlayerSlot,
} from "@clash-clone/shared";
import { GameState, PlayerSchema, TowerSchema, UnitSchema, Vec2Schema } from "../schema/GameState";
import { CardCycle } from "../deck";

interface DeployPayload {
  cardId: string;
  x: number;
  y: number;
}

const TOWER_HP = {
  king: 2400,
  left: 1400,
  right: 1400,
};
const KING_DAMAGE = 110;
const KING_HIT_SPEED_MS = 1000;
const KING_RANGE = 7;

let unitSeq = 0;
function nextUnitId(): string {
  unitSeq += 1;
  return `u${unitSeq}`;
}

export class BattleRoom extends Room<GameState> {
  maxClients = 2;

  private cycles: Record<PlayerSlot, CardCycle> = {} as any;
  private elixirAccum: Record<PlayerSlot, number> = { playerA: 0, playerB: 0 };
  private slotBySession: Record<string, PlayerSlot> = {};

  onCreate() {
    this.setState(new GameState());
    this.state.phase = "waiting";

    this.onMessage("deploy", (client, payload: DeployPayload) => {
      this.handleDeploy(client, payload);
    });

    this.setSimulationInterval(() => this.tick(), TICK_MS);
  }

  onJoin(client: Client, options: { deck?: string[] } = {}) {
    const slot: PlayerSlot = Object.keys(this.slotBySession).length === 0 ? "playerA" : "playerB";
    this.slotBySession[client.sessionId] = slot;

    const player = new PlayerSchema();
    player.slot = slot;
    player.elixir = ELIXIR_START;
    player.connected = true;
    player.sessionId = client.sessionId;

    const cycle = new CardCycle(options.deck);
    this.cycles[slot] = cycle;
    player.hand.push(...cycle.hand);
    player.nextCard = cycle.next;

    this.state.players.set(slot, player);
    this.spawnTowersFor(slot);

    if (this.state.players.size === 2) {
      this.startCountdown();
    }
  }

  onLeave(client: Client) {
    const slot = this.slotBySession[client.sessionId];
    const player = slot && this.state.players.get(slot);
    if (player) player.connected = false;
    // Simple forfeit: if a match is in progress and someone leaves, the
    // other player wins after a short grace period could be added later.
    if (this.state.phase === "battle" || this.state.phase === "overtime") {
      const other: PlayerSlot = slot === "playerA" ? "playerB" : "playerA";
      this.state.winner = other;
      this.state.phase = "ended";
    }
  }

  private spawnTowersFor(slot: PlayerSlot) {
    const positions = TOWER_POSITIONS[slot];
    (["king", "left", "right"] as const).forEach((type) => {
      const t = new TowerSchema();
      t.id = `${slot}-${type}`;
      t.owner = slot;
      t.towerType = type;
      t.pos = posSchema(positions[type].x, positions[type].y);
      t.maxHp = TOWER_HP[type];
      t.hp = TOWER_HP[type];
      t.activated = type !== "king"; // princess towers always active; king waits
      this.state.towers.set(t.id, t);
    });
  }

  private startCountdown() {
    this.state.phase = "countdown";
    this.clock.setTimeout(() => {
      this.state.phase = "battle";
    }, 3000);
  }

  private handleDeploy(client: Client, payload: DeployPayload) {
    if (this.state.phase !== "battle" && this.state.phase !== "overtime") return;
    const slot = this.slotBySession[client.sessionId];
    if (!slot) return;
    const player = this.state.players.get(slot);
    if (!player) return;

    const card = CARDS[payload.cardId];
    if (!card) return;
    if (player.elixir < card.elixirCost) return;

    if (!this.isValidDeployPosition(slot, payload.x, payload.y)) return;

    const cycle = this.cycles[slot];
    if (!cycle.play(payload.cardId)) return; // not actually in hand — ignore (desync/cheat)

    player.elixir = round1(player.elixir - card.elixirCost);
    player.hand.splice(0, player.hand.length, ...cycle.hand);
    player.nextCard = cycle.next;

    this.spawnCardUnits(slot, card, payload.x, payload.y);
  }

  // Own half only, unless that player's opponent has lost a princess
  // tower on that lane (classic "cross the bridge" rule) — simplified
  // here to: own half always allowed, far half allowed only after the
  // nearest enemy princess tower on that side has fallen.
  private isValidDeployPosition(slot: PlayerSlot, x: number, y: number): boolean {
    if (x < 0 || x > ARENA_WIDTH || y < 0 || y > 32) return false;

    const ownHalf = slot === "playerA" ? y > RIVER_ROW : y < RIVER_ROW;
    if (ownHalf) return true;

    const enemy: PlayerSlot = slot === "playerA" ? "playerB" : "playerA";
    const lane = x < ARENA_WIDTH / 2 ? "left" : "right";
    const enemyTower = this.state.towers.get(`${enemy}-${lane}`);
    return !!enemyTower?.destroyed;
  }

  private spawnCardUnits(slot: PlayerSlot, card: CardDefinition, x: number, y: number) {
    if (card.kind === "spell") {
      this.applySpell(slot, card, x, y);
      return;
    }

    const count = card.count ?? 1;
    const spread = 0.6;
    for (let i = 0; i < count; i++) {
      const u = new UnitSchema();
      u.id = nextUnitId();
      u.owner = slot;
      u.cardId = card.id;
      u.kind = "unit";
      const offset = (i - (count - 1) / 2) * spread;
      u.pos = posSchema(x + offset, y);
      u.maxHp = card.hitpoints ?? 100;
      u.hp = u.maxHp;
      this.state.units.set(u.id, u);
    }
  }

  private applySpell(slot: PlayerSlot, card: CardDefinition, x: number, y: number) {
    const radius = card.spellRadius ?? 2.5;
    const dmg = card.spellDamage ?? 0;

    for (const unit of this.state.units.values()) {
      if (unit.owner === slot) continue; // friendly fire off for now
      if (dist(unit.pos, { x, y }) <= radius) {
        this.damageUnit(unit, dmg);
      }
    }
    for (const tower of this.state.towers.values()) {
      if (tower.owner === slot || tower.destroyed) continue;
      if (dist(tower.pos, { x, y }) <= radius) {
        this.damageTower(tower, dmg);
      }
    }
  }

  private tick() {
    if (this.state.phase === "waiting" || this.state.phase === "countdown") return;
    if (this.state.phase === "ended") return;

    const dt = TICK_MS / 1000;
    this.state.elapsedMs += TICK_MS;

    this.tickElixir(dt);
    this.tickUnits(dt);
    this.tickTowers(dt);
    this.checkMatchEnd();
  }

  private tickElixir(dt: number) {
    const regenMs =
      this.state.elapsedMs >= DOUBLE_ELIXIR_AT_MS ? ELIXIR_REGEN_MS_DOUBLE : ELIXIR_REGEN_MS_NORMAL;
    const perSecond = 1000 / regenMs;

    for (const slot of ["playerA", "playerB"] as PlayerSlot[]) {
      const player = this.state.players.get(slot);
      if (!player) continue;
      this.elixirAccum[slot] += perSecond * dt;
      if (this.elixirAccum[slot] >= 1) {
        const whole = Math.floor(this.elixirAccum[slot]);
        this.elixirAccum[slot] -= whole;
        player.elixir = Math.min(ELIXIR_MAX, round1(player.elixir + whole));
      }
    }
  }

  private tickUnits(dt: number) {
    const now = this.state.elapsedMs;

    for (const unit of this.state.units.values()) {
      if (unit.hp <= 0) continue;
      const card = CARDS[unit.cardId];
      if (!card) continue;

      const target = this.findTarget(unit, card);
      if (!target) continue;

      const range = card.range ?? 1;
      const d = dist(unit.pos, targetPos(target));

      if (d > range) {
        // Move straight toward target. A full implementation would use
        // lane-aware pathing + flow fields to route around the river
        // and other units; this direct-line version is enough for a
        // first playable build.
        const speed = card.speed ?? 1;
        const dx = targetPos(target).x - unit.pos.x;
        const dy = targetPos(target).y - unit.pos.y;
        const len = Math.hypot(dx, dy) || 1;
        unit.pos.x += (dx / len) * speed * dt;
        unit.pos.y += (dy / len) * speed * dt;
      } else {
        const hitSpeed = card.hitSpeedMs ?? 1000;
        if (now - unit.lastAttackAt >= hitSpeed) {
          unit.lastAttackAt = now;
          this.resolveAttack(unit, target, card.damage ?? 0);
        }
      }
    }

    // Clean up dead units
    for (const [id, unit] of this.state.units.entries()) {
      if (unit.hp <= 0) this.state.units.delete(id);
    }
  }

  private findTarget(unit: UnitSchema, card: CardDefinition): UnitSchema | TowerSchema | undefined {
    const enemy: PlayerSlot = unit.owner === "playerA" ? "playerB" : "playerA";
    let best: UnitSchema | TowerSchema | undefined;
    let bestDist = Infinity;

    if (card.targets !== undefined) {
      for (const other of this.state.units.values()) {
        if (other.owner !== enemy || other.hp <= 0) continue;
        const otherCard = CARDS[other.cardId];
        if (otherCard?.flying && card.targets === "ground") continue;
        const d = dist(unit.pos, other.pos);
        if (d < bestDist) {
          bestDist = d;
          best = other;
        }
      }
    }

    // Prefer a nearby enemy unit; otherwise head for the nearest active tower.
    if (best && bestDist <= 4) return best;

    for (const tower of this.state.towers.values()) {
      if (tower.owner !== enemy || tower.destroyed || !tower.activated) continue;
      const d = dist(unit.pos, tower.pos);
      if (d < bestDist) {
        bestDist = d;
        best = tower;
      }
    }

    return best;
  }

  private resolveAttack(attacker: UnitSchema, target: UnitSchema | TowerSchema, damage: number) {
    if ("towerType" in target) {
      this.damageTower(target, damage);
    } else {
      this.damageUnit(target, damage);
    }
  }

  private damageUnit(unit: UnitSchema, dmg: number) {
    unit.hp = Math.max(0, unit.hp - dmg);
  }

  private damageTower(tower: TowerSchema, dmg: number) {
    if (tower.destroyed) return;
    tower.hp = Math.max(0, tower.hp - dmg);
    tower.activated = true;

    if (tower.hp === 0) {
      tower.destroyed = true;
      const player = this.state.players.get(tower.owner as PlayerSlot);
      if (player) player.towersLost += 1;

      if (tower.towerType !== "king") {
        const king = this.state.towers.get(`${tower.owner}-king`);
        if (king) king.activated = true;
      }
    }
  }

  private tickTowers(dt: number) {
    const now = this.state.elapsedMs;
    for (const tower of this.state.towers.values()) {
      if (tower.destroyed || !tower.activated) continue;
      const enemy: PlayerSlot = tower.owner === "playerA" ? "playerB" : "playerA";

      let best: UnitSchema | undefined;
      let bestDist = KING_RANGE;
      for (const unit of this.state.units.values()) {
        if (unit.owner !== enemy || unit.hp <= 0) continue;
        const d = dist(tower.pos, unit.pos);
        if (d <= bestDist) {
          bestDist = d;
          best = unit;
        }
      }
      if (!best) continue;
      this.fireTower(tower, best, now);
    }
  }

  private towerCooldowns: Record<string, number> = {};
  private fireTower(tower: TowerSchema, target: UnitSchema, now: number) {
    const last = this.towerCooldowns[tower.id] ?? -Infinity;
    if (now - last < KING_HIT_SPEED_MS) return;
    this.towerCooldowns[tower.id] = now;
    this.damageUnit(target, KING_DAMAGE);
  }

  private checkMatchEnd() {
    if (this.state.phase === "ended") return;

    const aKing = this.state.towers.get("playerA-king");
    const bKing = this.state.towers.get("playerB-king");
    if (aKing?.destroyed || bKing?.destroyed) {
      this.state.winner = aKing?.destroyed ? "playerB" : "playerA";
      this.state.phase = "ended";
      return;
    }

    const limit = this.state.phase === "overtime" ? MATCH_DURATION_MS + OVERTIME_DURATION_MS : MATCH_DURATION_MS;
    if (this.state.elapsedMs >= limit) {
      const a = this.state.players.get("playerA")!;
      const b = this.state.players.get("playerB")!;
      if (a.towersLost !== b.towersLost) {
        this.state.winner = a.towersLost < b.towersLost ? "playerA" : "playerB";
        this.state.phase = "ended";
      } else if (this.state.phase === "battle") {
        this.state.phase = "overtime";
      } else {
        this.state.winner = "draw";
        this.state.phase = "ended";
      }
    }
  }
}

function posSchema(x: number, y: number): Vec2Schema {
  const v = new Vec2Schema();
  v.x = x;
  v.y = y;
  return v;
}

function targetPos(t: UnitSchema | TowerSchema): Vec2Schema {
  return t.pos;
}

function dist(a: Vec2Schema, b: Vec2Schema): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
