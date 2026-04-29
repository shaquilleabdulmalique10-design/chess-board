# Product Requirements Document
## Chess Master — Browser-Based Chess Application

**Version:** 1.0  
**Date:** April 29, 2026  
**Status:** Current Implementation

---

## 1. Overview

Chess Master is a fully client-side, browser-based chess application. It requires no backend server, no account creation, and no installation. The app runs entirely in the browser and supports three play modes: vs. AI computer, local two-player, and online peer-to-peer multiplayer.

---

## 2. Goals

- Provide a complete, rules-compliant chess experience playable on any device (desktop, tablet, phone).
- Offer AI opponents at multiple skill levels for solo play.
- Enable real-time online multiplayer between two players using a shareable code — no server or account required.
- Deliver a polished, mobile-first UI that performs well on low-end devices.

---

## 3. Users

| User Type | Description |
|---|---|
| Solo player | Wants to practice or play against an AI opponent |
| Local players | Two people sharing a device, taking turns |
| Online players | Two people on separate devices connecting via a shared code |

---

## 4. Features

### 4.1 Chess Rules Engine

**Must have (all implemented):**

- Standard 8×8 board with correct initial piece placement
- Legal move generation for all piece types: Pawn, Knight, Bishop, Rook, Queen, King
- Pawn special moves: two-square opening advance, en passant capture
- Castling: kingside and queenside, with all legality checks (king/rook not moved, squares not attacked, path clear)
- Pawn promotion with piece selection modal (Queen, Rook, Bishop, Knight)
- Check detection and enforcement (illegal moves that leave king in check are filtered)
- Checkmate detection (no legal moves + in check)
- Stalemate detection (no legal moves, not in check)
- 50-move draw rule (half-move clock tracking)
- Algebraic notation generation for move history

### 4.2 Game Modes

| Mode | Description |
|---|---|
| VS Computer | Player (White) vs. AI (Black) |
| Local 2 Player | Two humans alternate on the same device |
| Online Multiplayer | Two humans on separate devices via P2P |

### 4.3 AI Opponent

- Implemented using minimax with alpha-beta pruning
- Piece-square tables (PST) for positional evaluation
- Move ordering (captures first) to improve pruning efficiency
- Four difficulty levels:

| Level | Search Depth | Behavior |
|---|---|---|
| Easy | — | Random moves; prefers captures 50% of the time |
| Medium | 2 ply | Minimax with alpha-beta |
| Hard | 3 ply | Minimax with alpha-beta (default) |
| Expert | 4 ply | Minimax with alpha-beta |

- AI runs in a Web Worker (off the main thread) to keep the UI responsive
- Falls back to main-thread execution if the Worker fails (e.g., `file://` protocol restrictions)

### 4.4 Online Multiplayer

- Peer-to-peer via [PeerJS](https://peerjs.com/) (WebRTC); no custom server required
- Host creates a game and receives a unique code
- Guest joins by entering the host's code
- Host plays White; guest plays Black
- Synchronized game state via move messages
- Supported in-game actions over the connection:
  - Move (including promotion piece)
  - Draw offer / accept / decline
  - Resign
  - New game (play again)
- Connection status indicator (connecting / online / offline)
- Disconnect detection with toast notification

### 4.5 Board UI

- Responsive chessboard rendered as an 8×8 CSS grid
- Unicode chess glyphs for pieces (no image assets required)
- Board orientation: flips for Black in online mode
- Visual indicators:
  - Selected square highlight (yellow)
  - Last move highlight (green tint)
  - Valid move dots (empty squares) and capture rings (occupied squares)
  - King-in-check highlight (red square)
  - Check shake animation (desktop only)
- Rank (1–8) and file (a–h) coordinate labels on board edges

### 4.6 Sidebar / Navigation

- Off-canvas sidebar on mobile (hamburger button); always-visible panel on desktop (≥1024px)
- Sections:
  - Current turn indicator (icon + text)
  - Online multiplayer controls (create, join, copy code, leave)
  - Online player panel (White vs. Black with active-turn highlight)
  - Move history list (scrollable, algebraic notation, paired by full move)
  - Game mode selector
  - AI difficulty selector
  - Game controls: New Game, Offer Draw, Resign
- Sidebar auto-closes on outside tap (mobile)

### 4.7 Modals

| Modal | Trigger |
|---|---|
| Pawn Promotion | Pawn reaches back rank (local/online) |
| Draw Offer | Opponent sends a draw offer (online) |
| Game Over | Checkmate, stalemate, 50-move draw, resign, or draw agreed |

### 4.8 Audio Feedback

Synthesized sounds via Web Audio API (no audio files):

| Event | Sound |
|---|---|
| Move | Sine tone, 523 Hz |
| Capture | Square wave, 330 Hz |
| Castle | Sine tone, 659 Hz |
| Check | Sine tone, 880 Hz |
| Checkmate | Sawtooth, 220 Hz |
| Stalemate | Sine tone, 440 Hz |
| Opponent connected | Sine tone, 660 Hz |

### 4.9 Toast Notifications

- Non-blocking, auto-dismissing messages for: turn enforcement, copy confirmation, connection events, draw responses, and errors.

---

## 5. Non-Functional Requirements

### 5.1 Performance

- No layout jank on mobile: transitions and animations are disabled or limited on touch devices
- CSS `will-change` and `contain: strict` used on the board to minimize repaints
- No `backdrop-filter` on mobile (GPU cost)
- AI computation runs off the main thread via Web Worker

### 5.2 Compatibility

- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Minimum font size of 14px on inputs to prevent iOS auto-zoom
- `touch-action: manipulation` on interactive elements to eliminate 300ms tap delay
- `overscroll-behavior: none` to prevent pull-to-refresh interference
- Dynamic viewport units (`100dvh`) for correct sizing on mobile browsers with collapsible chrome

### 5.3 Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| < 380px | Board fills 94vw/vh; compact padding |
| 380px – 599px | Default mobile layout |
| 600px – 1023px | Tablet: board fills 80vw/vh |
| ≥ 1024px | Desktop: sidebar always visible, board up to 480px |
| Landscape < 500px tall | Board fills 70vh; main content scrollable |

### 5.4 Accessibility

- Semantic HTML elements used throughout
- Touch and click events both handled for all interactive elements
- Sufficient color contrast on piece glyphs and UI text
- Note: full keyboard navigation and screen reader support are not implemented in v1.0

### 5.5 Deployment

- Zero dependencies beyond PeerJS (loaded from CDN)
- No build step required; works as static files
- Compatible with `file://` protocol (AI falls back to main thread in this case)

---

## 6. Architecture

```
index.html          — App shell, layout, modals
script.JS           — Game logic, AI, rendering, P2P multiplayer, event handling
style.css           — Mobile-first styles, responsive breakpoints
ai.worker.js        — Standalone Web Worker for off-thread AI computation
```

The AI logic is duplicated between `script.JS` (as an inlined blob for Worker creation) and `ai.worker.js` (standalone file). Both are kept in sync.

---

## 7. Out of Scope (v1.0)

- User accounts or persistent profiles
- Game history / save & resume
- ELO rating or matchmaking
- Spectator mode
- Time controls / chess clocks
- Opening book or endgame tablebase
- Threefold repetition draw detection
- Insufficient material draw detection
- Full keyboard / screen reader accessibility
- Mobile app packaging (PWA, native)
