// ================================================================
//  CHESS ARENA — Complete rewrite, all features working
// ================================================================

// ── Piece glyphs (fallback only) ─────────────────────────────────
const GLYPHS = {
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  p: "♟",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
  P: "♙",
};

// ── Piece image map (cburnett SVG set) ────────────────────────────
const PIECE_IMG = {
  P: "pieces/wP.svg",
  N: "pieces/wN.svg",
  B: "pieces/wB.svg",
  R: "pieces/wR.svg",
  Q: "pieces/wQ.svg",
  K: "pieces/wK.svg",
  p: "pieces/bP.svg",
  n: "pieces/bN.svg",
  b: "pieces/bB.svg",
  r: "pieces/bR.svg",
  q: "pieces/bQ.svg",
  k: "pieces/bK.svg",
};

// ── Piece-square tables ───────────────────────────────────────────
const PST = {
  P: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  N: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  B: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  R: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  Q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  K: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

const PIECE_VAL = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};
// Each level has its own real-time search budget and presentation delay.
// Search stays in a Worker, so deeper levels never freeze the board UI.
const AI_PROFILES = {
  easy: { searchMs: 120, maxDepth: 1, minDelay: 350 },
  normal: { searchMs: 500, maxDepth: 2, minDelay: 700 },
  hard: { searchMs: 1400, maxDepth: 4, minDelay: 1500 },
  expert: { searchMs: 3200, maxDepth: 6, minDelay: 3200 },
};

// ── User & settings ──────────────────────────
let currentUser = null;
const USER_STORE_KEY = "chess-arena-users";
const CURRENT_USER_KEY = "chess-arena-current";
const THEME_KEY = "chess-arena-theme";
const BOARD_THEMES = ["classic", "ocean", "forest", "midnight", "gold", "rose"];

// ── Game state ────────────────────────────────
let board, turn, gameOver, winner;
let selRow, selCol, validMoves, lastMove;
let currentMode = "computer",
  difficulty = "easy";
let aiThinking = false,
  pendingPromotion = null;
let moveHistory = [],
  halfMoveClock = 0,
  fullMoveNumber = 1;
let castleRights, enPassantTarget;
let myColor = null,
  isOnline = false;
let onlineOpponentName = ""; // real name of online opponent
let soundEnabled = true,
  showCoords = true;

// ── DOM helper ────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Init board state ──────────────────────────
function initState() {
  board = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"],
  ];
  turn = "white";
  gameOver = false;
  winner = null;
  selRow = null;
  selCol = null;
  validMoves = [];
  lastMove = null;
  castleRights = { wK: true, wQ: true, bK: true, bQ: true };
  enPassantTarget = null;
  moveHistory = [];
  halfMoveClock = 0;
  fullMoveNumber = 1;
  aiThinking = false;
  pendingPromotion = null;
}

// ── Chess helpers ─────────────────────────────
const col = (p) =>
  !p
    ? null
    : p === p.toUpperCase() && p !== p.toLowerCase()
      ? "white"
      : "black";
const opp = (c) => (c === "white" ? "black" : "white");
const cpB = (b) => b.map((r) => [...r]);
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function findKing(b, side) {
  const k = side === "white" ? "K" : "k";
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) if (b[r][c] === k) return [r, c];
  return [-1, -1];
}

function rawMoves(b, r, c, ep, cr) {
  const p = b[r][c];
  if (!p) return [];
  const pc = col(p),
    moves = [];
  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        const nr = r + dr * i,
          nc = c + dc * i;
        if (!inB(nr, nc)) break;
        if (b[nr][nc]) {
          if (col(b[nr][nc]) !== pc) moves.push([nr, nc]);
          break;
        }
        moves.push([nr, nc]);
      }
    }
  };
  switch (p.toLowerCase()) {
    case "p": {
      const dir = pc === "white" ? -1 : 1,
        st = pc === "white" ? 6 : 1;
      if (inB(r + dir, c) && !b[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === st && !b[r + 2 * dir][c]) moves.push([r + 2 * dir, c]);
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir,
          nc = c + dc;
        if (!inB(nr, nc)) continue;
        if (b[nr][nc] && col(b[nr][nc]) !== pc) moves.push([nr, nc]);
        if (ep && nr === ep[0] && nc === ep[1]) moves.push([nr, nc]);
      }
      break;
    }
    case "n":
      for (const [dr, dc] of [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ]) {
        const nr = r + dr,
          nc = c + dc;
        if (inB(nr, nc) && col(b[nr][nc]) !== pc) moves.push([nr, nc]);
      }
      break;
    case "b":
      slide([
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]);
      break;
    case "r":
      slide([
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]);
      break;
    case "q":
      slide([
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]);
      break;
    case "k": {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr,
            nc = c + dc;
          if (inB(nr, nc) && col(b[nr][nc]) !== pc) moves.push([nr, nc]);
        }
      if (pc === "white" && r === 7 && c === 4) {
        if (
          cr.wK &&
          !b[7][5] &&
          !b[7][6] &&
          !isAtk(b, 7, 4, "black") &&
          !isAtk(b, 7, 5, "black") &&
          !isAtk(b, 7, 6, "black")
        )
          moves.push([7, 6]);
        if (
          cr.wQ &&
          !b[7][3] &&
          !b[7][2] &&
          !b[7][1] &&
          !isAtk(b, 7, 4, "black") &&
          !isAtk(b, 7, 3, "black") &&
          !isAtk(b, 7, 2, "black")
        )
          moves.push([7, 2]);
      }
      if (pc === "black" && r === 0 && c === 4) {
        if (
          cr.bK &&
          !b[0][5] &&
          !b[0][6] &&
          !isAtk(b, 0, 4, "white") &&
          !isAtk(b, 0, 5, "white") &&
          !isAtk(b, 0, 6, "white")
        )
          moves.push([0, 6]);
        if (
          cr.bQ &&
          !b[0][3] &&
          !b[0][2] &&
          !b[0][1] &&
          !isAtk(b, 0, 4, "white") &&
          !isAtk(b, 0, 3, "white") &&
          !isAtk(b, 0, 2, "white")
        )
          moves.push([0, 2]);
      }
      break;
    }
  }
  return moves;
}

function isAtk(b, r, c, byCol) {
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const p = b[i][j];
      if (!p || col(p) !== byCol) continue;
      if (
        rawMoves(b, i, j, null, {
          wK: false,
          wQ: false,
          bK: false,
          bQ: false,
        }).some(([mr, mc]) => mr === r && mc === c)
      )
        return true;
    }
  return false;
}

function applyMov(b, fr, fc, tr, tc, promo, ep) {
  const p = b[fr][fc],
    pc = col(p);
  const isCastle = p.toLowerCase() === "k" && Math.abs(tc - fc) === 2;
  const isEP =
    p.toLowerCase() === "p" &&
    tc !== fc &&
    !b[tr][tc] &&
    ep &&
    tr === ep[0] &&
    tc === ep[1];
  b[tr][tc] = p;
  b[fr][fc] = "";
  if (isEP) b[fr][tc] = "";
  if (isCastle) {
    if (tc === 6) {
      b[tr][5] = b[tr][7];
      b[tr][7] = "";
    } else {
      b[tr][3] = b[tr][0];
      b[tr][0] = "";
    }
  }
  if (p.toLowerCase() === "p" && (tr === 0 || tr === 7)) {
    if (promo && promo !== "__P") b[tr][tc] = promo;
    else if (promo !== "__P") b[tr][tc] = pc === "white" ? "Q" : "q";
  }
}

function legalMov(r, c, forceColor) {
  const p = board[r][c];
  if (!p) return [];
  const pc = col(p),
    chk = forceColor || turn;
  if (pc !== chk) return [];
  return rawMoves(board, r, c, enPassantTarget, castleRights).filter(
    ([tr, tc]) => {
      const tb = cpB(board);
      applyMov(tb, r, c, tr, tc, null, enPassantTarget);
      const [kr, kc] = findKing(tb, pc);
      return !isAtk(tb, kr, kc, opp(pc));
    },
  );
}

function allLegal(side) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if (col(board[r][c]) === side)
        for (const [tr, tc] of legalMov(r, c, side))
          moves.push({ fr: r, fc: c, tr, tc });
    }
  return moves;
}

function updCR(cr, b, fr, fc, tr, tc) {
  const p = b[fr][fc],
    n = { ...cr };
  if (p === "K") {
    n.wK = false;
    n.wQ = false;
  }
  if (p === "k") {
    n.bK = false;
    n.bQ = false;
  }
  if (p === "R" && fr === 7 && fc === 7) n.wK = false;
  if (p === "R" && fr === 7 && fc === 0) n.wQ = false;
  if (p === "r" && fr === 0 && fc === 7) n.bK = false;
  if (p === "r" && fr === 0 && fc === 0) n.bQ = false;
  if (b[tr][tc] === "R" && tr === 7 && tc === 7) n.wK = false;
  if (b[tr][tc] === "R" && tr === 7 && tc === 0) n.wQ = false;
  if (b[tr][tc] === "r" && tr === 0 && tc === 7) n.bK = false;
  if (b[tr][tc] === "r" && tr === 0 && tc === 0) n.bQ = false;
  return n;
}

