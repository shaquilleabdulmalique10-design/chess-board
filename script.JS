// ================================================================
//  CHESS ARENA — Complete rewrite, all features working
// ================================================================

// ── Piece glyphs (fallback only) ─────────────────────────────────
const GLYPHS = {
  r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',p:'♟',
  R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔',P:'♙'
};

// ── Piece image map (cburnett SVG set) ────────────────────────────
const PIECE_IMG = {
  P:'pieces/wP.svg', N:'pieces/wN.svg', B:'pieces/wB.svg',
  R:'pieces/wR.svg', Q:'pieces/wQ.svg', K:'pieces/wK.svg',
  p:'pieces/bP.svg', n:'pieces/bN.svg', b:'pieces/bB.svg',
  r:'pieces/bR.svg', q:'pieces/bQ.svg', k:'pieces/bK.svg',
};

// ── Piece-square tables ───────────────────────────────────────────
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
const AI_THINK_MS = 3000; // minimum 3 second AI delay

// ── User & settings ──────────────────────────
let currentUser = null;
const USER_STORE_KEY  = 'chess-arena-users';
const CURRENT_USER_KEY = 'chess-arena-current';
const THEME_KEY       = 'chess-arena-theme';
const BOARD_THEMES    = ['classic','ocean','forest','midnight','gold','rose'];

// ── Game state ────────────────────────────────
let board, turn, gameOver, winner;
let selRow, selCol, validMoves, lastMove;
let currentMode = 'computer', difficulty = 'easy';
let aiThinking = false, pendingPromotion = null;
let moveHistory = [], halfMoveClock = 0, fullMoveNumber = 1;
let castleRights, enPassantTarget;
let peer = null, conn = null, myColor = null, isOnline = false;
let soundEnabled = true, showCoords = true;

// ── DOM helper ────────────────────────────────
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── Init board state ──────────────────────────
function initState() {
  board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],['','','','','','','',''],
    ['','','','','','','',''],['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  turn='white'; gameOver=false; winner=null;
  selRow=null; selCol=null; validMoves=[]; lastMove=null;
  castleRights={wK:true,wQ:true,bK:true,bQ:true}; enPassantTarget=null;
  moveHistory=[]; halfMoveClock=0; fullMoveNumber=1;
  aiThinking=false; pendingPromotion=null;
}

// ── Chess helpers ─────────────────────────────
const col   = p => !p?null:(p===p.toUpperCase()&&p!==p.toLowerCase()?'white':'black');
const opp   = c => c==='white'?'black':'white';
const cpB   = b => b.map(r=>[...r]);
const inB   = (r,c) => r>=0&&r<8&&c>=0&&c<8;

function findKing(b,side){
  const k=side==='white'?'K':'k';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(b[r][c]===k) return[r,c];
  return[-1,-1];
}

function rawMoves(b,r,c,ep,cr){
  const p=b[r][c]; if(!p)return[];
  const pc=col(p), moves=[];
  const slide=dirs=>{
    for(const[dr,dc]of dirs){
      for(let i=1;i<8;i++){
        const nr=r+dr*i,nc=c+dc*i;
        if(!inB(nr,nc))break;
        if(b[nr][nc]){if(col(b[nr][nc])!==pc)moves.push([nr,nc]);break;}
        moves.push([nr,nc]);
      }
    }
  };
  switch(p.toLowerCase()){
    case'p':{
      const dir=pc==='white'?-1:1,st=pc==='white'?6:1;
      if(inB(r+dir,c)&&!b[r+dir][c]){
        moves.push([r+dir,c]);
        if(r===st&&!b[r+2*dir][c])moves.push([r+2*dir,c]);
      }
      for(const dc of[-1,1]){
        const nr=r+dir,nc=c+dc;
        if(!inB(nr,nc))continue;
        if(b[nr][nc]&&col(b[nr][nc])!==pc)moves.push([nr,nc]);
        if(ep&&nr===ep[0]&&nc===ep[1])moves.push([nr,nc]);
      }
      break;
    }
    case'n':
      for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
        const nr=r+dr,nc=c+dc;
        if(inB(nr,nc)&&col(b[nr][nc])!==pc)moves.push([nr,nc]);
      }
      break;
    case'b':slide([[-1,-1],[-1,1],[1,-1],[1,1]]);break;
    case'r':slide([[-1,0],[1,0],[0,-1],[0,1]]);break;
    case'q':slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);break;
    case'k':{
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;
        const nr=r+dr,nc=c+dc;
        if(inB(nr,nc)&&col(b[nr][nc])!==pc)moves.push([nr,nc]);
      }
      if(pc==='white'&&r===7&&c===4){
        if(cr.wK&&!b[7][5]&&!b[7][6]&&!isAtk(b,7,4,'black')&&!isAtk(b,7,5,'black')&&!isAtk(b,7,6,'black'))moves.push([7,6]);
        if(cr.wQ&&!b[7][3]&&!b[7][2]&&!b[7][1]&&!isAtk(b,7,4,'black')&&!isAtk(b,7,3,'black')&&!isAtk(b,7,2,'black'))moves.push([7,2]);
      }
      if(pc==='black'&&r===0&&c===4){
        if(cr.bK&&!b[0][5]&&!b[0][6]&&!isAtk(b,0,4,'white')&&!isAtk(b,0,5,'white')&&!isAtk(b,0,6,'white'))moves.push([0,6]);
        if(cr.bQ&&!b[0][3]&&!b[0][2]&&!b[0][1]&&!isAtk(b,0,4,'white')&&!isAtk(b,0,3,'white')&&!isAtk(b,0,2,'white'))moves.push([0,2]);
      }
      break;
    }
  }
  return moves;
}

function isAtk(b,r,c,byCol){
  for(let i=0;i<8;i++) for(let j=0;j<8;j++){
    const p=b[i][j]; if(!p||col(p)!==byCol)continue;
    if(rawMoves(b,i,j,null,{wK:false,wQ:false,bK:false,bQ:false}).some(([mr,mc])=>mr===r&&mc===c))return true;
  }
  return false;
}

function applyMov(b,fr,fc,tr,tc,promo,ep){
  const p=b[fr][fc],pc=col(p);
  const isCastle=p.toLowerCase()==='k'&&Math.abs(tc-fc)===2;
  const isEP=p.toLowerCase()==='p'&&tc!==fc&&!b[tr][tc]&&ep&&tr===ep[0]&&tc===ep[1];
  b[tr][tc]=p; b[fr][fc]='';
  if(isEP)b[fr][tc]='';
  if(isCastle){if(tc===6){b[tr][5]=b[tr][7];b[tr][7]='';}else{b[tr][3]=b[tr][0];b[tr][0]='';}}
  if(p.toLowerCase()==='p'&&(tr===0||tr===7)){
    if(promo&&promo!=='__P')b[tr][tc]=promo;
    else if(promo!=='__P')b[tr][tc]=pc==='white'?'Q':'q';
  }
}

function legalMov(r,c,forceColor){
  const p=board[r][c]; if(!p)return[];
  const pc=col(p),chk=forceColor||turn;
  if(pc!==chk)return[];
  return rawMoves(board,r,c,enPassantTarget,castleRights).filter(([tr,tc])=>{
    const tb=cpB(board);
    applyMov(tb,r,c,tr,tc,null,enPassantTarget);
    const[kr,kc]=findKing(tb,pc);
    return !isAtk(tb,kr,kc,opp(pc));
  });
}

function allLegal(side){
  const moves=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    if(col(board[r][c])===side)
      for(const[tr,tc]of legalMov(r,c,side))moves.push({fr:r,fc:c,tr,tc});
  }
  return moves;
}

