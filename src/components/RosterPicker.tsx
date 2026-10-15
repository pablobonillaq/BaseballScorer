import React from 'react';
import {Text} from 'react-native';
import {useStore} from '../store';
import {Player} from '../types';
import {Avatar, Btn, Empty, Row, Sheet, s} from './ui';

/** Lista los jugadores registrados de un equipo para elegir uno. */
export function RosterPicker({
  visible,
  teamId,
  excludeIds = [],
  title,
  onClose,
  onPick,
  onNew,
  footer,
  emptyText,
}: {
  visible: boolean;
  teamId: string;
  excludeIds?: string[];
  title: string;
  onClose: () => void;
  onPick: (p: Player) => void;
  onNew?: () => void;
  footer?: React.ReactNode;
  emptyText?: string;
}) {
  const {players, photos} = useStore();
  const list = players
    .filter(p => p.teamId === teamId && !excludeIds.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Sheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <>
          {onNew ? (
            <Btn title="+ Agregar jugador nuevo" variant="outline" onPress={onNew} />
          ) : null}
          {footer}
        </>
      }>
      {list.length === 0 ? (
        <Empty text={emptyText ?? 'No hay más jugadores registrados.'} />
      ) : (
        list.map(p => (
          <Row key={p.id} onPress={() => onPick(p)}>
            <Avatar uri={photos[p.id]} name={p.name} />
            <Text style={s.name}>{p.name}</Text>
          </Row>
        ))
      )}
    </Sheet>
  );
}