// ── Make move ────────────────────────────────
async function makeMove(fr, fc, tr, tc, remote = false, promo = null) {
  if (gameOver) return false;
  if (isOnline && !remote && myColor !== turn) {
    showToast("⏳ Not your turn!");
    return false;
  }
  const p = board[fr][fc];
  if (!p || col(p) !== turn) return false;
  const legal = legalMov(fr, fc);
  if (!legal.some(([r, c]) => r === tr && c === tc)) return false;

  const isCastle = p.toLowerCase() === "k" && Math.abs(tc - fc) === 2;
  const isEP =
    p.toLowerCase() === "p" &&
    tc !== fc &&
    !board[tr][tc] &&
    enPassantTarget &&
    tr === enPassantTarget[0] &&
    tc === enPassantTarget[1];
  const isCap = !!board[tr][tc] || isEP;
  const isPawn = p.toLowerCase() === "p";
  const isPromo = isPawn && (tr === 0 || tr === 7);

  if (isCastle) snd("castle");
  else if (isCap) snd("capture");
  else snd("move");

  const newEP = isPawn && Math.abs(tr - fr) === 2 ? [(fr + tr) / 2, fc] : null;
  halfMoveClock = isPawn || isCap ? 0 : halfMoveClock + 1;
  const newCR = updCR(castleRights, board, fr, fc, tr, tc);
  const note = buildNote(p, fr, fc, tr, tc, isCap, isCastle, isEP);

  applyMov(board, fr, fc, tr, tc, isPromo ? "__P" : promo, enPassantTarget);

  if (isPromo) {
    if (!remote && !promo) {
      renderBoard();
      const chosen = await showPromoModal(turn);
      promo = turn === "white" ? chosen.toUpperCase() : chosen.toLowerCase();
    } else {
      promo = promo || (turn === "white" ? "Q" : "q");
    }
    board[tr][tc] = promo;
  }

  castleRights = newCR;
  enPassantTarget = newEP;
  lastMove = { fr, fc, tr, tc };
  if (turn === "black") fullMoveNumber++;
  moveHistory.push({ notation: note, color: turn });
  renderMoves();

  turn = opp(turn);
  const nextMoves = allLegal(turn);
  const checked = isAtk(board, ...findKing(board, turn), opp(turn));

  if (nextMoves.length === 0) {
    gameOver = true;
    winner = checked ? opp(turn) : null;
    snd(checked ? "checkmate" : "stalemate");
    const msg = checked
      ? `🏆 ${opp(turn).toUpperCase()} WINS!`
      : "½ STALEMATE — DRAW";
    setStatus(msg);
    saveGameResult(checked ? opp(turn) : null);
    setTimeout(
      () =>
        showModal(
          checked ? "🏆" : "🤝",
          checked ? "Checkmate!" : "Stalemate!",
          checked
            ? `${opp(turn).charAt(0).toUpperCase() + opp(turn).slice(1)} wins!`
            : "The game is a draw.",
        ),
      600,
    );
  } else if (halfMoveClock >= 100) {
    gameOver = true;
    winner = null;
    setStatus("♟️ DRAW — 50-move rule");
    saveGameResult(null);
    setTimeout(() => showModal("🤝", "Draw!", "50-move rule."), 600);
  } else {
    if (checked) {
      snd("check");
      setStatus(`⚠️ ${turn.toUpperCase()} IS IN CHECK!`);
      setTimeout(() => {
        if (!gameOver) updateStatus();
      }, 1600);
    } else updateStatus();
  }

  renderBoard();
  updateUI();
  if (isOnline && !remote && ws && ws.readyState === WebSocket.OPEN)
    sendMoveOnline(fr, fc, tr, tc, promo || null);
  return true;
}

function buildNote(p, fr, fc, tr, tc, cap, castle, ep) {
  if (castle) return tc === 6 ? "O-O" : "O-O-O";
  const f = (c) => String.fromCharCode(97 + c),
    rk = (r) => String(8 - r);
  const pn = p.toLowerCase() === "p" ? "" : p.toUpperCase();
  const cx = cap || ep ? "x" : "";
  const from = p.toLowerCase() === "p" && (cap || ep) ? f(fc) : "";
  return pn + from + cx + f(tc) + rk(tr);
}

// ── Promotion ────────────────────────────────
function showPromoModal(turnColor) {
  return new Promise((resolve) => {
    pendingPromotion = resolve;
    $("promotionModal").style.display = "flex";
    document.body.style.overflow = "hidden";
  });
}
function handlePromotion(pt) {
  if (!pendingPromotion) return;
  $("promotionModal").style.display = "none";
  document.body.style.overflow = "";
  const r = pendingPromotion;
  pendingPromotion = null;
  r(pt);
}

// ── Render board ─────────────────────────────
function renderBoard() {
  const el = $("board");
  if (!el) return;
  el.innerHTML = "";
  const flip = isOnline && myColor === "black";
  const [ckr, ckc] = findKing(board, turn);
  const inCheck = !gameOver && isAtk(board, ckr, ckc, opp(turn));

  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const r = flip ? 7 - i : i,
        c = flip ? 7 - j : j;
      const p = board[r][c],
        light = (r + c) % 2 === 0;
      const sq = document.createElement("div");
      sq.className = `board-square ${light ? "light" : "dark"}`;
      if (selRow === r && selCol === c) sq.classList.add("selected");
      if (lastMove && lastMove.fr === r && lastMove.fc === c)
        sq.classList.add("last-move");
      if (lastMove && lastMove.tr === r && lastMove.tc === c)
        sq.classList.add("last-move-to");
      const vm = (validMoves || []).some(([vr, vc]) => vr === r && vc === c);
      if (vm) {
        sq.classList.add("valid");
        if (p && col(p) === opp(turn)) sq.classList.add("capture");
      }
      if (inCheck && p && p.toLowerCase() === "k" && col(p) === turn)
        sq.classList.add("in-check");

      if (showCoords) {
        if (j === 0) {
          const lb = document.createElement("span");
          lb.className = "coord-top";
          lb.textContent = flip ? r + 1 : 8 - r;
          sq.appendChild(lb);
        }
        if (i === 7) {
          const lb = document.createElement("span");
          lb.className = "coord-bottom";
          lb.textContent = String.fromCharCode(97 + (flip ? 7 - c : c));
          sq.appendChild(lb);
        }
      }
      if (p) {
        const img = document.createElement("img");
        img.src = PIECE_IMG[p] || "";
        img.alt = GLYPHS[p] || p;
        img.className = "piece-img";
        img.draggable = false;
        sq.appendChild(img);
      }
      sq.addEventListener(
        "click",
        (() => {
          const rr = r,
            cc = c;
          return () => clickSq(rr, cc);
        })(),
      );
      sq.addEventListener(
        "touchend",
        (() => {
          const rr = r,
            cc = c;
          return (e) => {
            e.preventDefault();
            clickSq(rr, cc);
          };
        })(),
        { passive: false },
      );
      el.appendChild(sq);
    }
}

// ── Square click ─────────────────────────────
async function clickSq(r, c) {
  if (gameOver || aiThinking) return;
  if (isOnline && myColor !== turn) {
    showToast("⏳ Not your turn!");
    return;
  }

  if (selRow === null) {
    const p = board[r][c];
    if (p && col(p) === turn) {
      selRow = r;
      selCol = c;
      validMoves = legalMov(r, c);
      renderBoard();
      setStatus(
        `${GLYPHS[p]} — ${validMoves.length} move${validMoves.length !== 1 ? "s" : ""}`,
      );
    }
  } else {
    if ((validMoves || []).some(([vr, vc]) => vr === r && vc === c)) {
      const fr = selRow,
        fc = selCol;
      selRow = null;
      selCol = null;
      validMoves = [];
      await makeMove(fr, fc, r, c);
      if (currentMode === "computer" && !gameOver && turn === "black") aiMove();
    } else if (board[r][c] && col(board[r][c]) === turn) {
      selRow = r;
      selCol = c;
      validMoves = legalMov(r, c);
      renderBoard();
    } else {
      selRow = null;
      selCol = null;
      validMoves = [];
      renderBoard();
    }
  }
}

