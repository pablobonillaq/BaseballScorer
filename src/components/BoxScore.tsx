import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {battingAverage, emptyStats} from '../engine';
import {C} from '../theme';
import {Game, ID, PlayerStats, TeamIdx} from '../types';
import {formatClock} from '../utils';

const COLS: {key: keyof PlayerStats | 'avg'; label: string}[] = [
  {key: 'pa', label: 'TB'},
  {key: 'ab', label: 'VB'},
  {key: 'r', label: 'C'},
  {key: 'h', label: 'H'},
  {key: 'b2', label: '2B'},
  {key: 'b3', label: '3B'},
  {key: 'hr', label: 'HR'},
  {key: 'rbi', label: 'CI'},
  {key: 'k', label: 'K'},
  {key: 'ruleFirst', label: 'PR'},
  {key: 'roe', label: 'EE'},
  {key: 'sb', label: 'BR'},
  {key: 'defOuts', label: 'OD'},
  {key: 'e', label: 'E'},
  {key: 'avg', label: 'AVG'},
];

/** Jugadores de un equipo que participaron (lineup primero, luego defensa) */
function teamPlayerIds(g: Game, idx: TeamIdx): ID[] {
  const team = g.teams[idx];
  const ids = team.lineup.map(s => s.playerId);
  Object.entries(g.players).forEach(([id, p]) => {
    if (p.teamId === team.teamId && !ids.includes(id)) {
      const s = g.stats[id];
      if (s && (s.defOuts || s.e || s.pa)) ids.push(id);
    }
  });
  return ids;
}

export function BoxScore({game, idx}: {game: Game; idx: TeamIdx}) {
  const ids = teamPlayerIds(game, idx);
  const total = emptyStats();
  ids.forEach(id => {
    const s = game.stats[id] ?? emptyStats();
    (Object.keys(total) as (keyof PlayerStats)[]).forEach(k => {
      total[k] += s[k];
    });
  });
  const row = (label: string, s: PlayerStats, bold = false, key?: string) => (
    <View key={key ?? label} style={[st.row, bold && st.totalRow]}>
      <Text style={[st.name, bold && st.bold]} numberOfLines={1}>
        {label}
      </Text>
      {COLS.map(c => (
        <Text key={c.key} style={[st.cell, c.key === 'avg' && st.avg, bold && st.bold]}>
          {c.key === 'avg' ? battingAverage(s) : s[c.key]}
        </Text>
      ))}
    </View>
  );
  return (
    <View style={st.wrap}>
      <Text style={st.title}>{game.teams[idx].name}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[st.row, st.headRow]}>
            <Text style={[st.name, st.head]}>Jugador</Text>
            {COLS.map(c => (
              <Text key={c.key} style={[st.cell, st.head, c.key === 'avg' && st.avg]}>
                {c.label}
              </Text>
            ))}
          </View>
          {ids.length === 0 ? (
            <Text style={st.emptyTxt}>Sin jugadores</Text>
          ) : (
            ids.map((id, i) =>
              row(
                `${i + 1}. ${game.players[id]?.name ?? '?'}`,
                game.stats[id] ?? emptyStats(),
                false,
                id,
              ),
            )
          )}
          {row('Total', total, true)}
        </View>
      </ScrollView>
    </View>
  );
}

export function BoxLegend() {
  return (
    <Text style={st.legend}>
      TB: turnos al bat · VB: veces al bat oficiales · C: carreras · H: hits · CI:
      carreras impulsadas · K: ponches · PR: primera por regla · EE: embasado por
      error · BR: bases robadas · OD: outs a la defensiva · E: errores
    </Text>
  );
}

export function PlayLog({game}: {game: Game}) {
  if (!game.events.length) {
    return <Text style={st.emptyTxt}>Aún no hay jugadas</Text>;
  }
  return (
    <View>
      {[...game.events].reverse().map(e => (
        <View key={e.id} style={st.logRow}>
          <Text style={st.logTime}>{formatClock(e.elapsedMs)}</Text>
          <View style={{flex: 1}}>
            <Text style={st.logTeam}>
              {game.teams[e.teamIdx].name} · turno {e.turn}
            </Text>
            <Text style={st.logTxt}>{e.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: {fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 5},
  headRow: {borderBottomWidth: 1, borderBottomColor: C.border},
  totalRow: {borderTopWidth: 1, borderTopColor: C.border},
  name: {width: 140, fontSize: 14, color: C.text},
  cell: {width: 30, textAlign: 'center', fontSize: 14, color: C.text, fontVariant: ['tabular-nums']},
  avg: {width: 46},
  head: {fontWeight: '700', color: C.muted, fontSize: 12},
  bold: {fontWeight: '800'},
  emptyTxt: {color: C.muted, paddingVertical: 10},
  legend: {color: C.muted, fontSize: 12, lineHeight: 17, marginBottom: 12},
  logRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logTime: {width: 48, color: C.muted, fontVariant: ['tabular-nums'], fontSize: 13},
  logTeam: {fontSize: 12, color: C.muted},
  logTxt: {fontSize: 14, color: C.text},
});
