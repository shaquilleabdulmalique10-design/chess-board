// ============================================
// CHESS MASTER - ENHANCED MULTIPLAYER & AI
// ============================================

// ===== FIREBASE CONFIGURATION =====
let database = null;
let firebaseInitialized = false;
let firebaseApp = null;
let connectionRef = null;
let presenceRef = null;

// Load Firebase URL from localStorage
const savedFirebaseUrl = localStorage.getItem("firebaseDbUrl");

function initializeFirebase(databaseUrl) {
  try {
    // If already initialized, clean up first
    if (firebaseApp) {
      if (connectionRef) connectionRef.off();
      if (presenceRef) presenceRef.off();
      firebaseApp.delete();
    }

    // Extract project ID from database URL
    const match = databaseUrl.match(/https:\/\/([^.]+)/);
    if (!match) throw new Error("Invalid database URL format");

    const projectId = match[1];

    const firebaseConfig = {
      databaseURL: databaseUrl,
      projectId: projectId,
    };

    firebaseApp = firebase.initializeApp(firebaseConfig, "chess-" + Date.now());
    database = firebaseApp.database();

    // Test connection
    return database
      .ref(".info/connected")
      .once("value")
      .then(() => {
        firebaseInitialized = true;
        localStorage.setItem("firebaseDbUrl", databaseUrl);
        setupConnectionMonitoring();
        updateConnectionUI("online");
        console.log("✅ Firebase connected successfully!");
        return true;
      });
  } catch (e) {
    console.error("Firebase initialization error:", e);
    firebaseInitialized = false;
    updateConnectionUI("offline");
    return Promise.reject(e);
  }
}

function setupConnectionMonitoring() {
  if (!database) return;

  connectionRef = database.ref(".info/connected");
  connectionRef.on("value", (snap) => {
    if (snap.val() === true) {
      updateConnectionUI("online");
      // If we were in a game, try to restore
      if (currentRoom && isConnectedFirebase) {
        attemptReconnect();
      }
    } else {
      updateConnectionUI("offline");
    }
  });
}

function updateConnectionUI(status) {
  const bar = document.getElementById("connectionBar");
  const text = document.getElementById("connectionBarText");

  if (status === "online") {
    bar.className = "connection-bar online";
    text.textContent = "Connected";
  } else if (status === "connecting") {
    bar.className = "connection-bar connecting";
    text.textContent = "Connecting...";
  } else {
    bar.className = "connection-bar offline";
    text.textContent = "Offline";
  }
}

// Try to initialize on load if URL is saved
if (savedFirebaseUrl) {
  document.getElementById("firebaseSetupPanel").style.display = "none";
  document.getElementById("onlineControls").style.display = "block";
  updateConnectionUI("connecting");
  initializeFirebase(savedFirebaseUrl).catch(() => {
    document.getElementById("firebaseSetupPanel").style.display = "block";
    document.getElementById("onlineControls").style.display = "none";
  });
}

// ===== CHESS PIECES =====
const pieces = {
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

const pieceValues = {
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

// Positional bonus tables for better AI evaluation
const pawnTable = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const knightTable = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const bishopTable = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const rookTable = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const queenTable = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const kingTable = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

// ===== GAME STATE =====
let board = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

let turn = "white";
let selectedRow = null;
let selectedCol = null;
let validMoves = [];
let gameOver = false;
let winner = null;
let lastMove = null;
let currentMode = "computer";
let difficulty = "hard";
let aiThinking = false;
let pendingPromotion = null;
let moveHistory = [];
let capturedPieces = { white: [], black: [] };

// ===== MULTIPLAYER STATE =====
let currentRoom = null;
let myColorFirebase = null;
let isConnectedFirebase = false;
let gameListener = null;
let presenceListener = null;
let opponentPresenceListener = null;
let myPresenceRef = null;
let lastSyncTimestamp = 0;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let heartbeatInterval = null;

// ===== SOUND SYSTEM =====
function playBeep(frequency, duration, type = "sine") {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = 0.2;
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(
      0.00001,
      audioCtx.currentTime + duration,
    );
    oscillator.stop(audioCtx.currentTime + duration);
    audioCtx.resume();
  } catch (e) {}
}

function playCheckSound() {
  playBeep(880, 0.3, "sine");
  setTimeout(() => playBeep(1046.5, 0.2, "sine"), 150);
}

function playCheckmateSound() {
  playBeep(440, 0.4, "sawtooth");
  setTimeout(() => playBeep(349.23, 0.5, "sawtooth"), 300);
  setTimeout(() => playBeep(261.63, 0.8, "sawtooth"), 650);
}

function playMoveSound() {
  playBeep(523.25, 0.08, "sine");
}

function playCaptureSound() {
  playBeep(330, 0.15, "square");
}

function playNotificationSound() {
  playBeep(660, 0.1, "sine");
  setTimeout(() => playBeep(880, 0.1, "sine"), 100);
}

// ===== UTILITY FUNCTIONS =====
function getPieceColor(piece) {
  if (piece === "") return null;
  return piece === piece.toUpperCase() && piece !== piece.toLowerCase()
    ? "white"
    : "black";
}

function isValidRowCol(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function copyBoard(boardState) {
  return boardState.map((row) => [...row]);
}

function findKingPosition(boardState, color) {
  const targetPiece = color === "white" ? "K" : "k";
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (boardState[i][j] === targetPiece) return { row: i, col: j };
    }
  }
  return { row: -1, col: -1 };
}

// ===== MOVE GENERATION =====
function getPawnMoves(row, col, piece, boardState) {
  const color = getPieceColor(piece);
  const direction = color === "white" ? -1 : 1;
  const startRow = color === "white" ? 6 : 1;
  let moves = [];

  const newRow = row + direction;
  if (isValidRowCol(newRow, col) && boardState[newRow][col] === "") {
    moves.push([newRow, col]);
    if (row === startRow && boardState[row + 2 * direction][col] === "") {
      moves.push([row + 2 * direction, col]);
    }
  }

  for (const dc of [-1, 1]) {
    const newCol = col + dc;
    if (isValidRowCol(newRow, newCol)) {
      const targetPiece = boardState[newRow][newCol];
      if (targetPiece !== "" && getPieceColor(targetPiece) !== color) {
        moves.push([newRow, newCol]);
      }
    }
  }

  return moves;
}

