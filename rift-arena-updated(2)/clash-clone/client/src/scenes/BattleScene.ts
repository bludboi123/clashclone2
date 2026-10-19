import Phaser from "phaser";
import { ARENA_WIDTH, ARENA_HEIGHT, RIVER_ROW, CARDS, ELIXIR_MAX } from "@clash-clone/shared";
import { getRoom, deployCard } from "../network";

const TILE = 20; // px per tile
const HAND_HEIGHT = 140;
const ARENA_PX_W = ARENA_WIDTH * TILE;
const ARENA_PX_H = ARENA_HEIGHT * TILE;

const CARD_COLORS: Record<string, number> = {
  guard: 0x8d6e63, twins: 0x66bb6a, brute: 0xef5350, flyers: 0x42a5f5,
  bonepack: 0xeceff1, turret: 0x8d6e63, flare: 0xff7043, spark: 0xfff176,
  lancer: 0x9575cd, golem: 0x558b2f, healer: 0xf06292, ram: 0xffb74d,
  frost: 0x80deea, swarm: 0x4dd0e1,
};

export class BattleScene extends Phaser.Scene {
  private unitSprites = new Map<string, Phaser.GameObjects.Container>();
  private towerSprites = new Map<string, Phaser.GameObjects.Container>();
  private handCards: Phaser.GameObjects.Container[] = [];
  private elixirBar!: Phaser.GameObjects.Graphics;
  private elixirText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private selectedCardIndex: number | null = null;
  private flipY = false; // true when local player is playerB, so their king renders at bottom
  private mySlot: "playerA" | "playerB" | null = null;

  constructor() {
    super("battle");
  }

  create() {
    const room = getRoom();
    if (!room) {
      this.scene.start("lobby");
      return;
    }

    this.add.rectangle(ARENA_PX_W / 2, ARENA_PX_H / 2, ARENA_PX_W, ARENA_PX_H, 0x39734a);
    // Tile grid makes deployment placement readable at a glance.
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x214c35, 0.42);
    for (let x = 0; x <= ARENA_WIDTH; x++) { grid.lineBetween(x * TILE, 0, x * TILE, ARENA_PX_H); }
    for (let y = 0; y <= ARENA_HEIGHT; y++) { grid.lineBetween(0, y * TILE, ARENA_PX_W, y * TILE); }
    // River, two crossing bridges, and banks.
    this.add.rectangle(ARENA_PX_W / 2, RIVER_ROW * TILE, ARENA_PX_W, TILE * 1.7, 0x287ab2);
    this.add.rectangle(4 * TILE, RIVER_ROW * TILE, TILE * 2.4, TILE * 2.1, 0xb99a67).setStrokeStyle(2, 0xe0c38b);
    this.add.rectangle(14 * TILE, RIVER_ROW * TILE, TILE * 2.4, TILE * 2.1, 0xb99a67).setStrokeStyle(2, 0xe0c38b);
    this.add.rectangle(ARENA_PX_W / 2, RIVER_ROW * TILE - TILE * 1.1, ARENA_PX_W, 3, 0x9ad8e8).setAlpha(0.55);
    this.add.rectangle(ARENA_PX_W / 2, RIVER_ROW * TILE + TILE * 1.1, ARENA_PX_W, 3, 0x9ad8e8).setAlpha(0.55);

    this.statusText = this.add
      .text(ARENA_PX_W / 2, 20, "Waiting for opponent...", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.elixirBar = this.add.graphics();
    this.elixirText = this.add.text(8, ARENA_PX_H + 8, "", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#ffffff",
    });

