import React from 'react';
import {Alert, Text, View} from 'react-native';
import {LineScore} from '../components/Scoreboard';
import {Btn, Card, Screen, s} from '../components/ui';
import {useNav} from '../nav';
import {useStore} from '../store';
import {C} from '../theme';

export function HomeScreen() {
  const {push} = useNav();
  const {currentGame, setCurrentGame, teams, settings} = useStore();

  const newGame = () => {
    if (teams.length < 2) {
      Alert.alert(
        'Faltan equipos',
        'Necesitas al menos 2 equipos registrados para iniciar un juego.',
        [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Ir a equipos', onPress: () => push({name: 'teams'})},
        ],
      );
      return;
    }
    if (currentGame) {
      Alert.alert(
        'Hay un juego en curso',
        '¿Quieres descartarlo y empezar uno nuevo? (Se perderá el juego actual)',
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              setCurrentGame(null);
              push({name: 'gameSetup'});
            },
          },
        ],
      );
      return;
    }
    push({name: 'gameSetup'});
  };

  return (
    <Screen title="⚾ Baseball Scorer">
      {currentGame ? (
        <Card style={{borderColor: C.accent, borderWidth: 2}}>
          <Text style={[s.section, {marginTop: 0}]}>
            {currentGame.status === 'setup' ? 'Juego por iniciar' : 'Juego en curso'}
          </Text>
          {currentGame.status === 'live' ? (
            <View style={{marginBottom: 12}}>
              <LineScore game={currentGame} maxHR={settings.maxHomeRuns} />
            </View>
          ) : (
            <Text style={{fontSize: 17, fontWeight: '700', marginBottom: 12, color: C.text}}>
              {currentGame.teams[0].name} vs {currentGame.teams[1].name}
            </Text>
          )}
          <Btn
            title="Continuar juego"
            color={C.accent}
            big
            onPress={() =>
              push({name: currentGame.status === 'setup' ? 'gameSetup' : 'game'})
            }
          />
        </Card>
      ) : null}

      <Btn title="Nuevo juego" big onPress={newGame} style={{marginBottom: 12}} />
      <Btn
        title="Equipos y jugadores"
        variant="outline"
        big
        onPress={() => push({name: 'teams'})}
        style={{marginBottom: 12}}
      />
      <Btn
        title="Estadísticas de jugadores"
        variant="outline"
        big
        onPress={() => push({name: 'stats'})}
        style={{marginBottom: 12}}
      />
      <Btn
        title="Historial de juegos"
        variant="outline"
        big
        onPress={() => push({name: 'history'})}
        style={{marginBottom: 12}}
      />
      <Btn
        title="Ajustes"
        variant="outline"
        color={C.neutral}
        big
        onPress={() => push({name: 'settings'})}
      />
    </Screen>
  );
}