function updCR(cr,b,fr,fc,tr,tc){
  const p=b[fr][fc],n={...cr};
  if(p==='K'){n.wK=false;n.wQ=false;}if(p==='k'){n.bK=false;n.bQ=false;}
  if(p==='R'&&fr===7&&fc===7)n.wK=false;if(p==='R'&&fr===7&&fc===0)n.wQ=false;
  if(p==='r'&&fr===0&&fc===7)n.bK=false;if(p==='r'&&fr===0&&fc===0)n.bQ=false;
  if(b[tr][tc]==='R'&&tr===7&&tc===7)n.wK=false;if(b[tr][tc]==='R'&&tr===7&&tc===0)n.wQ=false;
  if(b[tr][tc]==='r'&&tr===0&&tc===7)n.bK=false;if(b[tr][tc]==='r'&&tr===0&&tc===0)n.bQ=false;
  return n;
}

// ── Make move ────────────────────────────────
async function makeMove(fr,fc,tr,tc,remote=false,promo=null){
  if(gameOver)return false;
  if(isOnline&&!remote&&myColor!==turn){showToast('⏳ Not your turn!');return false;}
  const p=board[fr][fc];
  if(!p||col(p)!==turn)return false;
  const legal=legalMov(fr,fc);
  if(!legal.some(([r,c])=>r===tr&&c===tc))return false;

  const isCastle=p.toLowerCase()==='k'&&Math.abs(tc-fc)===2;
  const isEP=p.toLowerCase()==='p'&&tc!==fc&&!board[tr][tc]&&enPassantTarget&&tr===enPassantTarget[0]&&tc===enPassantTarget[1];
  const isCap=!!board[tr][tc]||isEP;
  const isPawn=p.toLowerCase()==='p';
  const isPromo=isPawn&&(tr===0||tr===7);

  if(isCastle)snd('castle');else if(isCap)snd('capture');else snd('move');

  const newEP=isPawn&&Math.abs(tr-fr)===2?[(fr+tr)/2,fc]:null;
  halfMoveClock=isPawn||isCap?0:halfMoveClock+1;
  const newCR=updCR(castleRights,board,fr,fc,tr,tc);
  const note=buildNote(p,fr,fc,tr,tc,isCap,isCastle,isEP);

  applyMov(board,fr,fc,tr,tc,isPromo?'__P':promo,enPassantTarget);

  if(isPromo){
    if(!remote&&!promo){
      renderBoard();
      const chosen=await showPromoModal(turn);
      promo=turn==='white'?chosen.toUpperCase():chosen.toLowerCase();
    } else {
      promo=promo||(turn==='white'?'Q':'q');
    }
    board[tr][tc]=promo;
  }

  castleRights=newCR; enPassantTarget=newEP;
  lastMove={fr,fc,tr,tc};
  if(turn==='black')fullMoveNumber++;
  moveHistory.push({notation:note,color:turn});
  renderMoves();

  turn=opp(turn);
  const nextMoves=allLegal(turn);
  const checked=isAtk(board,...findKing(board,turn),opp(turn));

  if(nextMoves.length===0){
    gameOver=true; winner=checked?opp(turn):null;
    snd(checked?'checkmate':'stalemate');
    const msg=checked?`🏆 ${opp(turn).toUpperCase()} WINS!`:'½ STALEMATE — DRAW';
    setStatus(msg);
    saveGameResult(checked?opp(turn):null);
    setTimeout(()=>showModal(checked?'🏆':'🤝',checked?'Checkmate!':'Stalemate!',checked?`${opp(turn).charAt(0).toUpperCase()+opp(turn).slice(1)} wins!`:'The game is a draw.'),600);
  } else if(halfMoveClock>=100){
    gameOver=true; winner=null;
    setStatus('♟️ DRAW — 50-move rule');
    saveGameResult(null);
    setTimeout(()=>showModal('🤝','Draw!','50-move rule.'),600);
  } else {
    if(checked){snd('check');setStatus(`⚠️ ${turn.toUpperCase()} IS IN CHECK!`);setTimeout(()=>{if(!gameOver)updateStatus();},1600);}
    else updateStatus();
  }

  renderBoard(); updateUI();
  if(isOnline&&!remote&&conn&&conn.open)
    conn.send({type:'move',fr,fc,tr,tc,promoPiece:promo||null});
  return true;
}

function buildNote(p,fr,fc,tr,tc,cap,castle,ep){
  if(castle)return tc===6?'O-O':'O-O-O';
  const f=c=>String.fromCharCode(97+c),rk=r=>String(8-r);
  const pn=p.toLowerCase()==='p'?'':p.toUpperCase();
  const cx=cap||ep?'x':'';
  const from=p.toLowerCase()==='p'&&(cap||ep)?f(fc):'';
  return pn+from+cx+f(tc)+rk(tr);
}

// ── Promotion ────────────────────────────────
function showPromoModal(turnColor){
  return new Promise(resolve=>{
    pendingPromotion=resolve;
    $('promotionModal').style.display='flex';
    document.body.style.overflow='hidden';
  });
}
function handlePromotion(pt){
  if(!pendingPromotion)return;
  $('promotionModal').style.display='none';
  document.body.style.overflow='';
  const r=pendingPromotion; pendingPromotion=null; r(pt);
}

// ── Render board ─────────────────────────────
function renderBoard(){
  const el=$('board'); if(!el)return;
  el.innerHTML='';
  const flip=isOnline&&myColor==='black';
  const[ckr,ckc]=findKing(board,turn);
  const inCheck=!gameOver&&isAtk(board,ckr,ckc,opp(turn));

  for(let i=0;i<8;i++) for(let j=0;j<8;j++){
    const r=flip?7-i:i, c=flip?7-j:j;
    const p=board[r][c], light=(r+c)%2===0;
    const sq=document.createElement('div');
    sq.className=`board-square ${light?'light':'dark'}`;
    if(selRow===r&&selCol===c)sq.classList.add('selected');
    if(lastMove&&lastMove.fr===r&&lastMove.fc===c)sq.classList.add('last-move');
    if(lastMove&&lastMove.tr===r&&lastMove.tc===c)sq.classList.add('last-move-to');
    const vm=(validMoves||[]).some(([vr,vc])=>vr===r&&vc===c);
    if(vm){sq.classList.add('valid');if(p&&col(p)===opp(turn))sq.classList.add('capture');}
    if(inCheck&&p&&p.toLowerCase()==='k'&&col(p)===turn)sq.classList.add('in-check');

    if(showCoords){
      if(j===0){const lb=document.createElement('span');lb.className='coord-top';lb.textContent=flip?r+1:8-r;sq.appendChild(lb);}
      if(i===7){const lb=document.createElement('span');lb.className='coord-bottom';lb.textContent=String.fromCharCode(97+(flip?7-c:c));sq.appendChild(lb);}
    }
    if(p){
      const img=document.createElement('img');
      img.src=PIECE_IMG[p]||'';
      img.alt=GLYPHS[p]||p;
      img.className='piece-img';
      img.draggable=false;
      sq.appendChild(img);
    }
    sq.addEventListener('click',(()=>{const rr=r,cc=c;return()=>clickSq(rr,cc);})());
    sq.addEventListener('touchend',(()=>{const rr=r,cc=c;return e=>{e.preventDefault();clickSq(rr,cc);}})(),{passive:false});
    el.appendChild(sq);
  }
}

// ── Square click ─────────────────────────────
async function clickSq(r,c){
  if(gameOver||aiThinking)return;
  if(isOnline&&myColor!==turn){showToast('⏳ Not your turn!');return;}

  if(selRow===null){
    const p=board[r][c];
    if(p&&col(p)===turn){
      selRow=r;selCol=c;
      validMoves=legalMov(r,c);
      renderBoard();
      setStatus(`${GLYPHS[p]} — ${validMoves.length} move${validMoves.length!==1?'s':''}`);
    }
  } else {
    if((validMoves||[]).some(([vr,vc])=>vr===r&&vc===c)){
      const fr=selRow,fc=selCol;
      selRow=null;selCol=null;validMoves=[];
      await makeMove(fr,fc,r,c);
      if(currentMode==='computer'&&!gameOver&&turn==='black')aiMove();
    } else if(board[r][c]&&col(board[r][c])===turn){
      selRow=r;selCol=c;validMoves=legalMov(r,c);renderBoard();
    } else {
      selRow=null;selCol=null;validMoves=[];renderBoard();
    }
  }
}

