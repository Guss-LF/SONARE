/* ══════════════════════════════════════════════════════════════════════
   SONARE · solver de level design
   ──────────────────────────────────────────────────────────────────────
   Para cada fase, enumera as configurações possíveis por número crescente
   de movimentos e devolve o mínimo necessário para fechar a rede.

   Serve para duas coisas:
     1. garantir que nenhuma fase seja impossível;
     2. definir o "par" de movimentos que vale 3 estrelas (ótimo + 1).

   Uso:  node solver.js
   ══════════════════════════════════════════════════════════════════════ */
'use strict';

/* ── Constantes espelhadas do jogo ──────────────────────────────────── */
const COLS = 5, ROWS = 6, CELL = 80, GX = 40, GY = 112;

const TYPES = { grave1:'large', grave2:'large',
                media1:'medium', media2:'medium', aguda:'small' };

/* alcance: 0 mudo · 1 vizinha · 2 +diagonal · 3 +2 casas */
const TIERS = [50, 86, 120, 165];
const TIER  = { small:1, medium:2, large:3 };

/* capacidade: quantos cabos cada sino aguenta */
const CAP   = { small:1, medium:2, large:3 };

const cx = c => GX + c * CELL + CELL / 2;
const cy = r => GY + r * CELL + CELL / 2;
const has = (arr, c, r) => arr.some(v => v[0] === c && v[1] === r);

/* O Sino Mestre e o inicio de tudo — nao existe "linha de base". Um sino
   so vira raiz se estiver dentro do alcance do proprio mestre, que tem
   posicao, alcance e capacidade proprios (igual a um sino grande).      */
const SM_CX = 240, SM_CY = 678, SM_RANGE = 170, SM_CAP = 3;

