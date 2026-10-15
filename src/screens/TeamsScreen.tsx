import React, {useState} from 'react';
import {Alert, Text, View} from 'react-native';
import {Avatar, Btn, Empty, Field, Row, Screen, Sheet, s} from '../components/ui';
import {useNav} from '../nav';
import {useStore} from '../store';

export function TeamFormSheet({
  visible,
  onClose,
  initial,
  onSave,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: string;
  onSave: (name: string) => void;
  title: string;
}) {
  const [name, setName] = useState(initial ?? '');
  React.useEffect(() => {
    if (visible) setName(initial ?? '');
  }, [visible, initial]);
  const save = () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del equipo.');
      return;
    }
    onSave(name.trim());
    onClose();
  };
  return (
    <Sheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={<Btn title="Guardar" onPress={save} big />}>
      <Field
        label="Nombre del equipo"
        value={name}
        onChangeText={setName}
        autoFocus
        onSubmitEditing={save}
        returnKeyType="done"
      />
    </Sheet>
  );
}

export function TeamsScreen() {
  const {pop, push} = useNav();
  const {teams, players, addTeam} = useStore();
  const [adding, setAdding] = useState(false);

  return (
    <Screen
      title="Equipos"
      onBack={pop}
      right={<Btn title="+ Equipo" small color="#ffffff33" onPress={() => setAdding(true)} />}>
      {teams.length === 0 ? (
        <Empty text="Aún no hay equipos. Crea el primero." />
      ) : (
        teams.map(t => {
          const count = players.filter(p => p.teamId === t.id).length;
          return (
            <Row key={t.id} onPress={() => push({name: 'team', teamId: t.id})}>
              <Avatar name={t.name} />
              <View style={{flex: 1}}>
                <Text style={s.name}>{t.name}</Text>
                <Text style={s.muted}>
                  {count} jugador{count === 1 ? '' : 'es'}
                </Text>
              </View>
              <Text style={s.muted}>›</Text>
            </Row>
          );
        })
      )}
      <Btn
        title="+ Crear equipo"
        variant="outline"
        onPress={() => setAdding(true)}
        style={{marginTop: 8}}
      />
      <TeamFormSheet
        visible={adding}
        title="Nuevo equipo"
        onClose={() => setAdding(false)}
        onSave={n => addTeam(n)}
      />
    </Screen>
  );
}
