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
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900,
  P: 10,
  N: 30,
  B: 30,
  R: 50,
  Q: 90,
  K: 900,
};

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

// Online multiplayer
let peer = null;
let conn = null;
let myColor = null;
let onlineConnected = false;

function playBeep(frequency, duration, type = "sine") {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = 0.3;
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

function getPieceColor(piece) {
  if (piece === "") return null;
  return piece === piece.toUpperCase() && piece !== piece.toLowerCase()
    ? "white"
    : "black";
}

function isValidRowCol(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

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
      const newRow = row + dr;
      const newCol = col + dc;
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

function findKingPosition(boardState, color) {
  const targetPiece = color === "white" ? "K" : "k";
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (boardState[i][j] === targetPiece) return { row: i, col: j };
    }
  }
  return { row: -1, col: -1 };
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

function copyBoard(boardState) {
  return boardState.map((row) => [...row]);
}

function evaluateBoard(boardState) {
  let score = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = boardState[i][j];
      if (piece !== "") {
        const value = pieceValues[piece] || 0;
        if (getPieceColor(piece) === "black") {
          score += value;
        } else {
          score -= value;
        }
      }
    }
  }
  return score;
}

function minimax(boardState, depth, isMaximizing, alpha, beta) {
  if (depth === 0) return evaluateBoard(boardState);

  if (isMaximizing) {
    const moves = getAllValidMovesForColor(boardState, "black");
    if (moves.length === 0) {
      const kingPos = findKingPosition(boardState, "black");
      const inCheck = isSquareAttacked(
        boardState,
        kingPos.row,
        kingPos.col,
        "white",
      );
      return inCheck ? -10000 : 0;
    }
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(boardState);
      newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
      newBoard[move.from[0]][move.from[1]] = "";
      const evall = minimax(newBoard, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, evall);
      alpha = Math.max(alpha, evall);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    const moves = getAllValidMovesForColor(boardState, "white");
    if (moves.length === 0) {
      const kingPos = findKingPosition(boardState, "white");
      const inCheck = isSquareAttacked(
        boardState,
        kingPos.row,
        kingPos.col,
        "black",
      );
      return inCheck ? 10000 : 0;
    }
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(boardState);
      newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
      newBoard[move.from[0]][move.from[1]] = "";
      const evall = minimax(newBoard, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, evall);
      beta = Math.min(beta, evall);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestMove(boardState) {
  const moves = getAllValidMovesForColor(boardState, "black");
  if (moves.length === 0) return null;

  if (difficulty === "easy") {
    const captureMoves = moves.filter(
      (m) => boardState[m.to[0]][m.to[1]] !== "",
    );
    if (captureMoves.length > 0 && Math.random() < 0.5) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  } else if (difficulty === "medium") {
    return moves.sort((a, b) => {
      const valA = pieceValues[boardState[a.to[0]][a.to[1]]] || 0;
      const valB = pieceValues[boardState[b.to[0]][b.to[1]]] || 0;
      return valB - valA;
    })[0];
  } else {
    let bestMove = moves[0];
    let bestValue = -Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(boardState);
      newBoard[move.to[0]][move.to[1]] = newBoard[move.from[0]][move.from[1]];
      newBoard[move.from[0]][move.from[1]] = "";
      const moveValue = minimax(newBoard, 2, false, -Infinity, Infinity);
      if (moveValue > bestValue) {
        bestValue = moveValue;
        bestMove = move;
      }
    }
    return bestMove;
  }
}

function showPromotionModal(row, col, color) {
  return new Promise((resolve) => {
    pendingPromotion = { row, col, color, resolve };
    document.getElementById("promotionModal").style.display = "flex";
  });
}

function handlePromotion(pieceType) {
  if (!pendingPromotion) return;
  const { row, col, color, resolve } = pendingPromotion;
  const newPiece =
    color === "white" ? pieceType.toUpperCase() : pieceType.toLowerCase();
  board[row][col] = newPiece;
  document.getElementById("promotionModal").style.display = "none";
  pendingPromotion = null;
  resolve();
  renderBoard();
}

async function makeMove(fromRow, fromCol, toRow, toCol, isRemote = false) {
  if (gameOver) return false;

  if (currentMode === "online" && !isRemote && myColor !== turn) {
    document.getElementById("statusMsg").innerHTML =
      "❌ Wait for your opponent!";
    return false;
  }

  const piece = board[fromRow][fromCol];
  if (piece === "" || getPieceColor(piece) !== turn) return false;
  if (!isMoveLegal(fromRow, fromCol, toRow, toCol, board, turn)) return false;

  playMoveSound();
  lastMove = { from: [fromRow, fromCol], to: [toRow, toCol] };

  const movingPiece = board[fromRow][fromCol];
  const isPawn = movingPiece.toLowerCase() === "p";
  const isPromotion =
    isPawn &&
    ((turn === "white" && toRow === 0) || (turn === "black" && toRow === 7));

  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = "";

  if (isPromotion && !isRemote) {
    renderBoard();
    await showPromotionModal(toRow, toCol, turn);
  } else if (isPromotion && isRemote) {
    board[toRow][toCol] = turn === "white" ? "Q" : "q";
  }

  if (currentMode === "online" && !isRemote && conn && conn.open) {
    conn.send({
      type: "move",
      from: [fromRow, fromCol],
      to: [toRow, toCol],
    });
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

  if (opponentInCheck) {
    playCheckSound();
    document.getElementById("statusMsg").innerHTML =
      `⚠️ ${nextTurn.toUpperCase()} IN CHECK! ⚠️`;
    setTimeout(() => {
      if (!gameOver)
        document.getElementById("statusMsg").innerHTML =
          `${nextTurn.toUpperCase()}'s turn`;
    }, 1500);
  } else {
    document.getElementById("statusMsg").innerHTML =
      `${nextTurn.toUpperCase()}'s turn`;
  }

  if (opponentMoves.length === 0) {
    gameOver = true;
    winner = turn;
    playCheckmateSound();
    document.getElementById("statusMsg").innerHTML = opponentInCheck
      ? `🏆 CHECKMATE! ${turn.toUpperCase()} WINS! 🏆`
      : `♟️ STALEMATE - DRAW ♟️`;
  } else {
    turn = nextTurn;
    updateTurnDisplay();
  }

  renderBoard();
  return true;
}

async function aiMove() {
  if (gameOver || currentMode !== "computer" || turn !== "black" || aiThinking)
    return;
  aiThinking = true;
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!gameOver && turn === "black") {
    const bestMove = getBestMove(board);
    if (bestMove)
      await makeMove(
        bestMove.from[0],
        bestMove.from[1],
        bestMove.to[0],
        bestMove.to[1],
      );
  }
  aiThinking = false;
  renderBoard();
}

function updateTurnDisplay() {
  const turnPieceElem = document.getElementById("turnPiece");
  const turnTextElem = document.getElementById("turnText");
  turnPieceElem.innerHTML = turn === "white" ? "♔" : "♚";
  turnTextElem.innerText = turn === "white" ? "White's Turn" : "Black's Turn";
}

function resetGame() {
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
  turn = currentMode === "online" && myColor ? myColor : "white";
  gameOver = false;
  winner = null;
  selectedRow = null;
  validMoves = [];
  lastMove = null;
  updateTurnDisplay();
  renderBoard();

  if (currentMode === "computer" && turn === "black")
    setTimeout(() => aiMove(), 200);
  if (currentMode === "online" && conn && conn.open)
    conn.send({ type: "reset" });
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

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      const pieceChar = piece ? pieces[piece] || "" : "";
      const isLight = (i + j) % 2 === 0;
      const squareDiv = document.createElement("div");
      squareDiv.className = `square ${isLight ? "light" : "dark"}`;

      if (selectedRow === i && selectedCol === j)
        squareDiv.classList.add("selected");
      if (
        lastMove &&
        ((lastMove.from[0] === i && lastMove.from[1] === j) ||
          (lastMove.to[0] === i && lastMove.to[1] === j))
      )
        squareDiv.classList.add("last-move");
      if (validMoves.some(([r, c]) => r === i && c === j)) {
        squareDiv.classList.add("valid-move");
        if (piece !== "") squareDiv.classList.add("capture-move");
      }
      if (
        !gameOver &&
        piece &&
        piece.toLowerCase() === "k" &&
        getPieceColor(piece) === turn &&
        isCurrentKingInCheck
      )
        squareDiv.classList.add("in-check");

      const pieceSpan = document.createElement("span");
      if (piece)
        pieceSpan.className =
          getPieceColor(piece) === "white" ? "piece-white" : "piece-black";
      pieceSpan.innerText = pieceChar;
      squareDiv.appendChild(pieceSpan);
      squareDiv.addEventListener(
        "click",
        (function (row, col) {
          return function () {
            onSquareClick(row, col);
          };
        })(i, j),
      );
      boardEl.appendChild(squareDiv);
    }
  }
}

