/**
 * Lógica pura del juego (sin React). Todas las funciones regresan un Game nuevo.
 */
import {
  BatResult,
  Dest,
  Game,
  GameCore,
  GameTeam,
  ID,
  OutKind,
  PlayEvent,
  Player,
  PlayerStats,
  RunnerEventKind,
  Settings,
  Team,
  TeamIdx,
} from './types';
import {clone, uid} from './utils';

const MAX_UNDO = 40;

/* ------------------------------------------------------------------ */
/* Etiquetas                                                           */
/* ------------------------------------------------------------------ */

export const RESULT_LABEL: Record<BatResult, string> = {
  single: 'Sencillo',
  double: 'Doble',
  triple: 'Triple',
  homerun: 'Home run',
  strikeout: 'Ponche',
  ruleFirst: 'Primera por regla',
  reachedOnError: 'Embasado por error',
  fieldersChoice: 'Bola ocupada',
  out: 'Out',
  doublePlay: 'Doble play',
  sacFly: 'Elevado de sacrificio',
  hrOverLimit: 'Out (HR excedido)',
};

export const OUT_KIND_LABEL: Record<OutKind, string> = {
  ground: 'Rodado',
  fly: 'Elevado',
  line: 'Línea',
  foulFly: 'Foul atrapado',
  tag: 'Tocado / forzado',
  other: 'Otro',
};

export const RUNNER_EVENT_LABEL: Record<RunnerEventKind, string> = {
  steal: 'Base robada',
  caughtStealing: 'Out robando',
  leftEarly: 'Out por salir antes del lanzamiento',
  advanceOnError: 'Avanzó por error',
  advance: 'Avanzó (otra causa)',
  runnerOut: 'Out en las bases',
};

export const BATTER_OUT_RESULTS: BatResult[] = [
  'strikeout',
  'out',
  'doublePlay',
  'sacFly',
  'hrOverLimit',
];

export const HIT_BASES: Partial<Record<BatResult, 1 | 2 | 3 | 4>> = {
  single: 1,
  double: 2,
  triple: 3,
  homerun: 4,
};

export function isHit(r: BatResult) {
  return HIT_BASES[r] !== undefined;
}

export function isBatterOut(r: BatResult) {
  return BATTER_OUT_RESULTS.includes(r);
}

/** Resultados donde se debe/puede indicar quién hizo el out */
export function needsFielders(r: BatResult) {
  return ['out', 'doublePlay', 'sacFly', 'fieldersChoice'].includes(r);
}

/* ------------------------------------------------------------------ */
/* Creación                                                            */
/* ------------------------------------------------------------------ */

export function emptyStats(): PlayerStats {
  return {
    pa: 0,
    ab: 0,
    h: 0,
    b1: 0,
    b2: 0,
    b3: 0,
    hr: 0,
    k: 0,
    r: 0,
    rbi: 0,
    ruleFirst: 0,
    roe: 0,
    sb: 0,
    defOuts: 0,
    e: 0,
  };
}

function newGameTeam(t: Team): GameTeam {
  return {
    teamId: t.id,
    name: t.name,
    lineup: [],
    lineupClosed: false,
    nextIdx: 0,
    runs: 0,
    hits: 0,
    errors: 0,
    homeRuns: 0,
  };
}

export function createGame(a: Team, b: Team, settings: Settings): Game {
  return {
    id: uid(),
    createdAt: Date.now(),
    status: 'setup',
    durationMin: settings.gameMinutes,
    teams: [newGameTeam(a), newGameTeam(b)],
    battingIdx: null,
    outs: 0,
    bases: [null, null, null],
    pitches: 0,
    turns: [],
    stats: {},
    players: {},
    events: [],
    timer: {
      startedAt: null,
      accumulatedMs: 0,
      running: false,
      warned: false,
      expiredNotified: false,
    },
    undo: [],
  };
}