// ── AI (web worker blob, 3s+ think time) ─────
const AI_SRC = `
const PV={p:100,n:320,b:330,r:500,q:900,k:20000,P:100,N:320,B:330,R:500,Q:900,K:20000};
const PST={P:[[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],N:[[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],B:[[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],R:[[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],Q:[[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],K:[[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]};
const pc=p=>!p?null:(p===p.toUpperCase()&&p!==p.toLowerCase()?'white':'black');
const opp=c=>c==='white'?'black':'white';
const inB=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const cpB=b=>b.map(r=>[...r]);
function fk(b,s){const k=s==='white'?'K':'k';for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===k)return[r,c];return[-1,-1];}
function rM(b,r,c,ep,cr){const p=b[r][c];if(!p)return[];const cl=pc(p),m=[];const sl=d=>{for(const[dr,dc]of d){for(let i=1;i<8;i++){const nr=r+dr*i,nc=c+dc*i;if(!inB(nr,nc))break;if(b[nr][nc]){if(pc(b[nr][nc])!==cl)m.push([nr,nc]);break;}m.push([nr,nc]);}}};switch(p.toLowerCase()){case'p':{const d=cl==='white'?-1:1,st=cl==='white'?6:1;if(inB(r+d,c)&&!b[r+d][c]){m.push([r+d,c]);if(r===st&&!b[r+2*d][c])m.push([r+2*d,c]);}for(const dc of[-1,1]){const nr=r+d,nc=c+dc;if(!inB(nr,nc))continue;if(b[nr][nc]&&pc(b[nr][nc])!==cl)m.push([nr,nc]);if(ep&&nr===ep[0]&&nc===ep[1])m.push([nr,nc]);}break;}case'n':for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const nr=r+dr,nc=c+dc;if(inB(nr,nc)&&pc(b[nr][nc])!==cl)m.push([nr,nc]);}break;case'b':sl([[-1,-1],[-1,1],[1,-1],[1,1]]);break;case'r':sl([[-1,0],[1,0],[0,-1],[0,1]]);break;case'q':sl([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);break;case'k':{for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr=r+dr,nc=c+dc;if(inB(nr,nc)&&pc(b[nr][nc])!==cl)m.push([nr,nc]);}if(cl==='white'&&r===7&&c===4){if(cr.wK&&!b[7][5]&&!b[7][6]&&!atk(b,7,4,'black')&&!atk(b,7,5,'black')&&!atk(b,7,6,'black'))m.push([7,6]);if(cr.wQ&&!b[7][3]&&!b[7][2]&&!b[7][1]&&!atk(b,7,4,'black')&&!atk(b,7,3,'black')&&!atk(b,7,2,'black'))m.push([7,2]);}if(cl==='black'&&r===0&&c===4){if(cr.bK&&!b[0][5]&&!b[0][6]&&!atk(b,0,4,'white')&&!atk(b,0,5,'white')&&!atk(b,0,6,'white'))m.push([0,6]);if(cr.bQ&&!b[0][3]&&!b[0][2]&&!b[0][1]&&!atk(b,0,4,'white')&&!atk(b,0,3,'white')&&!atk(b,0,2,'white'))m.push([0,2]);}break;}}return m;}
function atk(b,r,c,by){for(let i=0;i<8;i++)for(let j=0;j<8;j++){const p=b[i][j];if(!p||pc(p)!==by)continue;if(rM(b,i,j,null,{wK:false,wQ:false,bK:false,bQ:false}).some(([mr,mc])=>mr===r&&mc===c))return true;}return false;}
function aM(b,fr,fc,tr,tc,ep){const p=b[fr][fc],cl=pc(p);const ic=p.toLowerCase()==='k'&&Math.abs(tc-fc)===2;const ie=p.toLowerCase()==='p'&&tc!==fc&&!b[tr][tc]&&ep&&tr===ep[0]&&tc===ep[1];b[tr][tc]=p;b[fr][fc]='';if(ie)b[fr][tc]='';if(ic){if(tc===6){b[tr][5]=b[tr][7];b[tr][7]='';}else{b[tr][3]=b[tr][0];b[tr][0]='';}}if(p.toLowerCase()==='p'&&(tr===0||tr===7))b[tr][tc]=cl==='white'?'Q':'q';}
function uCR(cr,b,fr,fc,tr,tc){const p=b[fr][fc],n={...cr};if(p==='K'){n.wK=false;n.wQ=false;}if(p==='k'){n.bK=false;n.bQ=false;}if(p==='R'&&fr===7&&fc===7)n.wK=false;if(p==='R'&&fr===7&&fc===0)n.wQ=false;if(p==='r'&&fr===0&&fc===7)n.bK=false;if(p==='r'&&fr===0&&fc===0)n.bQ=false;if(b[tr][tc]==='R'&&tr===7&&tc===7)n.wK=false;if(b[tr][tc]==='R'&&tr===7&&tc===0)n.wQ=false;if(b[tr][tc]==='r'&&tr===0&&tc===7)n.bK=false;if(b[tr][tc]==='r'&&tr===0&&tc===0)n.bQ=false;return n;}
function lF(b,cl,ep,cr){const m=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){if(pc(b[r][c])!==cl)continue;for(const[tr,tc]of rM(b,r,c,ep,cr)){const tb=cpB(b);aM(tb,r,c,tr,tc,ep);const[kr,kc]=fk(tb,cl);if(!atk(tb,kr,kc,opp(cl)))m.push({fr:r,fc:c,tr,tc});}}return m;}
function ev(b){let s=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(!p)continue;const iw=pc(p)==='white';const rw=iw?r:7-r;const v=(PV[p]||0)+(PST[p.toUpperCase()]?PST[p.toUpperCase()][rw][c]:0);s+=pc(p)==='black'?v:-v;}return s;}
function ord(mv,b){return mv.sort((a,bb)=>(PV[b[bb.tr][bb.tc]]||0)-(PV[b[a.tr][a.tc]]||0));}
function mm(b,d,al,be,mx,cr,ep){if(d===0)return ev(b);const cl=mx?'black':'white';const mv=ord(lF(b,cl,ep,cr),b);if(!mv.length){const[kr,kc]=fk(b,cl);return atk(b,kr,kc,opp(cl))?(mx?-1e5+d:1e5-d):0;}if(mx){let best=-Infinity;for(const m of mv){const tb=cpB(b);const nc=uCR(cr,b,m.fr,m.fc,m.tr,m.tc);const ne=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;aM(tb,m.fr,m.fc,m.tr,m.tc,ep);const v=mm(tb,d-1,al,be,false,nc,ne);if(v>best)best=v;if(v>al)al=v;if(be<=al)break;}return best;}else{let best=Infinity;for(const m of mv){const tb=cpB(b);const nc=uCR(cr,b,m.fr,m.fc,m.tr,m.tc);const ne=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;aM(tb,m.fr,m.fc,m.tr,m.tc,ep);const v=mm(tb,d-1,al,be,true,nc,ne);if(v<best)best=v;if(v<be)be=v;if(be<=al)break;}return best;}}
self.onmessage=function(e){
  const{board,castleRights,enPassantTarget,difficulty,timeBudget,maxDepth}=e.data;
  const moves=lF(board,'black',enPassantTarget,castleRights);
  if(!moves.length){self.postMessage(null);return;}

  // Easy is intentionally imperfect: it occasionally sees a capture, then
  // selects a legal move at random. The other levels use progressively more
  // search time and iterative deepening, returning the best fully-completed
  // depth if the allotted real-time budget expires.
  if(difficulty==='easy'){
    const caps=moves.filter(m=>board[m.tr][m.tc]);
    const pool=(caps.length&&Math.random()<0.35)?caps:moves;
    self.postMessage(pool[Math.floor(Math.random()*pool.length)]);return;
  }

  const deadline=Date.now()+timeBudget;
  const timed=(fn)=>{if(Date.now()>deadline)throw new Error('timeout');return fn();};
  function timedMM(b,d,al,be,mx,cr,ep){
    timed(()=>0);
    if(d===0)return ev(b);
    const cl=mx?'black':'white',mv=ord(lF(b,cl,ep,cr),b);
    if(!mv.length){const[kr,kc]=fk(b,cl);return atk(b,kr,kc,opp(cl))?(mx?-1e5+d:1e5-d):0;}
    if(mx){let best=-Infinity;for(const m of mv){timed(()=>0);const tb=cpB(b),nc=uCR(cr,b,m.fr,m.fc,m.tr,m.tc),ne=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;aM(tb,m.fr,m.fc,m.tr,m.tc,ep);const v=timedMM(tb,d-1,al,be,false,nc,ne);best=Math.max(best,v);al=Math.max(al,v);if(be<=al)break;}return best;}
    let best=Infinity;for(const m of mv){timed(()=>0);const tb=cpB(b),nc=uCR(cr,b,m.fr,m.fc,m.tr,m.tc),ne=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;aM(tb,m.fr,m.fc,m.tr,m.tc,ep);const v=timedMM(tb,d-1,al,be,true,nc,ne);best=Math.min(best,v);be=Math.min(be,v);if(be<=al)break;}return best;
  }
  function root(depth){
    let best=moves[0],bestV=-Infinity;
    for(const m of ord([...moves],board)){
      timed(()=>0);const tb=cpB(board),nc=uCR(castleRights,board,m.fr,m.fc,m.tr,m.tc),ne=(board[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;
      aM(tb,m.fr,m.fc,m.tr,m.tc,enPassantTarget);
      const v=timedMM(tb,depth-1,-Infinity,Infinity,false,nc,ne);
      if(v>bestV){bestV=v;best=m;}
    }
    return {best,bestV};
  }
  let choice=moves[0],completed=0;
  for(let depth=1;depth<=maxDepth;depth++){
    try{const result=root(depth);choice=result.best;completed=depth;}catch(err){break;}
  }
  // Normal occasionally chooses a close alternative, which keeps it human and
  // clearly below the consistently optimal Hard/Expert modes.
  if(difficulty==='normal'&&completed&&Math.random()<0.2){
    const alternatives=ord([...moves],board).slice(0,Math.min(3,moves.length));
    choice=alternatives[Math.floor(Math.random()*alternatives.length)];
  }
  self.postMessage(choice);
};`;

async function aiMove() {
  if (gameOver || currentMode !== "computer" || turn !== "black" || aiThinking)
    return;
  aiThinking = true;
  const started = Date.now();
  const profile = AI_PROFILES[difficulty] || AI_PROFILES.easy;
  setStatus("🤖 AI is thinking...");
  const bar = $("aiThinkBar");
  if (bar) bar.classList.add("show");

  const blob = new Blob([AI_SRC], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  worker.postMessage({
    board: board.map((r) => [...r]),
    castleRights: { ...castleRights },
    enPassantTarget: enPassantTarget ? [...enPassantTarget] : null,
    difficulty,
    timeBudget: profile.searchMs,
    maxDepth: profile.maxDepth,
  });

  const finish = async (m) => {
    worker.terminate();
    URL.revokeObjectURL(url);
    const elapsed = Date.now() - started;
    if (elapsed < profile.minDelay)
      await new Promise((r) => setTimeout(r, profile.minDelay - elapsed));
    if (bar) bar.classList.remove("show");
    if (m && !gameOver && turn === "black")
      await makeMove(m.fr, m.fc, m.tr, m.tc);
    aiThinking = false;
  };
  worker.onmessage = (e) => finish(e.data);
  worker.onerror = async () => {
    // fallback on main thread
    worker.terminate();
    URL.revokeObjectURL(url);
    const elapsed = Date.now() - started;
    if (elapsed < profile.minDelay)
      await new Promise((r) => setTimeout(r, profile.minDelay - elapsed));
    if (bar) bar.classList.remove("show");
    // simple random move as fallback
    const moves = allLegal("black");
    if (moves.length && !gameOver && turn === "black") {
      const m = moves[Math.floor(Math.random() * moves.length)];
      await makeMove(m.fr, m.fc, m.tr, m.tc);
    }
    aiThinking = false;
  };
}

// ── UI helpers ───────────────────────────────
function setStatus(msg) {
  const el = $("statusText");
  if (el) el.textContent = msg.replace(/<[^>]*>/g, "");
}
function updateStatus() {
  if (gameOver) return;
  if (isOnline) setStatus(myColor === turn ? "🎮 Your turn!" : "⏳ Waiting...");
  else if (currentMode === "computer")
    setStatus(turn === "white" ? "♟️ Your turn" : "🤖 AI is thinking...");
  else setStatus(`👥 ${turn.charAt(0).toUpperCase() + turn.slice(1)}'s turn`);
}
function updateUI() {
  const st = $("statusText");
  if (st)
    st.textContent = `${turn.charAt(0).toUpperCase() + turn.slice(1)}'s Turn`;
  // player badges
  const bb = $("bottomPlayerBadge"),
    tb = $("topPlayerBadge");
  const bottomColor = isOnline ? myColor || "white" : "white";
  const topColor = opp(bottomColor);
  if (bb) bb.textContent = bottomColor === turn ? "● Turn" : "○ Wait";
  if (tb) tb.textContent = topColor === turn ? "● Turn" : "○ Wait";
  if (bb)
    bb.className = `px-3 py-1 rounded-full text-xs font-bold ${bottomColor === turn ? "bg-ink text-white" : "bg-soft text-mute"}`;
  if (tb)
    tb.className = `px-3 py-1 rounded-full text-xs font-bold ${topColor === turn ? "bg-ink text-white" : "bg-soft"}`;
}
function renderMoves() {
  const list = $("moveHistoryList");
  if (!list) return;
  list.innerHTML = "";
  for (let i = 0; i < moveHistory.length; i += 2) {
    const n = Math.floor(i / 2) + 1;
    const w = moveHistory[i]?.notation || "";
    const bl = moveHistory[i + 1]?.notation || "";
    const row = document.createElement("div");
    row.className = "move-row";
    row.innerHTML = `<span style="color:#8a8a8a">${n}.</span><span>${w}</span><span style="color:#555">${bl}</span>`;
    list.appendChild(row);
  }
  list.scrollTop = list.scrollHeight;
}
function showModal(icon, title, sub) {
  $("gameOverIcon").textContent = icon;
  $("gameOverTitle").textContent = title;
  $("gameOverSub").textContent = sub;
  $("gameOverModal").style.display = "flex";
}
function showToast(msg, dur = 2800) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), dur);
}
function snd(type) {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    const tbl = {
      move: [523, 0.08, "sine"],
      capture: [330, 0.15, "square"],
      castle: [659, 0.18, "sine"],
      check: [880, 0.3, "sine"],
      checkmate: [220, 0.8, "sawtooth"],
      stalemate: [440, 0.4, "sine"],
      notify: [660, 0.1, "sine"],
    };
    const [f, d, w] = tbl[type] || tbl.move;
    o.frequency.value = f;
    o.type = w;
    g.gain.value = 0.2;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + d);
    o.stop(ctx.currentTime + d);
    ctx.resume();
  } catch (e) {}
}

