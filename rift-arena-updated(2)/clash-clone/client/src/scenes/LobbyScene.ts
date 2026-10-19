import Phaser from "phaser";
import { ALL_CARD_IDS, CARDS, STARTER_DECK } from "@clash-clone/shared";
import { joinBattle } from "../network";

const STORE_KEY = "arena-deck-v1";
function loadDeck(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    if (Array.isArray(saved) && saved.length === 8 && saved.every((id) => ALL_CARD_IDS.includes(id))) return saved;
  } catch { /* use default */ }
  return [...STARTER_DECK];
}

export class LobbyScene extends Phaser.Scene {
  private page: "play" | "deck" | "clubs" = "play";
  private deck = loadDeck();
  private status!: Phaser.GameObjects.Text;
  private code = "";
  private content: Phaser.GameObjects.GameObject[] = [];

  constructor() { super("lobby"); }

  create() {
    this.cameras.main.setBackgroundColor("#101d2a");
    this.add.rectangle(180, 75, 360, 150, 0x1d3545);
    this.add.text(180, 39, "RIFT ARENA", { fontFamily: "sans-serif", fontSize: "31px", color: "#ffe18a", fontStyle: "bold" }).setOrigin(.5);
    this.add.text(180, 75, "TACTICAL REAL-TIME BATTLES", { fontFamily: "sans-serif", fontSize: "11px", color: "#c8d8e4" }).setOrigin(.5);
    this.add.text(180, 104, "ALL CARDS MAX LEVEL  •  NO EVOLUTIONS", { fontFamily: "sans-serif", fontSize: "10px", color: "#8ee3c2" }).setOrigin(.5);
    this.add.rectangle(180, 760, 360, 140, 0x172a3a);
    this.makeButton(62, 718, "BATTLE", () => this.showPage("play"), 0x386c4b, 94);
    this.makeButton(180, 718, "DECK", () => this.showPage("deck"), 0x355f86, 94);
    this.makeButton(298, 718, "CLUBS", () => this.showPage("clubs"), 0x765a91, 94);
    this.status = this.add.text(180, 675, "Choose a mode to get started", { fontFamily: "sans-serif", fontSize: "12px", color: "#d6e4ef", align: "center", wordWrap: { width: 320 } }).setOrigin(.5);
    this.showPage("play");
  }

