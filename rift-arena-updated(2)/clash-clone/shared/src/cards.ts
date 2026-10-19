import { CardDefinition } from "./types";

// Original arena-battler roster. Every card is treated as max level; evolutions are intentionally absent.
export const CARDS: Record<string, CardDefinition> = {
  guard: { id: "guard", name: "Iron Guard", kind: "troop", elixirCost: 3, hitpoints: 650, damage: 78, hitSpeedMs: 1100, speed: 1, range: 1, targets: "ground" },
  twins: { id: "twins", name: "Twin Rangers", kind: "troop", elixirCost: 3, hitpoints: 140, damage: 48, hitSpeedMs: 900, speed: 1.2, range: 5, targets: "both", count: 2 },
  brute: { id: "brute", name: "Stone Brute", kind: "troop", elixirCost: 5, hitpoints: 2100, damage: 125, hitSpeedMs: 1500, speed: 0.7, range: 1, targets: "ground" },
  flyers: { id: "flyers", name: "Gloom Flyers", kind: "troop", elixirCost: 3, hitpoints: 95, damage: 42, hitSpeedMs: 800, speed: 1.8, range: 1.5, targets: "both", flying: true, count: 3 },
  bonepack: { id: "bonepack", name: "Bone Pack", kind: "troop", elixirCost: 1, hitpoints: 38, damage: 36, hitSpeedMs: 1000, speed: 1.4, range: 1, targets: "ground", count: 4 },
  turret: { id: "turret", name: "Bolt Turret", kind: "building", elixirCost: 3, hitpoints: 430, damage: 92, hitSpeedMs: 900, speed: 0, range: 5, targets: "ground" },
  flare: { id: "flare", name: "Meteor Flare", kind: "spell", elixirCost: 4, spellRadius: 2.5, spellDamage: 330 },
  spark: { id: "spark", name: "Static Burst", kind: "spell", elixirCost: 2, spellRadius: 2.5, spellDamage: 95 },
  lancer: { id: "lancer", name: "Sky Lancer", kind: "troop", elixirCost: 4, hitpoints: 520, damage: 115, hitSpeedMs: 1200, speed: 1.25, range: 1.2, targets: "both" },
  golem: { id: "golem", name: "Moss Golem", kind: "troop", elixirCost: 6, hitpoints: 2400, damage: 160, hitSpeedMs: 1800, speed: 0.55, range: 1, targets: "ground" },
  healer: { id: "healer", name: "Dawn Medic", kind: "troop", elixirCost: 4, hitpoints: 480, damage: 55, hitSpeedMs: 1000, speed: 1.1, range: 3.5, targets: "both" },
  ram: { id: "ram", name: "Ridge Ram", kind: "troop", elixirCost: 4, hitpoints: 780, damage: 145, hitSpeedMs: 1400, speed: 1.7, range: 1, targets: "ground" },
  frost: { id: "frost", name: "Frost Ring", kind: "spell", elixirCost: 3, spellRadius: 3, spellDamage: 125 },
  swarm: { id: "swarm", name: "Spark Swarm", kind: "troop", elixirCost: 2, hitpoints: 55, damage: 25, hitSpeedMs: 850, speed: 1.6, range: 1, targets: "both", count: 5, flying: true },
};

export const ALL_CARD_IDS = Object.keys(CARDS);
export const STARTER_DECK: string[] = ["guard", "twins", "brute", "flyers", "bonepack", "turret", "flare", "spark"];
