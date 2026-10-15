import * as E from '../src/engine';
import {careerFor, fmt3, leagueContext, rates} from '../src/stats';
import {DEFAULT_SETTINGS as S, Player, Team} from '../src/types';

const A: Team = {id: 'A', name: 'Tigres', createdAt: 0};
const B: Team = {id: 'B', name: 'Leones', createdAt: 0};
const P = (id: string, teamId: string): Player => ({id, teamId, name: id, hasPhoto: false, createdAt: 0});

test('promedios y totales a través de juegos', () => {
  let g = E.createGame(A, B, S);
  g = E.setLineupOrder(g, 0, [P('a1', 'A')]);
  g = E.setLineupClosed(g, 0, true);
  g = E.startGame(g, 0);
  const ab = (r: any) => {
    g = E.recordAtBat(g, S, {result: r, fielders: [], dest: E.defaultDestinations(g, r, true)}).game;
  };
  ab('homerun'); // 1-1
  ab('strikeout'); // 1-2
  ab('ruleFirst'); // no VB
  ab('double'); // 2-3, a1 en 2a se queda? (él mismo) — sólo valida números
  const final = E.finishGame(g);
  const c = careerFor('a1', [final, final], 'a1', 'A');
  expect(c.g).toBe(2);
  expect(c.s.ab).toBe(6);
  expect(c.s.h).toBe(4);
  const r = rates(c.s, leagueContext([final]));
  expect(fmt3(r.avg)).toBe('.667');
  expect(r.obp).toBeCloseTo(6 / 8);
  expect(r.slg).toBeCloseTo(12 / 6);
  expect(r.war).not.toBeNull();
});
