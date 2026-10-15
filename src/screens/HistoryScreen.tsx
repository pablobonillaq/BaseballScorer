import React from 'react';
import {Alert, Text, View} from 'react-native';
import {Empty, Row, Screen, s} from '../components/ui';
import {useNav} from '../nav';
import {useStore} from '../store';
import {C} from '../theme';
import {formatDate} from '../utils';

export function HistoryScreen() {
  const {pop, push} = useNav();
  const {games, deleteGame} = useStore();
  return (
    <Screen title="Historial" onBack={pop}>
      {games.length === 0 ? (
        <Empty text="Aún no hay juegos terminados." />
      ) : (
        games.map(g => {
          const [a, b] = g.teams;
          const winA = a.runs > b.runs;
          const winB = b.runs > a.runs;
          return (
            <Row
              key={g.id}
              onPress={() => push({name: 'gameSummary', gameId: g.id})}
              onLongPress={() =>
                Alert.alert('Eliminar juego', '¿Eliminar este juego del historial?', [
                  {text: 'Cancelar', style: 'cancel'},
                  {text: 'Eliminar', style: 'destructive', onPress: () => deleteGame(g.id)},
                ])
              }>
              <View style={{flex: 1}}>
                <Text style={[s.name, winA && {color: C.primary, fontWeight: '800'}]}>
                  {a.name}  {a.runs}
                </Text>
                <Text style={[s.name, winB && {color: C.primary, fontWeight: '800'}]}>
                  {b.name}  {b.runs}
                </Text>
                <Text style={s.muted}>{formatDate(g.createdAt)}</Text>
              </View>
              <Text style={s.muted}>›</Text>
            </Row>
          );
        })
      )}
      {games.length ? (
        <Text style={[s.muted, {textAlign: 'center', marginTop: 8}]}>
          Mantén presionado un juego para eliminarlo.
        </Text>
      ) : null}
    </Screen>
  );
}