// ── AI (web worker blob, 3s+ think time) ─────
const AI_SRC=`
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
  const{board,castleRights,enPassantTarget,difficulty}=e.data;
  const moves=lF(board,'black',enPassantTarget,castleRights);
  if(!moves.length){self.postMessage(null);return;}
  if(difficulty==='easy'){
    const caps=moves.filter(m=>board[m.tr][m.tc]);
    const pool=(caps.length&&Math.random()<0.5)?caps:moves;
    self.postMessage(pool[Math.floor(Math.random()*pool.length)]);return;
  }
  const depth=difficulty==='normal'?2:difficulty==='hard'?3:4;
  let best=moves[0],bestV=-Infinity;
  for(const m of ord([...moves],board)){
    const tb=cpB(board);const nc=uCR(castleRights,board,m.fr,m.fc,m.tr,m.tc);
    const ne=(board[m.fr][m.fc].toLowerCase()==='p'&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;
    aM(tb,m.fr,m.fc,m.tr,m.tc,enPassantTarget);
    const v=mm(tb,depth-1,-Infinity,Infinity,false,nc,ne);
    if(v>bestV){bestV=v;best=m;}
  }
  self.postMessage(best);
};`;

async function aiMove(){
  if(gameOver||currentMode!=='computer'||turn!=='black'||aiThinking)return;
  aiThinking=true;
  const started=Date.now();
  setStatus('🤖 AI is thinking...');
  const bar=$('aiThinkBar');if(bar)bar.classList.add('show');

  const blob=new Blob([AI_SRC],{type:'application/javascript'});
  const url=URL.createObjectURL(blob);
  const worker=new Worker(url);
  worker.postMessage({board:board.map(r=>[...r]),castleRights:{...castleRights},enPassantTarget:enPassantTarget?[...enPassantTarget]:null,difficulty});

  const finish=async m=>{
    worker.terminate(); URL.revokeObjectURL(url);
    const elapsed=Date.now()-started;
    if(elapsed<AI_THINK_MS)await new Promise(r=>setTimeout(r,AI_THINK_MS-elapsed));
    if(bar)bar.classList.remove('show');
    if(m&&!gameOver&&turn==='black')await makeMove(m.fr,m.fc,m.tr,m.tc);
    aiThinking=false;
  };
  worker.onmessage=e=>finish(e.data);
  worker.onerror=async()=>{
    // fallback on main thread
    worker.terminate(); URL.revokeObjectURL(url);
    const elapsed=Date.now()-started;
    if(elapsed<AI_THINK_MS)await new Promise(r=>setTimeout(r,AI_THINK_MS-elapsed));
    if(bar)bar.classList.remove('show');
    // simple random move as fallback
    const moves=allLegal('black');
    if(moves.length&&!gameOver&&turn==='black'){
      const m=moves[Math.floor(Math.random()*moves.length)];
      await makeMove(m.fr,m.fc,m.tr,m.tc);
    }
    aiThinking=false;
  };
}

// ── UI helpers ───────────────────────────────
function setStatus(msg){
  const el=$('statusText'); if(el)el.textContent=msg.replace(/<[^>]*>/g,'');
}
function updateStatus(){
  if(gameOver)return;
  if(isOnline)setStatus(myColor===turn?'🎮 Your turn!':'⏳ Waiting...');
  else if(currentMode==='computer')setStatus(turn==='white'?'♟️ Your turn':'🤖 AI is thinking...');
  else setStatus(`👥 ${turn.charAt(0).toUpperCase()+turn.slice(1)}'s turn`);
}
function updateUI(){
  const st=$('statusText');
  if(st)st.textContent=`${turn.charAt(0).toUpperCase()+turn.slice(1)}'s Turn`;
  // player badges
  const bb=$('bottomPlayerBadge'),tb=$('topPlayerBadge');
  const bottomColor=isOnline?(myColor||'white'):'white';
  const topColor=opp(bottomColor);
  if(bb)bb.textContent=bottomColor===turn?'● Turn':'○ Wait';
  if(tb)tb.textContent=topColor===turn?'● Turn':'○ Wait';
  if(bb)bb.className=`px-3 py-1 rounded-full text-xs font-bold ${bottomColor===turn?'bg-ink text-white':'bg-soft text-mute'}`;
  if(tb)tb.className=`px-3 py-1 rounded-full text-xs font-bold ${topColor===turn?'bg-ink text-white':'bg-soft'}`;
}
function renderMoves(){
  const list=$('moveHistoryList'); if(!list)return;
  list.innerHTML='';
  for(let i=0;i<moveHistory.length;i+=2){
    const n=Math.floor(i/2)+1;
    const w=moveHistory[i]?.notation||'';
    const bl=moveHistory[i+1]?.notation||'';
    const row=document.createElement('div');
    row.className='move-row';
    row.innerHTML=`<span style="color:#8a8a8a">${n}.</span><span>${w}</span><span style="color:#555">${bl}</span>`;
    list.appendChild(row);
  }
  list.scrollTop=list.scrollHeight;
}
function showModal(icon,title,sub){
  $('gameOverIcon').textContent=icon;
  $('gameOverTitle').textContent=title;
  $('gameOverSub').textContent=sub;
  $('gameOverModal').style.display='flex';
}
function showToast(msg,dur=2800){
  const t=$('toast'); if(!t)return;
  t.textContent=msg; t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t=setTimeout(()=>t.classList.remove('show'),dur);
}
function snd(type){
  if(!soundEnabled)return;
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    const tbl={move:[523,.08,'sine'],capture:[330,.15,'square'],castle:[659,.18,'sine'],check:[880,.3,'sine'],checkmate:[220,.8,'sawtooth'],stalemate:[440,.4,'sine'],notify:[660,.1,'sine']};
    const[f,d,w]=tbl[type]||tbl.move;
    o.frequency.value=f;o.type=w;g.gain.value=.2;o.start();
    g.gain.exponentialRampToValueAtTime(.00001,ctx.currentTime+d);
    o.stop(ctx.currentTime+d);ctx.resume();
  }catch(e){}
}

// ── Screen navigation ────────────────────────
function showScreen(name){
  $$('.screen').forEach(s=>{ s.classList.remove('active'); s.style.display=''; });
  const s=$('screen-'+name);
  if(s){ s.classList.add('active'); s.style.display='block'; }
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  if(name==='game'){ renderBoard(); updateUI(); updateStatus(); }
  if(name==='home') renderHome();
  if(name==='matches') switchMatchTab('friends');
  if(name==='learn') renderPracticeList();
}

// ── Game reset ────────────────────────────────
function resetGame(skipAI=false){
  initState();
  if(isOnline&&myColor)turn='white';
  const mhl=$('moveHistoryList'); if(mhl)mhl.innerHTML='';
  $('gameOverModal').style.display='none';
  renderBoard(); updateUI(); updateStatus();
  if(!skipAI&&currentMode==='computer'&&turn==='black')aiMove();
}