/* ------------------------------------------------------------------ */
/* Cronómetro                                                          */
/* ------------------------------------------------------------------ */

export function elapsedMs(g: Game, now = Date.now()): number {
  const t = g.timer;
  return t.accumulatedMs + (t.running && t.startedAt ? now - t.startedAt : 0);
}

export function remainingMs(g: Game, now = Date.now()): number {
  return g.durationMin * 60000 - elapsedMs(g, now);
}

export function pauseTimer(g: Game, now = Date.now()): Game {
  if (!g.timer.running) {
    return g;
  }
  const n = clone(g);
  n.timer.accumulatedMs = elapsedMs(g, now);
  n.timer.running = false;
  n.timer.startedAt = null;
  return n;
}

export function resumeTimer(g: Game, now = Date.now()): Game {
  if (g.timer.running || g.status !== 'live') {
    return g;
  }
  const n = clone(g);
  n.timer.running = true;
  n.timer.startedAt = now;
  return n;
}

/* ------------------------------------------------------------------ */
/* Lineup                                                              */
/* ------------------------------------------------------------------ */

export function registerPlayer(g: Game, p: Pick<Player, 'id' | 'name' | 'teamId'>) {
  g.players[p.id] = {name: p.name, teamId: p.teamId};
  if (!g.stats[p.id]) {
    g.stats[p.id] = emptyStats();
  }
}

/** Agrega un jugador al final del lineup (o lo reactiva si ya estaba). */
export function addToLineup(g: Game, idx: TeamIdx, p: Player): Game {
  const n = clone(g);
  registerPlayer(n, p);
  const team = n.teams[idx];
  const existing = team.lineup.find(s => s.playerId === p.id);
  if (existing) {
    existing.active = true;
  } else {
    team.lineup.push({playerId: p.id, active: true});
  }
  return n;
}

export function setLineupOrder(g: Game, idx: TeamIdx, players: Player[]): Game {
  let n = clone(g);
  n.teams[idx].lineup = [];
  n.teams[idx].nextIdx = 0;
  players.forEach(p => {
    n = addToLineup(n, idx, p);
  });
  return n;
}

export function setSlotActive(
  g: Game,
  idx: TeamIdx,
  playerId: ID,
  active: boolean,
): Game {
  const n = clone(g);
  const slot = n.teams[idx].lineup.find(s => s.playerId === playerId);
  if (slot) {
    slot.active = active;
  }
  return n;
}

export function setLineupClosed(g: Game, idx: TeamIdx, closed: boolean): Game {
  const n = clone(g);
  const team = n.teams[idx];
  team.lineupClosed = closed;
  if (closed && team.lineup.length > 0 && team.nextIdx >= team.lineup.length) {
    team.nextIdx = 0;
  }
  return n;
}

/** Índice en el lineup del bateador en turno, o null si hay que elegirlo. */
export function currentSlotIndex(team: GameTeam): number | null {
  const len = team.lineup.length;
  if (len === 0) {
    return null;
  }
  if (!team.lineupClosed) {
    for (let i = team.nextIdx; i < len; i++) {
      if (team.lineup[i].active) {
        return i;
      }
    }
    return null;
  }
  for (let k = 0; k < len; k++) {
    const i = (team.nextIdx + k) % len;
    if (team.lineup[i].active) {
      return i;
    }
  }
  return null;
}

export function currentBatterId(g: Game): ID | null {
  if (g.battingIdx === null) {
    return null;
  }
  const team = g.teams[g.battingIdx];
  const i = currentSlotIndex(team);
  return i === null ? null : team.lineup[i].playerId;
}