function getKnightMoves(row, col) {
  const offsets = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  return offsets
    .filter(([dr, dc]) => isValidRowCol(row + dr, col + dc))
    .map(([dr, dc]) => [row + dr, col + dc]);
}

function getBishopMoves(row, col, boardState, color) {
  let moves = [];
  const dirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of dirs) {
    for (let i = 1; i <= 7; i++) {
      const newRow = row + dr * i,
        newCol = col + dc * i;
      if (!isValidRowCol(newRow, newCol)) break;
      const target = boardState[newRow][newCol];
      if (target === "") moves.push([newRow, newCol]);
      else {
        if (getPieceColor(target) !== color) moves.push([newRow, newCol]);
        break;
      }
    }
  }
  return moves;
}

function getRookMoves(row, col, boardState, color) {
  let moves = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of dirs) {
    for (let i = 1; i <= 7; i++) {
      const newRow = row + dr * i,
        newCol = col + dc * i;
      if (!isValidRowCol(newRow, newCol)) break;
      const target = boardState[newRow][newCol];
      if (target === "") moves.push([newRow, newCol]);
      else {
        if (getPieceColor(target) !== color) moves.push([newRow, newCol]);
        break;
      }
    }
  }
  return moves;
}

function getQueenMoves(row, col, boardState, color) {
  return [
    ...getBishopMoves(row, col, boardState, color),
    ...getRookMoves(row, col, boardState, color),
  ];
}

function getKingMoves(row, col, boardState, color) {
  let moves = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const newRow = row + dr,
        newCol = col + dc;
      if (isValidRowCol(newRow, newCol)) {
        const targetPiece = boardState[newRow][newCol];
        if (targetPiece === "" || getPieceColor(targetPiece) !== color) {
          moves.push([newRow, newCol]);
        }
      }
    }
  }
  return moves;
}

function getAllValidMovesForPiece(row, col, boardState) {
  const piece = boardState[row][col];
  if (piece === "") return [];
  const color = getPieceColor(piece);

  switch (piece.toLowerCase()) {
    case "p":
      return getPawnMoves(row, col, piece, boardState);
    case "n":
      return getKnightMoves(row, col);
    case "b":
      return getBishopMoves(row, col, boardState, color);
    case "r":
      return getRookMoves(row, col, boardState, color);
    case "q":
      return getQueenMoves(row, col, boardState, color);
    case "k":
      return getKingMoves(row, col, boardState, color);
    default:
      return [];
  }
}

function isSquareAttacked(boardState, row, col, attackingColor) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = boardState[i][j];
      if (piece !== "" && getPieceColor(piece) === attackingColor) {
        const moves = getAllValidMovesForPiece(i, j, boardState);
        for (const [tr, tc] of moves) {
          if (tr === row && tc === col) return true;
        }
      }
    }
  }
  return false;
}

function isMoveLegal(fromRow, fromCol, toRow, toCol, boardState, sideToMove) {
  const piece = boardState[fromRow][fromCol];
  if (piece === "" || getPieceColor(piece) !== sideToMove) return false;

  const targetPiece = boardState[toRow][toCol];
  if (targetPiece !== "" && getPieceColor(targetPiece) === sideToMove)
    return false;

  const moves = getAllValidMovesForPiece(fromRow, fromCol, boardState);
  const isValidBasic = moves.some(([r, c]) => r === toRow && c === toCol);
  if (!isValidBasic) return false;

  const testBoard = copyBoard(boardState);
  testBoard[toRow][toCol] = testBoard[fromRow][fromCol];
  testBoard[fromRow][fromCol] = "";

  const kingPos = findKingPosition(testBoard, sideToMove);
  const isKingAttacked = isSquareAttacked(
    testBoard,
    kingPos.row,
    kingPos.col,
    sideToMove === "white" ? "black" : "white",
  );

  return !isKingAttacked;
}

function getAllValidMovesForColor(boardState, color) {
  let moves = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = boardState[i][j];
      if (piece !== "" && getPieceColor(piece) === color) {
        const pieceMoves = getAllValidMovesForPiece(i, j, boardState);
        for (const [tr, tc] of pieceMoves) {
          if (isMoveLegal(i, j, tr, tc, boardState, color)) {
            moves.push({ from: [i, j], to: [tr, tc] });
          }
        }
      }
    }
  }
  return moves;
}

// ===== ENHANCED AI EVALUATION =====
function getPositionBonus(piece, row, col) {
  const isWhite = getPieceColor(piece) === "white";
  const r = isWhite ? row : 7 - row;

  switch (piece.toLowerCase()) {
    case "p":
      return pawnTable[r][col];
    case "n":
      return knightTable[r][col];
    case "b":
      return bishopTable[r][col];
    case "r":
      return rookTable[r][col];
    case "q":
      return queenTable[r][col];
    case "k":
      return kingTable[r][col];
    default:
      return 0;
  }
}

function countMaterial(boardState, color) {
  let total = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const p = boardState[i][j];
      if (p !== "" && getPieceColor(p) === color && p.toLowerCase() !== "k") {
        total += pieceValues[p];
      }
    }
  }
  return total;
}

function isEndgame(boardState) {
  const whiteMat = countMaterial(boardState, "white");
  const blackMat = countMaterial(boardState, "black");
  return whiteMat < 1300 && blackMat < 1300;
}

function evaluateBoard(boardState) {
  let score = 0;
  const endgame = isEndgame(boardState);

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = boardState[i][j];
      if (piece === "") continue;

      const value = pieceValues[piece] || 0;
      const posBonus = getPositionBonus(piece, i, j);
      const total = value + posBonus;

      if (getPieceColor(piece) === "black") score += total;
      else score -= total;
    }
  }

  // Mobility bonus
  const blackMoves = getAllValidMovesForColor(boardState, "black").length;
  const whiteMoves = getAllValidMovesForColor(boardState, "white").length;
  score += (blackMoves - whiteMoves) * 5;

  // Doubled pawn penalty
  for (let col = 0; col < 8; col++) {
    let whitePawns = 0,
      blackPawns = 0;
    for (let row = 0; row < 8; row++) {
      if (boardState[row][col] === "P") whitePawns++;
      if (boardState[row][col] === "p") blackPawns++;
    }
    if (whitePawns > 1) score += (whitePawns - 1) * 20;
    if (blackPawns > 1) score -= (blackPawns - 1) * 20;
  }

  return score;
}

