export type ID = string;

export interface Team {
  id: ID;
  name: string;
  createdAt: number;
}

export interface Player {
  id: ID;
  teamId: ID;
  name: string;
  hasPhoto: boolean;
  createdAt: number;
}

/** Qué hacer cuando un equipo batea un HR después de agotar los permitidos */
export type ExtraHomeRunRule = 'out' | 'triple' | 'double' | 'allow';

export interface Settings {
  /** Duración del juego en minutos */
  gameMinutes: number;
  /** Lanzamientos máximos por turno al bat antes de ponche */
  maxPitches: number;
  /** Outs para cambiar de equipo al bat */
  outsPerTurn: number;
  /** Home runs permitidos por equipo por juego (0 = sin límite) */
  maxHomeRuns: number;
  extraHomeRunRule: ExtraHomeRunRule;
  /** Minutos antes del final para avisar (0 = sin aviso) */
  warningMinutes: number;
  vibrate: boolean;
  showPitchCounter: boolean;
  /** Al llegar al máximo de lanzamientos preguntar si se registra ponche */
  promptStrikeoutOnMaxPitches: boolean;
  /** Sugerir automáticamente el avance de corredores según la jugada */
  suggestRunnerAdvance: boolean;
  /** Permitir pausar el cronómetro */
  allowPause: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  gameMinutes: 50,
  maxPitches: 5,
  outsPerTurn: 3,
  maxHomeRuns: 3,
  extraHomeRunRule: 'out',
  warningMinutes: 5,
  vibrate: true,
  showPitchCounter: true,
  promptStrikeoutOnMaxPitches: true,
  suggestRunnerAdvance: true,
  allowPause: true,
};

/* ----------------------------- Juego ----------------------------- */

export type TeamIdx = 0 | 1;

export interface LineupSlot {
  playerId: ID;
  active: boolean;
}

export interface GameTeam {
  teamId: ID;
  name: string;
  lineup: LineupSlot[];
  /** El usuario presionó "Terminar line up": el orden ya cicla */
  lineupClosed: boolean;
  /** Índice del lineup del siguiente bateador */
  nextIdx: number;
  runs: number;
  hits: number;
  errors: number;
  homeRuns: number;
}

export type BatResult =
  | 'single'
  | 'double'
  | 'triple'
  | 'homerun'
  | 'strikeout'
  | 'ruleFirst'
  | 'reachedOnError'
  | 'fieldersChoice'
  | 'out'
  | 'doublePlay'
  | 'sacFly'
  | 'hrOverLimit';

export type OutKind = 'ground' | 'fly' | 'line' | 'foulFly' | 'tag' | 'other';

export type RunnerEventKind =
  | 'steal'
  | 'caughtStealing'
  | 'leftEarly'
  | 'advanceOnError'
  | 'advance'
  | 'runnerOut';

/** 1,2,3 = base; 4 = anotó; 'out' = out */
export type Dest = 1 | 2 | 3 | 4 | 'out';

export interface PlayEvent {
  id: ID;
  ts: number;
  elapsedMs: number;
  teamIdx: TeamIdx;
  turn: number;
  kind: 'atBat' | 'runner';
  batterId?: ID;
  result?: BatResult;
  outKind?: OutKind;
  runnerEvent?: RunnerEventKind;
  runnerId?: ID;
  fielders: ID[];
  errorFielderId?: ID;
  runsScored: ID[];
  playersOut: ID[];
  rbi: number;
  pitches?: number;
  description: string;
}

export interface PlayerStats {
  pa: number; // apariciones al bat
  ab: number; // turnos oficiales
  h: number;
  b1: number;
  b2: number;
  b3: number;
  hr: number;
  k: number;
  r: number;
  rbi: number;
  ruleFirst: number;
  roe: number; // embasado por error
  sb: number; // bases robadas
  defOuts: number; // outs en los que participó a la defensiva
  e: number; // errores cometidos
}

export interface GameTurn {
  teamIdx: TeamIdx;
  runs: number;
  hits: number;
}

export interface GameTimer {
  startedAt: number | null;
  accumulatedMs: number;
  running: boolean;
  warned: boolean;
  expiredNotified: boolean;
}

/** Parte del juego que se restaura al deshacer (el cronómetro NO se restaura) */
export interface GameCore {
  teams: [GameTeam, GameTeam];
  battingIdx: TeamIdx | null;
  outs: number;
  bases: [ID | null, ID | null, ID | null];
  pitches: number;
  turns: GameTurn[];
  stats: Record<ID, PlayerStats>;
  players: Record<ID, {name: string; teamId: ID}>;
  eventsLength: number;
}

export interface Game {
  id: ID;
  createdAt: number;
  endedAt?: number;
  status: 'setup' | 'live' | 'final';
  durationMin: number;
  teams: [GameTeam, GameTeam];
  battingIdx: TeamIdx | null;
  outs: number;
  bases: [ID | null, ID | null, ID | null];
  pitches: number;
  turns: GameTurn[];
  stats: Record<ID, PlayerStats>;
  /** Copia de nombres para que el juego guardado se lea aunque se borren jugadores */
  players: Record<ID, {name: string; teamId: ID}>;
  events: PlayEvent[];
  timer: GameTimer;
  undo: GameCore[];
}
