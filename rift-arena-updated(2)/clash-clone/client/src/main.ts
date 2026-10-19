import Phaser from "phaser";
import { LobbyScene } from "./scenes/LobbyScene";
import { BattleScene } from "./scenes/BattleScene";

const ARENA_PX_W = 18 * 20;
const ARENA_PX_H = 32 * 20 + 190; // arena + hand UI

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: ARENA_PX_W,
  height: ARENA_PX_H,
  backgroundColor: "#1a1f2b",
  scene: [LobbyScene, BattleScene],
});