// Move ordering for better alpha-beta pruning
function orderMoves(moves, boardState) {
  return moves.sort((a, b) => {
    const captureA =
      boardState[a.to[0]][a.to[1]] !== ""
        ? pieceValues[boardState[a.to[0]][a.to[1]]] || 0
        : 0;
    const captureB =
      boardState[b.to[0]][b.to[1]] !== ""
        ? pieceValues[boardState[b.to[0]][b.to[1]]] || 0
        : 0;
    return captureB - captureA;
  });
}

function minimax(boardState, depth, isMaximizing, alpha, beta) {
  if (depth === 0) return evaluateBoard(boardState);

  if (isMaximizing) {
    const moves = orderMoves(
      getAllValidMovesForColor(boardState, "black"),
      boardState,
    );
    if (moves.length === 0) {
      const kingPos = findKingPosition(boardState, "black");
      const inCheck = isSquareAttacked(
        boardState,
        kingPos.row,
        kingPos.col,
        "white",
      );
      return inCheck ? -100000 + depth : 0;
    }
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(boardState);
      newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
      newBoard[move.from[0]][move.from[1]] = "";
      const evalScore = minimax(newBoard, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    const moves = orderMoves(
      getAllValidMovesForColor(boardState, "white"),
      boardState,
    );
    if (moves.length === 0) {
      const kingPos = findKingPosition(boardState, "white");
      const inCheck = isSquareAttacked(
        boardState,
        kingPos.row,
        kingPos.col,
        "black",
      );
      return inCheck ? 100000 - depth : 0;
    }
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(boardState);
      newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
      newBoard[move.from[0]][move.from[1]] = "";
      const evalScore = minimax(newBoard, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Opening book for more natural play
const openingBook = [
  { from: [6, 4], to: [4, 4] }, // e4
  { from: [6, 3], to: [4, 3] }, // d4
  { from: [6, 2], to: [4, 2] }, // c4
  { from: [7, 6], to: [5, 5] }, // Nf3
  { from: [7, 1], to: [5, 2] }, // Nc3
];

let moveCount = 0;

function getBestMove(boardState) {
  const moves = getAllValidMovesForColor(boardState, "black");
  if (moves.length === 0) return null;

  if (difficulty === "easy") {
    // Easy: mostly random, occasionally captures
    const captureMoves = moves.filter(
      (m) => boardState[m.to[0]][m.to[1]] !== "",
    );
    if (captureMoves.length > 0 && Math.random() < 0.4)
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  } else if (difficulty === "medium") {
    // Medium: greedy captures + 1-ply lookahead
    const orderedMoves = orderMoves([...moves], boardState);
    let bestMove = orderedMoves[0];
    let bestValue = -Infinity;
    for (const move of orderedMoves.slice(0, 15)) {
      const newBoard = copyBoard(boardState);
      newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
      newBoard[move.from[0]][move.from[1]] = "";
      const val = minimax(newBoard, 1, false, -Infinity, Infinity);
      if (val > bestValue) {
        bestValue = val;
        bestMove = move;
      }
    }
    return bestMove;
  } else if (difficulty === "hard") {
    // Hard: depth 3 minimax
    let bestMove = moves[0];
    let bestValue = -Infinity;
    const orderedMoves = orderMoves([...moves], boardState);
    for (const move of orderedMoves) {
      const newBoard = copyBoard(boardState);
      newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
      newBoard[move.from[0]][move.from[1]] = "";
      const moveValue = minimax(newBoard, 3, false, -Infinity, Infinity);
      if (moveValue > bestValue) {
        bestValue = moveValue;
        bestMove = move;
      }
    }
    return bestMove;
  } else {
    // Expert: depth 4 minimax with opening book
    if (moveCount < 3) {
      const bookMoves = openingBook.filter((bm) => {
        const piece = boardState[bm.from[0]][bm.from[1]];
        return (
          piece !== "" &&
          getPieceColor(piece) === "black" &&
          isMoveLegal(
            bm.from[0],
            bm.from[1],
            bm.to[0],
            bm.to[1],
            boardState,
            "black",
          )
        );
      });
      if (bookMoves.length > 0) {
        return bookMoves[Math.floor(Math.random() * bookMoves.length)];
      }
    }

    let bestMove = moves[0];
    let bestValue = -Infinity;
    const orderedMoves = orderMoves([...moves], boardState);
    for (const move of orderedMoves) {
      const newBoard = copyBoard(boardState);
      newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
      newBoard[move.from[0]][move.from[1]] = "";
      const moveValue = minimax(newBoard, 4, false, -Infinity, Infinity);
      if (moveValue > bestValue) {
        bestValue = moveValue;
        bestMove = move;
      }
    }
    return bestMove;
  }
}

// ===== PROMOTION =====
function showPromotionModal(row, col, color) {
  return new Promise((resolve) => {
    pendingPromotion = { row, col, color, resolve };
    // Update promotion piece colors to match player
    document.querySelectorAll(".promo-piece").forEach((el) => {
      const pieceKey =
        color === "white"
          ? el.dataset.piece.toUpperCase()
          : el.dataset.piece.toLowerCase();
      el.querySelector("span") &&
        (el.childNodes[0].textContent =
          pieces[pieceKey] || el.childNodes[0].textContent);
    });
    document.getElementById("promotionModal").style.display = "flex";
    document.body.style.overflow = "hidden";
  });
}

function handlePromotion(pieceType) {
  if (!pendingPromotion) return;
  const { row, col, color, resolve } = pendingPromotion;
  const newPiece =
    color === "white" ? pieceType.toUpperCase() : pieceType.toLowerCase();
  board[row][col] = newPiece;
  document.getElementById("promotionModal").style.display = "none";
  document.body.style.overflow = "";
  pendingPromotion = null;
  resolve();
  renderBoard();
  updateUI();
  if (isConnectedFirebase && currentRoom) saveGameToFirebase();
}

// ===== MOVE HISTORY =====
function colToFile(col) {
  return String.fromCharCode(97 + col);
}

function rowToRank(row) {
  return String(8 - row);
}

function getMoveNotation(piece, fromRow, fromCol, toRow, toCol, captured) {
  const pieceName = piece.toLowerCase() === "p" ? "" : piece.toUpperCase();
  const captureStr = captured ? "x" : "";
  const dest = colToFile(toCol) + rowToRank(toRow);
  if (piece.toLowerCase() === "p" && captured) {
    return colToFile(fromCol) + captureStr + dest;
  }
  return pieceName + captureStr + dest;
}

function addMoveToHistory(piece, fromRow, fromCol, toRow, toCol, captured) {
  const notation = getMoveNotation(
    piece,
    fromRow,
    fromCol,
    toRow,
    toCol,
    captured,
  );
  moveHistory.push({ notation, color: getPieceColor(piece) });
  renderMoveHistory();
}

function renderMoveHistory() {
  const list = document.getElementById("moveHistoryList");
  if (!list) return;

  list.innerHTML = "";
  for (let i = 0; i < moveHistory.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = moveHistory[i];
    const blackMove = moveHistory[i + 1];

    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `
      <span class="move-num">${moveNum}.</span>
      <span class="move-white">${whiteMove ? whiteMove.notation : ""}</span>
      <span class="move-black">${blackMove ? blackMove.notation : ""}</span>
    `;
    list.appendChild(row);
  }
  list.scrollTop = list.scrollHeight;
}

// ===== GAME OVER MODAL =====
function showGameOverModal(icon, title, subtitle) {
  document.getElementById("gameOverIcon").textContent = icon;
  document.getElementById("gameOverTitle").textContent = title;
  document.getElementById("gameOverSubtitle").textContent = subtitle;
  document.getElementById("gameOverModal").style.display = "flex";
}

// ===== TOAST NOTIFICATION =====
function showToast(message, duration = 3000) {
  const toast = document.getElementById("disconnectToast");
  toast.textContent = message;
  toast.style.display = "block";
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.style.display = "none";
    }, 400);
  }, duration);
}