// ── Screen navigation ────────────────────────
function showScreen(name) {
  $$(".screen").forEach((s) => {
    s.classList.remove("active");
    s.style.display = "";
  });
  const s = $("screen-" + name);
  if (s) {
    s.classList.add("active");
    s.style.display = "block";
  }
  $$(".nav-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.nav === name),
  );
  if (name === "game") {
    renderBoard();
    updateUI();
    updateStatus();
  }
  if (name === "home") renderHome();
  if (name === "matches") switchMatchTab("friends");
  if (name === "learn") renderPracticeList();
}

// ── Game reset ────────────────────────────────
function resetGame(skipAI = false) {
  initState();
  if (isOnline && myColor) turn = "white";
  const mhl = $("moveHistoryList");
  if (mhl) mhl.innerHTML = "";
  $("gameOverModal").style.display = "none";
  renderBoard();
  updateUI();
  updateStatus();
  if (!skipAI && currentMode === "computer" && turn === "black") aiMove();
}

// ── Save result to user profile ───────────────
function saveGameResult(winnerColor) {
  if (!currentUser) return;
  const users = loadUsers();
  const key = currentUser.name.toLowerCase();
  if (!users[key]) return;
  let result = "draw";
  if (!winnerColor) {
    users[key].draws = (users[key].draws || 0) + 1;
    result = "draw";
  } else if (winnerColor === "white") {
    if (currentMode === "computer" || isOnline) {
      const iWon =
        (isOnline && myColor === "white") ||
        (!isOnline && winnerColor === "white");
      if (iWon) {
        users[key].wins = (users[key].wins || 0) + 1;
        result = "win";
      } else {
        users[key].losses = (users[key].losses || 0) + 1;
        result = "loss";
      }
    } else {
      users[key].wins = (users[key].wins || 0) + 1;
      result = "win";
    }
  } else {
    if (isOnline && myColor === "black") {
      users[key].wins = (users[key].wins || 0) + 1;
      result = "win";
    } else {
      users[key].losses = (users[key].losses || 0) + 1;
      result = "loss";
    }
  }
  saveUsers(users);
  currentUser = users[key];
  updateStatDisplay();

  // Save to match history + friends
  const opponent = isOnline
    ? (onlineOpponentName || ($("topPlayerName")?.textContent || "Opponent").replace(" (Opp)", ""))
    : currentMode === "computer"
      ? `AI (${difficulty})`
      : "Local Player";
  const moveCnt = moveHistory.length;
  saveGameHistory(opponent, result, moveCnt);
  if (isOnline) {
    addFriendFromGame(opponent);
    updateFriendRecord(opponent, result);
  }
}
function updateStatDisplay() {
  if (!currentUser) return;
  const set = (id, v) => {
    const el = $(id);
    if (el) el.textContent = v;
  };
  set("statWins", currentUser.wins || 0);
  set("statDraws", currentUser.draws || 0);
  set("statLosses", currentUser.losses || 0);
}

// ── Online multiplayer ────────────────────────
function setConnStatus(status) {
  const el = $("connectionStatus");
  if (!el) return;
  const map = {
    online: "✅ Connected",
    connecting: "⏳ Connecting…",
    offline: "Offline",
  };
  el.textContent = map[status] || status;
  el.style.color =
    status === "online"
      ? "#059669"
      : status === "connecting"
        ? "#d97706"
        : "#8a8a8a";
}
function showOnlineUI(myCol) {
  const oppCol = opp(myCol);
  ["opponentBanner", "myBanner", "onlinePlayerPanel"].forEach((id) => {
    const el = $(id);
    if (el) el.style.display = "flex";
  });
  const mhs = $("moveHistorySection");
  if (mhs) mhs.style.display = "block";
  ["resignBtn", "offerDrawBtn", "disconnectBtn"].forEach((id) => {
    const el = $(id);
    if (el) el.style.display = "block";
  });
  const wn = $("playerWhiteName"),
    bn = $("playerBlackName"),
    ws = $("playerWhiteStatus"),
    bs = $("playerBlackStatus");
  if (wn)
    wn.textContent = myCol === "white" ? "You (White)" : "Opponent (White)";
  if (bn)
    bn.textContent = myCol === "black" ? "You (Black)" : "Opponent (Black)";
  if (ws) ws.textContent = myCol === "white" ? "You" : "Waiting…";
  if (bs) bs.textContent = myCol === "black" ? "You" : "Waiting…";
  const od = $("oppDot"),
    md = $("myDot");
  if (od) od.className = `pb-dot ${oppCol}-dot`;
  if (md) md.className = `pb-dot ${myCol}-dot`;
  const ol = $("oppLabel"),
    ml = $("myLabel");
  if (ol)
    ol.textContent =
      oppCol.charAt(0).toUpperCase() + oppCol.slice(1) + " (Opp)";
  if (ml)
    ml.textContent = myCol.charAt(0).toUpperCase() + myCol.slice(1) + " (You)";
  const top = $("topPlayerName"),
    bot = $("bottomPlayerName");
  if (top) top.textContent = oppCol.charAt(0).toUpperCase() + oppCol.slice(1);
  if (bot)
    bot.textContent = myCol.charAt(0).toUpperCase() + myCol.slice(1) + " (You)";
}
function hideOnlineUI() {
  ["opponentBanner", "myBanner", "onlinePlayerPanel"].forEach((id) => {
    const el = $(id);
    if (el) el.style.display = "none";
  });
  ["resignBtn", "offerDrawBtn", "disconnectBtn"].forEach((id) => {
    const el = $(id);
    if (el) el.style.display = "none";
  });
}
// (online connection handled by WebSocket handleServerMsg)
function leaveGame() {
  if (ws) {
    wsSend({ type: "leave-room" });
    ws.close();
    ws = null;
  }
  isOnline = false;
  myColor = null;
  onlineOpponentName = "";
  currentMode = "computer";
  setConnStatus("offline");
  hideOnlineUI();
  const gc = $("gameCodeContainer");
  if (gc) gc.style.display = "none";
  const ri = $("joinRoomInput");
  if (ri) ri.value = "";
  const cs = $("connectionStatus");
  if (cs) {
    cs.textContent = "Offline";
    cs.style.color = "";
  }
  resetGame();
}
function offerDraw() {
  if (!isOnline || !ws) return;
  wsSend({ type: "draw_offer" });
  showToast("🤝 Draw offered");
}
function acceptDraw() {
  $("drawModal").style.display = "none";
  if (ws) wsSend({ type: "draw_accept" });
  gameOver = true;
  winner = null;
  saveGameResult(null);
  showModal("🤝", "Draw Agreed!", "Both players agreed.");
}
function declineDraw() {
  $("drawModal").style.display = "none";
  if (ws) wsSend({ type: "draw_decline" });
  showToast("❌ Draw declined");
}
function resign() {
  if (!confirm("Resign this game?")) return;
  if (isOnline && ws) wsSend({ type: "resign" });
  gameOver = true;
  winner = isOnline ? opp(myColor) : "black";
  saveGameResult(winner);
  showModal(
    "🏳️",
    "You Resigned",
    `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins.`,
  );
}
function copyCode() {
  const code = myShortCode || "";
  if (!code) {
    showToast("No room code yet");
    return;
  }
  navigator.clipboard
    ?.writeText(code)
    .then(() => showToast("✅ Copied: " + code, 4000))
    .catch(() => showToast("Code: " + code, 4000));
}

// ── User system ───────────────────────────────
function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveUsers(u) {
  localStorage.setItem(USER_STORE_KEY, JSON.stringify(u));
}
function isValidUsername(n) {
  return n.length >= 3 && n.length <= 20 && /^[a-zA-Z0-9 _-]+$/.test(n);
}
function sanitizeUser(n) {
  return (n || "").trim().replace(/\s+/g, " ").slice(0, 20);
}

function registerUser(name) {
  const users = loadUsers(),
    key = name.toLowerCase();
  if (!users[key])
    users[key] = {
      name,
      created: new Date().toISOString(),
      wins: 0,
      losses: 0,
      draws: 0,
    };
  saveUsers(users);
  localStorage.setItem(CURRENT_USER_KEY, name);
  currentUser = users[key];
  return currentUser;
}
function loadCurrentUser() {
  const saved = localStorage.getItem(CURRENT_USER_KEY);
  if (!saved) return null;
  return loadUsers()[saved.toLowerCase()] || null;
}
function updateProfileUI() {
  if (!currentUser) return;
  const init = currentUser.name.charAt(0).toUpperCase();
  const total =
    (currentUser.wins || 0) +
    (currentUser.losses || 0) +
    (currentUser.draws || 0);
  const since = new Date(currentUser.created).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
  // home header
  const ha = $("homeAvatar"),
    hn = $("homeName"),
    hx = $("homeXp");
  if (ha) ha.textContent = init;
  if (hn) hn.textContent = currentUser.name;
  if (hx)
    hx.textContent = `${(currentUser.wins || 0) * 40 + (currentUser.draws || 0) * 15 + (currentUser.losses || 0) * 5} XP`;
  // profile page
  const pn = $("profileName");
  if (pn) pn.value = currentUser.name;
  updateStatDisplay();
}
function setBoardTheme(theme) {
  const valid = BOARD_THEMES.includes(theme) ? theme : "classic";
  localStorage.setItem(THEME_KEY, valid);
  BOARD_THEMES.forEach((t) => document.body.classList.remove("theme-" + t));
  if (valid !== "classic") document.body.classList.add("theme-" + valid);
  $$(".theme-swatch").forEach((btn) => {
    const a = btn.dataset.theme === valid;
    btn.classList.toggle("active", a);
    const dv = btn.querySelector("div");
    if (dv) dv.style.borderColor = a ? "#0a0a0a" : "transparent";
  });
}
function enterApp() {
  const welcomeEl = $("welcomeScreen");
  const ap = $("app");
  if (welcomeEl) welcomeEl.style.display = "none";
  if (ap) {
    ap.classList.remove("hidden");
    ap.style.display = "flex";
    ap.style.flexDirection = "column";
  }
  const bn = $("bottomNav");
  if (bn) {
    bn.classList.remove("hidden");
    bn.style.display = "flex";
  }
  updateProfileUI();
  showScreen("home");
}
function showWelcomeScreen() {
  const welcomeEl = $("welcomeScreen"),
    ap = $("app"),
    bn = $("bottomNav");
  if (welcomeEl) {
    welcomeEl.style.display = "flex";
  }
  if (ap) {
    ap.classList.add("hidden");
    ap.style.display = "none";
  }
  if (bn) {
    bn.classList.add("hidden");
    bn.style.display = "none";
  }
  const user = loadCurrentUser();
  const form = $("welcomeForm"),
    ret = $("returningUser");
  if (user) {
    if (form) form.style.display = "none";
    if (ret) ret.style.display = "block";
    const rn = $("returningName");
    if (rn) rn.textContent = user.name;
    const ra = $("returningAvatar");
    if (ra) ra.textContent = user.name.charAt(0).toUpperCase();
    const rs = $("returningStats");
    if (rs)
      rs.textContent = `${user.wins || 0}W · ${user.draws || 0}D · ${user.losses || 0}L`;
    currentUser = user;
  } else {
    if (form) form.style.display = "block";
    if (ret) ret.style.display = "none";
    currentUser = null;
  }
}
function signOut() {
  localStorage.removeItem(CURRENT_USER_KEY);
  currentUser = null;
  if (isOnline) leaveGame();
  showWelcomeScreen();
  showToast("Signed out 👋");
}

