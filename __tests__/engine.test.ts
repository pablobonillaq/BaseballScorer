import * as E from '../src/engine';
import {DEFAULT_SETTINGS as S, Player, Team} from '../src/types';

const A: Team = {id: 'A', name: 'Tigres', createdAt: 0};
const B: Team = {id: 'B', name: 'Leones', createdAt: 0};
const P = (id: string, teamId: string): Player => ({
  id,
  teamId,
  name: id,
  hasPhoto: false,
  createdAt: 0,
});

function atBat(g: any, result: any, extra: any = {}) {
  const dest = E.defaultDestinations(g, result, true);
  return E.recordAtBat(g, S, {result, fielders: [], dest, ...extra});
}

test('hits, carreras y cambio a los 3 outs', () => {
  let g = E.createGame(A, B, S);
  g = E.setLineupOrder(g, 0, [P('a1', 'A'), P('a2', 'A'), P('a3', 'A')]);
  g = E.setLineupClosed(g, 0, true);
  g = E.startGame(g, 0);
  g = atBat(g, 'single').game;
  g = atBat(g, 'double').game;
  g = atBat(g, 'homerun').game;
  expect(g.teams[0].runs).toBe(3);
  expect(g.teams[0].hits).toBe(3);
  expect(g.teams[0].homeRuns).toBe(1);
  expect(E.currentBatterId(g)).toBe('a1'); // el orden cicla
  g = atBat(g, 'strikeout').game;
  g = atBat(g, 'ruleFirst').game;
  const dp = atBat(g, 'doublePlay');
  expect(dp.switched).toBe(true);
  expect(dp.game.battingIdx).toBe(1);
  expect(dp.game.bases).toEqual([null, null, null]);
});

test('equipo sin lineup y deshacer', () => {
  let g = E.createGame(A, B, S);
  g = E.startGame(g, 1);
  expect(E.currentBatterId(g)).toBeNull();
  g = E.addToLineup(g, 1, P('b1', 'B'));
  expect(E.currentBatterId(g)).toBe('b1');
  g = atBat(g, 'reachedOnError').game;
  expect(g.teams[0].errors).toBe(1);
  expect(E.currentBatterId(g)).toBeNull(); // hay que elegir al siguiente
  g = E.recordRunnerEvent(g, S, {
    kind: 'leftEarly',
    runnerId: 'b1',
    dest: 'out',
    fielders: [],
  }).game;
  expect(g.outs).toBe(1);
  g = E.undo(g);
  expect(g.outs).toBe(0);
  expect(g.bases[0]).toBe('b1');
  g = E.addToLineup(g, 1, P('b2', 'B'));
  g = E.setLineupClosed(g, 1, true);
  expect(E.currentBatterId(g)).toBe('b2');
});

test('límite de home runs', () => {
  let g = E.createGame(A, B, S);
  g = E.startGame(g, 0);
  g.teams[0].homeRuns = 3;
  expect(E.resolveHomeRun(g, S)).toBe('hrOverLimit');
  expect(E.resolveHomeRun(g, {...S, extraHomeRunRule: 'double'})).toBe('double');
});