// ===== MAIN GAME LOGIC =====
async function makeMove(
  fromRow,
  fromCol,
  toRow,
  toCol,
  isRemote = false,
  promotionPiece = null,
) {
  if (gameOver) return false;

  if (isConnectedFirebase && !isRemote && myColorFirebase !== turn) {
    showToast("❌ Wait for your opponent!");
    return false;
  }

  const piece = board[fromRow][fromCol];
  if (piece === "" || getPieceColor(piece) !== turn) return false;
  if (!isMoveLegal(fromRow, fromCol, toRow, toCol, board, turn)) return false;

  const captured = board[toRow][toCol];
  if (captured !== "") {
    playCaptureSound();
    capturedPieces[turn].push(captured);
  } else {
    playMoveSound();
  }

  addMoveToHistory(piece, fromRow, fromCol, toRow, toCol, captured !== "");
  lastMove = { from: [fromRow, fromCol], to: [toRow, toCol] };
  moveCount++;

  const movingPiece = board[fromRow][fromCol];
  const isPawn = movingPiece.toLowerCase() === "p";
  const isPromotion =
    isPawn &&
    ((turn === "white" && toRow === 0) || (turn === "black" && toRow === 7));

  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = "";

  if (isPromotion) {
    if (!isRemote) {
      renderBoard();
      await showPromotionModal(toRow, toCol, turn);
    } else {
      board[toRow][toCol] = promotionPiece || (turn === "white" ? "Q" : "q");
    }
  }

  const nextTurn = turn === "white" ? "black" : "white";
  const kingPos = findKingPosition(board, nextTurn);
  const opponentInCheck = isSquareAttacked(
    board,
    kingPos.row,
    kingPos.col,
    turn,
  );
  const opponentMoves = getAllValidMovesForColor(board, nextTurn);

  if (opponentMoves.length === 0) {
    gameOver = true;
    winner = turn;
    playCheckmateSound();

    if (opponentInCheck) {
      document.getElementById("statusMsg").innerHTML =
        `🏆 CHECKMATE! ${turn.toUpperCase()} WINS! 🏆`;
      setTimeout(
        () =>
          showGameOverModal(
            "🏆",
            "Checkmate!",
            `${turn.charAt(0).toUpperCase() + turn.slice(1)} wins the game!`,
          ),
        500,
      );
    } else {
      document.getElementById("statusMsg").innerHTML = `♟️ STALEMATE - DRAW ♟️`;
      setTimeout(
        () => showGameOverModal("🤝", "Stalemate!", "The game is a draw."),
        500,
      );
    }
  } else {
    if (opponentInCheck) {
      playCheckSound();
      document.getElementById("statusMsg").innerHTML =
        `⚠️ ${nextTurn.toUpperCase()} IN CHECK! ⚠️`;
      setTimeout(() => {
        if (!gameOver) updateStatusMsg();
      }, 1500);
    } else {
      updateStatusMsg();
    }
    turn = nextTurn;
    updateUI();
  }

  renderBoard();

  if (isConnectedFirebase && !isRemote && currentRoom) {
    saveGameToFirebase(board[toRow][toCol]);
  }

  return true;
}

function updateStatusMsg() {
  if (gameOver) return;

  if (isConnectedFirebase) {
    if (myColorFirebase === turn) {
      document.getElementById("statusMsg").innerHTML =
        "🎮 YOUR TURN! Make a move 🎮";
    } else {
      document.getElementById("statusMsg").innerHTML =
        "⏳ Waiting for opponent... ⏳";
    }
  } else if (currentMode === "computer") {
    document.getElementById("statusMsg").innerHTML =
      turn === "white" ? "♟️ Your turn (White)" : "🤖 AI is thinking...";
  } else {
    document.getElementById("statusMsg").innerHTML =
      `👥 ${turn.charAt(0).toUpperCase() + turn.slice(1)}'s Turn`;
  }
}

async function aiMove() {
  if (gameOver || currentMode !== "computer" || turn !== "black" || aiThinking)
    return;
  aiThinking = true;

  const delay =
    difficulty === "expert" ? 800 : difficulty === "hard" ? 500 : 350;
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (!gameOver && turn === "black") {
    const bestMove = getBestMove(board);
    if (bestMove) {
      await makeMove(
        bestMove.from[0],
        bestMove.from[1],
        bestMove.to[0],
        bestMove.to[1],
      );
    }
  }

  aiThinking = false;
  renderBoard();
  updateUI();
}

function updateUI() {
  const turnText = turn === "white" ? "White's Turn" : "Black's Turn";
  const turnIcon = turn === "white" ? "♔" : "♚";

  document.getElementById("sidebarTurnText").innerText = turnText;
  document.getElementById("sidebarTurnIcon").innerHTML = turnIcon;

  updateStatusMsg();

  // Update online player panel highlights
  if (isConnectedFirebase) {
    const whiteRow = document.getElementById("playerWhiteRow");
    const blackRow = document.getElementById("playerBlackRow");
    if (whiteRow && blackRow) {
      whiteRow.classList.toggle("active-turn", turn === "white");
      blackRow.classList.toggle("active-turn", turn === "black");
    }
  }
}