// ── Play setup ────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  const startBtn = $("startGameBtn");
  if (startBtn) {
    if (mode === "computer")
      startBtn.textContent = `Start vs AI (${difficulty})`;
    else if (mode === "local") startBtn.textContent = "Start local game";
    else startBtn.textContent = "Use Create / Join above";
  }
  $("aiSetup").style.display = mode === "computer" ? "block" : "none";
  $("onlineSetup").style.display = mode === "online" ? "block" : "none";
  // update mode chip styles
  $$(".mode-chip").forEach((b) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle("active", active);
    b.style.background = active ? "#0a0a0a" : "#fff";
    b.style.color = active ? "#fff" : "#0a0a0a";
    b.style.borderColor = active ? "#0a0a0a" : "#efefef";
  });
}
function setDiff(level) {
  difficulty = level;
  $$(".diff-chip").forEach((b) => {
    const active = b.dataset.diff === level;
    b.classList.toggle("active", active);
    b.style.background = active ? "#0a0a0a" : "#fff";
    b.style.color = active ? "#fff" : "#0a0a0a";
    b.style.borderColor = active ? "#0a0a0a" : "#efefef";
    const sub = b.querySelector("span:last-child");
    if (sub) sub.style.opacity = active ? ".55" : "1";
    if (sub) sub.style.color = active ? "rgba(255,255,255,.55)" : "#8a8a8a";
  });
  const sb = $("startGameBtn");
  if (sb && currentMode === "computer")
    sb.textContent = `Start vs AI (${level})`;
}
function startGame() {
  if (currentMode === "online") {
    // Board only opens once connected — handled by setupConn's open event
    showToast("Create or join a room to play online");
    return;
  }
  // local or AI
  if (isOnline) leaveGame();
  currentMode = currentMode === "online" ? "computer" : currentMode;
  resetGame(false);
  showScreen("game");
  showToast(
    currentMode === "computer"
      ? `vs AI — ${difficulty}`
      : "Local 2-player game 🎮",
  );
}

// ── Home — last games ─────────────────────────
function renderHome() {
  const user = loadCurrentUser();
  if (!user) return;
  updateProfileUI();
  const hist = JSON.parse(
    localStorage.getItem("chess-arena-history-" + user.name.toLowerCase()) ||
      "[]",
  );
  const list = $("homeRecentList");
  if (!list) return;
  list.innerHTML = "";
  if (!hist.length) {
    list.innerHTML =
      '<div class="bg-white rounded-2xl p-4 text-sm text-mute border border-soft">No games yet. Start one from Play.</div>';
    return;
  }
  hist.slice(0, 4).forEach((g) => {
    const d = document.createElement("div");
    d.className = "history-card";
    d.innerHTML = `<div><p class="font-bold text-sm">${g.opponent}</p><p class="text-xs text-mute mt-0.5">${g.date} · ${g.moves} moves</p></div><span class="badge-${g.result}">${g.result.toUpperCase()}</span>`;
    list.appendChild(d);
  });
}
function saveGameHistory(opponent, result, moves) {
  if (!currentUser) return;
  const key = "chess-arena-history-" + currentUser.name.toLowerCase();
  const hist = JSON.parse(localStorage.getItem(key) || "[]");
  hist.unshift({
    opponent,
    result,
    moves,
    date: new Date().toLocaleDateString(),
  });
  localStorage.setItem(key, JSON.stringify(hist.slice(0, 40)));
}
function renderMatches() {
  const user = loadCurrentUser();
  if (!user) return;
  const hist = JSON.parse(
    localStorage.getItem("chess-arena-history-" + user.name.toLowerCase()) ||
      "[]",
  );
  const list = $("matchesList");
  if (!list) return;
  list.innerHTML = "";
  if (!hist.length) {
    list.innerHTML =
      '<div class="bg-white rounded-2xl p-4 text-sm text-mute border border-soft">No match history yet.</div>';
    return;
  }
  hist.forEach((g) => {
    const d = document.createElement("div");
    d.className = "history-card";
    d.innerHTML = `<div><p class="font-bold text-sm">${g.opponent}</p><p class="text-xs text-mute">${g.date}</p></div><span class="badge-${g.result}">${g.result.toUpperCase()}</span>`;
    list.appendChild(d);
  });
}

// ── Practice puzzles ──────────────────────────
// Two lesson types:
//   explore: "freeMove" — shows ALL reachable squares; any move is accepted.
//   puzzle:  "single"   — one specific correct move required.
const PUZZLE_CATEGORIES = [
  {
    label: "How pieces move",
    icon: "♟",
    puzzles: [
      {
        id: "pawn_move",
        title: "Pawn — move forward",
        hint: "Pawns move forward 1 square. From the starting row they can move 2! They capture diagonally. All green squares show where this pawn can go — click any one.",
        fen: "8/8/8/8/8/8/3P4/8 w - - 0 1",
        sol: { from: "d2" },
        mode: "freeMove",
        xp: 10,
      },
      {
        id: "knight_move",
        title: "Knight — the L-shape jump",
        hint: "Knights jump in an 'L': 2 squares one way, 1 square sideways. They are the ONLY piece that can jump over others! All green squares show every possible knight jump from d4 — click any one.",
        fen: "8/8/8/8/3N4/8/8/8 w - - 0 1",
        sol: { from: "d4" },
        mode: "freeMove",
        xp: 15,
      },
      {
        id: "bishop_move",
        title: "Bishop — diagonal slide",
        hint: "Bishops slide diagonally any number of squares. A bishop always stays on the same colour! All green squares show where this bishop can go — click any one.",
        fen: "8/8/8/8/3B4/8/8/8 w - - 0 1",
        sol: { from: "d4" },
        mode: "freeMove",
        xp: 15,
      },
      {
        id: "rook_move",
        title: "Rook — straight slide",
        hint: "Rooks slide any number of squares along a rank (row) or file (column). They are very powerful in open positions! All green squares show where this rook can reach — click any one.",
        fen: "8/8/8/8/3R4/8/8/8 w - - 0 1",
        sol: { from: "d4" },
        mode: "freeMove",
        xp: 15,
      },
      {
        id: "queen_move",
        title: "Queen — most powerful piece",
        hint: "The queen combines the rook AND bishop — she slides in any direction, any number of squares. She can reach 27 squares from the centre! Click any green square.",
        fen: "8/8/8/8/3Q4/8/8/8 w - - 0 1",
        sol: { from: "d4" },
        mode: "freeMove",
        xp: 15,
      },
      {
        id: "king_move",
        title: "King — one step any direction",
        hint: "The king moves exactly 1 square in any direction. He is the most important piece — if he is checkmated, you lose! All green squares show where the king can step — click any one.",
        fen: "8/8/8/8/3K4/8/8/8 w - - 0 1",
        sol: { from: "d4" },
        mode: "freeMove",
        xp: 10,
      },
    ],
  },
  {
    label: "Special moves",
    icon: "⚡",
    puzzles: [
      {
        id: "capture",
        title: "Capture a piece",
        hint: "You capture an enemy piece by moving onto its square — it is removed from the board. Your bishop is on f3 and a black pawn sits on d5. Slide diagonally to capture it!",
        fen: "8/8/8/3p4/8/5B2/8/8 w - - 0 1",
        sol: { from: "f3", to: "d5" },
        mode: "single",
        xp: 20,
      },
      {
        id: "castling_ks",
        title: "Castling — king-side",
        hint: "Castling moves the king 2 squares toward the rook, then the rook jumps to the other side — all in one move! You can only castle if: neither piece has moved, no pieces are between them, and the king is not in check. Move the king from e1 to g1.",
        fen: "8/8/8/8/8/8/8/4K2R w KQ - 0 1",
        sol: { from: "e1", to: "g1" },
        mode: "single",
        special: "castle_ks",
        xp: 30,
      },
      {
        id: "castling_qs",
        title: "Castling — queen-side",
        hint: "You can also castle queen-side — the king moves 2 squares left and the rook on a1 jumps to d1. Same rules apply: no pieces between them, neither has moved. Move the king from e1 to c1.",
        fen: "8/8/8/8/8/8/8/R3K3 w KQ - 0 1",
        sol: { from: "e1", to: "c1" },
        mode: "single",
        special: "castle_qs",
        xp: 30,
      },
      {
        id: "en_passant",
        title: "En passant — pawn capture",
        hint: "En passant ('in passing'): if an enemy pawn double-pushes and lands beside your pawn, you can capture it as if it moved only 1 square — but ONLY on the very next move! The black pawn just rushed to d5. Capture it by moving your pawn from e5 to d6.",
        fen: "8/8/8/3pP3/8/8/8/8 w - d6 0 1",
        sol: { from: "e5", to: "d6" },
        mode: "single",
        special: "en_passant",
        xp: 35,
      },
      {
        id: "pawn_promo",
        title: "Pawn promotion",
        hint: "When a pawn reaches the opposite end of the board (rank 8 for white), it promotes — you swap it for any piece, almost always a queen! Push the white pawn from e7 to e8.",
        fen: "8/4P3/8/8/8/8/8/8 w - - 0 1",
        sol: { from: "e7", to: "e8" },
        mode: "single",
        special: "promotion",
        xp: 30,
      },
    ],
  },
  {
    label: "Tactics & checkmate",
    icon: "🎯",
    puzzles: [
      {
        id: "check",
        title: "Give check",
        hint: "Check means the king is under attack and must escape next move. The rook is on h1 and the black king is on h8 — same file! Slide the rook from h1 to h8 to put the king in check.",
        fen: "7k/8/8/8/8/8/8/7R w - - 0 1",
        sol: { from: "h1", to: "h8" },
        mode: "single",
        xp: 25,
      },
      {
        id: "knight_fork",
        title: "Knight fork — attack two at once",
        hint: "A fork attacks two pieces simultaneously — the opponent can only save one! Move the knight from d1 to e3. From e3 it attacks the black pawn on d5 AND the black rook on f5 at the same time!",
        fen: "8/8/8/3p1r2/8/8/8/3N4 w - - 0 1",
        sol: { from: "d1", to: "e3" },
        mode: "single",
        xp: 40,
      },
      {
        id: "mate1",
        title: "Checkmate in one!",
        hint: "Checkmate — king in check with no escape. The black king is cornered at a8, the white king on a6 covers a7 and b7. Slide the rook from b1 straight up to b8 for checkmate!",
        fen: "k7/8/K7/8/8/8/8/1R6 w - - 0 1",
        sol: { from: "b1", to: "b8" },
        mode: "single",
        xp: 50,
      },
    ],
  },
];

