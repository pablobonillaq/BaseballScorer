import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {C} from '../theme';
import {Game, TeamIdx} from '../types';

/** Pizarra: carreras por "entrada" (cada par de turnos al bat) + C H E */
export function LineScore({game, maxHR}: {game: Game; maxHR?: number}) {
  const first: TeamIdx = game.turns[0]?.teamIdx ?? 0;
  const order: TeamIdx[] = first === 0 ? [0, 1] : [1, 0];
  const innings = Math.max(1, Math.ceil(game.turns.length / 2));
  const cols = Array.from({length: innings}, (_, i) => i);
  const cell = (teamIdx: TeamIdx, inning: number) => {
    const k = inning * 2 + (teamIdx === first ? 0 : 1);
    const t = game.turns[k];
    if (!t) return '';
    return String(t.runs);
  };
  const currentTurn = game.turns.length - 1;
  const isCurrent = (teamIdx: TeamIdx, inning: number) =>
    game.status === 'live' &&
    inning * 2 + (teamIdx === first ? 0 : 1) === currentTurn;

  return (
    <View style={st.board}>
      <View style={st.row}>
        <View style={st.names}>
          <Text style={st.head}> </Text>
          {order.map(i => (
            <View key={i} style={st.nameCell}>
              {game.battingIdx === i && game.status === 'live' ? (
                <Text style={st.batDot}>●</Text>
              ) : null}
              <Text style={st.teamName} numberOfLines={1}>
                {game.teams[i].name}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal style={{flex: 1}} showsHorizontalScrollIndicator={false}>
          {cols.map(c => (
            <View key={c} style={st.col}>
              <Text style={st.head}>{c + 1}</Text>
              {order.map(i => (
                <Text
                  key={i}
                  style={[st.val, isCurrent(i, c) && st.current]}>
                  {cell(i, c)}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
        {(['runs', 'hits', 'errors'] as const).map((k, j) => (
          <View key={k} style={[st.col, j === 0 && st.sep]}>
            <Text style={[st.head, {color: C.accent}]}>{['C', 'H', 'E'][j]}</Text>
            {order.map(i => (
              <Text key={i} style={[st.val, j === 0 && st.total]}>
                {game.teams[i][k]}
              </Text>
            ))}
          </View>
        ))}
        {maxHR ? (
          <View style={st.col}>
            <Text style={[st.head, {color: C.accent}]}>HR</Text>
            {order.map(i => (
              <Text key={i} style={[st.val, {fontSize: 13}]}>
                {game.teams[i].homeRuns}/{maxHR}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Diamante con corredores y outs */
export function Diamond({
  bases,
  outs,
  outsPerTurn,
  names,
  size = 110,
}: {
  bases: (string | null)[];
  outs: number;
  outsPerTurn: number;
  names: Record<string, {name: string}>;
  size?: number;
}) {
  const b = size * 0.26;
  const base = (occupied: boolean, style: object) => (
    <View
      style={[
        {
          position: 'absolute',
          width: b,
          height: b,
          transform: [{rotate: '45deg'}],
          borderWidth: 2,
          borderColor: C.boardText,
          backgroundColor: occupied ? C.accent : 'transparent',
        },
        style,
      ]}
    />
  );
  const short = (id: string | null) =>
    id ? (names[id]?.name ?? '').split(' ')[0] : '';
  return (
    <View style={{alignItems: 'center'}}>
      <View style={{width: size, height: size * 0.8}}>
        {base(!!bases[1], {left: size / 2 - b / 2, top: 0})}
        {base(!!bases[2], {left: 4, top: size * 0.3})}
        {base(!!bases[0], {right: 4, top: size * 0.3})}
        <Text style={[st.runner, {top: b + 2, left: 0, right: 0, textAlign: 'center'}]} numberOfLines={1}>
          {short(bases[1])}
        </Text>
        <Text style={[st.runner, {top: size * 0.3 + b + 4, left: 0, width: size / 2}]} numberOfLines={1}>
          {short(bases[2])}
        </Text>
        <Text style={[st.runner, {top: size * 0.3 + b + 4, right: 0, width: size / 2, textAlign: 'right'}]} numberOfLines={1}>
          {short(bases[0])}
        </Text>
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2}}>
        <Text style={st.outsLbl}>OUTS</Text>
        {Array.from({length: outsPerTurn}, (_, i) => (
          <View
            key={i}
            style={[st.outDot, i < outs && {backgroundColor: C.danger, borderColor: C.danger}]}
          />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  board: {
    backgroundColor: C.board,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  row: {flexDirection: 'row'},
  names: {width: 112},
  nameCell: {flexDirection: 'row', alignItems: 'center', height: 26},
  batDot: {color: C.accent, fontSize: 10, marginRight: 4},
  teamName: {color: C.boardText, fontWeight: '700', fontSize: 15, flex: 1},
  head: {color: '#9FB5A6', fontSize: 12, height: 18, textAlign: 'center', fontWeight: '700'},
  col: {width: 30, alignItems: 'center'},
  sep: {borderLeftWidth: 1, borderLeftColor: '#ffffff33', marginLeft: 4, width: 34},
  val: {color: C.boardText, fontSize: 16, height: 26, lineHeight: 26, textAlign: 'center', fontVariant: ['tabular-nums']},
  total: {fontWeight: '800', color: '#fff', fontSize: 18},
  current: {color: C.accent, fontWeight: '800'},
  runner: {position: 'absolute', color: C.boardText, fontSize: 10, fontWeight: '600'},
  outsLbl: {color: '#9FB5A6', fontSize: 11, fontWeight: '700'},
  outDot: {width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.boardText},
});