function resetGame(skipFirebaseSync = false) {
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

  turn = isConnectedFirebase && myColorFirebase ? "white" : "white";
  gameOver = false;
  winner = null;
  selectedRow = null;
  selectedCol = null;
  validMoves = [];
  lastMove = null;
  moveHistory = [];
  capturedPieces = { white: [], black: [] };
  moveCount = 0;
  aiThinking = false;

  document.getElementById("moveHistoryList") &&
    (document.getElementById("moveHistoryList").innerHTML = "");
  document.getElementById("gameOverModal").style.display = "none";

  updateUI();
  renderBoard();

  if (currentMode === "computer" && turn === "black")
    setTimeout(() => aiMove(), 200);
  if (isConnectedFirebase && currentRoom && !skipFirebaseSync)
    saveGameToFirebase();
}

function renderBoard() {
  const boardEl = document.getElementById("chessboard");
  boardEl.innerHTML = "";

  const currentKingPos = findKingPosition(board, turn);
  const isCurrentKingInCheck =
    !gameOver &&
    isSquareAttacked(
      board,
      currentKingPos.row,
      currentKingPos.col,
      turn === "white" ? "black" : "white",
    );

  // Flip board for black player in online mode
  const flipped = isConnectedFirebase && myColorFirebase === "black";

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const row = flipped ? 7 - i : i;
      const col = flipped ? 7 - j : j;

      const piece = board[row][col];
      const pieceChar = piece ? pieces[piece] || "" : "";
      const isLight = (row + col) % 2 === 0;

      const squareDiv = document.createElement("div");
      squareDiv.className = `square ${isLight ? "light" : "dark"}`;

      if (selectedRow === row && selectedCol === col)
        squareDiv.classList.add("selected");
      if (
        lastMove &&
        ((lastMove.from[0] === row && lastMove.from[1] === col) ||
          (lastMove.to[0] === row && lastMove.to[1] === col))
      )
        squareDiv.classList.add("last-move");
      if (validMoves.some(([r, c]) => r === row && c === col))
        squareDiv.classList.add("valid-move");
      if (
        !gameOver &&
        piece &&
        piece.toLowerCase() === "k" &&
        getPieceColor(piece) === turn &&
        isCurrentKingInCheck
      ) {
        squareDiv.classList.add("in-check");
      }

      // Rank/file labels
      if (j === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "rank-label";
        rankLabel.textContent = flipped ? row + 1 : 8 - row;
        squareDiv.appendChild(rankLabel);
      }
      if (i === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "file-label";
        fileLabel.textContent = String.fromCharCode(
          97 + (flipped ? 7 - col : col),
        );
        squareDiv.appendChild(fileLabel);
      }

      const pieceSpan = document.createElement("span");
      pieceSpan.style.fontSize = "inherit";
      pieceSpan.style.display = "inline-block";
      pieceSpan.style.transition = "transform 0.1s ease";
      if (piece)
        pieceSpan.className =
          getPieceColor(piece) === "white" ? "piece-white" : "piece-black";
      pieceSpan.innerText = pieceChar;
      squareDiv.appendChild(pieceSpan);

      squareDiv.addEventListener(
        "click",
        (function (r, c) {
          return function () {
            onSquareClick(r, c);
          };
        })(row, col),
      );

      boardEl.appendChild(squareDiv);
    }
  }
}

async function onSquareClick(row, col) {
  if (gameOver) {
    document.getElementById("statusMsg").innerHTML =
      `🏆 Game Over! ${winner ? winner.toUpperCase() + " wins!" : "Draw!"} 🏆`;
    return;
  }

  if (isConnectedFirebase && myColorFirebase !== turn) {
    showToast("⏳ Not your turn!");
    return;
  }

  if (selectedRow === null) {
    const piece = board[row][col];
    if (piece !== "" && getPieceColor(piece) === turn) {
      selectedRow = row;
      selectedCol = col;
      validMoves = [];
      const allPieceMoves = getAllValidMovesForPiece(row, col, board);
      for (const [r, c] of allPieceMoves) {
        if (isMoveLegal(row, col, r, c, board, turn)) validMoves.push([r, c]);
      }
      renderBoard();
      document.getElementById("statusMsg").innerHTML =
        `🔍 ${pieces[piece]} selected — ${validMoves.length} moves`;
    } else {
      document.getElementById("statusMsg").innerHTML =
        `❌ Not your piece! It's ${turn}'s turn`;
    }
  } else {
    const isValid = validMoves.some(([r, c]) => r === row && c === col);
    if (isValid) {
      const prevSelected = { row: selectedRow, col: selectedCol };
      selectedRow = null;
      validMoves = [];
      await makeMove(prevSelected.row, prevSelected.col, row, col);
      renderBoard();
      if (currentMode === "computer" && !gameOver && turn === "black") {
        setTimeout(() => aiMove(), 100);
      }
    } else if (
      board[row][col] !== "" &&
      getPieceColor(board[row][col]) === turn
    ) {
      // Re-select another piece
      selectedRow = row;
      selectedCol = col;
      validMoves = [];
      const allPieceMoves = getAllValidMovesForPiece(row, col, board);
      for (const [r, c] of allPieceMoves) {
        if (isMoveLegal(row, col, r, c, board, turn)) validMoves.push([r, c]);
      }
      renderBoard();
    } else {
      document.getElementById("statusMsg").innerHTML =
        "❌ Invalid move! Try again";
      selectedRow = null;
      validMoves = [];
      renderBoard();
    }
  }
}

// ===== FIREBASE MULTIPLAYER =====
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function saveGameToFirebase(promotionPiece = null) {
  if (!currentRoom || !database) return;

  const gameData = {
    board: board,
    turn: turn,
    gameOver: gameOver,
    winner: winner || null,
    lastMove: lastMove,
    moveHistory: moveHistory,
    promotionPiece: promotionPiece || null,
    timestamp: Date.now(),
    seq: (lastSyncTimestamp || 0) + 1,
  };

  lastSyncTimestamp = gameData.seq;

  database
    .ref(`games/${currentRoom}/state`)
    .set(gameData)
    .catch((err) => {
      console.error("Save failed:", err);
      showToast("⚠️ Sync error — retrying...");
      setTimeout(() => saveGameToFirebase(promotionPiece), 1000);
    });
}

