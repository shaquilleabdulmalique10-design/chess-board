// ── Chess AI Web Worker ──────────────────────
// Runs minimax off the main thread so the UI never freezes.

const PIECE_VAL = {p:100,n:320,b:330,r:500,q:900,k:20000,P:100,N:320,B:330,R:500,Q:900,K:20000};

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

const pc = p => {
  if(!p) return null;
  return p===p.toUpperCase()&&p!==p.toLowerCase()?'white':'black';
};
const opp = c => c==='white'?'black':'white';
const inB = (r,c) => r>=0&&r<8&&c>=0&&c<8;
const cpB = b => b.map(r=>[...r]);

function findKing(b, col) {
  const k = col==='white'?'K':'k';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(b[r][c]===k) return [r,c];
  return [-1,-1];
}

function rawMoves(b, r, c, ep, cr) {
  const p = b[r][c];
  if(!p) return [];
  const col = pc(p);
  const moves = [];
  const slide = dirs => {
    for(const [dr,dc] of dirs) {
      for(let i=1;i<8;i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if(!inB(nr,nc)) break;
        if(b[nr][nc]) { if(pc(b[nr][nc])!==col) moves.push([nr,nc]); break; }
        moves.push([nr,nc]);
      }
    }
  };
  switch(p.toLowerCase()) {
    case 'p': {
      const dir=col==='white'?-1:1, start=col==='white'?6:1;
      if(inB(r+dir,c)&&!b[r+dir][c]) {
        moves.push([r+dir,c]);
        if(r===start&&!b[r+2*dir][c]) moves.push([r+2*dir,c]);
      }
      for(const dc of[-1,1]) {
        const nr=r+dir,nc=c+dc;
        if(inB(nr,nc)) {
          if(b[nr][nc]&&pc(b[nr][nc])!==col) moves.push([nr,nc]);
          if(ep&&nr===ep[0]&&nc===ep[1]) moves.push([nr,nc]);
        }
      }
      break;
    }
    case 'n':
      for(const [dr,dc] of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr=r+dr,nc=c+dc;
        if(inB(nr,nc)&&pc(b[nr][nc])!==col) moves.push([nr,nc]);
      }
      break;
    case 'b': slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'r': slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'q': slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'k': {
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
        if(!dr&&!dc) continue;
        const nr=r+dr,nc=c+dc;
        if(inB(nr,nc)&&pc(b[nr][nc])!==col) moves.push([nr,nc]);
      }
      if(col==='white'&&r===7&&c===4) {
        if(cr.wK&&!b[7][5]&&!b[7][6]&&!attacked(b,7,4,'black')&&!attacked(b,7,5,'black')&&!attacked(b,7,6,'black')) moves.push([7,6]);
        if(cr.wQ&&!b[7][3]&&!b[7][2]&&!b[7][1]&&!attacked(b,7,4,'black')&&!attacked(b,7,3,'black')&&!attacked(b,7,2,'black')) moves.push([7,2]);
      }
      if(col==='black'&&r===0&&c===4) {
        if(cr.bK&&!b[0][5]&&!b[0][6]&&!attacked(b,0,4,'white')&&!attacked(b,0,5,'white')&&!attacked(b,0,6,'white')) moves.push([0,6]);
        if(cr.bQ&&!b[0][3]&&!b[0][2]&&!b[0][1]&&!attacked(b,0,4,'white')&&!attacked(b,0,3,'white')&&!attacked(b,0,2,'white')) moves.push([0,2]);
      }
      break;
    }
  }
  return moves;
}

function attacked(b, r, c, byCol) {
  for(let i=0;i<8;i++) for(let j=0;j<8;j++) {
    const p=b[i][j];
    if(!p||pc(p)!==byCol) continue;
    const ms=rawMoves(b,i,j,null,{wK:false,wQ:false,bK:false,bQ:false});
    if(ms.some(([mr,mc])=>mr===r&&mc===c)) return true;
  }
  return false;
}

function applyMove(b, fr, fc, tr, tc, ep) {
  const p=b[fr][fc], col=pc(p);
  const isCastle=p.toLowerCase()==='k'&&Math.abs(tc-fc)===2;
  const isEP=p.toLowerCase()==='p'&&tc!==fc&&!b[tr][tc]&&ep&&tr===ep[0]&&tc===ep[1];
  b[tr][tc]=p; b[fr][fc]='';
  if(isEP) b[fr][tc]='';
  if(isCastle) { if(tc===6){b[tr][5]=b[tr][7];b[tr][7]='';}else{b[tr][3]=b[tr][0];b[tr][0]='';} }
  if(p.toLowerCase()==='p'&&(tr===0||tr===7)) b[tr][tc]=col==='white'?'Q':'q';
}

