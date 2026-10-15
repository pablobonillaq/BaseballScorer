import React, {useState} from 'react';
import {Text, View} from 'react-native';
import {BoxLegend, BoxScore, PlayLog} from '../components/BoxScore';
import {LineScore} from '../components/Scoreboard';
import {Chip, Empty, Screen} from '../components/ui';
import {elapsedMs} from '../engine';
import {useNav} from '../nav';
import {useStore} from '../store';
import {C} from '../theme';
import {formatClock, formatDate} from '../utils';

export function GameSummaryScreen({gameId}: {gameId: string}) {
  const {pop} = useNav();
  const {games, settings} = useStore();
  const [tab, setTab] = useState<'box' | 'log'>('box');
  const game = games.find(g => g.id === gameId);
  if (!game) {
    return (
      <Screen title="Juego" onBack={pop}>
        <Empty text="Juego no encontrado" />
      </Screen>
    );
  }
  const [a, b] = game.teams;
  const winner = a.runs === b.runs ? null : a.runs > b.runs ? a : b;
  return (
    <Screen title="Resumen del juego" onBack={pop}>
      <Text style={{fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center'}}>
        {winner ? `Ganó ${winner.name}` : 'Empate'}
      </Text>
      <Text style={{color: C.muted, textAlign: 'center', marginBottom: 12}}>
        {formatDate(game.createdAt)} · duración {formatClock(elapsedMs(game))}
      </Text>
      <LineScore game={game} maxHR={settings.maxHomeRuns} />
      <View style={{flexDirection: 'row', marginTop: 12}}>
        <Chip label="Estadísticas" selected={tab === 'box'} onPress={() => setTab('box')} />
        <Chip label="Jugada por jugada" selected={tab === 'log'} onPress={() => setTab('log')} />
      </View>
      {tab === 'box' ? (
        <>
          <BoxScore game={game} idx={0} />
          <BoxScore game={game} idx={1} />
          <BoxLegend />
        </>
      ) : (
        <PlayLog game={game} />
      )}
    </Screen>
  );
}