function setupPresence(roomCode, myColor) {
  if (!database) return;

  const presencePath = `games/${roomCode}/presence/${myColor}`;
  myPresenceRef = database.ref(presencePath);

  // Set online status
  myPresenceRef.set({ online: true, lastSeen: Date.now() });

  // Set offline on disconnect
  myPresenceRef.onDisconnect().set({ online: false, lastSeen: Date.now() });

  // Heartbeat every 10 seconds
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (myPresenceRef && isConnectedFirebase) {
      myPresenceRef.update({ lastSeen: Date.now() });
    }
  }, 10000);

  // Watch opponent presence
  const opponentColor = myColor === "white" ? "black" : "white";
  const opponentPresencePath = `games/${roomCode}/presence/${opponentColor}`;

  if (opponentPresenceListener) opponentPresenceListener.off();
  opponentPresenceListener = database.ref(opponentPresencePath);

  opponentPresenceListener.on("value", (snap) => {
    const data = snap.val();
    const isOnline = data && data.online;
    const lastSeen = data && data.lastSeen;
    const stale = lastSeen && Date.now() - lastSeen > 20000;

    updateOpponentPresenceUI(isOnline && !stale);
  });
}

function updateOpponentPresenceUI(isOnline) {
  const connEl = document.getElementById("oppConnTop");
  if (!connEl) return;

  if (isOnline) {
    connEl.className = "opp-conn-indicator online";
    connEl.innerHTML = '<span class="conn-pulse"></span>Online';
  } else {
    connEl.className = "opp-conn-indicator offline";
    connEl.innerHTML = "⚫ Offline";
    if (isConnectedFirebase && !gameOver) {
      showToast("⚠️ Opponent appears offline", 5000);
    }
  }
}

function showOnlineGameUI(myColor, roomCode) {
  const oppColor = myColor === "white" ? "black" : "white";

  // Show banners
  document.getElementById("opponentBanner").style.display = "flex";
  document.getElementById("myBanner").style.display = "flex";

  // Set colors
  document.getElementById("oppDotTop").className =
    `opp-color-dot ${oppColor}-dot`;
  document.getElementById("myDotBottom").className =
    `opp-color-dot ${myColor}-dot`;
  document.getElementById("oppNameTop").textContent =
    `${oppColor.charAt(0).toUpperCase() + oppColor.slice(1)} (Opponent)`;
  document.getElementById("myNameBottom").textContent =
    `${myColor.charAt(0).toUpperCase() + myColor.slice(1)} (You)`;

  // Show player panel in sidebar
  document.getElementById("onlinePlayerPanel").style.display = "block";
  document.getElementById("moveHistorySection").style.display = "block";

  // Show resign/draw buttons
  document.getElementById("resignBtn").style.display = "block";
  document.getElementById("offerDrawBtn").style.display = "block";
  document.getElementById("disconnectBtn").style.display = "block";

  // Update player panel
  document.getElementById("playerWhiteName").textContent =
    myColor === "white" ? "You (White)" : "Opponent (White)";
  document.getElementById("playerBlackName").textContent =
    myColor === "black" ? "You (Black)" : "Opponent (Black)";
  document.getElementById("playerWhiteStatus").textContent = "Connected";
  document.getElementById("playerBlackStatus").textContent = "Waiting...";
}

function hideOnlineGameUI() {
  document.getElementById("opponentBanner").style.display = "none";
  document.getElementById("myBanner").style.display = "none";
  document.getElementById("onlinePlayerPanel").style.display = "none";
  document.getElementById("moveHistorySection").style.display = "none";
  document.getElementById("resignBtn").style.display = "none";
  document.getElementById("offerDrawBtn").style.display = "none";
  document.getElementById("disconnectBtn").style.display = "none";
}

function createFirebaseGame() {
  if (!firebaseInitialized || !database) {
    showToast("❌ Firebase not connected! Set up your database URL first.");
    return;
  }

  const roomCode = generateRoomCode();
  currentRoom = roomCode;
  myColorFirebase = "white";
  isConnectedFirebase = true;
  currentMode = "online";
  turn = "white";

  document.getElementById("roomCodeDisplay").innerHTML =
    `<strong>${roomCode}</strong>`;
  document.getElementById("gameCodeContainer").style.display = "block";
  document.getElementById("statusMsg").innerHTML =
    `✅ Game created! Share code: <strong>${roomCode}</strong>`;

  // Initialize game in Firebase
  const initialData = {
    state: {
      board: board,
      turn: "white",
      gameOver: false,
      winner: null,
      lastMove: null,
      moveHistory: [],
      timestamp: Date.now(),
      seq: 0,
    },
    meta: {
      created: Date.now(),
      players: { white: true, black: false },
    },
    presence: {
      white: { online: true, lastSeen: Date.now() },
    },
  };

  database
    .ref(`games/${roomCode}`)
    .set(initialData)
    .then(() => {
      setupPresence(roomCode, "white");
      showOnlineGameUI("white", roomCode);
      startGameListener(roomCode, "white");

      document.getElementById("onlineStatus") &&
        (document.getElementById("onlineStatus").innerHTML =
          "🟡 Waiting for opponent...");
      document.getElementById("playerBlackStatus").textContent =
        "Waiting to join...";
    })
    .catch((err) => {
      showToast("❌ Failed to create game: " + err.message);
      isConnectedFirebase = false;
    });

  resetGame(true);
  closeOffcanvas();
}

