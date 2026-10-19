import http from "http";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BattleRoom } from "./rooms/BattleRoom";

const app = express();
const port = Number(process.env.PORT) || 2567;

app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("battle", BattleRoom);

httpServer.listen(port, () => {
  console.log(`Clash clone server listening on :${port}`);
});