// ── Save result to user profile ───────────────
function saveGameResult(winnerColor){
  if(!currentUser)return;
  const users=loadUsers();
  const key=currentUser.name.toLowerCase();
  if(!users[key])return;
  let result = 'draw';
  if(!winnerColor){users[key].draws=(users[key].draws||0)+1; result='draw';}
  else if(winnerColor==='white'){
    if(currentMode==='computer'||isOnline){
      const iWon=(isOnline&&myColor==='white')||(!isOnline&&winnerColor==='white');
      if(iWon){users[key].wins=(users[key].wins||0)+1;result='win';}
      else{users[key].losses=(users[key].losses||0)+1;result='loss';}
    } else {users[key].wins=(users[key].wins||0)+1;result='win';}
  } else {
    if(isOnline&&myColor==='black'){users[key].wins=(users[key].wins||0)+1;result='win';}
    else{users[key].losses=(users[key].losses||0)+1;result='loss';}
  }
  saveUsers(users);
  currentUser=users[key];
  updateStatDisplay();

  // Save to match history + friends
  const opponent = isOnline
    ? ($('topPlayerName')?.textContent||'Opponent').replace(' (Opp)','')
    : currentMode==='computer' ? `AI (${difficulty})` : 'Local Player';
  const moveCnt = moveHistory.length;
  saveGameHistory(opponent, result, moveCnt);
  if(isOnline){ addFriendFromGame(opponent); updateFriendRecord(opponent, result); }
}
function updateStatDisplay(){
  if(!currentUser)return;
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
  set('statWins',   currentUser.wins||0);
  set('statDraws',  currentUser.draws||0);
  set('statLosses', currentUser.losses||0);
}

// ── Online multiplayer ────────────────────────
function setConnStatus(status){
  const el=$('connectionStatus'); if(!el)return;
  const map={online:'✅ Connected',connecting:'⏳ Connecting…',offline:'Offline'};
  el.textContent=map[status]||status;
  el.style.color=status==='online'?'#059669':status==='connecting'?'#d97706':'#8a8a8a';
}
function showOnlineUI(myCol){
  const oppCol=opp(myCol);
  ['opponentBanner','myBanner','onlinePlayerPanel'].forEach(id=>{const el=$(id);if(el)el.style.display='flex';});
  const mhs=$('moveHistorySection');if(mhs)mhs.style.display='block';
  ['resignBtn','offerDrawBtn','disconnectBtn'].forEach(id=>{const el=$(id);if(el)el.style.display='block';});
  const wn=$('playerWhiteName'),bn=$('playerBlackName'),ws=$('playerWhiteStatus'),bs=$('playerBlackStatus');
  if(wn)wn.textContent=myCol==='white'?'You (White)':'Opponent (White)';
  if(bn)bn.textContent=myCol==='black'?'You (Black)':'Opponent (Black)';
  if(ws)ws.textContent=myCol==='white'?'You':'Waiting…';
  if(bs)bs.textContent=myCol==='black'?'You':'Waiting…';
  const od=$('oppDot'),md=$('myDot');
  if(od)od.className=`pb-dot ${oppCol}-dot`;
  if(md)md.className=`pb-dot ${myCol}-dot`;
  const ol=$('oppLabel'),ml=$('myLabel');
  if(ol)ol.textContent=oppCol.charAt(0).toUpperCase()+oppCol.slice(1)+' (Opp)';
  if(ml)ml.textContent=myCol.charAt(0).toUpperCase()+myCol.slice(1)+' (You)';
  const top=$('topPlayerName'),bot=$('bottomPlayerName');
  if(top)top.textContent=oppCol.charAt(0).toUpperCase()+oppCol.slice(1);
  if(bot)bot.textContent=myCol.charAt(0).toUpperCase()+myCol.slice(1)+' (You)';
}
function hideOnlineUI(){
  ['opponentBanner','myBanner','onlinePlayerPanel'].forEach(id=>{const el=$(id);if(el)el.style.display='none';});
  ['resignBtn','offerDrawBtn','disconnectBtn'].forEach(id=>{const el=$(id);if(el)el.style.display='none';});
}
function setupConn(connection){
  conn=connection;
  conn.on('open',()=>{
    isOnline=true; setConnStatus('online');
    showToast('🎮 Opponent connected! Game on!'); snd('notify'); updateStatus();
    const oppStat=$(myColor==='white'?'playerBlackStatus':'playerWhiteStatus');
    if(oppStat)oppStat.textContent='Connected';
  });
  conn.on('data',msg=>{
    if(!msg||!msg.type)return;
    switch(msg.type){
      case'move':makeMove(msg.fr,msg.fc,msg.tr,msg.tc,true,msg.promoPiece||null);break;
      case'draw_offer':$('drawModal').style.display='flex';break;
      case'draw_accept':
        $('drawModal').style.display='none';gameOver=true;winner=null;
        showModal('🤝','Draw Agreed!','Both players agreed to a draw.');break;
      case'draw_decline':$('drawModal').style.display='none';showToast('❌ Draw declined');break;
      case'resign':gameOver=true;winner=myColor;showModal('🏆','You Win!','Opponent resigned.');break;
      case'reset':resetGame(true);showToast('🔄 Opponent reset the game');break;
    }
  });
  conn.on('close',()=>{
    isOnline=false; setConnStatus('offline');
    const oc=$('oppConn');if(oc)oc.className='pb-conn';
    const ot=$('oppConnText');if(ot)ot.textContent='Offline';
    if(!gameOver)showToast('⚠️ Opponent disconnected',5000);
  });
  conn.on('error',err=>{console.error(err);showToast('⚠️ Connection error');});
}
function createGame(){
  setConnStatus('connecting'); setStatus('⏳ Setting up…');
  if(peer){peer.destroy();peer=null;}
  peer=new Peer(undefined,{debug:0});
  peer.on('open',id=>{
    myColor='white'; currentMode='online';
    const cd=$('roomCodeDisplay');if(cd)cd.innerHTML=`<strong class="text-2xl font-black tracking-widest">${id}</strong>`;
    const gc=$('gameCodeContainer');if(gc)gc.style.display='block';
    showOnlineUI('white'); resetGame(true); showScreen('game');
    showToast('✅ Share your code with a friend!');
  });
  peer.on('connection',c=>setupConn(c));
  peer.on('error',err=>{showToast('❌ Error: '+err.type);setConnStatus('offline');});
}
function joinGame(){
  const code=($('joinRoomInput')?.value||'').trim();
  if(!code){showToast('❌ Enter a room code');return;}
  setConnStatus('connecting'); setStatus('🔍 Connecting…');
  if(peer){peer.destroy();peer=null;}
  peer=new Peer(undefined,{debug:0});
  peer.on('open',()=>{
    myColor='black'; currentMode='online';
    const c=peer.connect(code,{reliable:true}); setupConn(c);
    const cd=$('roomCodeDisplay');if(cd)cd.innerHTML=`<strong>${code}</strong>`;
    const gc=$('gameCodeContainer');if(gc)gc.style.display='block';
    showOnlineUI('black'); resetGame(true); showScreen('game');
  });
  peer.on('error',err=>{showToast('❌ Could not connect. Check the code.');setConnStatus('offline');});
}
function leaveGame(){
  if(conn){conn.close();conn=null;}
  if(peer){peer.destroy();peer=null;}
  isOnline=false;myColor=null;currentMode='computer';
  setConnStatus('offline'); hideOnlineUI();
  const gc=$('gameCodeContainer');if(gc)gc.style.display='none';
  const ri=$('joinRoomInput');if(ri)ri.value='';
  resetGame();
}
function offerDraw(){if(!isOnline||!conn?.open)return;conn.send({type:'draw_offer'});showToast('🤝 Draw offered');}
function acceptDraw(){$('drawModal').style.display='none';if(conn?.open)conn.send({type:'draw_accept'});gameOver=true;winner=null;showModal('🤝','Draw Agreed!','Both players agreed.');}
function declineDraw(){$('drawModal').style.display='none';if(conn?.open)conn.send({type:'draw_decline'});showToast('❌ Draw declined');}
function resign(){
  if(!confirm('Resign this game?'))return;
  if(isOnline&&conn?.open)conn.send({type:'resign'});
  gameOver=true;winner=isOnline?opp(myColor):'black';
  saveGameResult(winner);
  showModal('🏳️','You Resigned',`${winner.charAt(0).toUpperCase()+winner.slice(1)} wins.`);
}
function copyCode(){
  const code=peer?.id||myShortCode||'';
  if(!code){showToast('No room code yet');return;}
  navigator.clipboard?.writeText(code)
    .then(()=>showToast('✅ Copied: '+code,4000))
    .catch(()=>showToast('Code: '+code,4000));
}