function joinFirebaseGame() {
  const roomCode = document
    .getElementById("roomCodeInput")
    .value.trim()
    .toUpperCase();
  if (!roomCode) {
    showToast("❌ Enter a game code!");
    return;
  }

  if (!firebaseInitialized || !database) {
    showToast("❌ Firebase not connected!");
    return;
  }

  showToast("🔍 Looking for game...");

  database
    .ref(`games/${roomCode}/state`)
    .get()
    .then((snapshot) => {
      if (!snapshot.exists()) {
        showToast("❌ Room not found! Check the code.");
        return;
      }

      currentRoom = roomCode;
      myColorFirebase = "black";
      isConnectedFirebase = true;
      currentMode = "online";

      document.getElementById("roomCodeDisplay").innerHTML =
        `<strong>${roomCode}</strong>`;
      document.getElementById("gameCodeContainer").style.display = "block";
      document.getElementById("statusMsg").innerHTML =
        `✅ Joined! You are BLACK`;

      // Mark black as joined
      database.ref(`games/${roomCode}/meta/players/black`).set(true);
      database
        .ref(`games/${roomCode}/presence/black`)
        .set({ online: true, lastSeen: Date.now() });

      const data = snapshot.val();
      if (data && data.board) {
        board = data.board;
        turn = data.turn || "white";
        gameOver = data.gameOver || false;
        lastMove = data.lastMove || null;
        moveHistory = data.moveHistory || [];
        renderBoard();
        renderMoveHistory();
      }

      setupPresence(roomCode, "black");
      showOnlineGameUI("black", roomCode);
      startGameListener(roomCode, "black");

      document.getElementById("playerWhiteStatus").textContent = "Connected";
      document.getElementById("playerBlackStatus").textContent = "You";

      updateUI();
      closeOffcanvas();
    })
    .catch((err) => {
      showToast("❌ Error joining room: " + err.message);
    });
}

function startGameListener(roomCode, myColor) {
  // Remove any existing listener
  if (gameListener) {
    gameListener.off();
    gameListener = null;
  }

  gameListener = database.ref(`games/${roomCode}/state`);

  gameListener.on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Ignore our own updates (we already applied them locally)
    // seq > 0 means it's a real move update; skip if we already have this seq
    if (data.seq && data.seq > 0 && data.seq === lastSyncTimestamp) return;

    if (data.board && JSON.stringify(data.board) !== JSON.stringify(board)) {
      const prevTurn = turn;
      board = data.board;
      turn = data.turn || "white";
      gameOver = data.gameOver || false;
      winner = data.winner || null;
      lastMove = data.lastMove || null;

      if (data.moveHistory) {
        moveHistory = data.moveHistory;
        renderMoveHistory();
      }

      lastSyncTimestamp = data.seq || 0;

      renderBoard();
      updateUI();

      // Play sound for opponent's move
      if (prevTurn !== turn) {
        playMoveSound();
        playNotificationSound();
      }

      if (gameOver) {
        setTimeout(() => {
          if (winner) {
            const isWinner = winner === myColor;
            showGameOverModal(
              isWinner ? "🏆" : "😔",
              isWinner ? "You Win!" : "You Lose!",
              isWinner
                ? "Congratulations! Well played!"
                : `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins this game.`,
            );
          } else {
            showGameOverModal("🤝", "Draw!", "The game ended in a draw.");
          }
        }, 500);
      }
    }

    // Handle draw offer
    if (data.drawOffer && data.drawOffer !== myColor) {
      document.getElementById("drawModal").style.display = "flex";
    }

    // Handle resign
    if (data.resigned && data.resigned !== myColor) {
      gameOver = true;
      winner = myColor;
      showGameOverModal("🏆", "You Win!", "Your opponent resigned.");
    }

    // Update opponent presence status
    if (data.players) {
      const oppColor = myColor === "white" ? "black" : "white";
      const oppJoined = data.players && data.players[oppColor];
      if (oppJoined) {
        document.getElementById(
          `player${oppColor.charAt(0).toUpperCase() + oppColor.slice(1)}Status`,
        ).textContent = "Connected";
      }
    }
  });

  // Also listen for meta changes (player join)
  database.ref(`games/${roomCode}/meta/players`).on("value", (snap) => {
    const players = snap.val();
    if (!players) return;

    if (players.black && myColor === "white") {
      document.getElementById("playerBlackStatus").textContent = "Connected";
      document.getElementById("statusMsg").innerHTML =
        "🎮 Opponent joined! Game on!";
      playNotificationSound();
      showToast("🎮 Opponent joined! Game is on!");
    }
  });
}

function attemptReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    document.getElementById("reconnectOverlay").style.display = "none";
    showToast("❌ Could not reconnect. Please rejoin the game.");
    return;
  }

  reconnectAttempts++;
  document.getElementById("reconnectOverlay").style.display = "flex";
  document.getElementById("reconnectMsg").textContent =
    `Attempt ${reconnectAttempts}/${maxReconnectAttempts}...`;

  if (currentRoom && database) {
    database
      .ref(`games/${currentRoom}/state`)
      .get()
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          board = data.board || board;
          turn = data.turn || turn;
          gameOver = data.gameOver || false;
          lastMove = data.lastMove || null;
          moveHistory = data.moveHistory || [];

          renderBoard();
          renderMoveHistory();
          updateUI();

          reconnectAttempts = 0;
          document.getElementById("reconnectOverlay").style.display = "none";
          showToast("✅ Reconnected!");

          // Re-setup presence and listener
          setupPresence(currentRoom, myColorFirebase);
          startGameListener(currentRoom, myColorFirebase);
        } else {
          setTimeout(() => attemptReconnect(), 2000);
        }
      })
      .catch(() => {
        setTimeout(() => attemptReconnect(), 2000);
      });
  }
}

