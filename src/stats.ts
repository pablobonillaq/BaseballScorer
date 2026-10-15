/**
 * Estadísticas acumuladas por jugador a lo largo de todos los juegos.
 */
import {emptyStats} from './engine';
import {Game, ID, PlayerStats} from './types';

export interface GameLine {
  gameId: string;
  date: number;
  rival: string;
  teamRuns: number;
  rivalRuns: number;
  live: boolean;
  s: PlayerStats;
}

export interface CareerStats {
  id: ID;
  name: string;
  teamId: ID;
  g: number; // juegos jugados
  s: PlayerStats; // totales
  games: GameLine[];
}

export interface Rates {
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  iso: number | null;
  babip: number | null;
  woba: number | null;
  kPct: number | null;
  tb: number;
  sf: number;
  xbh: number;
  rc: number; // carreras creadas (fórmula básica de Bill James)
  war: number | null; // WAR ofensivo aproximado
  wraa: number | null;
}

/** Pesos lineales estándar de wOBA (la primera por regla cuenta como base por bolas) */
const W = {bb: 0.69, b1: 0.89, b2: 1.27, b3: 1.62, hr: 2.1};
const WOBA_SCALE = 1.2;
/** Nivel de reemplazo: ~20 carreras por cada 600 apariciones (como en MLB) */
const REPLACEMENT_RUNS_PER_PA = 20 / 600;

function add(a: PlayerStats, b: PlayerStats) {
  (Object.keys(a) as (keyof PlayerStats)[]).forEach(k => {
    a[k] += b[k] ?? 0;
  });
}

function participated(s?: PlayerStats) {
  return !!s && (s.pa > 0 || s.defOuts > 0 || s.e > 0 || s.r > 0);
}

/** Juegos a considerar: historial + (opcional) el juego en curso */
export function gamesFor(games: Game[], current: Game | null, includeLive: boolean) {
  const list = games.filter(g => g.status === 'final');
  if (includeLive && current && current.status === 'live') list.unshift(current);
  return list;
}

export function careerFor(id: ID, games: Game[], fallbackName: string, teamId: ID): CareerStats {
  const total = emptyStats();
  const lines: GameLine[] = [];
  let name = fallbackName;
  games.forEach(g => {
    const s = g.stats[id];
    if (!participated(s)) return;
    add(total, s);
    if (!name && g.players[id]) name = g.players[id].name;
    const pTeam = g.players[id]?.teamId;
    const mine = g.teams[0].teamId === pTeam ? 0 : 1;
    lines.push({
      gameId: g.id,
      date: g.createdAt,
      rival: g.teams[mine === 0 ? 1 : 0].name,
      teamRuns: g.teams[mine].runs,
      rivalRuns: g.teams[mine === 0 ? 1 : 0].runs,
      live: g.status === 'live',
      s,
    });
  });
  lines.sort((a, b) => b.date - a.date);
  return {id, name, teamId, g: lines.length, s: total, games: lines};
}

/** Contexto de la liga para comparar (wOBA promedio y carreras por juego) */
export interface League {
  woba: number | null;
  runsPerWin: number;
}

export function leagueContext(games: Game[]): League {
  const total = emptyStats();
  let runs = 0;
  let n = 0;
  games.forEach(g => {
    Object.values(g.stats).forEach(s => add(total, s));
    runs += g.teams[0].runs + g.teams[1].runs;
    n++;
  });
  // En MLB ~10 carreras por victoria con ~9 carreras por juego: se usa
  // el total de carreras por juego de esta liga (mínimo 3 para no exagerar).
  const runsPerWin = n ? Math.max(3, runs / n) : 10;
  return {woba: wobaOf(total), runsPerWin};
}

function wobaOf(s: PlayerStats): number | null {
  const sf = Math.max(0, s.pa - s.ab - s.ruleFirst);
  const den = s.ab + s.ruleFirst + sf;
  if (!den) return null;
  const b1 = s.b1;
  return (
    (W.bb * s.ruleFirst + W.b1 * b1 + W.b2 * s.b2 + W.b3 * s.b3 + W.hr * s.hr) /
    den
  );
}

export function rates(s: PlayerStats, league?: League): Rates {
  const sf = Math.max(0, s.pa - s.ab - s.ruleFirst);
  const tb = s.b1 + 2 * s.b2 + 3 * s.b3 + 4 * s.hr;
  const avg = s.ab ? s.h / s.ab : null;
  const obpDen = s.ab + s.ruleFirst + sf;
  const obp = obpDen ? (s.h + s.ruleFirst) / obpDen : null;
  const slg = s.ab ? tb / s.ab : null;
  const ops = obp !== null && slg !== null ? obp + slg : null;
  const iso = avg !== null && slg !== null ? slg - avg : null;
  const babipDen = s.ab - s.k - s.hr + sf;
  const babip = babipDen > 0 ? (s.h - s.hr) / babipDen : null;
  const woba = wobaOf(s);
  const rc = obpDen ? ((s.h + s.ruleFirst) * tb) / obpDen : 0;

  let wraa: number | null = null;
  let war: number | null = null;
  if (woba !== null && league?.woba != null && s.pa > 0) {
    wraa = ((woba - league.woba) / WOBA_SCALE) * s.pa;
    const repl = REPLACEMENT_RUNS_PER_PA * s.pa;
    war = (wraa + repl) / league.runsPerWin;
  }

  return {
    avg,
    obp,
    slg,
    ops,
    iso,
    babip,
    woba,
    kPct: s.pa ? s.k / s.pa : null,
    tb,
    sf,
    xbh: s.b2 + s.b3 + s.hr,
    rc,
    war,
    wraa,
  };
}

/** Formato beisbolero: .333 / 1.050 */
export function fmt3(v: number | null): string {
  if (v === null || !isFinite(v)) return '---';
  const t = v.toFixed(3);
  return v < 1 && v >= 0 ? t.slice(1) : t;
}

export function fmtPct(v: number | null): string {
  return v === null ? '---' : `${Math.round(v * 100)}%`;
}

export function fmt1(v: number | null): string {
  return v === null ? '---' : v.toFixed(1);
}
