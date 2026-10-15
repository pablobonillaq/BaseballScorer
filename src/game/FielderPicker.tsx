import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar} from '../components/ui';
import {useStore} from '../store';
import {C} from '../theme';
import {Game, ID, TeamIdx} from '../types';

/** Jugadores disponibles a la defensiva: roster registrado + los que ya estén en el juego */
export function useFieldingRoster(game: Game, idx: TeamIdx) {
  const {players} = useStore();
  const teamId = game.teams[idx].teamId;
  const map = new Map<ID, string>();
  game.teams[idx].lineup.forEach(sl =>
    map.set(sl.playerId, game.players[sl.playerId]?.name ?? '?'),
  );
  players.filter(p => p.teamId === teamId).forEach(p => map.set(p.id, p.name));
  return [...map.entries()]
    .map(([id, name]) => ({id, name}))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Selección de jugadores defensivos. En modo múltiple se respeta el orden
 * en que se tocan (ej. 6 → 4 → 3).
 */
export function FielderPicker({
  game,
  idx,
  selected,
  onChange,
  multi = true,
}: {
  game: Game;
  idx: TeamIdx;
  selected: ID[];
  onChange: (ids: ID[]) => void;
  multi?: boolean;
}) {
  const {photos} = useStore();
  const roster = useFieldingRoster(game, idx);
  const toggle = (id: ID) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange(multi ? [...selected, id] : [id]);
  };
  if (!roster.length) {
    return <Text style={st.empty}>No hay jugadores registrados en {game.teams[idx].name}.</Text>;
  }
  return (
    <View style={st.grid}>
      {roster.map(p => {
        const pos = selected.indexOf(p.id);
        const on = pos >= 0;
        return (
          <Pressable
            key={p.id}
            onPress={() => toggle(p.id)}
            style={[st.item, on && st.itemOn]}>
            <Avatar uri={photos[p.id]} name={p.name} size={40} />
            <Text style={[st.name, on && {color: '#fff'}]} numberOfLines={2}>
              {p.name}
            </Text>
            {on && multi ? (
              <View style={st.badge}>
                <Text style={st.badgeTxt}>{pos + 1}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  item: {
    width: '31%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: '#fff',
  },
  itemOn: {backgroundColor: C.out, borderColor: C.out},
  name: {fontSize: 12, textAlign: 'center', marginTop: 4, color: C.text, fontWeight: '600'},
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: C.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: {color: '#000', fontWeight: '800', fontSize: 12},
  empty: {color: C.muted},
});