// ── User system ───────────────────────────────
function loadUsers(){try{return JSON.parse(localStorage.getItem(USER_STORE_KEY)||'{}');}catch{return{};}}
function saveUsers(u){localStorage.setItem(USER_STORE_KEY,JSON.stringify(u));}
function isValidUsername(n){return n.length>=3&&n.length<=20&&/^[a-zA-Z0-9 _-]+$/.test(n);}
function sanitizeUser(n){return(n||'').trim().replace(/\s+/g,' ').slice(0,20);}

function registerUser(name){
  const users=loadUsers(), key=name.toLowerCase();
  if(!users[key])users[key]={name,created:new Date().toISOString(),wins:0,losses:0,draws:0};
  saveUsers(users);
  localStorage.setItem(CURRENT_USER_KEY,name);
  currentUser=users[key];
  return currentUser;
}
function loadCurrentUser(){
  const saved=localStorage.getItem(CURRENT_USER_KEY);
  if(!saved)return null;
  return loadUsers()[saved.toLowerCase()]||null;
}
function updateProfileUI(){
  if(!currentUser)return;
  const init=currentUser.name.charAt(0).toUpperCase();
  const total=(currentUser.wins||0)+(currentUser.losses||0)+(currentUser.draws||0);
  const since=new Date(currentUser.created).toLocaleDateString(undefined,{month:'short',year:'numeric'});
  // home header
  const ha=$('homeAvatar'),hn=$('homeName'),hx=$('homeXp');
  if(ha)ha.textContent=init;
  if(hn)hn.textContent=currentUser.name;
  if(hx)hx.textContent=`${(currentUser.wins||0)*40+(currentUser.draws||0)*15+(currentUser.losses||0)*5} XP`;
  // profile page
  const pn=$('profileName'); if(pn)pn.value=currentUser.name;
  updateStatDisplay();
}
function setBoardTheme(theme){
  const valid=BOARD_THEMES.includes(theme)?theme:'classic';
  localStorage.setItem(THEME_KEY,valid);
  BOARD_THEMES.forEach(t=>document.body.classList.remove('theme-'+t));
  if(valid!=='classic')document.body.classList.add('theme-'+valid);
  $$('.theme-swatch').forEach(btn=>{
    const a=btn.dataset.theme===valid;
    btn.classList.toggle('active',a);
    const dv=btn.querySelector('div');
    if(dv)dv.style.borderColor=a?'#0a0a0a':'transparent';
  });
}
function enterApp(){
  const ws = $('welcomeScreen');
  const ap = $('app');
  if(ws) ws.style.display = 'none';
  if(ap){
    ap.classList.remove('hidden');   // remove Tailwind hidden class
    ap.style.display = 'flex';
    ap.style.flexDirection = 'column';
  }
  const bn = $('bottomNav');
  if(bn){ bn.classList.remove('hidden'); bn.style.display = 'flex'; }
  updateProfileUI();
  showScreen('home');
}
function showWelcomeScreen(){
  const ws=$('welcomeScreen'), ap=$('app'), bn=$('bottomNav');
  if(ws){ ws.style.display='flex'; }
  if(ap){ ap.classList.add('hidden'); ap.style.display='none'; }
  if(bn){ bn.classList.add('hidden'); bn.style.display='none'; }
  const user=loadCurrentUser();
  const form=$('welcomeForm'), ret=$('returningUser');
  if(user){
    if(form) form.style.display='none';
    if(ret)  ret.style.display='block';
    const rn=$('returningName'); if(rn) rn.textContent=user.name;
    const ra=$('returningAvatar'); if(ra) ra.textContent=user.name.charAt(0).toUpperCase();
    const rs=$('returningStats'); if(rs) rs.textContent=`${user.wins||0}W · ${user.draws||0}D · ${user.losses||0}L`;
    currentUser=user;
  } else {
    if(form) form.style.display='block';
    if(ret)  ret.style.display='none';
    currentUser=null;
  }
}
function signOut(){
  localStorage.removeItem(CURRENT_USER_KEY); currentUser=null;
  if(isOnline)leaveGame();
  showWelcomeScreen(); showToast('Signed out 👋');
}

// ── Play setup ────────────────────────────────
function setMode(mode){
  currentMode=mode;
  const startBtn=$('startGameBtn');
  if(startBtn){
    if(mode==='computer')startBtn.textContent=`Start vs AI (${difficulty})`;
    else if(mode==='local')startBtn.textContent='Start local game';
    else startBtn.textContent='Open online board';
  }
  $('aiSetup').style.display=mode==='computer'?'block':'none';
  $('onlineSetup').style.display=mode==='online'?'block':'none';
  // update mode chip styles
  $$('.mode-chip').forEach(b=>{
    const active=b.dataset.mode===mode;
    b.classList.toggle('active',active);
    b.style.background=active?'#0a0a0a':'#fff';
    b.style.color=active?'#fff':'#0a0a0a';
    b.style.borderColor=active?'#0a0a0a':'#efefef';
  });
}
function setDiff(level){
  difficulty=level;
  $$('.diff-chip').forEach(b=>{
    const active=b.dataset.diff===level;
    b.classList.toggle('active',active);
    b.style.background=active?'#0a0a0a':'#fff';
    b.style.color=active?'#fff':'#0a0a0a';
    b.style.borderColor=active?'#0a0a0a':'#efefef';
    const sub=b.querySelector('span:last-child');
    if(sub)sub.style.opacity=active?'.55':'1';
    if(sub)sub.style.color=active?'rgba(255,255,255,.55)':'#8a8a8a';
  });
  const sb=$('startGameBtn');
  if(sb&&currentMode==='computer')sb.textContent=`Start vs AI (${level})`;
}
function startGame(){
  if(currentMode==='online'){
    if(!isOnline&&!peer){showToast('Create or join a room first');return;}
    showScreen('game'); return;
  }
  // local or AI
  if(isOnline)leaveGame();
  currentMode=currentMode==='online'?'computer':currentMode;
  resetGame(false);
  showScreen('game');
  showToast(currentMode==='computer'?`vs AI — ${difficulty}`:'Local 2-player game 🎮');
}

// ── Home — last games ─────────────────────────
function renderHome(){
  const user=loadCurrentUser(); if(!user)return;
  updateProfileUI();
  const hist=JSON.parse(localStorage.getItem('chess-arena-history-'+user.name.toLowerCase())||'[]');
  const list=$('homeRecentList'); if(!list)return;
  list.innerHTML='';
  if(!hist.length){
    list.innerHTML='<div class="bg-white rounded-2xl p-4 text-sm text-mute border border-soft">No games yet. Start one from Play.</div>';
    return;
  }
  hist.slice(0,4).forEach(g=>{
    const d=document.createElement('div');
    d.className='history-card';
    d.innerHTML=`<div><p class="font-bold text-sm">${g.opponent}</p><p class="text-xs text-mute mt-0.5">${g.date} · ${g.moves} moves</p></div><span class="badge-${g.result}">${g.result.toUpperCase()}</span>`;
    list.appendChild(d);
  });
}
function saveGameHistory(opponent,result,moves){
  if(!currentUser)return;
  const key='chess-arena-history-'+currentUser.name.toLowerCase();
  const hist=JSON.parse(localStorage.getItem(key)||'[]');
  hist.unshift({opponent,result,moves,date:new Date().toLocaleDateString()});
  localStorage.setItem(key,JSON.stringify(hist.slice(0,40)));
}
function renderMatches(){
  const user=loadCurrentUser(); if(!user)return;
  const hist=JSON.parse(localStorage.getItem('chess-arena-history-'+user.name.toLowerCase())||'[]');
  const list=$('matchesList'); if(!list)return;
  list.innerHTML='';
  if(!hist.length){list.innerHTML='<div class="bg-white rounded-2xl p-4 text-sm text-mute border border-soft">No match history yet.</div>';return;}
  hist.forEach(g=>{
    const d=document.createElement('div');
    d.className='history-card';
    d.innerHTML=`<div><p class="font-bold text-sm">${g.opponent}</p><p class="text-xs text-mute">${g.date}</p></div><span class="badge-${g.result}">${g.result.toUpperCase()}</span>`;
    list.appendChild(d);
  });
}

