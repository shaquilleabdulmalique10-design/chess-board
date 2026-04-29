# ♜ Chess Master — Project Presentation

---

## Slide 1: Title

# ♜ Chess Master
### A Full-Featured Chess App Built with Vanilla Web Technologies

> Play anywhere, anytime — solo or with a friend across the globe.

---

## Slide 2: Overview

### What is Chess Master?

Chess Master is a **browser-based chess application** built entirely with:

- **HTML5** — structure and UI
- **CSS3** — mobile-first responsive design
- **Vanilla JavaScript** — game logic, AI, and networking

No frameworks. No backend. No account needed.

---

## Slide 3: Key Features

### ✨ Feature Highlights

| Feature | Description |
|---|---|
| 🤖 AI Opponent | Minimax engine with 4 difficulty levels |
| 👥 Local 2-Player | Pass-and-play on the same device |
| 🌐 Online Multiplayer | Real-time P2P via PeerJS (no server) |
| ♟️ Full Chess Rules | Castling, en passant, promotion, 50-move rule |
| 📱 Mobile-First | Responsive design for all screen sizes |
| 📜 Move History | Algebraic notation recorded in real time |

---

## Slide 4: Game Modes

### 🎮 Three Ways to Play

#### 🤖 VS Computer
- Four difficulty levels: Easy, Medium, Hard, Expert
- AI runs in a **Web Worker** to keep the UI smooth
- Falls back to main thread if Workers are unavailable

#### 👥 Local 2-Player
- Two players share one device
- Board flips perspective automatically in online mode

#### 🌐 Online Multiplayer
- Powered by **PeerJS** (WebRTC P2P)
- Share a game code — no accounts, no servers
- Supports draw offers and resignation

---

## Slide 5: AI Engine

### 🧠 How the AI Works

The AI uses the classic **Minimax algorithm** with **Alpha-Beta pruning**:

```
Depth by difficulty:
  Easy   → random moves (prefers captures)
  Medium → depth 2
  Hard   → depth 3
  Expert → depth 4
```

**Evaluation factors:**
- Material value (Pawn=100, Knight=320, Bishop=330, Rook=500, Queen=900)
- **Piece-Square Tables (PST)** — rewards good piece positioning
- Checkmate detection with depth-adjusted scoring

**Performance:** Runs inside a `Web Worker` blob so the board never freezes during AI calculation.

---

## Slide 6: Chess Rules Implemented

### ♟️ Complete Rule Set

- ✅ Standard piece movement (all 6 piece types)
- ✅ **Castling** — kingside and queenside, with all legality checks
- ✅ **En passant** — tracked via target square state
- ✅ **Pawn promotion** — interactive modal to choose piece
- ✅ **Check detection** — king highlighted in red
- ✅ **Checkmate & Stalemate** — game ends with modal
- ✅ **50-move draw rule** — half-move clock tracked
- ✅ Legal move filtering — no move can leave own king in check

---

## Slide 7: Online Multiplayer Architecture

### 🌐 P2P Networking with PeerJS

```
Player A (Host)          Player B (Guest)
    │                         │
    │── Creates Game ──────►  │
    │◄─ Shares Code ──────── │
    │                         │
    │◄──── WebRTC P2P ──────►│
    │    (via PeerJS relay)   │
    │                         │
    │  { type: 'move',        │
    │    fr, fc, tr, tc,      │
    │    promoPiece }         │
```

- Host becomes **White**, guest becomes **Black**
- Board is **flipped** for the Black player
- Supports: move sync, draw offers, resignation, disconnect detection

---

## Slide 8: UI & Design

### 🎨 Design Highlights

**Color Palette:**
- Background: Deep navy gradient `#1a1a2e → #0f3460`
- Accent: Gold `#ffd966`
- Board: Classic `#f0d9b5` (light) / `#b58863` (dark)

**Mobile-First Approach:**
- Sidebar as off-canvas drawer on mobile
- Always-visible sidebar on desktop (≥1024px)
- Board size uses `min(90vw, 90vh, 480px)` for perfect fit
- Touch events handled alongside click events
- No hover effects on touch devices (prevents jank)
- No CSS transitions on board squares (prevents shake)