/** Próximos bateadores (para mostrar "en espera") */
export function upcomingBatters(team: GameTeam, count: number): ID[] {
  const out: ID[] = [];
  const start = currentSlotIndex(team);
  if (start === null) {
    return out;
  }
  const len = team.lineup.length;
  for (let k = 1; k < len && out.length < count; k++) {
    const i = start + k;
    if (!team.lineupClosed && i >= len) {
      break;
    }
    const slot = team.lineup[i % len];
    if (slot.active) {
      out.push(slot.playerId);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Inicio / fin                                                        */
/* ------------------------------------------------------------------ */

export function startGame(g: Game, battingIdx: TeamIdx, now = Date.now()): Game {
  const n = clone(g);
  n.status = 'live';
  n.battingIdx = battingIdx;
  n.turns = [{teamIdx: battingIdx, runs: 0, hits: 0}];
  n.timer = {
    startedAt: now,
    accumulatedMs: 0,
    running: true,
    warned: false,
    expiredNotified: false,
  };
  return n;
}

export function finishGame(g: Game, now = Date.now()): Game {
  const n = pauseTimer(g, now);
  const f = n === g ? clone(g) : n;
  f.status = 'final';
  f.endedAt = now;
  f.undo = [];
  return f;
}

/* ------------------------------------------------------------------ */
/* Deshacer                                                            */
/* ------------------------------------------------------------------ */

function snapshot(g: Game): GameCore {
  return clone({
    teams: g.teams,
    battingIdx: g.battingIdx,
    outs: g.outs,
    bases: g.bases,
    pitches: g.pitches,
    turns: g.turns,
    stats: g.stats,
    players: g.players,
    eventsLength: g.events.length,
  });
}

function pushUndo(g: Game) {
  g.undo.push(snapshot(g));
  if (g.undo.length > MAX_UNDO) {
    g.undo.shift();
  }
}

export function canUndo(g: Game) {
  return g.undo.length > 0;
}

export function undo(g: Game): Game {
  if (!g.undo.length) {
    return g;
  }
  const n = clone(g);
  const s = n.undo.pop()!;
  // Los cambios de lineup (altas/bajas) se conservan; sólo regresa el turno
  s.teams.forEach((t, i) => {
    t.lineup = n.teams[i].lineup;
    t.lineupClosed = n.teams[i].lineupClosed;
  });
  n.teams = s.teams;
  n.battingIdx = s.battingIdx;
  n.outs = s.outs;
  n.bases = s.bases;
  n.pitches = s.pitches;
  n.turns = s.turns;
  n.stats = {...s.stats};
  Object.keys(n.players).forEach(id => {
    if (!n.stats[id]) {
      n.stats[id] = emptyStats();
    }
  });
  n.events = n.events.slice(0, s.eventsLength);
  return n;
}

/* ------------------------------------------------------------------ */
/* Jugadas                                                             */
/* ------------------------------------------------------------------ */

export function addPitch(g: Game, delta: 1 | -1, max: number): Game {
  const n = clone(g);
  n.pitches = Math.max(0, Math.min(max, n.pitches + delta));
  return n;
}

export function fieldingIdx(g: Game): TeamIdx {
  return g.battingIdx === 0 ? 1 : 0;
}

/** Corredores en base: [{id, base(1-3)}] de 3ª a 1ª */
export function runnersOnBase(g: Game): {id: ID; base: 1 | 2 | 3}[] {
  const out: {id: ID; base: 1 | 2 | 3}[] = [];
  for (let b = 2; b >= 0; b--) {
    const id = g.bases[b];
    if (id) {
      out.push({id, base: (b + 1) as 1 | 2 | 3});
    }
  }
  return out;
}

export interface Destinations {
  batter: Dest;
  runners: Record<ID, Dest>;
}

/** Destinos sugeridos según el resultado */
export function defaultDestinations(
  g: Game,
  result: BatResult,
  suggest: boolean,
): Destinations {
  const runners: Record<ID, Dest> = {};
  const [r1, r2, r3] = g.bases;
  const stay = () => {
    if (r1) runners[r1] = 1;
    if (r2) runners[r2] = 2;
    if (r3) runners[r3] = 3;
  };
  const forced = () => {
    // Avance sólo de corredores forzados
    if (r1) {
      runners[r1] = 2;
      if (r2) {
        runners[r2] = 3;
        if (r3) runners[r3] = 4;
      }
    }
    if (r2 && runners[r2] === undefined) runners[r2] = 2;
    if (r3 && runners[r3] === undefined) runners[r3] = 3;
  };

  const hb = HIT_BASES[result];
  if (hb === 4) {
    if (r1) runners[r1] = 4;
    if (r2) runners[r2] = 4;
    if (r3) runners[r3] = 4;
    return {batter: 4, runners};
  }
  if (hb) {
    if (suggest) {
      if (r1) runners[r1] = Math.min(4, 1 + hb) as Dest;
      if (r2) runners[r2] = Math.min(4, 2 + hb) as Dest;
      if (r3) runners[r3] = 4;
    } else {
      forced();
    }
    return {batter: hb, runners};
  }
  switch (result) {
    case 'ruleFirst':
    case 'reachedOnError':
      forced();
      return {batter: 1, runners};
    case 'fieldersChoice':
      forced();
      if (r1) runners[r1] = 'out';
      return {batter: 1, runners};
    case 'doublePlay':
      stay();
      if (r1) runners[r1] = 'out';
      else if (r2) runners[r2] = 'out';
      else if (r3) runners[r3] = 'out';
      return {batter: 'out', runners};
    case 'sacFly':
      stay();
      if (r3) runners[r3] = 4;
      return {batter: 'out', runners};
    default:
      stay();
      return {batter: 'out', runners};
  }
}

/** Valida destinos: no dos corredores en la misma base y no retroceder. */
export function validateDestinations(g: Game, d: Destinations): string | null {
  const used = new Set<number>();
  const check = (dest: Dest, from: number, who: string): string | null => {
    if (dest === 'out' || dest === 4) {
      return null;
    }
    if (dest < from) {
      return `${who} no puede regresar de base.`;
    }
    if (used.has(dest)) {
      return `Hay dos corredores en ${dest}ª base.`;
    }
    used.add(dest);
    return null;
  };
  for (const r of runnersOnBase(g)) {
    const err = check(
      d.runners[r.id] ?? r.base,
      r.base,
      g.players[r.id]?.name ?? 'Corredor',
    );
    if (err) return err;
  }
  return check(d.batter, 0, 'El bateador');
}

function stats(g: Game, id: ID) {
  if (!g.stats[id]) {
    g.stats[id] = emptyStats();
  }
  return g.stats[id];
}

function scoreRun(g: Game, id: ID) {
  const bi = g.battingIdx!;
  g.teams[bi].runs++;
  g.turns[g.turns.length - 1].runs++;
  stats(g, id).r++;
}

function switchSides(g: Game) {
  const next = fieldingIdx(g);
  g.battingIdx = next;
  g.outs = 0;
  g.bases = [null, null, null];
  g.pitches = 0;
  g.turns.push({teamIdx: next, runs: 0, hits: 0});
}

function name(g: Game, id?: ID) {
  return id ? g.players[id]?.name ?? '?' : '?';
}

export interface AtBatInput {
  result: BatResult;
  outKind?: OutKind;
  fielders: ID[];
  errorFielderId?: ID;
  dest: Destinations;
}

export interface PlayOutcome {
  game: Game;
  switched: boolean;
  event: PlayEvent;
}

export function recordAtBat(
  g0: Game,
  settings: Settings,
  input: AtBatInput,
  now = Date.now(),
): PlayOutcome {
  const g = clone(g0);
  const batterId = currentBatterId(g);
  if (g.battingIdx === null || !batterId) {
    throw new Error('No hay bateador en turno');
  }
  pushUndo(g);
  const bi = g.battingIdx;
  const fi = fieldingIdx(g);
  const team = g.teams[bi];
  const turn = g.turns[g.turns.length - 1];
  const {result} = input;
  const bs = stats(g, batterId);

  // --- mover corredores
  const scored: ID[] = [];
  const outs: ID[] = [];
  const newBases: [ID | null, ID | null, ID | null] = [null, null, null];
  const place = (id: ID, d: Dest) => {
    if (d === 'out') outs.push(id);
    else if (d === 4) scored.push(id);
    else newBases[d - 1] = id;
  };
  runnersOnBase(g).forEach(r => place(r.id, input.dest.runners[r.id] ?? r.base));
  place(batterId, isBatterOut(result) ? 'out' : input.dest.batter);
  g.bases = newBases;

  // --- estadísticas del bateador
  bs.pa++;
  if (result !== 'ruleFirst' && result !== 'sacFly') bs.ab++;
  if (isHit(result)) {
    bs.h++;
    team.hits++;
    turn.hits++;
    if (result === 'single') bs.b1++;
    if (result === 'double') bs.b2++;
    if (result === 'triple') bs.b3++;
    if (result === 'homerun') {
      bs.hr++;
      team.homeRuns++;
    }
  }
  if (result === 'strikeout') bs.k++;
  if (result === 'ruleFirst') bs.ruleFirst++;
  if (result === 'reachedOnError') bs.roe++;

  scored.forEach(id => scoreRun(g, id));
  const rbi =
    result === 'reachedOnError' || result === 'doublePlay' ? 0 : scored.length;
  bs.rbi += rbi;

  // --- defensa
  const fielders = input.fielders.filter(Boolean);
  fielders.forEach(id => stats(g, id).defOuts++);
  if (input.errorFielderId) {
    g.teams[fi].errors++;
    stats(g, input.errorFielderId).e++;
  } else if (result === 'reachedOnError') {
    g.teams[fi].errors++;
  }

  // --- siguiente bateador
  const slot = currentSlotIndex(team)!;
  team.nextIdx = team.lineupClosed
    ? (slot + 1) % team.lineup.length
    : slot + 1;

  const pitches = g.pitches;
  g.pitches = 0;

  // --- descripción
  let desc = `${name(g, batterId)}: ${RESULT_LABEL[result]}`;
  if (input.outKind && isBatterOut(result) && result !== 'strikeout') {
    desc += ` (${OUT_KIND_LABEL[input.outKind]})`;
  }
  if (fielders.length) desc += ` — ${fielders.map(f => name(g, f)).join(' → ')}`;
  if (input.errorFielderId) desc += ` — error de ${name(g, input.errorFielderId)}`;
  if (scored.length) desc += `. Anotan: ${scored.map(s => name(g, s)).join(', ')}`;
  const runnerOuts = outs.filter(o => o !== batterId);
  if (runnerOuts.length)
    desc += `. Out: ${runnerOuts.map(s => name(g, s)).join(', ')}`;

  const event: PlayEvent = {
    id: uid(),
    ts: now,
    elapsedMs: elapsedMs(g, now),
    teamIdx: bi,
    turn: g.turns.length,
    kind: 'atBat',
    batterId,
    result,
    outKind: input.outKind,
    fielders,
    errorFielderId: input.errorFielderId,
    runsScored: scored,
    playersOut: outs,
    rbi,
    pitches,
    description: desc,
  };
  g.events.push(event);

  g.outs += outs.length;
  let switched = false;
  if (g.outs >= settings.outsPerTurn) {
    switchSides(g);
    switched = true;
  }
  return {game: g, switched, event};
}

export interface RunnerEventInput {
  kind: RunnerEventKind;
  runnerId: ID;
  dest: Dest;
  fielders: ID[];
  errorFielderId?: ID;
}

export function recordRunnerEvent(
  g0: Game,
  settings: Settings,
  input: RunnerEventInput,
  now = Date.now(),
): PlayOutcome {
  const g = clone(g0);
  const b = g.bases.indexOf(input.runnerId);
  if (g.battingIdx === null || b < 0) {
    throw new Error('Ese corredor no está en base');
  }
  pushUndo(g);
  const bi = g.battingIdx;
  const fi = fieldingIdx(g);
  g.bases[b] = null;
  const scored: ID[] = [];
  const outs: ID[] = [];
  if (input.dest === 'out') outs.push(input.runnerId);
  else if (input.dest === 4) scored.push(input.runnerId);
  else g.bases[input.dest - 1] = input.runnerId;

  if (input.kind === 'steal' && input.dest !== 'out') {
    stats(g, input.runnerId).sb++;
  }
  scored.forEach(id => scoreRun(g, id));
  input.fielders.forEach(id => stats(g, id).defOuts++);
  if (input.errorFielderId) {
    g.teams[fi].errors++;
    stats(g, input.errorFielderId).e++;
  } else if (input.kind === 'advanceOnError') {
    g.teams[fi].errors++;
  }

  let desc = `${name(g, input.runnerId)}: ${RUNNER_EVENT_LABEL[input.kind]}`;
  if (input.dest === 4) desc += ' — anotó';
  else if (input.dest !== 'out') desc += ` a ${input.dest}ª`;
  if (input.fielders.length)
    desc += ` — ${input.fielders.map(f => name(g, f)).join(' → ')}`;
  if (input.errorFielderId) desc += ` — error de ${name(g, input.errorFielderId)}`;

  const event: PlayEvent = {
    id: uid(),
    ts: now,
    elapsedMs: elapsedMs(g, now),
    teamIdx: bi,
    turn: g.turns.length,
    kind: 'runner',
    runnerEvent: input.kind,
    runnerId: input.runnerId,
    fielders: input.fielders,
    errorFielderId: input.errorFielderId,
    runsScored: scored,
    playersOut: outs,
    rbi: 0,
    description: desc,
  };
  g.events.push(event);
  g.outs += outs.length;
  let switched = false;
  if (g.outs >= settings.outsPerTurn) {
    switchSides(g);
    switched = true;
  }
  return {game: g, switched, event};
}

/** Cambio de equipo manual (por si se necesita corregir) */
export function forceSwitch(g0: Game): Game {
  const g = clone(g0);
  pushUndo(g);
  switchSides(g);
  return g;
}

/** Resultado efectivo de un HR según el límite */
export function resolveHomeRun(
  g: Game,
  settings: Settings,
): BatResult {
  if (g.battingIdx === null) return 'homerun';
  const used = g.teams[g.battingIdx].homeRuns;
  if (settings.maxHomeRuns <= 0 || used < settings.maxHomeRuns) return 'homerun';
  switch (settings.extraHomeRunRule) {
    case 'out':
      return 'hrOverLimit';
    case 'triple':
      return 'triple';
    case 'double':
      return 'double';
    default:
      return 'homerun';
  }
}

export function battingAverage(s: PlayerStats): string {
  if (!s.ab) return '.000';
  const v = s.h / s.ab;
  return v >= 1 ? v.toFixed(3) : v.toFixed(3).slice(1);
}

/* ------------------------------------------------------------------ */
/* Edición de lineup antes de iniciar                                  */
/* ------------------------------------------------------------------ */

export function moveSlot(g: Game, idx: TeamIdx, from: number, to: number): Game {
  const n = clone(g);
  const l = n.teams[idx].lineup;
  if (to < 0 || to >= l.length) return g;
  const [item] = l.splice(from, 1);
  l.splice(to, 0, item);
  return n;
}

/** Quita definitivamente un jugador del lineup (sólo antes de iniciar) */
export function removeSlot(g: Game, idx: TeamIdx, playerId: ID): Game {
  const n = clone(g);
  n.teams[idx].lineup = n.teams[idx].lineup.filter(s => s.playerId !== playerId);
  return n;
}