/* ── Fases (idênticas às do Sonare_teste.html) ────────────────────────── */
const LEVELS = [
 { nome:'1 · O Toque',   par:2, walls:[], damps:[], amps:[],
   bells:[{t:'grave1',c:2,r:2}] },

 { nome:'2 · Dois Sinos',par:3, walls:[], damps:[], amps:[],
   bells:[{t:'grave1',c:1,r:2},{t:'grave2',c:3,r:0}] },

 { nome:'3 · Tamanhos',  par:4, walls:[], damps:[], amps:[],
   bells:[{t:'aguda',c:0,r:0},{t:'media1',c:4,r:1},{t:'grave1',c:2,r:2}] },

 { nome:'4 · Capacidade',par:4, walls:[], damps:[], amps:[],
   bells:[{t:'grave1',c:2,r:5},
          {t:'aguda',c:0,r:0},{t:'aguda',c:4,r:0},
          {t:'grave2',c:0,r:1},{t:'media1',c:4,r:1},{t:'media2',c:2,r:0}] },

 { nome:'5 · Bloqueios', par:4,
   walls:[[0,3],[1,3],[3,3],[4,3],[0,1],[1,1],[3,1],[4,1],[2,2]], damps:[], amps:[],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},
          {t:'grave1',c:4,r:0},{t:'grave2',c:3,r:0}] },

 { nome:'6 · Sonare',    par:4,
   walls:[[0,2],[4,2],[2,4]], damps:[[1,4],[3,4]], amps:[[2,3]],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media1',c:4,r:0},
          {t:'media2',c:4,r:1},{t:'aguda',c:0,r:5}] },

 { nome:'7 · Ramificacao',par:5,
   walls:[[0,4],[1,4],[3,4],[4,4]], damps:[], amps:[],
   bells:[{t:'grave1',c:2,r:5},{t:'media1',c:0,r:0},{t:'media2',c:4,r:0},
          {t:'aguda',c:0,r:1},{t:'aguda',c:4,r:1},{t:'aguda',c:2,r:0}] },

 { nome:'8 · Labirinto', par:5,
   walls:[[0,1],[2,1],[4,1],[1,3],[3,3],[0,4],[4,4]], damps:[[1,1],[3,1]], amps:[],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media1',c:4,r:0},
          {t:'media2',c:2,r:0},{t:'aguda',c:0,r:3},{t:'aguda',c:4,r:3},{t:'aguda',c:2,r:2}] },

 { nome:'9 · Convergencia',par:5,
   walls:[[0,2],[1,2],[3,2],[4,2],[0,4],[1,4],[3,4],[4,4]], damps:[[2,2],[2,4]], amps:[[2,3]],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media1',c:4,r:0},
          {t:'media2',c:0,r:1},{t:'aguda',c:4,r:1},{t:'aguda',c:1,r:0},
          {t:'media1',c:3,r:1},{t:'aguda',c:2,r:0}] },

 /* ══ Capitulo 2 · Elo ══ */
 { nome:'10 · Primeiro Elo',par:4, walls:[],damps:[],amps:[],
   bells:[{t:'grave1',c:2,r:5},{t:'media1',c:1,r:2},{t:'media2',c:3,r:2},
          {t:'aguda',c:0,r:0},{t:'aguda',c:4,r:0}] },

 { nome:'11 · Cadeia Dupla',par:4, walls:[[2,2],[2,1]],damps:[],amps:[],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media1',c:4,r:0},
          {t:'media2',c:0,r:3},{t:'aguda',c:4,r:3},{t:'aguda',c:1,r:0}] },

 { nome:'12 · Contrapeso',par:4, walls:[[0,3],[4,3]],damps:[[1,3],[3,3]],amps:[[2,2]],
   bells:[{t:'grave1',c:2,r:5},{t:'media1',c:0,r:1},{t:'media2',c:4,r:1},
          {t:'aguda',c:2,r:0},{t:'aguda',c:0,r:4}] },

 { nome:'13 · Encruzilhada',par:5, walls:[[1,4],[3,4],[0,2],[4,2]],damps:[],amps:[],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media1',c:4,r:0},
          {t:'media2',c:0,r:3},{t:'aguda',c:4,r:3},{t:'aguda',c:2,r:1},{t:'aguda',c:2,r:0}] },

 { nome:'14 · Represa',par:5, walls:[[0,2],[1,2],[3,2],[4,2],[0,4],[4,4]],damps:[[2,3]],amps:[],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media1',c:4,r:0},
          {t:'media2',c:2,r:1},{t:'aguda',c:0,r:3},{t:'aguda',c:4,r:3},{t:'aguda',c:2,r:0}] },

 { nome:'15 · Simetria',par:5, walls:[[0,2],[4,2],[1,4],[3,4]],damps:[[1,3],[3,3]],amps:[[2,1]],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media2',c:4,r:0},
          {t:'media1',c:0,r:3},{t:'aguda',c:4,r:3},{t:'aguda',c:2,r:0},{t:'aguda',c:0,r:1}] },

 { nome:'16 · Cascata',par:5, walls:[[1,4],[3,4],[1,1],[3,1]],damps:[[0,2],[4,2]],amps:[[2,3]],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media1',c:4,r:0},
          {t:'media2',c:0,r:3},{t:'media1',c:4,r:3},{t:'aguda',c:2,r:1},{t:'aguda',c:2,r:0}] },

 { nome:'17 · No Duplo',par:5,
   walls:[[1,1],[3,1],[1,3],[3,3],[0,2],[4,2],[0,0],[4,0]],damps:[[2,1],[2,4]],amps:[[2,2]],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:1},{t:'media1',c:0,r:3},
          {t:'media2',c:4,r:3},{t:'aguda',c:2,r:0},{t:'aguda',c:0,r:4},{t:'aguda',c:4,r:4},{t:'aguda',c:4,r:1}] },

 { nome:'18 · No Cego',par:6, walls:[[1,2],[3,2],[0,4],[4,4],[1,0],[3,0]],damps:[[2,4]],amps:[],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:1},{t:'media1',c:4,r:1},
          {t:'media2',c:2,r:0},{t:'aguda',c:0,r:3},{t:'aguda',c:4,r:3},{t:'aguda',c:2,r:2},{t:'aguda',c:0,r:0}] },

 { nome:'19 · Fenda Final',par:5,
   walls:[[1,1],[3,1],[1,3],[3,3],[4,2],[0,4],[4,0]],damps:[],amps:[[2,2]],
   bells:[{t:'grave1',c:2,r:5},{t:'grave2',c:0,r:0},{t:'media1',c:4,r:0},
          {t:'media2',c:2,r:0},{t:'aguda',c:0,r:3},{t:'aguda',c:4,r:3},{t:'aguda',c:2,r:3}] },
];

/* ── Muro bloqueia a onda: interseção segmento × retângulo (Liang–Barsky) ── */
function segRect(x0, y0, x1, y1, rx, ry, rw, rh) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const p = [-dx, dx, -dy, dy];
  const q = [x0 - rx, rx + rw - x0, y0 - ry, ry + rh - y0];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else          { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}

