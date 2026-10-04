import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { Chess } from "chess.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(express.static(process.cwd()));

const rooms = new Map();

function createCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function safeSend(socket, payload) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
}

function roomSnapshot(room) {
  return {
    white: room.players.white?.name || "White",
    black: room.players.black?.name || "Black"
  };
}

function removePlayer(socket) {
  const { roomCode, color } = socket.meta || {};
  if (!roomCode || !rooms.has(roomCode)) {
    return;
  }

  const room = rooms.get(roomCode);
  if (room.players[color]?.socket === socket) {
    room.players[color] = null;
  }

  const leaverName = socket.meta.playerName || "A player";

  ["white", "black"].forEach((side) => {
    const peer = room.players[side]?.socket;
    if (peer) {
      safeSend(peer, {
        type: "player-left",
        leaverColor: color,        // who left
        leaverName,                // their display name
        players: roomSnapshot(room),
      });
    }
  });

  const hasWhite = Boolean(room.players.white);
  const hasBlack = Boolean(room.players.black);

  if (!hasWhite && !hasBlack) {
    rooms.delete(roomCode);
  }
}

function broadcast(room, payload, except = null) {
  ["white", "black"].forEach((side) => {
    const peer = room.players[side]?.socket;
    if (peer && peer !== except) {
      safeSend(peer, payload);
    }
  });
}

function joinRoom(socket, roomCode, color, name) {
  const room = rooms.get(roomCode);
  if (!room.chat) room.chat = [];
  room.players[color] = { socket, name };
  socket.meta = { roomCode, color, playerName: name };

  safeSend(socket, {
    type: color === "white" ? "room-created" : "room-joined",
    roomCode,
    color,
    players: roomSnapshot(room),
    chatHistory: room.chat.slice(-80)
  });

  const otherColor = color === "white" ? "black" : "white";
  const peer = room.players[otherColor]?.socket;
  if (peer) {
    safeSend(peer, {
      type: "room-update",
      players: roomSnapshot(room),
      message: `${name} joined the room.`
    });
  }
}

wss.on("connection", (socket) => {
  socket.meta = null;
  socket.isAlive = true;
  socket.on("pong", () => { socket.isAlive = true; });

  socket.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      safeSend(socket, { type: "error", message: "Invalid message format." });
      return;
    }

    if (data.type === "create-room") {
      let roomCode = createCode();
      while (rooms.has(roomCode)) {
        roomCode = createCode();
      }

      rooms.set(roomCode, {
        chess: new Chess(),
        players: { white: null, black: null },
        chat: []
      });

      joinRoom(socket, roomCode, "white", data.playerName || "Host");
      return;
    }

    if (data.type === "join-room") {
      const roomCode = (data.roomCode || "").toUpperCase();
      const room = rooms.get(roomCode);

      if (!room) {
        safeSend(socket, { type: "error", message: "Room not found." });
        return;
      }

      if (room.players.black) {
        safeSend(socket, { type: "error", message: "Room already has two players." });
        return;
      }

      joinRoom(socket, roomCode, "black", data.playerName || "Guest");
      return;
    }

    if (data.type === "leave-room") {
      removePlayer(socket);
      socket.meta = null;
      return;
    }

    if (!socket.meta || !rooms.has(socket.meta.roomCode)) {
      safeSend(socket, { type: "error", message: "Join a room first." });
      return;
    }

    const room = rooms.get(socket.meta.roomCode);

    if (data.type === "move") {
      try {
        const turnColor = room.chess.turn() === "w" ? "white" : "black";
        if (turnColor !== socket.meta.color) {
          safeSend(socket, { type: "error", message: "It is not your turn." });
          return;
        }

        const result = room.chess.move(data.move);
        if (!result) {
          safeSend(socket, { type: "error", message: "Illegal move." });
          return;
        }

        ["white", "black"].forEach((side) => {
          const peer = room.players[side]?.socket;
          if (peer) {
            safeSend(peer, {
              type: "move-applied",
              by: socket.meta.color,
              move: data.move
            });
          }
        });
      } catch {
        safeSend(socket, { type: "error", message: "Move could not be applied." });
      }
      return;
    }

    if (data.type === "chat") {
      const sender = socket.meta.playerName || socket.meta.color;
      const text = String(data.text || "").trim().slice(0, 220);
      if (!text) return;

      if (!room.chat) room.chat = [];
      const message = {
        sender,
        text,
        color: socket.meta.color,
        at: Date.now()
      };
      room.chat.push(message);
      if (room.chat.length > 120) room.chat = room.chat.slice(-120);

      broadcast(room, {
        type: "chat",
        sender: message.sender,
        text: message.text,
        color: message.color,
        at: message.at
      }, socket);
      return;
    }

    if (data.type === "typing") {
      broadcast(room, {
        type: "typing",
        sender: socket.meta.playerName || socket.meta.color,
        color: socket.meta.color,
        isTyping: Boolean(data.isTyping)
      }, socket);
      return;
    }

    if (data.type === "reset") {
      room.chess = new Chess();
      broadcast(room, { type: "reset-applied" });
    }

    // draw / resign passthrough
    if (data.type === "draw_offer" || data.type === "draw_accept" ||
        data.type === "draw_decline" || data.type === "resign") {
      broadcast(room, { type: data.type }, socket);
    }

    // client pong (manual, in case browser strips WebSocket pong frames)
    if (data.type === "pong") {
      socket.isAlive = true;
    }
  });

  socket.on("close", () => {
    removePlayer(socket);
  });
});

// ── Heartbeat: ping every 25 s, kill silent sockets after 2 missed pings ──
const heartbeat = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (socket.isAlive === false) {
      removePlayer(socket);
      return socket.terminate();
    }
    socket.isAlive = false;
    socket.ping();
    // Also send a JSON ping so clients that can't handle WS ping frames still respond
    safeSend(socket, { type: "ping" });
  });
}, 25000);

wss.on("close", () => clearInterval(heartbeat));

server.listen(PORT, () => {
  console.log(`Chess Arena Live running on http://localhost:${PORT}`);
});