  private makeButton(x: number, y: number, label: string, action: () => void, color = 0x34566a, width = 200) {
    const bg = this.add.rectangle(x, y, width, 38, color).setStrokeStyle(1, 0x9bb5c7).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontFamily: "sans-serif", fontSize: "13px", color: "#ffffff", fontStyle: "bold" }).setOrigin(.5);
    bg.on("pointerdown", action); bg.on("pointerover", () => bg.setAlpha(.8)); bg.on("pointerout", () => bg.setAlpha(1));
    this.content.push(bg, txt);
  }

  private clearContent() { this.content.forEach((o) => o.destroy()); this.content = []; }
  private showPage(page: "play" | "deck" | "clubs") {
    this.page = page; this.clearContent(); this.status.setText("");
    if (page === "play") {
      this.addPanelTitle("BATTLE GATE", "Find a real opponent in the shared room queue.");
      this.makeButton(180, 270, "FIND MATCH", async () => {
        this.status.setText("Connecting to arena server…");
        this.content.forEach((o) => { if (o instanceof Phaser.GameObjects.Rectangle) o.disableInteractive(); });
        try {
          const room = await joinBattle(this.deck);
          this.status.setText(`Room ${room.roomId} — waiting for an opponent…`);
          room.onStateChange.once(() => this.scene.start("battle"));
        } catch (e) {
          console.error(e); this.status.setText("Could not connect. Start the server and try again.");
        }
      }, 0x2e875e, 220);
      this.addText(180, 335, "Both players must connect to the same hosted server.", 11, "#a8bdcc", 300);
      this.addText(180, 400, "YOUR BATTLE DECK", 13, "#ffe18a", 300);
      this.deck.forEach((id, i) => this.makeCardChip(70 + (i % 4) * 74, 445 + Math.floor(i / 4) * 76, id, false));
    } else if (page === "deck") {
      this.addPanelTitle("DECK WORKSHOP", `Choose 8 cards • ${this.deck.length}/8 selected • all max level`);
      ALL_CARD_IDS.forEach((id, i) => this.makeCardChip(65 + (i % 3) * 115, 220 + Math.floor(i / 3) * 78, id, true));
      this.makeButton(180, 630, "RESET STARTER DECK", () => { this.deck = [...STARTER_DECK]; localStorage.setItem(STORE_KEY, JSON.stringify(this.deck)); this.showPage("deck"); }, 0x765a3a, 220);
      this.addText(180, 670, "Tap cards to add/remove them from your 8-card deck.", 10, "#b9c9d5", 330);
    } else {
      this.addPanelTitle("CLUB HALL", "Join a club using its 4-digit invite code.");
      this.addText(180, 240, `CODE: ${this.code.padEnd(4, "_" ).split("").join(" ")}`, 26, "#ffe18a", 300);
      for (let i = 0; i < 10; i++) {
        const digit = i === 9 ? "⌫" : String((i + 1) % 10);
        const x = 90 + (i % 3) * 90, y = 310 + Math.floor(i / 3) * 58;
        this.makeButton(x, y, digit, () => {
          if (digit === "⌫") this.code = this.code.slice(0, -1);
          else if (this.code.length < 4) this.code += digit;
          const text = this.content.find((o) => o instanceof Phaser.GameObjects.Text && o.text.startsWith("CODE:")) as Phaser.GameObjects.Text | undefined;
          text?.setText(`CODE: ${this.code.padEnd(4, "_" ).split("").join(" ")}`);
        }, 0x35566c, 62);
      }
      this.makeButton(180, 540, "JOIN CLUB", () => {
        this.status.setText(this.code.length === 4 ? `Code ${this.code} entered. Club membership needs a shared club service to persist online.` : "Enter all 4 digits first.");
      }, 0x765a91, 180);
      this.addText(180, 590, "Club codes are a UI prototype; membership isn't yet stored on the server.", 10, "#a8bdcc", 320);
    }
  }

  private addPanelTitle(title: string, subtitle: string) {
    this.add.text(180, 155, title, { fontFamily: "sans-serif", fontSize: "22px", color: "#ffffff", fontStyle: "bold" }).setOrigin(.5);
    this.addText(180, 187, subtitle, 11, "#b9cbd8", 320);
  }
  private addText(x: number, y: number, text: string, size: number, color: string, wrap: number) {
    const o = this.add.text(x, y, text, { fontFamily: "sans-serif", fontSize: `${size}px`, color, align: "center", wordWrap: { width: wrap } }).setOrigin(.5); this.content.push(o); return o;
  }
  private makeCardChip(x: number, y: number, id: string, selectable: boolean) {
    const card = CARDS[id]; const selected = this.deck.includes(id);
    const bg = this.add.rectangle(x, y, 102, 62, selected ? 0x356b58 : 0x293d4b).setStrokeStyle(2, selected ? 0xffd36b : 0x637b8b);
    const name = this.add.text(x, y - 9, card.name, { fontFamily: "sans-serif", fontSize: "10px", color: "#ffffff", align: "center", wordWrap: { width: 94 } }).setOrigin(.5);
    const info = this.add.text(x, y + 12, `${card.elixirCost} energy • MAX`, { fontFamily: "sans-serif", fontSize: "9px", color: "#ffe18a" }).setOrigin(.5);
    this.content.push(bg, name, info);
    if (selectable) {
      bg.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        const idx = this.deck.indexOf(id);
        if (idx >= 0) { if (this.deck.length === 8) this.deck.splice(idx, 1); }
        else if (this.deck.length < 8) this.deck.push(id);
        else { this.status.setText("Your deck is full. Remove a card first."); return; }
        localStorage.setItem(STORE_KEY, JSON.stringify(this.deck)); this.showPage("deck");
      });
    }
  }
}
