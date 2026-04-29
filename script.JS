// ==============================================
//  CHESS MASTER — Full Rules + P2P Multiplayer
// ==============================================

// ── Piece maps ──────────────────────────────
const GLYPHS = {
  r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',p:'♟',
  R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔',P:'♙'
};

// ── Piece-square tables (white perspective, row 0 = rank 8) ──
const PST = {
  P:[[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
     [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
     [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
  N:[[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
     [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
     [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
     [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  B:[[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
     [-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],
     [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
     [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  R:[[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],
     [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
     [-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
  Q:[[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
     [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
     [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],
     [-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  K:[[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
     [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
     [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],
     [20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
};

const PIECE_VAL = {p:100,n:320,b:330,r:500,q:900,k:20000,P:100,N:320,B:330,R:500,Q:900,K:20000};

// ── Game state ───────────────────────────────
let board, turn, gameOver, winner;
let selectedRow, selectedCol, validMoves, lastMove;
let currentMode, difficulty, aiThinking, pendingPromotion;
let moveHistory, halfMoveClock, fullMoveNumber;

// Castling rights
let castleRights; // { wK, wQ, bK, bQ } booleans

// En passant target square [row, col] or null
let enPassantTarget;

// ── Multiplayer state ────────────────────────
let peer = null;
let conn = null;
let myColor = null;       // 'white' | 'black'
let isOnline = false;

// ── Init ─────────────────────────────────────
function initState() {
  board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  turn = 'white';
  gameOver = false;
  winner = null;
  selectedRow = null;
  selectedCol = null;
  validMoves = [];
  lastMove = null;
  castleRights = { wK:true, wQ:true, bK:true, bQ:true };
  enPassantTarget = null;
  moveHistory = [];
  halfMoveClock = 0;
  fullMoveNumber = 1;
  aiThinking = false;
  pendingPromotion = null;
}

// ── Helpers ──────────────────────────────────
const color = p => {
  if (!p) return null;
  return p === p.toUpperCase() && p !== p.toLowerCase() ? 'white' : 'black';
};
const inBounds = (r,c) => r>=0 && r<8 && c>=0 && c<8;
const copyBoard = b => b.map(r=>[...r]);
const opp = c => c==='white'?'black':'white';

function findKing(b, col) {
  const k = col==='white'?'K':'k';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(b[r][c]===k) return [r,c];
  return [-1,-1];
}

// ── Raw move generation (no check filter) ────
function rawMoves(b, r, c, epTarget, cr) {
  const p = b[r][c];
  if(!p) return [];
  const col = color(p);
  const moves = [];

  const slide = (dirs) => {
    for(const [dr,dc] of dirs) {
      for(let i=1;i<8;i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if(!inBounds(nr,nc)) break;
        if(b[nr][nc]) {
          if(color(b[nr][nc])!==col) moves.push([nr,nc]);
          break;
        }
        moves.push([nr,nc]);
      }
    }
  };

  switch(p.toLowerCase()) {
    case 'p': {
      const dir = col==='white'?-1:1;
      const start = col==='white'?6:1;
      // Forward
      if(inBounds(r+dir,c) && !b[r+dir][c]) {
        moves.push([r+dir,c]);
        if(r===start && !b[r+2*dir][c]) moves.push([r+2*dir,c]);
      }
      // Captures
      for(const dc of [-1,1]) {
        const nr=r+dir, nc=c+dc;
        if(inBounds(nr,nc)) {
          if(b[nr][nc] && color(b[nr][nc])!==col) moves.push([nr,nc]);
          // En passant
          if(epTarget && nr===epTarget[0] && nc===epTarget[1]) moves.push([nr,nc]);
        }
      }
      break;
    }
    case 'n': {
      for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr=r+dr, nc=c+dc;
        if(inBounds(nr,nc) && color(b[nr][nc])!==col) moves.push([nr,nc]);
      }
      break;
    }
    case 'b': slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'r': slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'q': slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'k': {
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
        if(!dr&&!dc) continue;
        const nr=r+dr, nc=c+dc;
        if(inBounds(nr,nc) && color(b[nr][nc])!==col) moves.push([nr,nc]);
      }
      // Castling
      if(col==='white' && r===7 && c===4) {
        if(cr.wK && !b[7][5] && !b[7][6] &&
           !isAttacked(b,7,4,'black') && !isAttacked(b,7,5,'black') && !isAttacked(b,7,6,'black'))
          moves.push([7,6]);
        if(cr.wQ && !b[7][3] && !b[7][2] && !b[7][1] &&
           !isAttacked(b,7,4,'black') && !isAttacked(b,7,3,'black') && !isAttacked(b,7,2,'black'))
          moves.push([7,2]);
      }
      if(col==='black' && r===0 && c===4) {
        if(cr.bK && !b[0][5] && !b[0][6] &&
           !isAttacked(b,0,4,'white') && !isAttacked(b,0,5,'white') && !isAttacked(b,0,6,'white'))
          moves.push([0,6]);
        if(cr.bQ && !b[0][3] && !b[0][2] && !b[0][1] &&
           !isAttacked(b,0,4,'white') && !isAttacked(b,0,3,'white') && !isAttacked(b,0,2,'white'))
          moves.push([0,2]);
      }
      break;
    }
  }
  return moves;
}

// ── Attack check (no castling, no ep needed) ─
function isAttacked(b, r, c, byColor) {
  for(let i=0;i<8;i++) for(let j=0;j<8;j++) {
    const p = b[i][j];
    if(!p || color(p)!==byColor) continue;
    // Use rawMoves with empty cr and no ep to avoid infinite recursion
    const ms = rawMoves(b,i,j,null,{wK:false,wQ:false,bK:false,bQ:false});
    if(ms.some(([mr,mc])=>mr===r&&mc===c)) return true;
  }
  return false;
}

// ── Legal moves (filters out moves leaving king in check) ──
// forcedColor lets you check moves for a specific color regardless of whose turn it is
function legalMoves(r, c, forcedColor) {
  const p = board[r][c];
  if(!p) return [];
  const pieceCol = color(p);
  const checkCol = forcedColor || turn;
  if(pieceCol !== checkCol) return [];
  const raw = rawMoves(board, r, c, enPassantTarget, castleRights);
  return raw.filter(([tr,tc]) => {
    const tb = copyBoard(board);
    applyMoveToBoard(tb, r, c, tr, tc, null, enPassantTarget);
    const [kr,kc] = findKing(tb, pieceCol);
    return !isAttacked(tb, kr, kc, opp(pieceCol));
  });
}

// ── Apply a move to a board copy (used for legality & AI) ──
function applyMoveToBoard(b, fr, fc, tr, tc, promoPiece, epTarget) {
  const p = b[fr][fc];
  const col = color(p);
  const isCastle = p.toLowerCase()==='k' && Math.abs(tc-fc)===2;
  const isEP = p.toLowerCase()==='p' && tc!==fc && !b[tr][tc] && epTarget && tr===epTarget[0] && tc===epTarget[1];

  b[tr][tc] = p;
  b[fr][fc] = '';

  // En passant capture
  if(isEP) b[fr][tc] = '';

  // Castling — move rook
  if(isCastle) {
    if(tc===6) { b[tr][5]=b[tr][7]; b[tr][7]=''; }
    else       { b[tr][3]=b[tr][0]; b[tr][0]=''; }
  }

  // Promotion
  if(p.toLowerCase()==='p' && (tr===0||tr===7)) {
    if(promoPiece && promoPiece !== '__PROMO__') {
      b[tr][tc] = promoPiece;
    } else if(promoPiece !== '__PROMO__') {
      b[tr][tc] = col==='white'?'Q':'q';
    }
    // if '__PROMO__' leave as-is; caller will set it
  }
}

// ── All legal moves for a color (works regardless of whose turn it is) ──
function allLegalMoves(col) {
  const moves = [];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(color(board[r][c])===col) {
      for(const [tr,tc] of legalMoves(r, c, col)) moves.push({fr:r,fc:c,tr,tc});
    }
  }
  return moves;
}

// ── Check / checkmate / stalemate ────────────
function inCheck(col) {
  const [kr,kc] = findKing(board, col);
  return isAttacked(board, kr, kc, opp(col));
}

// ── Fifty-move / threefold (simplified) ──────
function isDraw() {
  if(halfMoveClock >= 100) return true; // 50-move rule
  return false;
}

// ── Make a move (main game logic) ────────────
async function makeMove(fr, fc, tr, tc, isRemote=false, promoPiece=null) {
  if(gameOver) return false;
  if(isOnline && !isRemote && myColor!==turn) { showToast('⏳ Not your turn!'); return false; }

  const p = board[fr][fc];
  if(!p || color(p)!==turn) return false;

  const legal = legalMoves(fr, fc);
  if(!legal.some(([r,c])=>r===tr&&c===tc)) return false;

  const isCastle = p.toLowerCase()==='k' && Math.abs(tc-fc)===2;
  const isEP = p.toLowerCase()==='p' && tc!==fc && !board[tr][tc] &&
               enPassantTarget && tr===enPassantTarget[0] && tc===enPassantTarget[1];
  const isCapture = !!board[tr][tc] || isEP;
  const isPawn = p.toLowerCase()==='p';
  const isPromo = isPawn && (tr===0||tr===7);

  // Sounds
  if(isCastle) playSound('castle');
  else if(isCapture) playSound('capture');
  else playSound('move');

  // En passant target for next move
  const newEP = (isPawn && Math.abs(tr-fr)===2) ? [(fr+tr)/2, fc] : null;

  // Half-move clock
  halfMoveClock = (isPawn||isCapture) ? 0 : halfMoveClock+1;

  // Update castling rights
  const newCR = {...castleRights};
  if(p==='K') { newCR.wK=false; newCR.wQ=false; }
  if(p==='k') { newCR.bK=false; newCR.bQ=false; }
  if(p==='R'&&fr===7&&fc===7) newCR.wK=false;
  if(p==='R'&&fr===7&&fc===0) newCR.wQ=false;
  if(p==='r'&&fr===0&&fc===7) newCR.bK=false;
  if(p==='r'&&fr===0&&fc===0) newCR.bQ=false;
  // Rook captured
  if(board[tr][tc]==='R'&&tr===7&&tc===7) newCR.wK=false;
  if(board[tr][tc]==='R'&&tr===7&&tc===0) newCR.wQ=false;
  if(board[tr][tc]==='r'&&tr===0&&tc===7) newCR.bK=false;
  if(board[tr][tc]==='r'&&tr===0&&tc===0) newCR.bQ=false;

  // Record move notation before applying
  const notation = buildNotation(p, fr, fc, tr, tc, isCapture, isCastle, isEP);

  // Apply move to board (pass a placeholder for promotion — we'll fix it after modal)
  applyMoveToBoard(board, fr, fc, tr, tc, isPromo ? '__PROMO__' : promoPiece, enPassantTarget);

  // Promotion — ask player if local, then set the actual piece
  if(isPromo) {
    if(!isRemote && !promoPiece) {
      renderBoard();
      const chosen = await showPromotionModal(tr, tc, turn);
      promoPiece = turn==='white' ? chosen.toUpperCase() : chosen.toLowerCase();
    } else {
      promoPiece = promoPiece || (turn==='white'?'Q':'q');
    }
    board[tr][tc] = promoPiece;
  }

  // Update state
  castleRights = newCR;
  enPassantTarget = newEP;
  lastMove = {fr,fc,tr,tc};
  if(turn==='black') fullMoveNumber++;

  // Record history
  moveHistory.push({notation, color:turn});
  renderMoveHistory();

  // Switch turn
  const nextTurn = opp(turn);
  turn = nextTurn;

  // Check game-ending conditions
  const nextMoves = allLegalMoves(turn);
  const checked = inCheck(turn);

  if(nextMoves.length===0) {
    gameOver = true;
    winner = checked ? opp(turn) : null;
    playSound(checked?'checkmate':'stalemate');
    const msg = checked
      ? `🏆 CHECKMATE! ${opp(turn).toUpperCase()} WINS!`
      : '♟️ STALEMATE — DRAW';
    document.getElementById('statusMsg').innerHTML = msg;
    setTimeout(()=>showGameOverModal(
      checked?'🏆':'🤝',
      checked?'Checkmate!':'Stalemate!',
      checked?`${opp(turn).charAt(0).toUpperCase()+opp(turn).slice(1)} wins!`:'The game is a draw.'
    ), 600);
  } else if(isDraw()) {
    gameOver = true;
    winner = null;
    document.getElementById('statusMsg').innerHTML = '♟️ DRAW — 50-move rule';
    setTimeout(()=>showGameOverModal('🤝','Draw!','50-move rule.'), 600);
  } else {
    if(checked) {
      playSound('check');
      document.getElementById('statusMsg').innerHTML = `⚠️ ${turn.toUpperCase()} IS IN CHECK!`;
      setTimeout(()=>{ if(!gameOver) updateStatusMsg(); }, 1600);
    } else {
      updateStatusMsg();
    }
  }

  renderBoard();
  updateUI();

  // Send to opponent if online
  if(isOnline && !isRemote && conn && conn.open) {
    conn.send({ type:'move', fr, fc, tr, tc, promoPiece: promoPiece||null });
  }

  return true;
}

// ── Notation builder ─────────────────────────
function buildNotation(p, fr, fc, tr, tc, isCapture, isCastle, isEP) {
  if(isCastle) return tc===6?'O-O':'O-O-O';
  const file = c => String.fromCharCode(97+c);
  const rank = r => String(8-r);
  const pName = p.toLowerCase()==='p'?'':(p.toUpperCase());
  const cap = (isCapture||isEP)?'x':'';
  const from = p.toLowerCase()==='p'&&(isCapture||isEP)?file(fc):'';
  return pName+from+cap+file(tc)+rank(tr);
}

// ── Promotion modal ───────────────────────────
function showPromotionModal(row, col, col2) {
  return new Promise(resolve => {
    pendingPromotion = resolve;
    document.getElementById('promotionModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
}

function handlePromotion(pieceType) {
  if(!pendingPromotion) return;
  document.getElementById('promotionModal').style.display = 'none';
  document.body.style.overflow = '';
  const resolve = pendingPromotion;
  pendingPromotion = null;
  resolve(pieceType);
}

// ── Move history render ───────────────────────
function renderMoveHistory() {
  const list = document.getElementById('moveHistoryList');
  if(!list) return;
  list.innerHTML = '';
  for(let i=0;i<moveHistory.length;i+=2) {
    const num = Math.floor(i/2)+1;
    const w = moveHistory[i]?.notation||'';
    const bl = moveHistory[i+1]?.notation||'';
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `<span class="move-num">${num}.</span><span class="move-white">${w}</span><span class="move-black">${bl}</span>`;
    list.appendChild(row);
  }
  list.scrollTop = list.scrollHeight;
}

// ── AI ────────────────────────────────────────
const pstBonus = (p, r, c) => {
  const isW = color(p)==='white';
  const row = isW ? r : 7-r;
  const key = p.toUpperCase();
  return PST[key] ? PST[key][row][c] : 0;
};

function evalBoard(b) {
  let score = 0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const p = b[r][c];
    if(!p) continue;
    const v = (PIECE_VAL[p]||0) + pstBonus(p,r,c);
    score += color(p)==='black' ? v : -v;
  }
  return score;
}

function orderMoves(moves, b) {
  return moves.sort((a,b2)=>{
    const va = PIECE_VAL[b[a.tr][a.tc]]||0;
    const vb = PIECE_VAL[b2[b2.tr][b2.tc]]||0;
    return vb-va;
  });
}

function updateCR(cr, b, fr, fc, tr, tc) {
  const p = b[fr][fc];
  const newCR = {...cr};
  if(p==='K') { newCR.wK=false; newCR.wQ=false; }
  if(p==='k') { newCR.bK=false; newCR.bQ=false; }
  if(p==='R'&&fr===7&&fc===7) newCR.wK=false;
  if(p==='R'&&fr===7&&fc===0) newCR.wQ=false;
  if(p==='r'&&fr===0&&fc===7) newCR.bK=false;
  if(p==='r'&&fr===0&&fc===0) newCR.bQ=false;
  if(b[tr][tc]==='R'&&tr===7&&tc===7) newCR.wK=false;
  if(b[tr][tc]==='R'&&tr===7&&tc===0) newCR.wQ=false;
  if(b[tr][tc]==='r'&&tr===0&&tc===7) newCR.bK=false;
  if(b[tr][tc]==='r'&&tr===0&&tc===0) newCR.bQ=false;
  return newCR;
}

// ── Fast legal move generator for minimax (operates on any board state) ──
function fastLegalMoves(b, col, ep, cr) {
  const moves = [];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const p = b[r][c];
    if(!p || color(p)!==col) continue;
    const raw = rawMoves(b, r, c, ep, cr);
    for(const [tr,tc] of raw) {
      const tb = copyBoard(b);
      applyMoveToBoard(tb, r, c, tr, tc, null, ep);
      const [kr,kc] = findKing(tb, col);
      if(!isAttacked(tb, kr, kc, opp(col))) moves.push({fr:r,fc:c,tr,tc});
    }
  }
  return moves;
}

function minimax(b, depth, alpha, beta, maximizing, cr, ep) {
  if(depth===0) return evalBoard(b);
  const col = maximizing?'black':'white';
  const moves = fastLegalMoves(b, col, ep, cr);

  if(moves.length===0) {
    const [kr,kc] = findKing(b,col);
    return isAttacked(b,kr,kc,opp(col)) ? (maximizing?-100000+depth:100000-depth) : 0;
  }

  orderMoves(moves, b);

  if(maximizing) {
    let best=-Infinity;
    for(const m of moves) {
      const tb=copyBoard(b);
      const newCR=updateCR(cr,b,m.fr,m.fc,m.tr,m.tc);
      const newEP=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;
      applyMoveToBoard(tb,m.fr,m.fc,m.tr,m.tc,null,ep);
      const v=minimax(tb,depth-1,alpha,beta,false,newCR,newEP);
      if(v>best) best=v;
      if(v>alpha) alpha=v;
      if(beta<=alpha) break;
    }
    return best;
  } else {
    let best=Infinity;
    for(const m of moves) {
      const tb=copyBoard(b);
      const newCR=updateCR(cr,b,m.fr,m.fc,m.tr,m.tc);
      const newEP=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;
      applyMoveToBoard(tb,m.fr,m.fc,m.tr,m.tc,null,ep);
      const v=minimax(tb,depth-1,alpha,beta,true,newCR,newEP);
      if(v<best) best=v;
      if(v<beta) beta=v;
      if(beta<=alpha) break;
    }
    return best;
  }
}

function getBestMove() {
  const moves = allLegalMoves('black');
  if(!moves.length) return null;

  if(difficulty==='easy') {
    const caps = moves.filter(m=>board[m.tr][m.tc]);
    return (caps.length&&Math.random()<0.5)
      ? caps[Math.floor(Math.random()*caps.length)]
      : moves[Math.floor(Math.random()*moves.length)];
  }

  // Medium: depth 2, Hard: depth 3, Expert: depth 4
  const depth = difficulty==='medium'?2 : difficulty==='hard'?3 : 4;

  let best=moves[0], bestVal=-Infinity;
  const ordered = orderMoves([...moves], board);

  for(const m of ordered) {
    const tb=copyBoard(board);
    const newCR=updateCR(castleRights,board,m.fr,m.fc,m.tr,m.tc);
    const newEP=(board[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;
    applyMoveToBoard(tb,m.fr,m.fc,m.tr,m.tc,null,enPassantTarget);
    const v=minimax(tb, depth-1, -Infinity, Infinity, false, newCR, newEP);
    if(v>bestVal){ bestVal=v; best=m; }
  }
  return best;
}

// ── AI Worker (inlined as blob so it works on file:// and any server) ──
const AI_WORKER_SRC = `
const PIECE_VAL={p:100,n:320,b:330,r:500,q:900,k:20000,P:100,N:320,B:330,R:500,Q:900,K:20000};
const PST={P:[[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],N:[[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],B:[[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],R:[[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],Q:[[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],K:[[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]};
const pc=p=>{if(!p)return null;return p===p.toUpperCase()&&p!==p.toLowerCase()?'white':'black';};
const opp=c=>c==='white'?'black':'white';
const inB=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const cpB=b=>b.map(r=>[...r]);
function findKing(b,col){const k=col==='white'?'K':'k';for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===k)return[r,c];return[-1,-1];}
function rawMoves(b,r,c,ep,cr){const p=b[r][c];if(!p)return[];const col=pc(p);const moves=[];const slide=dirs=>{for(const[dr,dc]of dirs){for(let i=1;i<8;i++){const nr=r+dr*i,nc=c+dc*i;if(!inB(nr,nc))break;if(b[nr][nc]){if(pc(b[nr][nc])!==col)moves.push([nr,nc]);break;}moves.push([nr,nc]);}}};switch(p.toLowerCase()){case'p':{const dir=col==='white'?-1:1,start=col==='white'?6:1;if(inB(r+dir,c)&&!b[r+dir][c]){moves.push([r+dir,c]);if(r===start&&!b[r+2*dir][c])moves.push([r+2*dir,c]);}for(const dc of[-1,1]){const nr=r+dir,nc=c+dc;if(inB(nr,nc)){if(b[nr][nc]&&pc(b[nr][nc])!==col)moves.push([nr,nc]);if(ep&&nr===ep[0]&&nc===ep[1])moves.push([nr,nc]);}}break;}case'n':for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const nr=r+dr,nc=c+dc;if(inB(nr,nc)&&pc(b[nr][nc])!==col)moves.push([nr,nc]);}break;case'b':slide([[-1,-1],[-1,1],[1,-1],[1,1]]);break;case'r':slide([[-1,0],[1,0],[0,-1],[0,1]]);break;case'q':slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);break;case'k':{for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr=r+dr,nc=c+dc;if(inB(nr,nc)&&pc(b[nr][nc])!==col)moves.push([nr,nc]);}if(col==='white'&&r===7&&c===4){if(cr.wK&&!b[7][5]&&!b[7][6]&&!atk(b,7,4,'black')&&!atk(b,7,5,'black')&&!atk(b,7,6,'black'))moves.push([7,6]);if(cr.wQ&&!b[7][3]&&!b[7][2]&&!b[7][1]&&!atk(b,7,4,'black')&&!atk(b,7,3,'black')&&!atk(b,7,2,'black'))moves.push([7,2]);}if(col==='black'&&r===0&&c===4){if(cr.bK&&!b[0][5]&&!b[0][6]&&!atk(b,0,4,'white')&&!atk(b,0,5,'white')&&!atk(b,0,6,'white'))moves.push([0,6]);if(cr.bQ&&!b[0][3]&&!b[0][2]&&!b[0][1]&&!atk(b,0,4,'white')&&!atk(b,0,3,'white')&&!atk(b,0,2,'white'))moves.push([0,2]);}break;}}return moves;}
function atk(b,r,c,byCol){for(let i=0;i<8;i++)for(let j=0;j<8;j++){const p=b[i][j];if(!p||pc(p)!==byCol)continue;const ms=rawMoves(b,i,j,null,{wK:false,wQ:false,bK:false,bQ:false});if(ms.some(([mr,mc])=>mr===r&&mc===c))return true;}return false;}
function applyMove(b,fr,fc,tr,tc,ep){const p=b[fr][fc],col=pc(p);const isCastle=p.toLowerCase()==='k'&&Math.abs(tc-fc)===2;const isEP=p.toLowerCase()==='p'&&tc!==fc&&!b[tr][tc]&&ep&&tr===ep[0]&&tc===ep[1];b[tr][tc]=p;b[fr][fc]='';if(isEP)b[fr][tc]='';if(isCastle){if(tc===6){b[tr][5]=b[tr][7];b[tr][7]='';}else{b[tr][3]=b[tr][0];b[tr][0]='';}}if(p.toLowerCase()==='p'&&(tr===0||tr===7))b[tr][tc]=col==='white'?'Q':'q';}
function updCR(cr,b,fr,fc,tr,tc){const p=b[fr][fc],n={...cr};if(p==='K'){n.wK=false;n.wQ=false;}if(p==='k'){n.bK=false;n.bQ=false;}if(p==='R'&&fr===7&&fc===7)n.wK=false;if(p==='R'&&fr===7&&fc===0)n.wQ=false;if(p==='r'&&fr===0&&fc===7)n.bK=false;if(p==='r'&&fr===0&&fc===0)n.bQ=false;if(b[tr][tc]==='R'&&tr===7&&tc===7)n.wK=false;if(b[tr][tc]==='R'&&tr===7&&tc===0)n.wQ=false;if(b[tr][tc]==='r'&&tr===0&&tc===7)n.bK=false;if(b[tr][tc]==='r'&&tr===0&&tc===0)n.bQ=false;return n;}
function legalFor(b,col,ep,cr){const moves=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){if(pc(b[r][c])!==col)continue;for(const[tr,tc]of rawMoves(b,r,c,ep,cr)){const tb=cpB(b);applyMove(tb,r,c,tr,tc,ep);const[kr,kc]=findKing(tb,col);if(!atk(tb,kr,kc,opp(col)))moves.push({fr:r,fc:c,tr,tc});}}return moves;}
function pst(p,r,c){const isW=pc(p)==='white';const row=isW?r:7-r;const k=p.toUpperCase();return PST[k]?PST[k][row][c]:0;}
function evalB(b){let s=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(!p)continue;const v=(PIECE_VAL[p]||0)+pst(p,r,c);s+=pc(p)==='black'?v:-v;}return s;}
function ord(moves,b){return moves.sort((a,b2)=>(PIECE_VAL[b[b2.tr][b2.tc]]||0)-(PIECE_VAL[b[a.tr][a.tc]]||0));}
function mm(b,depth,alpha,beta,max,cr,ep){if(depth===0)return evalB(b);const col=max?'black':'white';const moves=ord(legalFor(b,col,ep,cr),b);if(!moves.length){const[kr,kc]=findKing(b,col);return atk(b,kr,kc,opp(col))?(max?-100000+depth:100000-depth):0;}if(max){let best=-Infinity;for(const m of moves){const tb=cpB(b);const ncr=updCR(cr,b,m.fr,m.fc,m.tr,m.tc);const nep=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;applyMove(tb,m.fr,m.fc,m.tr,m.tc,ep);const v=mm(tb,depth-1,alpha,beta,false,ncr,nep);if(v>best)best=v;if(v>alpha)alpha=v;if(beta<=alpha)break;}return best;}else{let best=Infinity;for(const m of moves){const tb=cpB(b);const ncr=updCR(cr,b,m.fr,m.fc,m.tr,m.tc);const nep=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;applyMove(tb,m.fr,m.fc,m.tr,m.tc,ep);const v=mm(tb,depth-1,alpha,beta,true,ncr,nep);if(v<best)best=v;if(v<beta)beta=v;if(beta<=alpha)break;}return best;}}
self.onmessage=function(e){const{board,castleRights,enPassantTarget,difficulty}=e.data;const moves=legalFor(board,'black',enPassantTarget,castleRights);if(!moves.length){self.postMessage(null);return;}if(difficulty==='easy'){const caps=moves.filter(m=>board[m.tr][m.tc]);const pick=(caps.length&&Math.random()<0.5)?caps:moves;self.postMessage(pick[Math.floor(Math.random()*pick.length)]);return;}const depth=difficulty==='medium'?2:difficulty==='hard'?3:4;let best=moves[0],bestVal=-Infinity;for(const m of ord([...moves],board)){const tb=cpB(board);const ncr=updCR(castleRights,board,m.fr,m.fc,m.tr,m.tc);const nep=(board[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;applyMove(tb,m.fr,m.fc,m.tr,m.tc,enPassantTarget);const v=mm(tb,depth-1,-Infinity,Infinity,false,ncr,nep);if(v>bestVal){bestVal=v;best=m;}}self.postMessage(best);};
`;

async function aiMove() {
  if(gameOver||currentMode!=='computer'||turn!=='black'||aiThinking) return;
  aiThinking=true;
  document.getElementById('statusMsg').innerHTML='🤖 AI is thinking...';

  const blob = new Blob([AI_WORKER_SRC], {type:'application/javascript'});
  const url  = URL.createObjectURL(blob);
  const worker = new Worker(url);

  worker.postMessage({
    board: board.map(r=>[...r]),
    castleRights: {...castleRights},
    enPassantTarget: enPassantTarget ? [...enPassantTarget] : null,
    difficulty
  });

  worker.onmessage = async (e) => {
    worker.terminate();
    URL.revokeObjectURL(url);
    const m = e.data;
    if(m && !gameOver && turn==='black') {
      await makeMove(m.fr, m.fc, m.tr, m.tc);
    }
    aiThinking = false;
  };

  worker.onerror = async (err) => {
    console.warn('Worker failed, falling back to main thread:', err);
    worker.terminate();
    URL.revokeObjectURL(url);
    // Fallback: run on main thread
    await new Promise(r=>setTimeout(r,30));
    const m = getBestMove();
    if(m && !gameOver && turn==='black') await makeMove(m.fr, m.fc, m.tr, m.tc);
    aiThinking = false;
  };
}

// ── Render board ──────────────────────────────
function renderBoard() {
  const el = document.getElementById('chessboard');
  el.innerHTML = '';
  const flipped = isOnline && myColor==='black';
  const [ckr,ckc] = findKing(board, turn);
  const kingInCheck = !gameOver && isAttacked(board,ckr,ckc,opp(turn));

  for(let i=0;i<8;i++) {
    for(let j=0;j<8;j++) {
      const r = flipped?7-i:i;
      const c = flipped?7-j:j;
      const p = board[r][c];
      const light = (r+c)%2===0;

      const sq = document.createElement('div');
      sq.className = `square ${light?'light':'dark'}`;

      if(selectedRow===r&&selectedCol===c) sq.classList.add('selected');
      if(lastMove&&((lastMove.fr===r&&lastMove.fc===c)||(lastMove.tr===r&&lastMove.tc===c)))
        sq.classList.add('last-move');
      if(validMoves.some(([vr,vc])=>vr===r&&vc===c)) {
        sq.classList.add('valid-move');
        // Show capture ring if there's an enemy piece on that square
        if(p && color(p)===opp(turn)) sq.classList.add('capture-move');
      }
      if(kingInCheck && p && p.toLowerCase()==='k' && color(p)===turn)
        sq.classList.add('in-check');

      // Rank label (left edge)
      if(j===0) {
        const lbl = document.createElement('span');
        lbl.className='rank-label';
        lbl.textContent = flipped?r+1:8-r;
        sq.appendChild(lbl);
      }
      // File label (bottom edge)
      if(i===7) {
        const lbl = document.createElement('span');
        lbl.className='file-label';
        lbl.textContent = String.fromCharCode(97+(flipped?7-c:c));
        sq.appendChild(lbl);
      }

      if(p) {
        const span = document.createElement('span');
        span.className = color(p)==='white'?'piece-white':'piece-black';
        span.textContent = GLYPHS[p]||'';
        sq.appendChild(span);
      }

      sq.addEventListener('click', (()=>{const rr=r,cc=c;return()=>onSquareClick(rr,cc);})());
      el.appendChild(sq);
    }
  }
}

// ── Square click handler ──────────────────────
async function onSquareClick(r, c) {
  if(gameOver) return;
  if(isOnline && myColor!==turn) { showToast('⏳ Not your turn!'); return; }

  if(selectedRow===null) {
    const p = board[r][c];
    if(p && color(p)===turn) {
      selectedRow=r; selectedCol=c;
      validMoves = legalMoves(r,c);
      renderBoard();
      document.getElementById('statusMsg').innerHTML =
        `${GLYPHS[p]} selected — ${validMoves.length} move${validMoves.length!==1?'s':''}`;
    }
  } else {
    if(validMoves.some(([vr,vc])=>vr===r&&vc===c)) {
      const fr=selectedRow, fc=selectedCol;
      selectedRow=null; selectedCol=null; validMoves=[];
      await makeMove(fr,fc,r,c);
      if(currentMode==='computer'&&!gameOver&&turn==='black')
        setTimeout(()=>aiMove(),80);
    } else if(board[r][c]&&color(board[r][c])===turn) {
      // Re-select
      selectedRow=r; selectedCol=c;
      validMoves=legalMoves(r,c);
      renderBoard();
    } else {
      selectedRow=null; selectedCol=null; validMoves=[];
      renderBoard();
    }
  }
}

// ── UI helpers ────────────────────────────────
function updateUI() {
  document.getElementById('sidebarTurnText').textContent = turn==='white'?"White's Turn":"Black's Turn";
  document.getElementById('sidebarTurnIcon').textContent = turn==='white'?'♔':'♚';
  if(isOnline) {
    const wr=document.getElementById('playerWhiteRow');
    const br=document.getElementById('playerBlackRow');
    if(wr) wr.classList.toggle('active-turn',turn==='white');
    if(br) br.classList.toggle('active-turn',turn==='black');
  }
}

function updateStatusMsg() {
  if(gameOver) return;
  if(isOnline) {
    document.getElementById('statusMsg').innerHTML =
      myColor===turn ? '🎮 YOUR TURN — make a move!' : '⏳ Waiting for opponent...';
  } else if(currentMode==='computer') {
    document.getElementById('statusMsg').innerHTML =
      turn==='white' ? '♟️ Your turn (White)' : '🤖 AI is thinking...';
  } else {
    document.getElementById('statusMsg').innerHTML =
      `👥 ${turn.charAt(0).toUpperCase()+turn.slice(1)}'s turn`;
  }
}

function resetGame(skipAI=false) {
  initState();
  if(isOnline && myColor) turn='white'; // online always starts white
  document.getElementById('moveHistoryList')&&(document.getElementById('moveHistoryList').innerHTML='');
  document.getElementById('gameOverModal').style.display='none';
  renderBoard();
  updateUI();
  updateStatusMsg();
  if(!skipAI && currentMode==='computer' && turn==='black') setTimeout(()=>aiMove(),200);
}

// ── Modals & toasts ───────────────────────────
function showGameOverModal(icon, title, sub) {
  document.getElementById('gameOverIcon').textContent=icon;
  document.getElementById('gameOverTitle').textContent=title;
  document.getElementById('gameOverSub').textContent=sub;
  document.getElementById('gameOverModal').style.display='flex';
}

let toastTimer=null;
function showToast(msg, dur=3000) {
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),dur);
}

// ── Sound ─────────────────────────────────────
function playSound(type) {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const sounds={
      move:[523,0.08,'sine'], capture:[330,0.15,'square'],
      castle:[659,0.18,'sine'], check:[880,0.3,'sine'],
      checkmate:[220,0.8,'sawtooth'], stalemate:[440,0.4,'sine'],
      notify:[660,0.1,'sine']
    };
    const [freq,dur,wave]=sounds[type]||sounds.move;
    osc.frequency.value=freq; osc.type=wave;
    gain.gain.value=0.2;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001,ctx.currentTime+dur);
    osc.stop(ctx.currentTime+dur);
    ctx.resume();
  } catch(e){}
}

// ── P2P Multiplayer (PeerJS) ──────────────────
function updateConnBar(status) {
  const bar=document.getElementById('connectionBar');
  const txt=document.getElementById('connectionBarText');
  bar.className='connection-bar '+status;
  txt.textContent=status==='online'?'Connected to opponent':status==='connecting'?'Connecting...':'Not connected';
}

function showOnlineUI(myCol) {
  const oppCol=opp(myCol);
  document.getElementById('opponentBanner').style.display='flex';
  document.getElementById('myBanner').style.display='flex';
  document.getElementById('oppDot').className=`banner-dot ${oppCol}-dot`;
  document.getElementById('myDot').className=`banner-dot ${myCol}-dot`;
  document.getElementById('oppLabel').textContent=`${oppCol.charAt(0).toUpperCase()+oppCol.slice(1)} (Opponent)`;
  document.getElementById('myLabel').textContent=`${myCol.charAt(0).toUpperCase()+myCol.slice(1)} (You)`;
  document.getElementById('onlinePlayerPanel').style.display='block';
  document.getElementById('moveHistorySection').style.display='block';
  document.getElementById('resignBtn').style.display='block';
  document.getElementById('offerDrawBtn').style.display='block';
  document.getElementById('disconnectBtn').style.display='block';
  document.getElementById('playerWhiteName').textContent=myCol==='white'?'You (White)':'Opponent (White)';
  document.getElementById('playerBlackName').textContent=myCol==='black'?'You (Black)':'Opponent (Black)';
  document.getElementById('playerWhiteStatus').textContent=myCol==='white'?'You':'Waiting...';
  document.getElementById('playerBlackStatus').textContent=myCol==='black'?'You':'Waiting...';
}

function hideOnlineUI() {
  ['opponentBanner','myBanner','onlinePlayerPanel','moveHistorySection'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='none';
  });
  ['resignBtn','offerDrawBtn','disconnectBtn'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='none';
  });
}

function setupConn(connection) {
  conn=connection;
  conn.on('open',()=>{
    isOnline=true;
    updateConnBar('online');
    const oppCol=opp(myColor);
    document.getElementById(`player${oppCol.charAt(0).toUpperCase()+oppCol.slice(1)}Status`).textContent='Connected';
    showToast('🎮 Opponent connected! Game on!');
    playSound('notify');
    updateStatusMsg();
  });
  conn.on('data', msg=>{
    if(!msg||!msg.type) return;
    switch(msg.type) {
      case 'move':
        makeMove(msg.fr,msg.fc,msg.tr,msg.tc,true,msg.promoPiece||null);
        break;
      case 'draw_offer':
        document.getElementById('drawModal').style.display='flex';
        break;
      case 'draw_accept':
        document.getElementById('drawModal').style.display='none';
        gameOver=true; winner=null;
        showGameOverModal('🤝','Draw Agreed!','Both players agreed to a draw.');
        break;
      case 'draw_decline':
        document.getElementById('drawModal').style.display='none';
        showToast('❌ Opponent declined the draw');
        break;
      case 'resign':
        gameOver=true; winner=myColor;
        showGameOverModal('🏆','You Win!','Your opponent resigned.');
        break;
      case 'reset':
        resetGame(true);
        showToast('🔄 Opponent started a new game');
        break;
    }
  });
  conn.on('close',()=>{
    isOnline=false;
    updateConnBar('offline');
    const oppCol=opp(myColor);
    document.getElementById(`player${oppCol.charAt(0).toUpperCase()+oppCol.slice(1)}Status`).textContent='Disconnected';
    document.getElementById('oppConnText').textContent='Offline';
    document.getElementById('oppConn').className='banner-conn offline';
    if(!gameOver) showToast('⚠️ Opponent disconnected',5000);
  });
  conn.on('error',err=>{ console.error(err); showToast('⚠️ Connection error'); });
}

function createGame() {
  updateConnBar('connecting');
  document.getElementById('statusMsg').innerHTML='⏳ Setting up game...';
  if(peer){peer.destroy();peer=null;}

  peer=new Peer(undefined,{debug:0});
  peer.on('open',id=>{
    myColor='white';
    currentMode='online';
    document.getElementById('roomCodeDisplay').innerHTML=`<strong>${id}</strong>`;
    document.getElementById('gameCodeContainer').style.display='block';
    document.getElementById('statusMsg').innerHTML='⏳ Waiting for opponent...';
    showOnlineUI('white');
    resetGame(true);
    closeOffcanvas();
    showToast('✅ Game created! Share your code with your friend.');
  });
  peer.on('connection',connection=>setupConn(connection));
  peer.on('error',err=>{ showToast('❌ Error: '+err.type); updateConnBar('offline'); });
}

function joinGame() {
  const code=document.getElementById('roomCodeInput').value.trim();
  if(!code){showToast('❌ Enter a game code!');return;}
  updateConnBar('connecting');
  document.getElementById('statusMsg').innerHTML='🔍 Connecting...';
  if(peer){peer.destroy();peer=null;}

  peer=new Peer(undefined,{debug:0});
  peer.on('open',()=>{
    myColor='black';
    currentMode='online';
    const connection=peer.connect(code,{reliable:true});
    setupConn(connection);
    document.getElementById('roomCodeDisplay').innerHTML=`<strong>${code}</strong>`;
    document.getElementById('gameCodeContainer').style.display='block';
    showOnlineUI('black');
    resetGame(true);
    closeOffcanvas();
  });
  peer.on('error',err=>{ showToast('❌ Could not connect: '+err.type+'. Check the code.'); updateConnBar('offline'); });
}

function leaveGame() {
  if(conn){conn.close();conn=null;}
  if(peer){peer.destroy();peer=null;}
  isOnline=false; myColor=null; currentMode='computer';
  updateConnBar('offline');
  hideOnlineUI();
  document.getElementById('gameCodeContainer').style.display='none';
  document.getElementById('roomCodeInput').value='';
  resetGame();
  closeOffcanvas();
}

function offerDraw() {
  if(!isOnline||!conn||!conn.open) return;
  conn.send({type:'draw_offer'});
  showToast('🤝 Draw offered');
}
function acceptDraw() {
  document.getElementById('drawModal').style.display='none';
  if(conn&&conn.open) conn.send({type:'draw_accept'});
  gameOver=true; winner=null;
  showGameOverModal('🤝','Draw Agreed!','Both players agreed to a draw.');
}
function declineDraw() {
  document.getElementById('drawModal').style.display='none';
  if(conn&&conn.open) conn.send({type:'draw_decline'});
  showToast('❌ Draw declined');
}
function resign() {
  if(!isOnline) return;
  if(!confirm('Are you sure you want to resign?')) return;
  if(conn&&conn.open) conn.send({type:'resign'});
  gameOver=true; winner=opp(myColor);
  showGameOverModal('🏳️','You Resigned',`${winner.charAt(0).toUpperCase()+winner.slice(1)} wins.`);
}

// ── Sidebar ───────────────────────────────────
function openOffcanvas(){document.getElementById('offcanvas').classList.add('open');}
function closeOffcanvas(){document.getElementById('offcanvas').classList.remove('open');}
function copyCode(){
  if(!peer) return;
  navigator.clipboard.writeText(peer.id)
    .then(()=>showToast('✅ Code copied! Send to your friend.'))
    .catch(()=>showToast('Code: '+peer.id));
}

function setMode(mode) {
  if(isOnline) leaveGame();
  currentMode=mode;
  document.getElementById('statusMsg').innerHTML=
    mode==='computer'?'🤖 VS COMPUTER — make your move!':'👥 LOCAL 2 PLAYER — take turns!';
  resetGame();
}

function setDifficulty(level) {
  difficulty=level;
  ['Easy','Medium','Hard','Expert'].forEach(l=>{
    const b=document.getElementById('offcanvas'+l);
    if(b) b.classList.remove('active');
  });
  const btn=document.getElementById('offcanvas'+level.charAt(0).toUpperCase()+level.slice(1));
  if(btn) btn.classList.add('active');
  resetGame();
  showToast('Difficulty: '+level.toUpperCase());
}

// ── Event listeners ───────────────────────────
document.querySelectorAll('.promo-piece').forEach(el=>
  el.addEventListener('click',()=>handlePromotion(el.dataset.piece))
);

document.getElementById('menuBtn').addEventListener('click',openOffcanvas);
document.getElementById('createGameBtn').addEventListener('click',createGame);
document.getElementById('joinGameBtn').addEventListener('click',joinGame);
document.getElementById('disconnectBtn').addEventListener('click',leaveGame);
document.getElementById('copyCodeBtn').addEventListener('click',copyCode);
document.getElementById('offerDrawBtn').addEventListener('click',offerDraw);
document.getElementById('resignBtn').addEventListener('click',resign);
document.getElementById('acceptDrawBtn').addEventListener('click',acceptDraw);
document.getElementById('declineDrawBtn').addEventListener('click',declineDraw);

document.getElementById('playAgainBtn').addEventListener('click',()=>{
  document.getElementById('gameOverModal').style.display='none';
  if(isOnline&&conn&&conn.open) conn.send({type:'reset'});
  resetGame(isOnline);
});
document.getElementById('closeGameOverBtn').addEventListener('click',()=>{
  document.getElementById('gameOverModal').style.display='none';
});

document.getElementById('offcanvasModeAI').addEventListener('click',()=>{setMode('computer');closeOffcanvas();});
document.getElementById('offcanvasModeFriend').addEventListener('click',()=>{setMode('friend');closeOffcanvas();});
document.getElementById('offcanvasEasy').addEventListener('click',()=>{setDifficulty('easy');closeOffcanvas();});
document.getElementById('offcanvasMedium').addEventListener('click',()=>{setDifficulty('medium');closeOffcanvas();});
document.getElementById('offcanvasHard').addEventListener('click',()=>{setDifficulty('hard');closeOffcanvas();});
document.getElementById('offcanvasExpert').addEventListener('click',()=>{setDifficulty('expert');closeOffcanvas();});
document.getElementById('offcanvasReset').addEventListener('click',()=>{resetGame();closeOffcanvas();});

document.getElementById('roomCodeInput').addEventListener('keydown',e=>{
  if(e.key==='Enter') joinGame();
});

document.addEventListener('click',e=>{
  const oc=document.getElementById('offcanvas');
  const mb=document.getElementById('menuBtn');
  if(window.innerWidth<1024&&oc.classList.contains('open')&&!oc.contains(e.target)&&!mb.contains(e.target))
    closeOffcanvas();
});

// ── Boot ──────────────────────────────────────
currentMode='computer';
difficulty='hard';
initState();
renderBoard();
updateUI();
updateStatusMsg();