/* ── Avaliação de uma configuração ──────────────────────────────────── */
function makeEval(L) {
  const blocked = (x0, y0, x1, y1) => L.walls.some(w =>
    segRect(x0, y0, x1, y1, GX + w[0]*CELL + 12, GY + w[1]*CELL + 12, CELL - 24, CELL - 24));

  const aura = (bell, pos) => {
    let t = TIER[TYPES[bell.t]];
    if (has(L.damps, pos.c, pos.r)) t--;
    if (has(L.amps,  pos.c, pos.r)) t++;
    return TIERS[Math.max(0, Math.min(3, t))];
  };

  /* válida = todos alcançados E nenhum sino com mais cabos do que aguenta */
  return function connected(pos) {
    const n = pos.length;

    /* 1. carga: conta os cabos ligados a cada sino */
    const deg = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const ax = cx(pos[i].c), ay = cy(pos[i].r);
      const bx = cx(pos[j].c), by = cy(pos[j].r);
      const alcance = Math.max(aura(L.bells[i], pos[i]), aura(L.bells[j], pos[j]));
      if (Math.hypot(ax - bx, ay - by) <= alcance && !blocked(ax, ay, bx, by)) {
        deg[i]++; deg[j]++;
      }
    }
    for (let i = 0; i < n; i++)
      if (deg[i] > CAP[TYPES[L.bells[i].t]]) return false;

    /* 2. alcance: busca em largura a partir do Sino Mestre — raiz = quem
       estiver dentro do alcance dele, respeitando a capacidade dele.    */
    const seen = new Set(), queue = [];
    let smLinks = 0;
    pos.forEach((p, i) => {
      const bx = cx(p.c), by = cy(p.r);
      if (Math.hypot(SM_CX - bx, SM_CY - by) <= SM_RANGE && !blocked(SM_CX, SM_CY, bx, by)) {
        smLinks++; seen.add(i); queue.push(i);
      }
    });
    if (smLinks > SM_CAP) return false;
    while (queue.length) {
      const i = queue.shift();
      const a = aura(L.bells[i], pos[i]);
      const sx = cx(pos[i].c), sy = cy(pos[i].r);
      for (let j = 0; j < n; j++) {
        if (seen.has(j)) continue;
        const bx = cx(pos[j].c), by = cy(pos[j].r);
        if (Math.hypot(sx - bx, sy - by) <= a && !blocked(sx, sy, bx, by)) {
          seen.add(j); queue.push(j);
        }
      }
    }
    return seen.size === n;
  };
}

/* ── Busca do mínimo de movimentos ──────────────────────────────────── */
function minMoves(L) {
  const connected = makeEval(L);
  const start = L.bells.map(b => ({ c: b.c, r: b.r }));
  const movable = L.bells.map((b, i) => b.fix ? -1 : i).filter(i => i >= 0);

  const free = [];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++)
      if (!has(L.walls, c, r)) free.push({ c, r });

  let solution = null;

  /* tenta mover exatamente k sinos, para k = 0, 1, 2, ... */
  function tryK(k, from, chosen) {
    if (chosen.length === k) {
      const pos = start.map(p => ({ ...p }));
      /* células livres = as que não estão ocupadas por sinos que NÃO se movem */
      const cand = free.filter(f =>
        !start.some((p, i) => !chosen.includes(i) && p.c === f.c && p.r === f.r));

      const place = (d, taken) => {
        if (d === chosen.length) {
          if (connected(pos)) {
            solution = pos.map(p => `(${p.c},${p.r})`).join(' ');
            return true;
          }
          return false;
        }
        for (let z = 0; z < cand.length; z++) {
          if (taken.has(z)) continue;
          pos[chosen[d]] = { ...cand[z] };
          taken.add(z);
          if (place(d + 1, taken)) return true;
          taken.delete(z);
        }
        return false;
      };
      return place(0, new Set());
    }
    for (let i = from; i < movable.length; i++) {
      chosen.push(movable[i]);
      if (tryK(k, i + 1, chosen)) return true;
      chosen.pop();
    }
    return false;
  }

  for (let k = 0; k <= movable.length; k++)
    if (tryK(k, 0, [])) return { k, solution };

  return { k: Infinity, solution: null };
}

/* ── Relatório ──────────────────────────────────────────────────────── */
let falhas = 0;
console.log('');
console.log('  fase                 otimo   par   3★   solucao');
console.log('  ' + '─'.repeat(74));
LEVELS.forEach(L => {
  const { k, solution } = minMoves(L);
  const ok = k <= L.par;
  if (!ok) falhas++;
  console.log('  ' + L.nome.padEnd(20) +
              String(k === Infinity ? '—' : k).padEnd(8) +
              String(L.par).padEnd(6) +
              (ok ? 'ok  ' : 'FALHA') + '  ' + (solution || 'IMPOSSIVEL'));
});
console.log('  ' + '─'.repeat(74));
console.log(falhas
  ? `  ${falhas} fase(s) com par inalcancavel — revisar`
  : '  todas as fases sao resolviveis dentro do par');
console.log('');
