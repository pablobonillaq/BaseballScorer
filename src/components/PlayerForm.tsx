import React, {useEffect, useState} from 'react';
import {Alert, View} from 'react-native';
import {
  ImagePickerResponse,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import {useStore} from '../store';
import {C} from '../theme';
import {Player} from '../types';
import {Avatar, Btn, Field, Sheet} from './ui';

const PICK_OPTS = {
  mediaType: 'photo' as const,
  includeBase64: true,
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.6 as const,
};

function toDataUri(res: ImagePickerResponse): string | null {
  if (res.didCancel) return null;
  if (res.errorCode) {
    Alert.alert('No se pudo obtener la foto', res.errorMessage ?? res.errorCode);
    return null;
  }
  const a = res.assets?.[0];
  if (!a?.base64) return null;
  return `data:${a.type ?? 'image/jpeg'};base64,${a.base64}`;
}

export function PlayerForm({
  visible,
  teamId,
  player,
  onClose,
  onSaved,
  title,
}: {
  visible: boolean;
  teamId: string;
  player?: Player | null;
  onClose: () => void;
  onSaved?: (p: Player) => void;
  title?: string;
}) {
  const {savePlayer, photos, players} = useStore();
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      setName(player?.name ?? '');
      setPhoto(undefined);
    }
  }, [visible, player]);

  const shownPhoto =
    photo === undefined ? (player ? photos[player.id] : undefined) : photo ?? undefined;

  const pick = async (camera: boolean) => {
    try {
      const res = camera
        ? await launchCamera({...PICK_OPTS, saveToPhotos: false})
        : await launchImageLibrary({...PICK_OPTS, selectionLimit: 1});
      const uri = toDataUri(res);
      if (uri) setPhoto(uri);
    } catch (e: any) {
      Alert.alert('Error', String(e?.message ?? e));
    }
  };

  const save = () => {
    const n = name.trim();
    if (!n) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del jugador.');
      return;
    }
    const dup = players.find(
      p =>
        p.teamId === teamId &&
        p.id !== player?.id &&
        p.name.toLowerCase() === n.toLowerCase(),
    );
    const doSave = () => {
      const p = savePlayer({id: player?.id, teamId, name: n, photo});
      onSaved?.(p);
      onClose();
    };
    if (dup) {
      Alert.alert('Nombre repetido', `Ya existe "${dup.name}" en este equipo. ¿Guardar de todos modos?`, [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Guardar', onPress: doSave},
      ]);
    } else {
      doSave();
    }
  };

  return (
    <Sheet
      visible={visible}
      title={title ?? (player ? 'Editar jugador' : 'Nuevo jugador')}
      onClose={onClose}
      footer={<Btn title="Guardar" onPress={save} big />}>
      <View style={{alignItems: 'center', marginBottom: 16}}>
        <Avatar uri={shownPhoto} name={name || '?'} size={110} />
      </View>
      <View style={{flexDirection: 'row', gap: 8, marginBottom: 16}}>
        <Btn
          title="📷 Cámara"
          variant="outline"
          onPress={() => pick(true)}
          style={{flex: 1}}
        />
        <Btn
          title="🖼 Galería"
          variant="outline"
          onPress={() => pick(false)}
          style={{flex: 1}}
        />
        {shownPhoto ? (
          <Btn
            title="Quitar"
            variant="outline"
            color={C.danger}
            onPress={() => setPhoto(null)}
          />
        ) : null}
      </View>
      <Field
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Nombre del jugador"
        autoFocus={!player}
        returnKeyType="done"
        onSubmitEditing={save}
      />
    </Sheet>
  );
}
