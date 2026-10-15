import React, {useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {PlayerForm} from '../components/PlayerForm';
import {RosterPicker} from '../components/RosterPicker';
import {Avatar, Btn, Card, Chip, Screen, SectionTitle, Sheet, s} from '../components/ui';
import * as E from '../engine';
import {useNav} from '../nav';
import {useStore} from '../store';
import {C} from '../theme';
import {Game, TeamIdx} from '../types';

function TeamSelect() {
  const {teams, settings, setCurrentGame} = useStore();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const create = () => {
    const ta = teams.find(t => t.id === a);
    const tb = teams.find(t => t.id === b);
    if (!ta || !tb) return;
    setCurrentGame(E.createGame(ta, tb, settings));
  };
  return (
    <>
      <SectionTitle>Equipo 1</SectionTitle>
      <View style={st.wrap}>
        {teams.map(t => (
          <Chip
            key={t.id}
            label={t.name}
            selected={a === t.id}
            onPress={() => {
              setA(t.id);
              if (b === t.id) setB(null);
            }}
          />
        ))}
      </View>
      <SectionTitle>Equipo 2</SectionTitle>
      <View style={st.wrap}>
        {teams
          .filter(t => t.id !== a)
          .map(t => (
            <Chip
              key={t.id}
              label={t.name}
              selected={b === t.id}
              color={C.info}
              onPress={() => setB(t.id)}
            />
          ))}
      </View>
      <Btn
        title="Continuar a line ups"
        big
        disabled={!a || !b}
        onPress={create}
        style={{marginTop: 16}}
      />
    </>
  );
}

function LineupEditor({game, idx}: {game: Game; idx: TeamIdx}) {
  const {updateGame, photos, players} = useStore();
  const team = game.teams[idx];
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const inLineup = team.lineup.map(sl => sl.playerId);
  const roster = players.filter(p => p.teamId === team.teamId);

  const addAll = () => {
    let g = game;
    roster
      .filter(p => !inLineup.includes(p.id))
      .forEach(p => {
        g = E.addToLineup(g, idx, p);
      });
    updateGame(() => g);
  };

  return (
    <Card>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
        <Text style={[st.teamTitle, {flex: 1}]}>{team.name}</Text>
        <Text style={s.muted}>
          {team.lineup.length ? `${team.lineup.length} en line up` : 'Sin line up'}
        </Text>
      </View>
      {team.lineup.length === 0 ? (
        <Text style={[s.muted, {marginBottom: 10}]}>
          Puedes iniciar sin line up: el orden se irá armando durante el juego eligiendo a
          cada bateador.
        </Text>
      ) : (
        team.lineup.map((sl, i) => {
          const name = game.players[sl.playerId]?.name ?? '?';
          return (
            <View key={sl.playerId} style={st.slot}>
              <Text style={st.order}>{i + 1}</Text>
              <Avatar uri={photos[sl.playerId]} name={name} size={34} />
              <Text style={s.name} numberOfLines={1}>
                {name}
              </Text>
              <Pressable
                hitSlop={6}
                onPress={() => updateGame(g => E.moveSlot(g, idx, i, i - 1))}
                style={st.icon}>
                <Text style={st.iconTxt}>▲</Text>
              </Pressable>
              <Pressable
                hitSlop={6}
                onPress={() => updateGame(g => E.moveSlot(g, idx, i, i + 1))}
                style={st.icon}>
                <Text style={st.iconTxt}>▼</Text>
              </Pressable>
              <Pressable
                hitSlop={6}
                onPress={() => updateGame(g => E.removeSlot(g, idx, sl.playerId))}
                style={st.icon}>
                <Text style={[st.iconTxt, {color: C.danger}]}>✕</Text>
              </Pressable>
            </View>
          );
        })
      )}
      <View style={{flexDirection: 'row', gap: 8, marginTop: 6}}>
        <Btn
          title="+ Del roster"
          small
          variant="outline"
          onPress={() => setPicking(true)}
          style={{flex: 1}}
        />
        <Btn
          title="+ Nuevo"
          small
          variant="outline"
          onPress={() => setCreating(true)}
          style={{flex: 1}}
        />
        {roster.some(p => !inLineup.includes(p.id)) ? (
          <Btn title="Todos" small variant="outline" onPress={addAll} style={{flex: 1}} />
        ) : null}
      </View>

      <RosterPicker
        visible={picking}
        teamId={team.teamId}
        excludeIds={inLineup}
        title={`Agregar al line up · ${team.name}`}
        onClose={() => setPicking(false)}
        onPick={p => updateGame(g => E.addToLineup(g, idx, p))}
        onNew={() => {
          setPicking(false);
          setCreating(true);
        }}
        footer={<Btn title="Listo" onPress={() => setPicking(false)} />}
      />
      <PlayerForm
        visible={creating}
        teamId={team.teamId}
        title={`Nuevo jugador · ${team.name}`}
        onClose={() => setCreating(false)}
        onSaved={p => updateGame(g => E.addToLineup(g, idx, p))}
      />
    </Card>
  );
}

export function GameSetupScreen() {
  const {pop, reset} = useNav();
  const {currentGame, setCurrentGame, updateGame} = useStore();
  const [choosing, setChoosing] = useState(false);

  const game = currentGame && currentGame.status === 'setup' ? currentGame : null;

  const start = (battingIdx: TeamIdx) => {
    setChoosing(false);
    updateGame(g => {
      let n = g;
      ([0, 1] as TeamIdx[]).forEach(i => {
        n = E.setLineupClosed(n, i, n.teams[i].lineup.length > 0);
      });
      return E.startGame(n, battingIdx);
    });
    reset([{name: 'home'}, {name: 'game'}]);
  };

  return (
    <Screen title="Nuevo juego" onBack={pop}>
      {!game ? (
        <TeamSelect />
      ) : (
        <>
          <Text style={st.vs}>
            {game.teams[0].name} <Text style={{color: C.muted}}>vs</Text>{' '}
            {game.teams[1].name}
          </Text>
          <LineupEditor game={game} idx={0} />
          <LineupEditor game={game} idx={1} />
          <Text style={[s.muted, {marginBottom: 12}]}>
            El reloj de {game.durationMin} minutos empieza al presionar "Iniciar juego".
            Durante el juego podrás agregar jugadores que lleguen tarde o quitar a quien
            tenga que salir.
          </Text>
          <Btn title="▶ Iniciar juego" big color={C.accent} onPress={() => setChoosing(true)} />
          <Btn
            title="Cambiar equipos"
            variant="ghost"
            color={C.danger}
            onPress={() =>
              Alert.alert('Cambiar equipos', 'Se descartarán los line ups capturados.', [
                {text: 'Cancelar', style: 'cancel'},
                {text: 'Continuar', onPress: () => setCurrentGame(null)},
              ])
            }
            style={{marginTop: 8}}
          />
          <Sheet
            visible={choosing}
            title="¿Qué equipo inicia bateando?"
            onClose={() => setChoosing(false)}>
            {([0, 1] as TeamIdx[]).map(i => (
              <Btn
                key={i}
                title={game.teams[i].name}
                big
                color={i === 0 ? C.primary : C.info}
                onPress={() => start(i)}
                style={{marginBottom: 10}}
              />
            ))}
          </Sheet>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  vs: {fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 12},
  teamTitle: {fontSize: 18, fontWeight: '800', color: C.text},
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  order: {width: 22, fontWeight: '800', color: C.primary, textAlign: 'center'},
  icon: {paddingHorizontal: 6, paddingVertical: 4},
  iconTxt: {fontSize: 15, color: C.neutral},
});