function leaveFirebaseGame() {
  if (gameListener) {
    gameListener.off();
    gameListener = null;
  }
  if (opponentPresenceListener) {
    opponentPresenceListener.off();
    opponentPresenceListener = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (myPresenceRef) {
    myPresenceRef.set({ online: false, lastSeen: Date.now() });
    myPresenceRef = null;
  }

  if (currentRoom && database) {
    database
      .ref(`games/${currentRoom}`)
      .remove()
      .catch(() => {});
  }

  isConnectedFirebase = false;
  currentRoom = null;
  myColorFirebase = null;
  currentMode = "computer";
  lastSyncTimestamp = 0;
  reconnectAttempts = 0;

  document.getElementById("gameCodeContainer").style.display = "none";
  document.getElementById("roomCodeInput").value = "";
  document.getElementById("statusMsg").innerHTML = "🤖 Back to AI mode";

  hideOnlineGameUI();
  resetGame();
  closeOffcanvas();
}

function offerDraw() {
  if (!isConnectedFirebase || !currentRoom || !database) return;
  database.ref(`games/${currentRoom}/state/drawOffer`).set(myColorFirebase);
  showToast("🤝 Draw offered to opponent");
}

function acceptDraw() {
  document.getElementById("drawModal").style.display = "none";
  gameOver = true;
  winner = null;
  if (currentRoom && database) {
    database
      .ref(`games/${currentRoom}/state`)
      .update({ gameOver: true, winner: null, drawOffer: null });
  }
  showGameOverModal("🤝", "Draw Agreed!", "Both players agreed to a draw.");
}

function declineDraw() {
  document.getElementById("drawModal").style.display = "none";
  if (currentRoom && database) {
    database.ref(`games/${currentRoom}/state/drawOffer`).remove();
  }
  showToast("❌ Draw declined");
}

function resign() {
  if (!isConnectedFirebase || !currentRoom || !database) return;
  if (!confirm("Are you sure you want to resign?")) return;

  gameOver = true;
  winner = myColorFirebase === "white" ? "black" : "white";

  database.ref(`games/${currentRoom}/state`).update({
    gameOver: true,
    winner: winner,
    resigned: myColorFirebase,
  });

  showGameOverModal(
    "🏳️",
    "You Resigned",
    `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins the game.`,
  );
}

// ===== GAME MODE & DIFFICULTY =====
function setDifficultyLevel(level) {
  difficulty = level;
  resetGame();
  document.getElementById("statusMsg").innerHTML =
    `🎮 Difficulty: ${level.toUpperCase()}`;

  ["Easy", "Medium", "Hard", "Expert"].forEach((l) => {
    const btn = document.getElementById(`offcanvas${l}`);
    if (btn) btn.classList.remove("active");
  });

  const activeBtn = document.getElementById(
    `offcanvas${level.charAt(0).toUpperCase() + level.slice(1)}`,
  );
  if (activeBtn) activeBtn.classList.add("active");
}

function setGameMode(mode) {
  if (isConnectedFirebase) leaveFirebaseGame();
  currentMode = mode;
  turn = "white";

  if (mode === "computer") {
    document.getElementById("statusMsg").innerHTML =
      "🤖 VS COMPUTER — Make your move!";
  } else {
    document.getElementById("statusMsg").innerHTML =
      "👥 LOCAL TWO PLAYER — Take turns!";
  }

  resetGame();
  updateUI();
}

// ===== SIDEBAR =====
function openOffcanvas() {
  document.getElementById("offcanvas").classList.add("open");
}

function closeOffcanvas() {
  document.getElementById("offcanvas").classList.remove("open");
}

function copyGameCode() {
  if (currentRoom) {
    navigator.clipboard
      .writeText(currentRoom)
      .then(() => {
        showToast("✅ Game code copied! Send to your friend!");
      })
      .catch(() => {
        showToast(`Code: ${currentRoom}`);
      });
  }
}

// ===== EVENT LISTENERS =====
document.querySelectorAll(".promo-piece").forEach((el) => {
  el.addEventListener("click", () => handlePromotion(el.dataset.piece));
});

document.getElementById("menuBtn").addEventListener("click", openOffcanvas);

document.getElementById("saveFirebaseBtn").addEventListener("click", () => {
  const url = document.getElementById("firebaseUrlInput").value.trim();
  if (!url) {
    showToast("❌ Enter a database URL");
    return;
  }

  updateConnectionUI("connecting");
  document.getElementById("saveFirebaseBtn").textContent = "⏳ Connecting...";

  initializeFirebase(url)
    .then(() => {
      document.getElementById("firebaseSetupPanel").style.display = "none";
      document.getElementById("onlineControls").style.display = "block";
      showToast("✅ Firebase connected!");
    })
    .catch((err) => {
      document.getElementById("saveFirebaseBtn").textContent =
        "💾 SAVE & CONNECT";
      showToast("❌ Connection failed: " + err.message);
    });
});

document
  .getElementById("createGameBtn")
  .addEventListener("click", createFirebaseGame);
document
  .getElementById("joinGameBtn")
  .addEventListener("click", joinFirebaseGame);
document
  .getElementById("disconnectBtn")
  .addEventListener("click", leaveFirebaseGame);
document.getElementById("copyCodeBtn").addEventListener("click", copyGameCode);

document.getElementById("offerDrawBtn").addEventListener("click", offerDraw);
document.getElementById("resignBtn").addEventListener("click", resign);
document.getElementById("acceptDrawBtn").addEventListener("click", acceptDraw);
document
  .getElementById("declineDrawBtn")
  .addEventListener("click", declineDraw);

document.getElementById("playAgainBtn").addEventListener("click", () => {
  document.getElementById("gameOverModal").style.display = "none";
  if (isConnectedFirebase) {
    resetGame();
  } else {
    resetGame();
  }
});

document.getElementById("closeGameOverBtn").addEventListener("click", () => {
  document.getElementById("gameOverModal").style.display = "none";
});

document.getElementById("cancelReconnectBtn").addEventListener("click", () => {
  reconnectAttempts = maxReconnectAttempts;
  document.getElementById("reconnectOverlay").style.display = "none";
  leaveFirebaseGame();
});

document.getElementById("offcanvasModeAI").addEventListener("click", () => {
  setGameMode("computer");
  closeOffcanvas();
});
document.getElementById("offcanvasModeFriend").addEventListener("click", () => {
  setGameMode("friend");
  closeOffcanvas();
});
document.getElementById("offcanvasEasy").addEventListener("click", () => {
  setDifficultyLevel("easy");
  closeOffcanvas();
});
document.getElementById("offcanvasMedium").addEventListener("click", () => {
  setDifficultyLevel("medium");
  closeOffcanvas();
});
document.getElementById("offcanvasHard").addEventListener("click", () => {
  setDifficultyLevel("hard");
  closeOffcanvas();
});
document.getElementById("offcanvasExpert").addEventListener("click", () => {
  setDifficultyLevel("expert");
  closeOffcanvas();
});
document.getElementById("offcanvasReset").addEventListener("click", () => {
  resetGame();
  closeOffcanvas();
});

// Room code input — allow Enter key
document.getElementById("roomCodeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinFirebaseGame();
});

// Close offcanvas when clicking outside on mobile
document.addEventListener("click", (e) => {
  const offcanvas = document.getElementById("offcanvas");
  const menuBtn = document.getElementById("menuBtn");
  if (window.innerWidth < 1024 && offcanvas.classList.contains("open")) {
    if (!offcanvas.contains(e.target) && !menuBtn.contains(e.target)) {
      closeOffcanvas();
    }
  }
});

// ===== INIT =====
renderBoard();
updateUI();