    for (let i = 0; i < 4; i++) {
      const card = this.makeHandSlot(i);
      this.handCards.push(card);
    }

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > ARENA_PX_H) return; // clicks in the hand area are handled per-card
      this.tryDeployAt(pointer.x, pointer.y);
    });

    room.onStateChange((state) => {
      if (!this.mySlot) {
        for (const [slot, p] of state.players.entries()) {
          if (p.sessionId === room.sessionId) {
            this.mySlot = slot as "playerA" | "playerB";
            this.flipY = slot === "playerB";
          }
        }
      }
      this.syncTowers(state);
      this.syncUnits(state);
      this.syncHand(state);
      this.syncElixir(state);
      this.syncStatus(state);
    });
  }

  private worldY(tileY: number): number {
    return (this.flipY ? ARENA_HEIGHT - tileY : tileY) * TILE;
  }
  private worldX(tileX: number): number {
    return (this.flipY ? ARENA_WIDTH - tileX : tileX) * TILE;
  }

  private syncTowers(state: any) {
    for (const tower of state.towers.values()) {
      let c = this.towerSprites.get(tower.id);
      if (!c) {
        const rect = this.add.rectangle(0, 0, TILE * 1.6, TILE * 1.6, tower.owner === this.mySlot ? 0x4fc3f7 : 0xe57373);
        rect.setStrokeStyle(2, 0x000000);
        const hpText = this.add.text(0, -TILE, "", {
          fontFamily: "sans-serif",
          fontSize: "11px",
          color: "#ffffff",
        }).setOrigin(0.5);
        c = this.add.container(0, 0, [rect, hpText]);
        this.towerSprites.set(tower.id, c);
      }
      c.setPosition(this.worldX(tower.pos.x), this.worldY(tower.pos.y));
      const hpText = c.list[1] as Phaser.GameObjects.Text;
      hpText.setText(tower.destroyed ? "DESTROYED" : `${Math.ceil(tower.hp)}`);
      c.setAlpha(tower.destroyed ? 0.25 : 1);
    }
  }

  private syncUnits(state: any) {
    const seen = new Set<string>();
    for (const unit of state.units.values()) {
      seen.add(unit.id);
      let c = this.unitSprites.get(unit.id);
      if (!c) {
        const color = unit.owner === this.mySlot ? 0x4fc3f7 : 0xe57373;
        const circle = this.add.circle(0, 0, TILE * 0.45, color);
        circle.setStrokeStyle(2, 0x000000);
        const label = this.add
          .text(0, 0, cardLabel(unit.cardId), { fontFamily: "sans-serif", fontSize: "9px", color: "#000" })
          .setOrigin(0.5);
        c = this.add.container(0, 0, [circle, label]);
        this.unitSprites.set(unit.id, c);
      }
      c.setPosition(this.worldX(unit.pos.x), this.worldY(unit.pos.y));
    }
    for (const [id, c] of this.unitSprites.entries()) {
      if (!seen.has(id)) {
        c.destroy();
        this.unitSprites.delete(id);
      }
    }
  }

  private makeHandSlot(index: number): Phaser.GameObjects.Container {
    const x = 50 + index * 90;
    const y = ARENA_PX_H + 70;
    const bg = this.add.rectangle(0, 0, 80, 100, 0x37474f).setStrokeStyle(2, 0xffffff);
    const name = this.add.text(0, -30, "", { fontFamily: "sans-serif", fontSize: "11px", color: "#fff" }).setOrigin(0.5);
    const cost = this.add.text(0, 35, "", { fontFamily: "sans-serif", fontSize: "14px", color: "#ffd54a" }).setOrigin(0.5);
    const container = this.add.container(x, y, [bg, name, cost]);
    container.setSize(80, 100);
    container.setInteractive(new Phaser.Geom.Rectangle(-40, -50, 80, 100), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", () => {
      this.selectedCardIndex = this.selectedCardIndex === index ? null : index;
      this.refreshSelection();
    });
    return container;
  }

  private refreshSelection() {
    this.handCards.forEach((c, i) => {
      const bg = c.list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, i === this.selectedCardIndex ? 0xffd54a : 0xffffff);
    });
  }

  private syncHand(state: any) {
    const me = this.mySlot ? state.players.get(this.mySlot) : null;
    if (!me) return;
    me.hand.forEach((cardId: string, i: number) => {
      const container = this.handCards[i];
      const name = container.list[1] as Phaser.GameObjects.Text;
      const cost = container.list[2] as Phaser.GameObjects.Text;
      const def = CARDS[cardId];
      name.setText(def?.name ?? cardId);
      cost.setText(def ? `${def.elixirCost}` : "");
      const bg = container.list[0] as Phaser.GameObjects.Rectangle;
      bg.fillColor = CARD_COLORS[cardId] ?? 0x546e7a;
    });
  }

  private syncElixir(state: any) {
    const me = this.mySlot ? state.players.get(this.mySlot) : null;
    if (!me) return;
    const pct = Math.max(0, Math.min(1, me.elixir / ELIXIR_MAX));
    this.elixirBar.clear();
    this.elixirBar.fillStyle(0x4a148c, 1);
    this.elixirBar.fillRect(8, ARENA_PX_H + 30, 300, 16);
    this.elixirBar.fillStyle(0xba68c8, 1);
    this.elixirBar.fillRect(8, ARENA_PX_H + 30, 300 * pct, 16);
    this.elixirText.setText(`Elixir: ${me.elixir.toFixed(1)} / ${ELIXIR_MAX}`);
  }

  private syncStatus(state: any) {
    if (state.phase === "ended") {
      const won = state.winner === this.mySlot;
      this.statusText.setText(state.winner === "draw" ? "Draw!" : won ? "Victory!" : "Defeat");
    } else if (state.phase === "countdown") {
      this.statusText.setText("Match starting...");
    } else if (state.phase === "battle") {
      this.statusText.setText("");
    } else if (state.phase === "overtime") {
      this.statusText.setText("Overtime!");
    }
  }

  private tryDeployAt(px: number, py: number) {
    if (this.selectedCardIndex === null || !this.mySlot) return;
    const room = getRoom();
    const me = room?.state.players.get(this.mySlot);
    if (!me) return;
    const cardId = me.hand[this.selectedCardIndex];
    if (!cardId) return;

    const tileX = (this.flipY ? ARENA_WIDTH - px / TILE : px / TILE);
    const tileY = (this.flipY ? ARENA_HEIGHT - py / TILE : py / TILE);

    deployCard(cardId, round1(tileX), round1(tileY));
    this.selectedCardIndex = null;
    this.refreshSelection();
  }
}

function cardLabel(cardId: string): string {
  return CARDS[cardId]?.name.slice(0, 3).toUpperCase() ?? "?";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