// Flat list (used for XP counter and solved tracking)
const PUZZLES = PUZZLE_CATEGORIES.flatMap((cat) => cat.puzzles);

let activePuzzle = null,
  puzzleChess = null,
  puzzleSel = null,
  puzzleTargets = [];

// ── Render categorised practice list ──────────
function renderPracticeList() {
  const list = $("practiceList");
  if (!list) return;
  list.innerHTML = "";
  const solved = JSON.parse(localStorage.getItem("chess-arena-solved") || "[]");
  const total = PUZZLES.length;
  const doneCount = PUZZLES.filter((p) => solved.includes(p.id)).length;

  // Progress bar header
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const header = document.createElement("div");
  header.className = "mb-4";
  header.innerHTML = `
    <div class="flex items-center justify-between mb-1">
      <p class="text-xs font-bold text-ink">${doneCount}/${total} lessons completed</p>
      <p class="text-xs font-bold text-mute">${pct}%</p>
    </div>
    <div class="w-full h-2 bg-soft rounded-full overflow-hidden">
      <div class="h-full bg-ink rounded-full transition-all" style="width:${pct}%"></div>
    </div>`;
  list.appendChild(header);

  PUZZLE_CATEGORIES.forEach((cat) => {
    // Category heading
    const catHead = document.createElement("div");
    catHead.className = "flex items-center gap-2 mt-4 mb-2";
    catHead.innerHTML = `<span class="text-lg">${cat.icon}</span><p class="text-xs font-black tracking-[0.18em] text-mute uppercase">${cat.label}</p>`;
    list.appendChild(catHead);

    cat.puzzles.forEach((p) => {
      const done = solved.includes(p.id);
      const btn = document.createElement("button");
      btn.className = "practice-card mb-2";
      btn.innerHTML = `
        <div class="flex-1 text-left">
          <p class="font-bold text-sm">${p.title}</p>
          <p class="text-xs text-mute mt-0.5 leading-relaxed">${p.hint.slice(0, 72)}…</p>
        </div>
        <div class="text-right flex-shrink-0 ml-3 flex flex-col items-end gap-1">
          <span class="text-xs font-black text-ink">+${p.xp} XP</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${done ? "bg-green-100 text-green-700" : "bg-soft text-mute"}">${done ? "✓ Done" : "Start"}</span>
        </div>`;
      btn.onclick = () => openPuzzle(p);
      list.appendChild(btn);
    });
  });
}

// ── Puzzle board helpers ───────────────────────
function pzSq(sq) {
  const f = sq.charCodeAt(0) - 97,
    r = 8 - parseInt(sq[1]);
  return [r, f];
}
function pzFen2Board(fen) {
  const rows = fen.split(" ")[0].split("/");
  return rows.map((row) => {
    const cells = [];
    for (const ch of row) {
      const n = parseInt(ch);
      if (isNaN(n)) cells.push(ch);
      else for (let i = 0; i < n; i++) cells.push("");
    }
    return cells;
  });
}

// pzMove handles normal moves + three special cases
function pzMove(board, from, to, special) {
  const [fr, fc] = pzSq(from);
  const [tr, tc] = pzSq(to);
  const nb = board.map((r) => [...r]);
  const piece = nb[fr][fc];

  nb[tr][tc] = piece;
  nb[fr][fc] = "";

  if (special === "castle_ks") {
    // Move rook from h1 (7,7) to f1 (7,5)
    nb[7][5] = nb[7][7];
    nb[7][7] = "";
  } else if (special === "castle_qs") {
    // Move rook from a1 (7,0) to d1 (7,3)
    nb[7][3] = nb[7][0];
    nb[7][0] = "";
  } else if (special === "en_passant") {
    // Remove the captured pawn — it sits on the same rank as FROM, same file as TO
    nb[fr][tc] = "";
  } else if (special === "promotion") {
    // Promote to queen
    nb[tr][tc] = "Q";
  }

  return nb;
}

function openPuzzle(p) {
  activePuzzle = p;
  puzzleSel = null;
  puzzleTargets = [];
  puzzleChess = pzFen2Board(p.fen);
  $("practiceList").classList.add("hidden");
  $("practicePlay").classList.remove("hidden");
  $("practiceTitle").textContent = p.title;
  $("practiceHint").textContent = p.hint;
  if (p.mode === "freeMove") {
    // Pre-select the piece and show ALL its targets immediately
    const [r, c] = pzSq(p.sol.from);
    puzzleSel = p.sol.from;
    puzzleTargets = pzAllMoves(puzzleChess, r, c);
    $("practiceStatus").textContent = "Click any green square to move the piece!";
    $("practiceStatus").className = "text-center text-sm text-mute mt-3";
  } else {
    $("practiceStatus").textContent = "Click the glowing piece to select it";
    $("practiceStatus").className = "text-center text-sm text-mute mt-3";
  }
  renderPuzzleBoard();
}

