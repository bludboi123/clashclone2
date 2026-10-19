import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class Vec2Schema extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
}

export class UnitSchema extends Schema {
  @type("string") id = "";
  @type("string") owner = "";
  @type("string") cardId = "";
  @type("string") kind: "unit" | "tower" = "unit";
  @type(Vec2Schema) pos = new Vec2Schema();
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("string") targetId = "";
  @type("number") lastAttackAt = 0;
}

export class TowerSchema extends Schema {
  @type("string") id = "";
  @type("string") owner = "";
  @type("string") towerType: "king" | "left" | "right" = "left";
  @type(Vec2Schema) pos = new Vec2Schema();
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("boolean") destroyed = false;
  @type("boolean") activated = false;
}

export class PlayerSchema extends Schema {
  @type("string") slot: "playerA" | "playerB" = "playerA";
  @type("number") elixir = 5;
  @type(["string"]) hand = new ArraySchema<string>();
  @type("string") nextCard = "";
  @type("number") towersLost = 0;
  @type("boolean") connected = false;
  @type("string") sessionId = "";
}

export class GameState extends Schema {
  @type("string") phase: "waiting" | "countdown" | "battle" | "overtime" | "ended" = "waiting";
  @type("number") elapsedMs = 0;
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: UnitSchema }) units = new MapSchema<UnitSchema>();
  @type({ map: TowerSchema }) towers = new MapSchema<TowerSchema>();
  @type("string") winner = "";
}