async function onSquareClick(row, col) {
  if (gameOver) {
    document.getElementById("statusMsg").innerHTML =
      `Game Over! Press NEW GAME.`;
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
        `Selected ${pieces[piece]} - ${validMoves.length} legal moves`;
    } else {
      document.getElementById("statusMsg").innerHTML =
        `❌ Not your piece! It's ${turn}'s turn`;
    }
  } else {
    const isValid = validMoves.some(([r, c]) => r === row && c === col);
    if (isValid) {
      await makeMove(selectedRow, selectedCol, row, col);
      selectedRow = null;
      validMoves = [];
      renderBoard();
      if (currentMode === "computer" && !gameOver && turn === "black")
        setTimeout(() => aiMove(), 100);
    } else {
      document.getElementById("statusMsg").innerHTML = "❌ Invalid move!";
      selectedRow = null;
      validMoves = [];
      renderBoard();
    }
  }
}

// Online Multiplayer Functions
async function createGame() {
  if (peer) peer.destroy();

  const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  document.getElementById("roomCodeDisplay").textContent =
    `🎮 GAME CODE: ${gameId}`;
  document.getElementById("roomCodeDisplay").style.display = "block";

  peer = new Peer(gameId, {
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    },
  });

  peer.on("open", () => {
    myColor = "white";
    turn = "white";
    currentMode = "online";
    document.getElementById("statusMsg").innerHTML =
      `✅ Game created! Share code: ${gameId} with your friend`;
    document.getElementById("connectionStatus").innerHTML =
      "🟡 Waiting for opponent...";
    resetGame();
  });

  peer.on("connection", (connection) => {
    conn = connection;
    onlineConnected = true;
    document.getElementById("connectionStatus").innerHTML =
      "🟢 Connected! You are WHITE";
    document.getElementById("statusMsg").innerHTML =
      "🎮 Opponent joined! You move first.";

    conn.on("data", async (data) => {
      if (data.type === "move") {
        await makeMove(
          data.from[0],
          data.from[1],
          data.to[0],
          data.to[1],
          true,
        );
        renderBoard();
      } else if (data.type === "reset") {
        resetGame();
      }
    });

    conn.on("close", () => {
      onlineConnected = false;
      document.getElementById("connectionStatus").innerHTML = "🔴 Disconnected";
      document.getElementById("statusMsg").innerHTML =
        "❌ Opponent disconnected!";
    });
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    document.getElementById("statusMsg").innerHTML = `❌ Error: ${err}`;
  });
}