function updCR(cr, b, fr, fc, tr, tc) {
  const p=b[fr][fc], n={...cr};
  if(p==='K'){n.wK=false;n.wQ=false;}
  if(p==='k'){n.bK=false;n.bQ=false;}
  if(p==='R'&&fr===7&&fc===7) n.wK=false;
  if(p==='R'&&fr===7&&fc===0) n.wQ=false;
  if(p==='r'&&fr===0&&fc===7) n.bK=false;
  if(p==='r'&&fr===0&&fc===0) n.bQ=false;
  if(b[tr][tc]==='R'&&tr===7&&tc===7) n.wK=false;
  if(b[tr][tc]==='R'&&tr===7&&tc===0) n.wQ=false;
  if(b[tr][tc]==='r'&&tr===0&&tc===7) n.bK=false;
  if(b[tr][tc]==='r'&&tr===0&&tc===0) n.bQ=false;
  return n;
}

function legalMovesFor(b, col, ep, cr) {
  const moves=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(pc(b[r][c])!==col) continue;
    for(const [tr,tc] of rawMoves(b,r,c,ep,cr)) {
      const tb=cpB(b);
      applyMove(tb,r,c,tr,tc,ep);
      const [kr,kc]=findKing(tb,col);
      if(!attacked(tb,kr,kc,opp(col))) moves.push({fr:r,fc:c,tr,tc});
    }
  }
  return moves;
}

function pstBonus(p, r, c) {
  const isW=pc(p)==='white';
  const row=isW?r:7-r;
  const k=p.toUpperCase();
  return PST[k]?PST[k][row][c]:0;
}

function evalBoard(b) {
  let s=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const p=b[r][c];
    if(!p) continue;
    const v=(PIECE_VAL[p]||0)+pstBonus(p,r,c);
    s+=pc(p)==='black'?v:-v;
  }
  return s;
}

function orderMoves(moves, b) {
  return moves.sort((a,b2)=>(PIECE_VAL[b[b2.tr][b2.tc]]||0)-(PIECE_VAL[b[a.tr][a.tc]]||0));
}

function minimax(b, depth, alpha, beta, maximizing, cr, ep) {
  if(depth===0) return evalBoard(b);
  const col=maximizing?'black':'white';
  const moves=orderMoves(legalMovesFor(b,col,ep,cr), b);

  if(!moves.length) {
    const [kr,kc]=findKing(b,col);
    return attacked(b,kr,kc,opp(col))?(maximizing?-100000+depth:100000-depth):0;
  }

  if(maximizing) {
    let best=-Infinity;
    for(const m of moves) {
      const tb=cpB(b);
      const ncr=updCR(cr,b,m.fr,m.fc,m.tr,m.tc);
      const nep=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;
      applyMove(tb,m.fr,m.fc,m.tr,m.tc,ep);
      const v=minimax(tb,depth-1,alpha,beta,false,ncr,nep);
      if(v>best) best=v;
      if(v>alpha) alpha=v;
      if(beta<=alpha) break;
    }
    return best;
  } else {
    let best=Infinity;
    for(const m of moves) {
      const tb=cpB(b);
      const ncr=updCR(cr,b,m.fr,m.fc,m.tr,m.tc);
      const nep=(b[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;
      applyMove(tb,m.fr,m.fc,m.tr,m.tc,ep);
      const v=minimax(tb,depth-1,alpha,beta,true,ncr,nep);
      if(v<best) best=v;
      if(v<beta) beta=v;
      if(beta<=alpha) break;
    }
    return best;
  }
}

// ── Message handler ──────────────────────────
self.onmessage = function(e) {
  const { board, castleRights, enPassantTarget, difficulty } = e.data;

  const moves = legalMovesFor(board, 'black', enPassantTarget, castleRights);
  if(!moves.length) { self.postMessage(null); return; }

  if(difficulty==='easy') {
    const caps=moves.filter(m=>board[m.tr][m.tc]);
    const pick=(caps.length&&Math.random()<0.5)?caps:moves;
    self.postMessage(pick[Math.floor(Math.random()*pick.length)]);
    return;
  }

  const depth = difficulty==='medium'?2 : difficulty==='hard'?3 : 4;
  let best=moves[0], bestVal=-Infinity;

  for(const m of orderMoves([...moves], board)) {
    const tb=cpB(board);
    const ncr=updCR(castleRights,board,m.fr,m.fc,m.tr,m.tc);
    const nep=(board[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;
    applyMove(tb,m.fr,m.fc,m.tr,m.tc,enPassantTarget);
    const v=minimax(tb,depth-1,-Infinity,Infinity,false,ncr,nep);
    if(v>bestVal){ bestVal=v; best=m; }
  }

  self.postMessage(best);
};