---

## Slide 9: Responsive Design

### 📱 Breakpoints

| Breakpoint | Layout |
|---|---|
| `< 380px` (small phones) | Compact board `94vw`, reduced padding |
| `380px – 599px` (phones) | Standard mobile layout |
| `600px – 1023px` (tablets) | Board `80vw/vh`, off-canvas sidebar |
| `≥ 1024px` (desktop) | Sidebar always visible, board up to `480px` |
| Landscape `< 500px height` | Scrollable layout, board `70vh` |

---

## Slide 10: Project Structure

### 📁 File Structure

```
chess board/
├── index.html       # App shell, modals, sidebar UI
├── script.JS        # Game logic, AI engine, P2P networking
├── style.css        # Mobile-first responsive styles
├── ai.worker.js     # (AI worker — inlined as blob in script.JS)
└── docs/
    └── presentation.md   # This presentation
```

**Key design decision:** The AI worker source is inlined as a string blob in `script.JS`, making the app work on `file://` URLs and any static host without CORS issues.

---

## Slide 11: Technical Highlights

### ⚡ Notable Technical Decisions

1. **Zero dependencies** (except PeerJS CDN) — no build step needed
2. **Web Worker blob** — AI runs off the main thread without a separate file
3. **Async/await promotion flow** — pawn promotion uses a `Promise` resolved by modal interaction
4. **Immutable board copies** — `copyBoard()` used throughout to avoid state mutation bugs
5. **Touch + click dual events** — `touchend` with `preventDefault` for instant mobile response
6. **`contain: strict`** on the board — prevents layout recalculations during renders
7. **`will-change: left`** on sidebar — GPU-composited slide animation

---

## Slide 12: Move Notation

### 📜 Algebraic Notation

Moves are recorded in standard algebraic notation:

| Move Type | Example |
|---|---|
| Pawn move | `e4` |
| Piece move | `Nf3` |
| Capture | `Bxe5` |
| Pawn capture | `exd5` |
| Kingside castle | `O-O` |
| Queenside castle | `O-O-O` |
| En passant | `exd6` |

Move history is displayed in the sidebar, scrollable, with white and black moves side by side.

---

## Slide 13: Game State Management

### 🗂️ State Variables

```javascript
// Board & turn
board          // 8×8 array of piece characters
turn           // 'white' | 'black'
gameOver       // boolean
winner         // 'white' | 'black' | null

// Move tracking
selectedRow/Col  // currently selected square
validMoves       // array of [row, col] legal destinations
lastMove         // { fr, fc, tr, tc } for highlight

// Special rules
castleRights     // { wK, wQ, bK, bQ }
enPassantTarget  // [row, col] | null
halfMoveClock    // for 50-move rule
moveHistory      // array of { notation, color }

// Multiplayer
myColor          // 'white' | 'black'
isOnline         // boolean
peer / conn      // PeerJS objects
```

---

## Slide 14: Future Improvements

### 🚀 Potential Enhancements

- [ ] **Threefold repetition** draw detection
- [ ] **Insufficient material** draw detection
- [ ] **Game timer / clock** (blitz, rapid modes)
- [ ] **Opening book** for stronger early AI play
- [ ] **Undo / takeback** move functionality
- [ ] **Board themes** (multiple color schemes)
- [ ] **Sound settings** (mute toggle)
- [ ] **Export PGN** (Portable Game Notation)
- [ ] **Spectator mode** for online games
- [ ] **ELO rating system** for online play

---

## Slide 15: Summary

### ✅ What We Built

A **complete, production-ready chess application** that:

- Runs entirely in the browser with no backend
- Supports solo play against a smart AI engine
- Enables real-time online multiplayer via P2P
- Works beautifully on mobile, tablet, and desktop
- Implements the full FIDE chess rule set
- Delivers smooth performance through careful mobile optimization

> **Tech Stack:** HTML5 · CSS3 · Vanilla JS · PeerJS · Web Workers

---

*Chess Master — Built with ♟️ and JavaScript*