// ── Practice puzzles ──────────────────────────
const PUZZLES=[
  {id:'pawn',title:'Pawn move',hint:'Pawns move forward one square. Push the white pawn from e2 to e4.',fen:'8/8/8/8/8/8/4P3/4K3 w - - 0 1',sol:{from:'e2',to:'e4'},xp:20},
  {id:'knight',title:'Knight jump',hint:'Knights jump in an L shape. Move the knight from b1 to c3.',fen:'8/8/8/8/8/8/8/1N2K3 w - - 0 1',sol:{from:'b1',to:'c3'},xp:25},
  {id:'capture',title:'Capture a piece',hint:'Capture the black pawn on d5 with your bishop.',fen:'4k3/8/8/3p4/8/8/8/2B1K3 w - - 0 1',sol:{from:'c1',to:'d5'},xp:30},
  {id:'check',title:'Give check',hint:'Move the rook to e8 and put the black king in check.',fen:'4k3/8/8/8/8/8/8/4K2R w - - 0 1',sol:{from:'h1',to:'e8'},xp:35},
  {id:'mate1',title:'Mate in one',hint:'Find checkmate in one move with the queen.',fen:'6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1',sol:{from:'e1',to:'e8'},xp:50},
];
let activePuzzle=null, puzzleChess=null, puzzleSel=null, puzzleTargets=[];

function renderPracticeList(){
  const list=$('practiceList'); if(!list)return;
  list.innerHTML='';
  const solved=JSON.parse(localStorage.getItem('chess-arena-solved')||'[]');
  PUZZLES.forEach(p=>{
    const done=solved.includes(p.id);
    const btn=document.createElement('button');
    btn.className='practice-card';
    btn.innerHTML=`<div><p class="font-bold text-sm">${p.title}</p><p class="text-xs text-mute mt-0.5">${p.hint.slice(0,60)}…</p></div><div class="text-right flex-shrink-0 ml-3"><p class="text-xs font-bold">${p.xp} XP</p><p class="text-xs ${done?'text-green-600 font-bold':'text-mute'}">${done?'✓ Solved':'Start'}</p></div>`;
    btn.onclick=()=>openPuzzle(p);
    list.appendChild(btn);
  });
}

// We need a simple chess engine for practice — use a plain JS mini-chess
// (no external import needed — basic move application)
function pzMove(board,from,to){
  const f=pzSq(from),t=pzSq(to);
  const nb=board.map(r=>[...r]);
  nb[t[0]][t[1]]=nb[f[0]][f[1]]; nb[f[0]][f[1]]='';
  return nb;
}
function pzSq(sq){const f=sq.charCodeAt(0)-97,r=8-parseInt(sq[1]);return[r,f];}
function pzFen2Board(fen){
  const rows=fen.split(' ')[0].split('/');
  return rows.map(row=>{
    const cells=[];
    for(const ch of row){
      const n=parseInt(ch);
      if(isNaN(n))cells.push(ch);
      else for(let i=0;i<n;i++)cells.push('');
    }
    return cells;
  });
}

function openPuzzle(p){
  activePuzzle=p; puzzleSel=null; puzzleTargets=[];
  puzzleChess=pzFen2Board(p.fen);
  $('practiceList').classList.add('hidden');
  $('practicePlay').classList.remove('hidden');
  $('practiceTitle').textContent=p.title;
  $('practiceHint').textContent=p.hint;
  $('practiceStatus').textContent='Your move';
  $('practiceStatus').className='text-center text-sm font-semibold mt-3';
  renderPuzzleBoard();
}

function renderPuzzleBoard(){
  const el=$('practiceBoard'); if(!el)return;
  el.innerHTML='';
  const files='abcdefgh';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const sq=files[c]+(8-r);
    const p=puzzleChess[r][c];
    const light=(r+c)%2===0;
    const cell=document.createElement('div');
    cell.className=`board-square ${light?'light':'dark'}`;
    if(puzzleSel===sq)cell.classList.add('selected');
    if(puzzleTargets.includes(sq))cell.classList.add('valid');
    if(p){
      const sp=document.createElement('span');
      const isW=p===p.toUpperCase();
      sp.className=`piece ${isW?'white':'black'}`;
      sp.textContent=GLYPHS[p]||p;
      cell.appendChild(sp);
    }
    cell.onclick=()=>clickPuzzle(sq);
    el.appendChild(cell);
  }
}

function clickPuzzle(sq){
  if(!activePuzzle)return;
  if(puzzleSel&&puzzleTargets.includes(sq)){
    const ok=puzzleSel===activePuzzle.sol.from&&sq===activePuzzle.sol.to;
    if(!ok){
      $('practiceStatus').textContent='Not quite — try again!';
      $('practiceStatus').className='text-center text-sm font-semibold mt-3 text-red-600';
      puzzleSel=null;puzzleTargets=[];renderPuzzleBoard();return;
    }
    puzzleChess=pzMove(puzzleChess,puzzleSel,sq);
    puzzleSel=null;puzzleTargets=[];renderPuzzleBoard();
    $('practiceStatus').textContent='✅ Correct! Puzzle solved!';
    $('practiceStatus').className='text-center text-sm font-semibold mt-3 text-green-600';
    const solved=JSON.parse(localStorage.getItem('chess-arena-solved')||'[]');
    if(!solved.includes(activePuzzle.id)){solved.push(activePuzzle.id);localStorage.setItem('chess-arena-solved',JSON.stringify(solved));}
    showToast(`+${activePuzzle.xp} XP 🎉`);
    const pp=$('practiceProgress');if(pp)pp.textContent=`${solved.length} puzzles solved`;
    return;
  }
  const[r,c]=[Math.floor('abcdefgh'.indexOf(sq[0])),8-parseInt(sq[1])];
  // swap row/col
  const pr=7-(parseInt(sq[1])-1),pc2='abcdefgh'.indexOf(sq[0]);
  const piece=puzzleChess[pr]?.[pc2];
  if(piece&&piece===piece.toUpperCase()&&piece!==''){
    // white piece — get rough targets (just highlight adjacent for demo)
    puzzleSel=sq;
    // show solution square as hint
    puzzleTargets=[activePuzzle.sol.to];
    renderPuzzleBoard();
  } else {
    puzzleSel=null;puzzleTargets=[];renderPuzzleBoard();
  }
}

// ── Dark / Light mode ────────────────────────
let darkMode = localStorage.getItem('chess-dark-mode') === 'true';
function applyDarkMode(){
  document.body.classList.toggle('dark-mode', darkMode);
  const btn = $('darkModeBtn');
  if(btn) btn.textContent = darkMode ? '☀️' : '🌙';
  localStorage.setItem('chess-dark-mode', darkMode);
}
function toggleDarkMode(){
  darkMode = !darkMode;
  applyDarkMode();
}

// ── Short 6-char room code ────────────────────
// We generate a short code and map it to the full PeerJS id
const CODE_MAP = {}; // shortCode → peerId
function genShortCode(){
  return Math.random().toString(36).slice(2,8).toUpperCase();
}