async function joinGame() {
  const gameId = document
    .getElementById("roomCodeInput")
    .value.trim()
    .toUpperCase();
  if (!gameId) {
    document.getElementById("statusMsg").innerHTML = "❌ Enter a game code!";
    return;
  }

  if (peer) peer.destroy();

  peer = new Peer({
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    },
  });

  peer.on("open", () => {
    conn = peer.connect(gameId);
    myColor = "black";
    turn = "black";
    currentMode = "online";
    document.getElementById("connectionStatus").innerHTML = "🟡 Connecting...";

    conn.on("open", () => {
      onlineConnected = true;
      document.getElementById("connectionStatus").innerHTML =
        "🟢 Connected! You are BLACK";
      document.getElementById("statusMsg").innerHTML =
        "🎮 Connected! Waiting for white to move...";
      resetGame();
    });

    conn.on("data", async (data) => {
      if (data.type === "move") {
        await makeMove(
          data.from[0],
          data.from[1],
          data.to[0],
          data.to[1],
          true,
        );
        renderBoard();
      } else if (data.type === "reset") {
        resetGame();
      }
    });

    conn.on("close", () => {
      onlineConnected = false;
      document.getElementById("connectionStatus").innerHTML = "🔴 Disconnected";
      document.getElementById("statusMsg").innerHTML =
        "❌ Opponent disconnected!";
    });
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
    document.getElementById("statusMsg").innerHTML =
      `❌ Failed to join: ${err}`;
    document.getElementById("connectionStatus").innerHTML =
      "🔴 Connection failed";
  });
}

function disconnectGame() {
  if (conn) conn.close();
  if (peer) peer.destroy();
  peer = null;
  conn = null;
  onlineConnected = false;
  myColor = null;
  currentMode = "computer";
  document.getElementById("roomCodeDisplay").style.display = "none";
  document.getElementById("connectionStatus").innerHTML = "";
  document.getElementById("statusMsg").innerHTML = "🤖 Back to AI mode";
  resetGame();
}

document.querySelectorAll(".promo-piece").forEach((el) => {
  el.addEventListener("click", () => handlePromotion(el.dataset.piece));
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (currentMode === "online" && conn && conn.open)
    conn.send({ type: "reset" });
  resetGame();
});

document.getElementById("modeVsFriend").addEventListener("click", () => {
  if (currentMode === "online") disconnectGame();
  currentMode = "friend";
  myColor = null;
  turn = "white";
  document.getElementById("statusMsg").innerHTML =
    "👥 Local Friend Mode - Players take turns on this device";
  resetGame();
});

document.getElementById("modeVsComputer").addEventListener("click", () => {
  if (currentMode === "online") disconnectGame();
  currentMode = "computer";
  myColor = null;
  turn = "white";
  document.getElementById("statusMsg").innerHTML =
    "🤖 VS AI Mode - Choose difficulty above";
  resetGame();
});

document.getElementById("createRoomBtn").addEventListener("click", createGame);
document.getElementById("joinRoomBtn").addEventListener("click", joinGame);
document
  .getElementById("disconnectBtn")
  .addEventListener("click", disconnectGame);

renderBoard();
