import React, {useMemo, useState} from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {Avatar, Chip, Empty, Row, Screen, SectionTitle, s} from '../components/ui';
import {useNav} from '../nav';
import {useStore} from '../store';
import {
  CareerStats,
  careerFor,
  fmt1,
  fmt3,
  gamesFor,
  leagueContext,
  Rates,
  rates,
} from '../stats';
import {C} from '../theme';
import {ID} from '../types';

type SortKey = 'avg' | 'ops' | 'h' | 'hr' | 'rbi' | 'r' | 'war';
const SORTS: {key: SortKey; label: string}[] = [
  {key: 'avg', label: 'AVG'},
  {key: 'ops', label: 'OPS'},
  {key: 'war', label: 'WAR'},
  {key: 'h', label: 'Hits'},
  {key: 'hr', label: 'HR'},
  {key: 'rbi', label: 'CI'},
  {key: 'r', label: 'Carreras'},
];

function sortValue(c: CareerStats, r: Rates, k: SortKey): number {
  switch (k) {
    case 'avg':
      return r.avg ?? -1;
    case 'ops':
      return r.ops ?? -1;
    case 'war':
      return r.war ?? -99;
    case 'h':
      return c.s.h;
    case 'hr':
      return c.s.hr;
    case 'rbi':
      return c.s.rbi;
    case 'r':
      return c.s.r;
  }
}

export function StatsScreen({teamId: initialTeam}: {teamId?: string}) {
  const {pop, push} = useNav();
  const {teams, players, games, currentGame, photos} = useStore();
  const [teamId, setTeamId] = useState<string | undefined>(initialTeam ?? teams[0]?.id);
  const [includeLive, setIncludeLive] = useState(true);
  const [sort, setSort] = useState<SortKey>('avg');

  const pool = useMemo(
    () => gamesFor(games, currentGame, includeLive),
    [games, currentGame, includeLive],
  );
  const league = useMemo(() => leagueContext(pool), [pool]);

  const rows = useMemo(() => {
    if (!teamId) return [];
    // Jugadores registrados + jugadores históricos del equipo (aunque se hayan borrado)
    const ids = new Map<ID, string>();
    players.filter(p => p.teamId === teamId).forEach(p => ids.set(p.id, p.name));
    pool.forEach(g =>
      Object.entries(g.players).forEach(([id, p]) => {
        if (p.teamId === teamId && !ids.has(id)) ids.set(id, p.name);
      }),
    );
    return [...ids.entries()]
      .map(([id, name]) => {
        const c = careerFor(id, pool, name, teamId);
        return {c, r: rates(c.s, league)};
      })
      .sort((a, b) => {
        const d = sortValue(b.c, b.r, sort) - sortValue(a.c, a.r, sort);
        return d !== 0 ? d : a.c.name.localeCompare(b.c.name);
      });
  }, [teamId, players, pool, league, sort]);

  const liveAvailable = currentGame?.status === 'live';

  return (
    <Screen title="Estadísticas" onBack={pop}>
      {teams.length === 0 ? (
        <Empty text="Aún no hay equipos." />
      ) : (
        <>
          <SectionTitle>1. Elige el equipo</SectionTitle>
          <View style={st.wrap}>
            {teams.map(t => (
              <Chip
                key={t.id}
                label={t.name}
                selected={teamId === t.id}
                onPress={() => setTeamId(t.id)}
              />
            ))}
          </View>

          {liveAvailable ? (
            <View style={st.toggle}>
              <Text style={[s.name, {fontSize: 14}]}>Incluir el juego en curso</Text>
              <Switch
                value={includeLive}
                onValueChange={setIncludeLive}
                trackColor={{true: C.primary, false: C.border}}
                thumbColor="#fff"
              />
            </View>
          ) : null}

          <SectionTitle>2. Elige el jugador</SectionTitle>
          <View style={st.wrap}>
            <Text style={[s.muted, {marginRight: 8, alignSelf: 'center', marginBottom: 8}]}>
              Ordenar:
            </Text>
            {SORTS.map(o => (
              <Chip
                key={o.key}
                label={o.label}
                selected={sort === o.key}
                color={C.info}
                onPress={() => setSort(o.key)}
              />
            ))}
          </View>

          {rows.length === 0 ? (
            <Empty text="Este equipo no tiene jugadores." />
          ) : (
            rows.map(({c, r}, i) => (
              <Row
                key={c.id}
                onPress={() =>
                  push({name: 'playerStats', playerId: c.id, teamId: c.teamId, includeLive})
                }>
                <Text style={st.rank}>{i + 1}</Text>
                <Avatar uri={photos[c.id]} name={c.name} size={42} />
                <View style={{flex: 1}}>
                  <Text style={s.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={s.muted}>
                    {c.s.pa
                      ? `${c.g} J · ${c.s.h}-${c.s.ab} · ${c.s.hr} HR · ${c.s.rbi} CI`
                      : 'Sin turnos al bat'}
                  </Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={st.big}>
                    {sort === 'war'
                      ? fmt1(r.war)
                      : sort === 'ops'
                      ? fmt3(r.ops)
                      : sort === 'avg'
                      ? fmt3(r.avg)
                      : String(sortValue(c, r, sort))}
                  </Text>
                  <Text style={st.small}>{SORTS.find(o => o.key === sort)?.label}</Text>
                </View>
              </Row>
            ))
          )}
          <Text style={[s.muted, {textAlign: 'center', marginTop: 8}]}>
            {pool.length} juego{pool.length === 1 ? '' : 's'} considerado
            {pool.length === 1 ? '' : 's'}
          </Text>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },
  rank: {width: 20, textAlign: 'center', color: C.muted, fontWeight: '700'},
  big: {fontSize: 18, fontWeight: '800', color: C.primary, fontVariant: ['tabular-nums']},
  small: {fontSize: 11, color: C.muted, fontWeight: '700'},
});