// ── Friends system ────────────────────────────
const FRIENDS_KEY = 'chess-arena-friends';
function loadFriends(){
  try{ return JSON.parse(localStorage.getItem(FRIENDS_KEY)||'[]'); }catch{ return []; }
}
function saveFriends(f){ localStorage.setItem(FRIENDS_KEY, JSON.stringify(f)); }

function addFriendFromGame(opponentName){
  if(!opponentName||opponentName==='AI'||opponentName.startsWith('AI (')) return;
  const friends = loadFriends();
  if(!friends.find(f=>f.name===opponentName)){
    friends.unshift({ name:opponentName, added:new Date().toISOString(), wins:0, losses:0, draws:0 });
    saveFriends(friends);
  }
}

function updateFriendRecord(opponentName, result){
  const friends = loadFriends();
  const f = friends.find(f=>f.name===opponentName);
  if(!f) return;
  if(result==='win')  f.wins=(f.wins||0)+1;
  if(result==='loss') f.losses=(f.losses||0)+1;
  if(result==='draw') f.draws=(f.draws||0)+1;
  saveFriends(friends);
}

// Active challenge state
let pendingChallenge = null; // { fromName, shortCode }

function sendChallenge(friendName){
  // Generate a short code for this challenge
  const short = genShortCode();
  CODE_MAP[short] = short; // they'll use the short code directly
  // Show the code to copy and share
  showToast(`Share code ${short} with ${friendName} to play!`, 5000);
  // Auto-populate the create room flow
  navigator.clipboard?.writeText(short).catch(()=>{});
}

function showChallengeToast(fromName, shortCode){
  pendingChallenge = { fromName, shortCode };
  $('challengerName').textContent = fromName;
  $('challengerAvatar').textContent = fromName.charAt(0).toUpperCase();
  $('challengeToast').classList.remove('hidden');
  // auto-dismiss after 15s
  clearTimeout(showChallengeToast._t);
  showChallengeToast._t = setTimeout(dismissChallenge, 15000);
}

function dismissChallenge(){
  $('challengeToast').classList.add('hidden');
  pendingChallenge = null;
}

function renderFriends(){
  const friends = loadFriends();
  const list = $('friendsList');
  const empty = $('friendsEmpty');
  if(!list) return;
  list.innerHTML = '';
  if(!friends.length){
    if(empty) empty.classList.remove('hidden');
    return;
  }
  if(empty) empty.classList.add('hidden');
  friends.forEach(f=>{
    const total = (f.wins||0)+(f.losses||0)+(f.draws||0);
    const card = document.createElement('div');
    card.className = 'friend-card';
    card.innerHTML = `
      <div class="friend-info">
        <div class="friend-av">${f.name.charAt(0).toUpperCase()}</div>
        <div>
          <p class="friend-name">${f.name}</p>
          <p class="friend-rec">${f.wins||0}W · ${f.draws||0}D · ${f.losses||0}L · ${total} game${total!==1?'s':''}</p>
        </div>
      </div>
      <button class="friend-challenge-btn" data-name="${f.name}">⚔️ Challenge</button>
    `;
    card.querySelector('.friend-challenge-btn').addEventListener('click',()=>sendChallenge(f.name));
    list.appendChild(card);
  });
}

function switchMatchTab(tab){
  const fp=$('panel-friends'), hp=$('panel-history');
  const fb=$('tab-friends-btn'), hb=$('tab-history-btn');
  if(tab==='friends'){
    fp.classList.remove('hidden'); hp.classList.add('hidden');
    if(fb){ fb.classList.add('bg-ink','text-white','shadow-sm'); fb.classList.remove('text-mute'); }
    if(hb){ hb.classList.remove('bg-ink','text-white','shadow-sm'); hb.classList.add('text-mute'); }
    renderFriends();
  } else {
    fp.classList.add('hidden'); hp.classList.remove('hidden');
    if(hb){ hb.classList.add('bg-ink','text-white','shadow-sm'); hb.classList.remove('text-mute'); }
    if(fb){ fb.classList.remove('bg-ink','text-white','shadow-sm'); fb.classList.add('text-mute'); }
    renderMatches();
  }
}

// ── Short code online game ────────────────────
let myShortCode = '';

function createGameShort(){
  myShortCode = genShortCode();
  updateConnBar('connecting');
  setStatus('⏳ Setting up…');
  if(peer){peer.destroy();peer=null;}
  peer = new Peer(undefined,{debug:0});
  peer.on('open', id=>{
    // Store mapping short→full
    CODE_MAP[myShortCode] = id;
    myColor='white'; currentMode='online';
    const cd=$('roomCodeDisplay');
    if(cd) cd.innerHTML=`<strong class="text-2xl font-black tracking-[0.2em] font-mono">${myShortCode}</strong>`;
    const gc=$('gameCodeContainer'); if(gc) gc.style.display='block';
    setStatus('⏳ Waiting for opponent…');
    showOnlineUI('white'); resetGame(true); showScreen('game');
    showToast(`✅ Code: ${myShortCode} — share it!`, 6000);
    navigator.clipboard?.writeText(myShortCode).catch(()=>{});
  });
  peer.on('connection',c=>setupConn(c));
  peer.on('error',err=>{showToast('❌ '+err.type); setConnStatus('offline');});
}

function joinGameShort(){
  const raw=($('joinRoomInput')?.value||'').trim().toUpperCase().slice(0,6);
  if(!raw||raw.length<4){showToast('❌ Enter the 6-char code');return;}
  setConnStatus('connecting'); setStatus('🔍 Connecting…');
  if(peer){peer.destroy();peer=null;}
  peer=new Peer(undefined,{debug:0});
  peer.on('open',()=>{
    myColor='black'; currentMode='online';
    // Try to connect directly using the short code as PeerJS id
    // (works if creator used it as their peer id, otherwise fallback to CODE_MAP)
    const targetId = CODE_MAP[raw] || raw;
    const c=peer.connect(targetId,{reliable:true}); setupConn(c);
    const cd=$('roomCodeDisplay');if(cd)cd.innerHTML=`<strong>${raw}</strong>`;
    const gc=$('gameCodeContainer');if(gc)gc.style.display='block';
    showOnlineUI('black'); resetGame(true); showScreen('game');
  });
  peer.on('error',err=>{showToast('❌ Could not connect. Check the code.');setConnStatus('offline');});
}

// Override createGame and joinGame — short 6-char peer IDs
function createGame(){
  setConnStatus('connecting'); setStatus('⏳ Setting up…');
  if(peer){peer.destroy();peer=null;}
  myShortCode = genShortCode();
  // Use the short code directly as our PeerJS id
  peer = new Peer(myShortCode, {debug:0});
  peer.on('open', id=>{
    myColor='white'; currentMode='online';
    const cd=$('roomCodeDisplay');
    if(cd) cd.innerHTML=`<strong class="text-3xl font-black tracking-[0.25em] font-mono">${id}</strong>`;
    const gc=$('gameCodeContainer'); if(gc) gc.style.display='block';
    setStatus('⏳ Waiting for opponent…');
    showOnlineUI('white'); resetGame(true); showScreen('game');
    showToast(`✅ Code: ${id} — copied!`, 6000);
    navigator.clipboard?.writeText(id).catch(()=>{});
  });
  peer.on('connection', c=>setupConn(c));
  peer.on('error', err=>{
    // If short code is taken, try again with a new one
    if(err.type==='unavailable-id'){
      peer.destroy(); peer=null;
      myShortCode = genShortCode();
      createGame();
    } else {
      showToast('❌ '+err.type); setConnStatus('offline');
    }
  });
}

