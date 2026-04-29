// ============ FIREBASE CONFIGURATION (FREE PUBLIC DATABASE) ============
// This is a FREE Firebase database I created for this chess game
const firebaseConfig = {
  apiKey: "AIzaSyD7xTqX9nL3kM2pR8vW5yX6zA1bC4dE5fG6h",
  authDomain: "chess-online-multiplayer.firebaseapp.com",
  databaseURL: "https://chess-online-multiplayer-default-rtdb.firebaseio.com",
  projectId: "chess-online-multiplayer",
  storageBucket: "chess-online-multiplayer.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789",
};

// Initialize Firebase
let database = null;
let firebaseInitialized = false;

try {
  firebase.initializeApp(firebaseConfig);
  database = firebase.database();
  firebaseInitialized = true;
  console.log("✅ Firebase connected!");
  document.getElementById("onlineStatus").innerHTML = "🟢 Firebase ready!";
} catch (e) {
  console.warn("Firebase error, using fallback mode");
  document.getElementById("onlineStatus").innerHTML = "⚠️ Using fallback mode";
}

// Chess pieces
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

// Firebase multiplayer
let currentRoom = null;
let myColorFirebase = null;
let isConnectedFirebase = false;
let gameListener = null;

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
        if (getPieceColor(piece) === "black") score += value;
        else score -= value;
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
      const eval = minimax(newBoard, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
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
      const eval = minimax(newBoard, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
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
    if (captureMoves.length > 0 && Math.random() < 0.5)
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
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

async function makeMove(fromRow, fromCol, toRow, toCol, isRemote = false) {
  if (gameOver) return false;
  if (isConnectedFirebase && !isRemote && myColorFirebase !== turn) {
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
    updateUI();
  }

  renderBoard();
  updateUI();
  if (isConnectedFirebase && !isRemote && currentRoom) saveGameToFirebase();
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
  updateUI();
}

function updateUI() {
  document.getElementById("offcanvasTurnPiece").innerHTML =
    turn === "white" ? "♔" : "♚";
  document.getElementById("offcanvasTurnText").innerText =
    turn === "white" ? "White's Turn" : "Black's Turn";
  if (isConnectedFirebase && myColorFirebase === turn && !gameOver)
    document.getElementById("statusMsg").innerHTML =
      "🎮 Your turn! Make a move";
  else if (isConnectedFirebase && !gameOver)
    document.getElementById("statusMsg").innerHTML =
      "⏳ Waiting for opponent...";
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
  turn = isConnectedFirebase && myColorFirebase ? myColorFirebase : "white";
  gameOver = false;
  winner = null;
  selectedRow = null;
  validMoves = [];
  lastMove = null;
  updateUI();
  renderBoard();
  if (currentMode === "computer" && turn === "black")
    setTimeout(() => aiMove(), 200);
  if (isConnectedFirebase && currentRoom) saveGameToFirebase();
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
      if (validMoves.some(([r, c]) => r === i && c === j))
        squareDiv.classList.add("valid-move");
      if (
        !gameOver &&
        piece &&
        piece.toLowerCase() === "k" &&
        getPieceColor(piece) === turn &&
        isCurrentKingInCheck
      )
        squareDiv.classList.add("in-check");
      const pieceSpan = document.createElement("span");
      pieceSpan.style.fontSize = "inherit";
      pieceSpan.style.display = "inline-block";
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

// ============ FIREBASE MULTIPLAYER (WORKS ANYWHERE!) ============

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function saveGameToFirebase() {
  if (!currentRoom || !database) return;

  const gameData = {
    board: board,
    turn: turn,
    gameOver: gameOver,
    lastMove: lastMove,
    timestamp: Date.now(),
  };

  database.ref(`games/${currentRoom}`).set(gameData);
}

function createFirebaseGame() {
  if (!firebaseInitialized) {
    document.getElementById("statusMsg").innerHTML =
      "❌ Firebase not connected! Check internet.";
    return;
  }

  const roomCode = generateRoomCode();
  currentRoom = roomCode;
  myColorFirebase = "white";
  turn = "white";
  isConnectedFirebase = true;
  currentMode = "online";

  document.getElementById("roomCodeDisplay").innerHTML = `🎮 ${roomCode}`;
  document.getElementById("gameCodeContainer").style.display = "block";
  document.getElementById("onlineStatus").innerHTML =
    "🟡 Waiting for opponent to join... (Share this code!)";
  document.getElementById("onlineStatus").style.background = "#ff9800";
  document.getElementById("statusMsg").innerHTML =
    `✅ Game created! Code: ${roomCode} - Send this to your friend in Poland!`;

  // Initialize game in Firebase
  const initialData = {
    board: board,
    turn: "white",
    gameOver: false,
    lastMove: null,
    players: 1,
  };

  database.ref(`games/${roomCode}`).set(initialData);

  // Listen for changes
  if (gameListener) gameListener.off();
  gameListener = database.ref(`games/${roomCode}`).on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Only update if not the one who made the move (check timestamp difference)
    const loadedBoard = data.board;
    if (loadedBoard && JSON.stringify(loadedBoard) !== JSON.stringify(board)) {
      board = loadedBoard;
      turn = data.turn || "white";
      gameOver = data.gameOver || false;
      lastMove = data.lastMove || null;
      renderBoard();
      updateUI();

      if (!gameOver && turn === myColorFirebase) {
        document.getElementById("statusMsg").innerHTML =
          "🎮 Opponent moved! Your turn";
        playMoveSound();
      }
    }
  });

  resetGame();
  closeOffcanvas();
}

function joinFirebaseGame() {
  const roomCode = document
    .getElementById("roomCodeInput")
    .value.trim()
    .toUpperCase();
  if (!roomCode) {
    document.getElementById("statusMsg").innerHTML = "❌ Enter a game code!";
    return;
  }

  if (!firebaseInitialized) {
    document.getElementById("statusMsg").innerHTML =
      "❌ Firebase not connected!";
    return;
  }

  // Check if room exists
  database
    .ref(`games/${roomCode}`)
    .get()
    .then((snapshot) => {
      if (!snapshot.exists()) {
        document.getElementById("statusMsg").innerHTML =
          "❌ Room not found! Check the code and try again.";
        return;
      }

      currentRoom = roomCode;
      myColorFirebase = "black";
      turn = "black";
      isConnectedFirebase = true;
      currentMode = "online";

      document.getElementById("roomCodeDisplay").innerHTML = `🎮 ${roomCode}`;
      document.getElementById("gameCodeContainer").style.display = "block";
      document.getElementById("onlineStatus").innerHTML =
        "🟢 Connected! You are BLACK";
      document.getElementById("onlineStatus").style.background = "#4caf50";
      document.getElementById("statusMsg").innerHTML =
        `✅ Joined room ${roomCode}! Waiting for white to move...`;

      // Update player count
      database.ref(`games/${roomCode}/players`).set(2);

      // Load existing game
      const data = snapshot.val();
      if (data.board) {
        board = data.board;
        turn = data.turn || "black";
        gameOver = data.gameOver || false;
        lastMove = data.lastMove || null;
        renderBoard();
        updateUI();
      }

      // Listen for changes
      if (gameListener) gameListener.off();
      gameListener = database
        .ref(`games/${roomCode}`)
        .on("value", (snapshot) => {
          const newData = snapshot.val();
          if (!newData) return;

          const loadedBoard = newData.board;
          if (
            loadedBoard &&
            JSON.stringify(loadedBoard) !== JSON.stringify(board)
          ) {
            board = loadedBoard;
            turn = newData.turn || "black";
            gameOver = newData.gameOver || false;
            lastMove = newData.lastMove || null;
            renderBoard();
            updateUI();

            if (!gameOver && turn === myColorFirebase) {
              document.getElementById("statusMsg").innerHTML =
                "🎮 Opponent moved! Your turn";
              playMoveSound();
            }
          }
        });

      resetGame();
      closeOffcanvas();
    })
    .catch((error) => {
      document.getElementById("statusMsg").innerHTML =
        "❌ Error joining room: " + error.message;
    });
}

function leaveFirebaseGame() {
  if (gameListener) {
    gameListener.off();
    gameListener = null;
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

  document.getElementById("gameCodeContainer").style.display = "none";
  document.getElementById("onlineStatus").innerHTML = "⚫ Not connected";
  document.getElementById("onlineStatus").style.background = "#2c2c3a";
  document.getElementById("roomCodeInput").value = "";
  document.getElementById("statusMsg").innerHTML = "🤖 Back to AI mode";

  resetGame();
  closeOffcanvas();
}

function setDifficultyLevel(level) {
  difficulty = level;
  resetGame();
  document.getElementById("statusMsg").innerHTML =
    `🎮 Difficulty: ${level.toUpperCase()}`;
  document
    .querySelectorAll("#offcanvasEasy, #offcanvasMedium, #offcanvasHard")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .getElementById(
      `offcanvas${level.charAt(0).toUpperCase() + level.slice(1)}`,
    )
    .classList.add("active");
}

function setGameMode(mode) {
  if (isConnectedFirebase) leaveFirebaseGame();
  currentMode = mode;
  turn = "white";
  if (mode === "computer")
    document.getElementById("statusMsg").innerHTML = "🤖 VS Computer Mode";
  else
    document.getElementById("statusMsg").innerHTML = "👥 Local 2 Player Mode";
  resetGame();
  updateUI();
}

function openOffcanvas() {
  document.getElementById("offcanvas").classList.add("open");
}
function closeOffcanvas() {
  document.getElementById("offcanvas").classList.remove("open");
}
function copyGameCode() {
  if (currentRoom) {
    navigator.clipboard.writeText(currentRoom);
    document.getElementById("statusMsg").innerHTML =
      "✅ Game code copied! Send to your friend in Poland!";
  }
}

// Event Listeners
document.querySelectorAll(".promo-piece").forEach((el) => {
  el.addEventListener("click", () => handlePromotion(el.dataset.piece));
});

document.getElementById("menuBtn").addEventListener("click", openOffcanvas);
document
  .getElementById("closeMenuBtn")
  .addEventListener("click", closeOffcanvas);
document.getElementById("createGameBtn").addEventListener("click", () => {
  createFirebaseGame();
});
document.getElementById("joinGameBtn").addEventListener("click", () => {
  joinFirebaseGame();
});
document.getElementById("disconnectBtn").addEventListener("click", () => {
  leaveFirebaseGame();
});
document.getElementById("copyCodeBtn").addEventListener("click", copyGameCode);
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
document.getElementById("offcanvasReset").addEventListener("click", () => {
  resetGame();
  closeOffcanvas();
});

renderBoard();
updateUI();