// ── Compute all reachable squares for a piece (used by freeMove lessons) ──
function pzAllMoves(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  const pl = p.toLowerCase();
  const isW = p === p.toUpperCase();
  const moves = [];
  const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const friendly = (r, c) => {
    const x = board[r]?.[c];
    return x && (isW ? x === x.toUpperCase() : x === x.toLowerCase());
  };
  const sqN = (r, c) => String.fromCharCode(97 + c) + (8 - r);
  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (!inB(nr, nc)) break;
        if (friendly(nr, nc)) break;
        moves.push(sqN(nr, nc));
        if (board[nr][nc]) break;
      }
    }
  };
  if (pl === "p") {
    const dir = isW ? -1 : 1, start = isW ? 6 : 1;
    if (inB(r + dir, c) && !board[r + dir][c]) {
      moves.push(sqN(r + dir, c));
      if (r === start && !board[r + 2 * dir][c]) moves.push(sqN(r + 2 * dir, c));
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (inB(nr, nc) && board[nr][nc]) moves.push(sqN(nr, nc));
    }
  } else if (pl === "n") {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr = r + dr, nc = c + dc;
      if (inB(nr, nc) && !friendly(nr, nc)) moves.push(sqN(nr, nc));
    }
  } else if (pl === "b") {
    slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  } else if (pl === "r") {
    slide([[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (pl === "q") {
    slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (pl === "k") {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (inB(nr, nc) && !friendly(nr, nc)) moves.push(sqN(nr, nc));
      }
  }
  return moves;
}

// ── Render puzzle board (SVG pieces + coords) ──
function renderPuzzleBoard() {
  const el = $("practiceBoard");
  if (!el) return;
  el.innerHTML = "";
  const files = "abcdefgh";
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const sq = files[c] + (8 - r);
      const p = puzzleChess[r][c];
      const light = (r + c) % 2 === 0;
      const cell = document.createElement("div");
      cell.className = `board-square ${light ? "light" : "dark"}`;

      // In freeMove mode the piece is pre-selected; in single mode highlight it
      if (activePuzzle) {
        if (activePuzzle.mode === "freeMove" && sq === activePuzzle.sol.from) {
          cell.classList.add("selected");
        } else if (activePuzzle.mode !== "freeMove" && sq === activePuzzle.sol.from && !puzzleSel) {
          cell.classList.add("pz-hint");
        }
      }
      if (puzzleSel === sq && activePuzzle?.mode !== "freeMove") cell.classList.add("selected");
      if (puzzleTargets.includes(sq)) {
        cell.classList.add("valid");
        if (p) cell.classList.add("capture");
      }

      // Coordinates
      if (c === 0) {
        const lb = document.createElement("span");
        lb.className = "coord-top";
        lb.textContent = 8 - r;
        cell.appendChild(lb);
      }
      if (r === 7) {
        const lb = document.createElement("span");
        lb.className = "coord-bottom";
        lb.textContent = files[c];
        cell.appendChild(lb);
      }

      if (p) {
        const img = document.createElement("img");
        img.src = PIECE_IMG[p] || "";
        img.alt = GLYPHS[p] || p;
        img.className = "piece-img";
        img.draggable = false;
        cell.appendChild(img);
      }
      cell.onclick = () => clickPuzzle(sq);
      el.appendChild(cell);
    }
}

// ── Click handler for puzzle board ────────────
function clickPuzzle(sq) {
  if (!activePuzzle) return;

  // ── freeMove mode: any legal square is correct ──
  if (activePuzzle.mode === "freeMove") {
    if (!puzzleTargets.includes(sq)) {
      // Clicked outside valid squares — ignore silently
      return;
    }
    // Valid move — apply it
    puzzleChess = pzMove(puzzleChess, activePuzzle.sol.from, sq, activePuzzle.special);
    puzzleSel = null;
    puzzleTargets = [];
    renderPuzzleBoard();

    const countMsgs = {
      pawn_move:   "✅ That's how pawns move! They only go forward, and capture diagonally.",
      knight_move: "✅ Perfect L-shape! Knights can jump over any pieces in the way.",
      bishop_move: "✅ Diagonal slide! Remember — your bishop stays on this colour all game.",
      rook_move:   "✅ Straight slide! Rooks are most powerful in open files and ranks.",
      queen_move:  "✅ The queen can go anywhere — the most powerful piece on the board!",
      king_move:   "✅ One step at a time. Keep your king safe — he is the most important piece!",
    };
    $("practiceStatus").textContent = countMsgs[activePuzzle.id] || "✅ Correct!";
    $("practiceStatus").className = "text-center text-sm font-semibold mt-3 text-green-600";

    const solved = JSON.parse(localStorage.getItem("chess-arena-solved") || "[]");
    if (!solved.includes(activePuzzle.id)) {
      solved.push(activePuzzle.id);
      localStorage.setItem("chess-arena-solved", JSON.stringify(solved));
      showToast(`+${activePuzzle.xp} XP 🎉`);
    } else {
      showToast("Nice move! (already completed)");
    }
    const pp = $("practiceProgress");
    if (pp) pp.textContent = `${solved.length} / ${PUZZLES.length} lessons done`;
    return;
  }

  // ── single mode: one specific correct move required ──
  if (puzzleSel && puzzleTargets.includes(sq)) {
    const ok = puzzleSel === activePuzzle.sol.from && sq === activePuzzle.sol.to;
    if (!ok) {
      $("practiceStatus").textContent = "Not quite — try again!";
      $("practiceStatus").className = "text-center text-sm font-semibold mt-3 text-red-500";
      puzzleSel = null;
      puzzleTargets = [];
      renderPuzzleBoard();
      return;
    }
    puzzleChess = pzMove(puzzleChess, puzzleSel, sq, activePuzzle.special);
    puzzleSel = null;
    puzzleTargets = [];
    renderPuzzleBoard();

    const msgs = {
      castle_ks:  "✅ Castled king-side! King is tucked away safely behind the pawns.",
      castle_qs:  "✅ Castled queen-side! King moved to safety, rook joins the action.",
      en_passant: "✅ En passant! The passed pawn was captured in the act.",
      promotion:  "✅ Pawn promoted to Queen — now the most powerful piece on the board!",
    };
    $("practiceStatus").textContent = msgs[activePuzzle.special] || "✅ Correct! Well done!";
    $("practiceStatus").className = "text-center text-sm font-semibold mt-3 text-green-600";

    const solved = JSON.parse(localStorage.getItem("chess-arena-solved") || "[]");
    if (!solved.includes(activePuzzle.id)) {
      solved.push(activePuzzle.id);
      localStorage.setItem("chess-arena-solved", JSON.stringify(solved));
      showToast(`+${activePuzzle.xp} XP 🎉`);
    } else {
      showToast("Already solved — no extra XP");
    }
    const pp = $("practiceProgress");
    if (pp) pp.textContent = `${solved.length} / ${PUZZLES.length} lessons done`;
    return;
  }

  // User clicked a square to select a piece (single mode)
  const [pr, pc2] = pzSq(sq);
  const piece = puzzleChess[pr]?.[pc2];
  const isWhitePiece = piece && piece === piece.toUpperCase() && piece !== "";

  if (isWhitePiece) {
    if (sq === activePuzzle.sol.from) {
      puzzleSel = sq;
      puzzleTargets = [activePuzzle.sol.to];
      $("practiceStatus").textContent = "Good — now click the highlighted destination!";
      $("practiceStatus").className = "text-center text-sm font-semibold mt-3 text-blue-600";
    } else {
      puzzleSel = null;
      puzzleTargets = [];
      $("practiceStatus").textContent = "That's not the right piece — look for the glowing square!";
      $("practiceStatus").className = "text-center text-sm font-semibold mt-3 text-yellow-600";
    }
    renderPuzzleBoard();
  } else {
    puzzleSel = null;
    puzzleTargets = [];
    renderPuzzleBoard();
  }
}

// ── Dark / Light mode ────────────────────────
let darkMode = localStorage.getItem("chess-dark-mode") === "true";
function applyDarkMode() {
  document.body.classList.toggle("dark-mode", darkMode);
  // sync all dark mode toggles
  ["darkModeToggle", "darkModeToggle2"].forEach((id) => {
    const el = $(id);
    if (el) el.checked = darkMode;
  });
  // update header icon
  const icon = $("darkModeIcon");
  if (icon) icon.textContent = darkMode ? "☀️" : "🌙";
  const btn = $("darkModeBtn");
  if (btn) {
    btn.style.background = darkMode ? "rgba(255,255,255,.08)" : "";
    btn.style.borderColor = darkMode ? "rgba(255,255,255,.12)" : "";
    btn.style.color = darkMode ? "#7dd3fc" : "";
  }
  localStorage.setItem("chess-dark-mode", darkMode);
}
function toggleDarkMode() {
  darkMode = !darkMode;
  applyDarkMode();
}

// ── Short 6-char room code ────────────────────
const CODE_MAP = {};
function genShortCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Friends system ────────────────────────────
const FRIENDS_KEY = "chess-arena-friends";
function loadFriends() {
  try {
    return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveFriends(f) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(f));
}

function addFriendFromGame(opponentName) {
  if (!opponentName || opponentName === "AI" || opponentName.startsWith("AI ("))
    return;
  const friends = loadFriends();
  if (!friends.find((f) => f.name === opponentName)) {
    friends.unshift({
      name: opponentName,
      added: new Date().toISOString(),
      wins: 0,
      losses: 0,
      draws: 0,
    });
    saveFriends(friends);
  }
}

function updateFriendRecord(opponentName, result) {
  const friends = loadFriends();
  const f = friends.find((f) => f.name === opponentName);
  if (!f) return;
  if (result === "win") f.wins = (f.wins || 0) + 1;
  if (result === "loss") f.losses = (f.losses || 0) + 1;
  if (result === "draw") f.draws = (f.draws || 0) + 1;
  saveFriends(friends);
}

let pendingChallenge = null;

function sendChallenge(friendName) {
  showToast(`Create a room and share the code with ${friendName}!`, 4000);
}

function showChallengeToast(fromName, shortCode) {
  pendingChallenge = { fromName, shortCode };
  $("challengerName").textContent = fromName;
  $("challengerAvatar").textContent = fromName.charAt(0).toUpperCase();
  $("challengeToast").classList.remove("hidden");
  clearTimeout(showChallengeToast._t);
  showChallengeToast._t = setTimeout(dismissChallenge, 15000);
}

function dismissChallenge() {
  $("challengeToast").classList.add("hidden");
  pendingChallenge = null;
}

function renderFriends() {
  const friends = loadFriends();
  const list = $("friendsList");
  const empty = $("friendsEmpty");
  if (!list) return;
  list.innerHTML = "";
  if (!friends.length) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  friends.forEach((f) => {
    const total = (f.wins || 0) + (f.losses || 0) + (f.draws || 0);
    const card = document.createElement("div");
    card.className = "friend-card";
    card.innerHTML = `
      <div class="friend-info">
        <div class="friend-av">${f.name.charAt(0).toUpperCase()}</div>
        <div>
          <p class="friend-name">${f.name}</p>
          <p class="friend-rec">${f.wins || 0}W · ${f.draws || 0}D · ${f.losses || 0}L · ${total} game${total !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <button class="friend-challenge-btn" data-name="${f.name}">⚔️ Challenge</button>
    `;
    card
      .querySelector(".friend-challenge-btn")
      .addEventListener("click", () => sendChallenge(f.name));
    list.appendChild(card);
  });
}

function switchMatchTab(tab) {
  const fp = $("panel-friends"),
    hp = $("panel-history");
  const fb = $("tab-friends-btn"),
    hb = $("tab-history-btn");
  if (tab === "friends") {
    fp.classList.remove("hidden");
    hp.classList.add("hidden");
    if (fb) {
      fb.classList.add("bg-ink", "text-white", "shadow-sm");
      fb.classList.remove("text-mute");
    }
    if (hb) {
      hb.classList.remove("bg-ink", "text-white", "shadow-sm");
      hb.classList.add("text-mute");
    }
    renderFriends();
  } else {
    fp.classList.add("hidden");
    hp.classList.remove("hidden");
    if (hb) {
      hb.classList.add("bg-ink", "text-white", "shadow-sm");
      hb.classList.remove("text-mute");
    }
    if (fb) {
      fb.classList.remove("bg-ink", "text-white", "shadow-sm");
      fb.classList.add("text-mute");
    }
    renderMatches();
  }
}

// ══════════════════════════════════════════════
//  ONLINE MULTIPLAYER — WebSocket (your server)
// ══════════════════════════════════════════════
let ws = null; // WebSocket connection
let myShortCode = ""; // current room code

function wsUrl() {
  // Works both locally (ws://) and on any HTTPS host (wss://)
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}`;
}

function wsConnect(onOpen) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    onOpen();
    return;
  }
  ws = new WebSocket(wsUrl());
  ws.onopen = onOpen;
  ws.onerror = () => {
    showToast("❌ Cannot reach server");
    setConnStatus("offline");
  };
  ws.onclose = () => {
    if (isOnline) {
      isOnline = false;
      setConnStatus("offline");
      showToast("⚠️ Disconnected from server", 5000);
    }
  };
  ws.onmessage = (e) => handleServerMsg(JSON.parse(e.data));
}

function wsSend(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function handleServerMsg(msg) {
  switch (msg.type) {
    case "room-created":
      myShortCode = msg.roomCode;
      myColor = msg.color; // 'white'
      currentMode = "online";
      onlineOpponentName = ""; // reset until opponent joins
      const cs = $("connectionStatus");
      if (cs) {
        cs.textContent = "⏳ Waiting for opponent… Code: " + myShortCode;
        cs.style.color = "#d97706";
      }
      const cd = $("roomCodeDisplay");
      if (cd)
        cd.innerHTML =
          '<span style="font-size:2rem;font-weight:900;font-family:monospace;letter-spacing:0.15em">' +
          myShortCode +
          "</span>";
      const gc = $("gameCodeContainer");
      if (gc) gc.style.display = "block";
      showOnlineUI(myColor);
      resetGame(true);
      showScreen("game");
      updateStatus();
      showToast("✅ Room code: " + myShortCode + " — share it!", 7000);
      navigator.clipboard?.writeText(myShortCode).catch(() => {});
      setConnStatus("connecting");
      break;

    case "room-joined":
      myShortCode = msg.roomCode;
      myColor = msg.color; // 'black'
      currentMode = "online";
      // Capture opponent name from players snapshot
      if (msg.players) {
        const oppColor = msg.color === "white" ? "black" : "white";
        onlineOpponentName = msg.players[oppColor] || "";
      }
      // Both sides are now in the room — open the board
      isOnline = true;
      setConnStatus("online");
      showToast("🎮 Joined room " + myShortCode + "! Game on!");
      snd("notify");
      const cdj = $("roomCodeDisplay");
      if (cdj)
        cdj.innerHTML =
          '<span style="font-size:2rem;font-weight:900;font-family:monospace;letter-spacing:0.15em">' +
          myShortCode +
          "</span>";
      const gcj = $("gameCodeContainer");
      if (gcj) gcj.style.display = "block";
      showOnlineUI(myColor);
      // Show real opponent name in the top player panel
      if (onlineOpponentName) {
        const topEl = $("topPlayerName");
        if (topEl) topEl.textContent = onlineOpponentName;
        const oppColor = myColor === "white" ? "black" : "white";
        const oppNameEl = $(myColor === "white" ? "playerBlackName" : "playerWhiteName");
        if (oppNameEl) oppNameEl.textContent = onlineOpponentName + " (" + oppColor.charAt(0).toUpperCase() + oppColor.slice(1) + ")";
      }
      resetGame(true);
      showScreen("game");
      updateStatus();
      break;

    case "room-update":
      // Host gets this when opponent joins — open the board now
      if (!isOnline) {
        isOnline = true;
        setConnStatus("online");
        showToast("🎮 Opponent connected! Game on!");
        snd("notify");
        showOnlineUI(myColor);
        // Capture opponent name for host
        if (msg.players) {
          const oppColor = myColor === "white" ? "black" : "white";
          onlineOpponentName = msg.players[oppColor] || "";
          if (onlineOpponentName) {
            const topEl = $("topPlayerName");
            if (topEl) topEl.textContent = onlineOpponentName;
            const oppNameEl = $(myColor === "white" ? "playerBlackName" : "playerWhiteName");
            if (oppNameEl) oppNameEl.textContent = onlineOpponentName + " (" + oppColor.charAt(0).toUpperCase() + oppColor.slice(1) + ")";
          }
        }
        resetGame(true);
        showScreen("game");
        updateStatus();
      }
      const oppStat = $(
        myColor === "white" ? "playerBlackStatus" : "playerWhiteStatus",
      );
      if (oppStat) oppStat.textContent = "Connected";
      break;

    case "move-applied":
      if (msg.by !== myColor) {
        // opponent's move arriving
        const m = msg.move;
        if (typeof m === "object" && m.from) {
          // convert algebraic back to row/col
          const f2rc = (sq) => [8 - parseInt(sq[1]), sq.charCodeAt(0) - 97];
          const [fr, fc] = f2rc(m.from);
          const [tr, tc] = f2rc(m.to);
          makeMove(fr, fc, tr, tc, /*remote*/ true, m.promotion || null);
        }
      }
      break;

    case "draw_offer":
      $("drawModal").style.display = "flex";
      break;
    case "draw_accept":
      $("drawModal").style.display = "none";
      gameOver = true;
      winner = null;
      saveGameResult(null);
      showModal("🤝", "Draw Agreed!", "Both players agreed to a draw.");
      break;
    case "draw_decline":
      $("drawModal").style.display = "none";
      showToast("❌ Draw declined");
      break;
    case "resign":
      gameOver = true;
      winner = myColor;
      saveGameResult(myColor);
      showModal("🏆", "You Win!", "Opponent resigned.");
      break;

    case "reset":
    case "reset-applied":
      resetGame(true);
      showToast("🔄 Opponent reset the game");
      break;

    case "player-left":
      if (isOnline) {
        isOnline = false;
        setConnStatus("offline");
        if (!gameOver) showToast("⚠️ Opponent left the room", 5000);
      }
      break;

    case "error":
      showToast("❌ " + msg.message);
      // Only go offline for fatal errors, not turn/move validation errors
      if (msg.message && (msg.message.includes("Room") || msg.message.includes("Join"))) {
        setConnStatus("offline");
      }
      break;
  }
}

// Convert board row/col to algebraic (e2, d4, etc.)
function toAlg(r, c) {
  return String.fromCharCode(97 + c) + (8 - r);
}

// Override makeMove's ws send (replaces the old PeerJS conn.send)
function sendMoveOnline(fr, fc, tr, tc, promo) {
  wsSend({
    type: "move",
    move: {
      from: toAlg(fr, fc),
      to: toAlg(tr, tc),
      ...(promo
        ? {
            promotion:
              promo.toLowerCase().replace("__p", "").slice(0, 1) || "q",
          }
        : {}),
    },
  });
}

function createGame() {
  setConnStatus("connecting");
  const name =
    ($("playerName")?.value || "").trim() || currentUser?.name || "Host";
  wsConnect(() => {
    wsSend({ type: "create-room", playerName: name });
  });
}

function joinGame() {
  const raw = ($("joinRoomInput")?.value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  if (!raw || raw.length < 4) {
    showToast("❌ Enter the 6-char room code");
    return;
  }
  setConnStatus("connecting");
  const name =
    ($("playerName")?.value || "").trim() || currentUser?.name || "Guest";
  wsConnect(() => {
    wsSend({ type: "join-room", roomCode: raw, playerName: name });
  });
}

function bindAll() {
  // Screen nav
  $$("[data-nav]").forEach((btn) =>
    btn.addEventListener("click", () => showScreen(btn.dataset.nav)),
  );

  // Bottom nav active style
  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Mode chips
  $$(".mode-chip").forEach((btn) =>
    btn.addEventListener("click", () => setMode(btn.dataset.mode)),
  );

  // Diff chips
  $$(".diff-chip").forEach((btn) =>
    btn.addEventListener("click", () => setDiff(btn.dataset.diff)),
  );

  // Start / resume
  $("startGameBtn")?.addEventListener("click", startGame);
  $("resumeGameBtn")?.addEventListener("click", () => showScreen("game"));

  // Game controls
  $("backFromGameBtn")?.addEventListener("click", () => showScreen("play"));
  $("newGameBtn")?.addEventListener("click", () => {
    resetGame(false);
    showToast("New game started!");
  });
  $("resignBtn")?.addEventListener("click", resign);
  $("flipBoardBtn")?.addEventListener("click", () => {
    isOnline && (myColor = myColor === "white" ? "black" : "white");
    renderBoard();
  });
  $("undoBtn")?.addEventListener("click", () => {
    if (currentMode === "computer") {
      // undo twice (player + AI move)
      if (moveHistory.length >= 2) {
        moveHistory.splice(-2);
        halfMoveClock = Math.max(0, halfMoveClock - 2);
      } else if (moveHistory.length === 1) {
        moveHistory.pop();
      }
    } else {
      if (moveHistory.length > 0) moveHistory.pop();
    }
    // rebuild board from scratch with stored moves — simpler: just reset and replay
    // For simplicity, show toast
    showToast("Undo not available in this mode 🤷");
  });
  $("piecesBtn")?.addEventListener("click", () =>
    showToast("Piece set: Cburnett (3D) ♟"),
  );

  // Online
  $("createRoomBtn")?.addEventListener("click", createGame);
  $("joinRoomBtn")?.addEventListener("click", joinGame);
  $("joinRoomInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinGame();
  });
  $("joinRoomInput")?.addEventListener("input", (e) => {
    e.target.value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  });
  $("disconnectBtn")?.addEventListener("click", leaveGame);
  $("copyCodeBtn")?.addEventListener("click", copyCode);
  $("offerDrawBtn")?.addEventListener("click", offerDraw);
  $("acceptDrawBtn")?.addEventListener("click", acceptDraw);
  $("declineDrawBtn")?.addEventListener("click", declineDraw);

  // Game over modal
  $("playAgainBtn")?.addEventListener("click", () => {
    $("gameOverModal").style.display = "none";
    if (isOnline && ws) wsSend({ type: "reset" });
    resetGame(isOnline);
  });
  $("closeGameOverBtn")?.addEventListener("click", () => {
    $("gameOverModal").style.display = "none";
  });

  // Promotion
  $$(".promo-piece").forEach((el) =>
    el.addEventListener("click", () => handlePromotion(el.dataset.piece)),
  );

  // Profile
  $("saveProfileBtn")?.addEventListener("click", () => {
    const name = ($("profileName")?.value || "").trim();
    if (!name || !currentUser) return;
    const users = loadUsers(),
      key = currentUser.name.toLowerCase();
    if (users[key]) {
      users[key].name = name;
      saveUsers(users);
      currentUser.name = name;
      localStorage.setItem(CURRENT_USER_KEY, name);
    }
    updateProfileUI();
    showToast("Profile saved ✓");
  });
  $("signOutBtn")?.addEventListener("click", signOut);
  $("leaveRoomBtn")?.addEventListener("click", leaveGame);
  $("clearHistoryBtn")?.addEventListener("click", () => {
    if (!currentUser || !confirm("Clear all history?")) return;
    localStorage.removeItem(
      "chess-arena-history-" + currentUser.name.toLowerCase(),
    );
    renderMatches();
    renderHome();
    showToast("History cleared");
  });

  // Sound & coords toggles
  $("soundToggle")?.addEventListener("change", (e) => {
    soundEnabled = e.target.checked;
    localStorage.setItem("chess-sound", soundEnabled);
  });
  $("coordToggle")?.addEventListener("change", (e) => {
    showCoords = e.target.checked;
    localStorage.setItem("chess-coords", showCoords);
    renderBoard();
  });

  // Theme swatches
  $$(".theme-swatch").forEach((btn) =>
    btn.addEventListener("click", () => {
      setBoardTheme(btn.dataset.theme);
      showToast("Theme: " + btn.title);
    }),
  );

  // Practice
  $("practiceBackBtn")?.addEventListener("click", () => {
    $("practiceList").classList.remove("hidden");
    $("practicePlay").classList.add("hidden");
    activePuzzle = null;
  });

  // Welcome / auth
  $("welcomeBtn")?.addEventListener("click", () => {
    const name = sanitizeUser($("usernameInput")?.value || "");
    const hint = $("welcomeHint");
    if (!isValidUsername(name)) {
      if (hint) {
        hint.textContent = "Use 3–20 letters, numbers, _ or -";
        hint.className = "welcome-hint error";
      }
      return;
    }
    if (hint) {
      hint.textContent = "";
      hint.className = "welcome-hint";
    }
    registerUser(name);
    enterApp();
    showToast(`Welcome, ${name}! 🎉`);
  });
  $("usernameInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("welcomeBtn")?.click();
  });
  $("continueBtn")?.addEventListener("click", () => {
    const u = loadCurrentUser();
    if (u) {
      currentUser = u;
      enterApp();
    }
  });
  $("switchUserBtn")?.addEventListener("click", () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    currentUser = null;
    $("welcomeForm").style.display = "block";
    $("returningUser").style.display = "none";
    $("usernameInput").value = "";
    $("usernameInput")?.focus();
  });

  // Dark mode toggle
  // Dark mode checkbox in profile
  $("darkModeToggle")?.addEventListener("change", toggleDarkMode);

  // Challenge toast
  $("acceptChallengeBtn")?.addEventListener("click", () => {
    if (pendingChallenge) {
      dismissChallenge();
      // Pre-fill the join code and go to play screen
      const ri = $("joinRoomInput");
      if (ri) ri.value = pendingChallenge.shortCode;
      joinGame();
    }
  });
  $("declineChallengeBtn")?.addEventListener("click", () => {
    dismissChallenge();
    showToast("Challenge declined");
  });

  // Friends/History tab nav — expose globally for onclick attributes
  window.switchMatchTab = switchMatchTab;

  // Render home / matches when navigating
  $$('[data-nav="home"]').forEach((b) =>
    b.addEventListener("click", renderHome),
  );
  $$('[data-nav="matches"]').forEach((b) =>
    b.addEventListener("click", () => {
      switchMatchTab("friends");
    }),
  );
  $$('[data-nav="learn"]').forEach((b) =>
    b.addEventListener("click", renderPracticeList),
  );
}

// ── BOOT ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  soundEnabled = localStorage.getItem("chess-sound") !== "false";
  showCoords = localStorage.getItem("chess-coords") !== "false";
  darkMode = localStorage.getItem("chess-dark-mode") === "true";

  initState();
  bindAll();
  setBoardTheme(localStorage.getItem(THEME_KEY) || "classic");
  applyDarkMode();

  const st = $("soundToggle");
  if (st) st.checked = soundEnabled;
  const ct = $("coordToggle");
  if (ct) ct.checked = showCoords;

  const solvedList = JSON.parse(
    localStorage.getItem("chess-arena-solved") || "[]",
  );
  const pp = $("practiceProgress");
  if (pp) pp.textContent = solvedList.length + " / " + PUZZLES.length + " lessons done";

  setMode("computer");
  setDiff("easy");

  const savedUser = loadCurrentUser();
  if (savedUser) {
    currentUser = savedUser;
    enterApp();
  } else showWelcomeScreen();
});