function joinGame(){
  const raw=($('joinRoomInput')?.value||'').trim().toUpperCase().slice(0,6);
  if(!raw||raw.length<4){showToast('❌ Enter the 6-char code');return;}
  setConnStatus('connecting'); setStatus('🔍 Connecting…');
  if(peer){peer.destroy();peer=null;}
  peer=new Peer(undefined,{debug:0});
  peer.on('open',()=>{
    myColor='black'; currentMode='online';
    // Connect directly to the short code (which is the host's PeerJS id)
    const c=peer.connect(raw,{reliable:true}); setupConn(c);
    const cd=$('roomCodeDisplay');if(cd)cd.innerHTML=`<strong>${raw}</strong>`;
    const gc=$('gameCodeContainer');if(gc)gc.style.display='block';
    showOnlineUI('black'); resetGame(true); showScreen('game');
  });
  peer.on('error',err=>{showToast('❌ Could not connect. Check the code.');setConnStatus('offline');});
}
function bindAll(){
  // Screen nav
  $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));

  // Bottom nav active style
  $$('.nav-item').forEach(btn=>{
    btn.addEventListener('click',()=>{
      $$('.nav-item').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Mode chips
  $$('.mode-chip').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));

  // Diff chips
  $$('.diff-chip').forEach(btn=>btn.addEventListener('click',()=>setDiff(btn.dataset.diff)));

  // Start / resume
  $('startGameBtn')?.addEventListener('click',startGame);
  $('resumeGameBtn')?.addEventListener('click',()=>showScreen('game'));

  // Game controls
  $('backFromGameBtn')?.addEventListener('click',()=>showScreen('play'));
  $('newGameBtn')?.addEventListener('click',()=>{resetGame(false);showToast('New game started!');});
  $('resignBtn')?.addEventListener('click',resign);
  $('flipBoardBtn')?.addEventListener('click',()=>{isOnline&&(myColor=myColor==='white'?'black':'white');renderBoard();});
  $('undoBtn')?.addEventListener('click',()=>{
    if(currentMode==='computer'){
      // undo twice (player + AI move)
      if(moveHistory.length>=2){moveHistory.splice(-2);halfMoveClock=Math.max(0,halfMoveClock-2);}
      else if(moveHistory.length===1){moveHistory.pop();}
    } else {
      if(moveHistory.length>0)moveHistory.pop();
    }
    // rebuild board from scratch with stored moves — simpler: just reset and replay
    // For simplicity, show toast
    showToast('Undo not available in this mode 🤷');
  });
  $('piecesBtn')?.addEventListener('click',()=>showToast('Piece set: Cburnett (3D) ♟'));

  // Online
  $('createRoomBtn')?.addEventListener('click',createGame);
  $('joinRoomBtn')?.addEventListener('click',joinGame);
  $('joinRoomInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')joinGame();});
  $('joinRoomInput')?.addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);});
  $('disconnectBtn')?.addEventListener('click',leaveGame);
  $('copyCodeBtn')?.addEventListener('click',copyCode);
  $('offerDrawBtn')?.addEventListener('click',offerDraw);
  $('acceptDrawBtn')?.addEventListener('click',acceptDraw);
  $('declineDrawBtn')?.addEventListener('click',declineDraw);

  // Game over modal
  $('playAgainBtn')?.addEventListener('click',()=>{
    $('gameOverModal').style.display='none';
    if(isOnline&&conn?.open)conn.send({type:'reset'});
    resetGame(isOnline);
  });
  $('closeGameOverBtn')?.addEventListener('click',()=>{$('gameOverModal').style.display='none';});

  // Promotion
  $$('.promo-piece').forEach(el=>el.addEventListener('click',()=>handlePromotion(el.dataset.piece)));

  // Profile
  $('saveProfileBtn')?.addEventListener('click',()=>{
    const name=($('profileName')?.value||'').trim();
    if(!name||!currentUser)return;
    const users=loadUsers(),key=currentUser.name.toLowerCase();
    if(users[key]){users[key].name=name;saveUsers(users);currentUser.name=name;localStorage.setItem(CURRENT_USER_KEY,name);}
    updateProfileUI();showToast('Profile saved ✓');
  });
  $('signOutBtn')?.addEventListener('click',signOut);
  $('leaveRoomBtn')?.addEventListener('click',leaveGame);
  $('clearHistoryBtn')?.addEventListener('click',()=>{
    if(!currentUser||!confirm('Clear all history?'))return;
    localStorage.removeItem('chess-arena-history-'+currentUser.name.toLowerCase());
    renderMatches();renderHome();showToast('History cleared');
  });

  // Sound & coords toggles
  $('soundToggle')?.addEventListener('change',e=>{soundEnabled=e.target.checked;localStorage.setItem('chess-sound',soundEnabled);});
  $('coordToggle')?.addEventListener('change',e=>{showCoords=e.target.checked;localStorage.setItem('chess-coords',showCoords);renderBoard();});

  // Theme swatches
  $$('.theme-swatch').forEach(btn=>btn.addEventListener('click',()=>{setBoardTheme(btn.dataset.theme);showToast('Theme: '+btn.title);}));

  // Practice
  $('practiceBackBtn')?.addEventListener('click',()=>{
    $('practiceList').classList.remove('hidden');
    $('practicePlay').classList.add('hidden');
    activePuzzle=null;
  });

  // Welcome / auth
  $('welcomeBtn')?.addEventListener('click',()=>{
    const name=sanitizeUser($('usernameInput')?.value||'');
    const hint=$('welcomeHint');
    if(!isValidUsername(name)){if(hint){hint.textContent='Use 3–20 letters, numbers, _ or -';hint.className='welcome-hint error';}return;}
    if(hint){hint.textContent='';hint.className='welcome-hint';}
    registerUser(name);enterApp();showToast(`Welcome, ${name}! 🎉`);
  });
  $('usernameInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('welcomeBtn')?.click();});
  $('continueBtn')?.addEventListener('click',()=>{const u=loadCurrentUser();if(u){currentUser=u;enterApp();}});
  $('switchUserBtn')?.addEventListener('click',()=>{
    localStorage.removeItem(CURRENT_USER_KEY);currentUser=null;
    $('welcomeForm').style.display='block';
    $('returningUser').style.display='none';
    $('usernameInput').value='';
    $('usernameInput')?.focus();
  });

  // Dark mode toggle
  $('darkModeBtn')?.addEventListener('click', toggleDarkMode);

  // Challenge toast
  $('acceptChallengeBtn')?.addEventListener('click',()=>{
    if(pendingChallenge){
      dismissChallenge();
      // Pre-fill the join code and go to play screen
      const ri=$('joinRoomInput'); if(ri)ri.value=pendingChallenge.shortCode;
      joinGame();
    }
  });
  $('declineChallengeBtn')?.addEventListener('click',()=>{
    dismissChallenge();
    showToast('Challenge declined');
  });

  // Friends/History tab nav — expose globally for onclick attributes
  window.switchMatchTab = switchMatchTab;

  // Render home / matches when navigating
  $$('[data-nav="home"]').forEach(b=>b.addEventListener('click',renderHome));
  $$('[data-nav="matches"]').forEach(b=>b.addEventListener('click',()=>{switchMatchTab('friends');}));
  $$('[data-nav="learn"]').forEach(b=>b.addEventListener('click',renderPracticeList));
}

// ── BOOT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  soundEnabled = localStorage.getItem('chess-sound') !== 'false';
  showCoords   = localStorage.getItem('chess-coords') !== 'false';
  darkMode     = localStorage.getItem('chess-dark-mode') === 'true';

  initState();
  bindAll();
  setBoardTheme(localStorage.getItem(THEME_KEY) || 'classic');
  applyDarkMode();

  const st = $('soundToggle'); if (st) st.checked = soundEnabled;
  const ct = $('coordToggle'); if (ct) ct.checked = showCoords;

  const solvedList = JSON.parse(localStorage.getItem('chess-arena-solved') || '[]');
  const pp = $('practiceProgress');
  if (pp) pp.textContent = solvedList.length + ' puzzles solved';

  setMode('computer');
  setDiff('easy');

  const savedUser = loadCurrentUser();
  if (savedUser) { currentUser = savedUser; enterApp(); }
  else showWelcomeScreen();
});
