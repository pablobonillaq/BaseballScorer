import React, {useState} from 'react';
import {Alert, Text} from 'react-native';
import {PlayerForm} from '../components/PlayerForm';
import {Avatar, Btn, Empty, Row, Screen, SectionTitle, s} from '../components/ui';
import {useNav} from '../nav';
import {useStore} from '../store';
import {C} from '../theme';
import {Player} from '../types';
import {TeamFormSheet} from './TeamsScreen';

export function TeamDetailScreen({teamId}: {teamId: string}) {
  const {pop, push} = useNav();
  const {teams, players, photos, renameTeam, deleteTeam, deletePlayer, currentGame} =
    useStore();
  const team = teams.find(t => t.id === teamId);
  const [editing, setEditing] = useState<Player | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  if (!team) {
    return (
      <Screen title="Equipo" onBack={pop}>
        <Empty text="Equipo no encontrado" />
      </Screen>
    );
  }
  const roster = players
    .filter(p => p.teamId === teamId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const inCurrentGame =
    currentGame?.teams.some(t => t.teamId === teamId) ?? false;

  const confirmDeletePlayer = (p: Player) =>
    Alert.alert('Eliminar jugador', `¿Eliminar a ${p.name}?`, [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Eliminar', style: 'destructive', onPress: () => deletePlayer(p.id)},
    ]);

  const confirmDeleteTeam = () => {
    if (inCurrentGame) {
      Alert.alert('No se puede eliminar', 'Este equipo está en el juego en curso.');
      return;
    }
    Alert.alert(
      'Eliminar equipo',
      `¿Eliminar "${team.name}" y sus ${roster.length} jugadores? Los juegos del historial se conservan.`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTeam(team.id);
            pop();
          },
        },
      ],
    );
  };

  return (
    <Screen
      title={team.name}
      onBack={pop}
      right={<Btn title="Renombrar" small color="#ffffff33" onPress={() => setRenaming(true)} />}>
      <Btn
        title="+ Agregar jugador"
        onPress={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        style={{marginBottom: 12}}
      />
      <Btn
        title="📊 Estadísticas del equipo"
        variant="outline"
        onPress={() => push({name: 'stats', teamId})}
        style={{marginBottom: 12}}
      />
      <SectionTitle>Jugadores ({roster.length})</SectionTitle>
      {roster.length === 0 ? (
        <Empty text="Este equipo no tiene jugadores." />
      ) : (
        roster.map(p => (
          <Row
            key={p.id}
            onPress={() => {
              setEditing(p);
              setFormOpen(true);
            }}
            onLongPress={() => confirmDeletePlayer(p)}>
            <Avatar uri={photos[p.id]} name={p.name} />
            <Text style={s.name}>{p.name}</Text>
            <Btn
              title="🗑"
              small
              variant="ghost"
              color={C.danger}
              onPress={() => confirmDeletePlayer(p)}
            />
          </Row>
        ))
      )}
      <Text style={[s.muted, {marginVertical: 8}]}>
        Toca un jugador para editarlo (nombre o foto).
      </Text>
      <Btn
        title="Eliminar equipo"
        variant="outline"
        color={C.danger}
        onPress={confirmDeleteTeam}
        style={{marginTop: 24}}
      />

      <PlayerForm
        visible={formOpen}
        teamId={teamId}
        player={editing}
        onClose={() => setFormOpen(false)}
      />
      <TeamFormSheet
        visible={renaming}
        title="Renombrar equipo"
        initial={team.name}
        onClose={() => setRenaming(false)}
        onSave={n => renameTeam(team.id, n)}
      />
    </Screen>
  );
}
