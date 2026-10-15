import React from 'react';
import {Alert, Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import {Btn, Card, Chip, Screen, SectionTitle} from '../components/ui';
import {useNav} from '../nav';
import {useStore} from '../store';
import {C} from '../theme';
import {ExtraHomeRunRule, Settings} from '../types';

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={st.item}>
      <View style={{flex: 1}}>
        <Text style={st.label}>{label}</Text>
        {hint ? <Text style={st.hint}>{hint}</Text> : null}
      </View>
      <View style={st.stepper}>
        <Pressable
          style={st.stepBtn}
          onPress={() => onChange(Math.max(min, value - step))}>
          <Text style={st.stepTxt}>−</Text>
        </Pressable>
        <Text style={st.value}>
          {value}
          {suffix ? <Text style={st.hint}> {suffix}</Text> : null}
        </Text>
        <Pressable
          style={st.stepBtn}
          onPress={() => onChange(Math.min(max, value + step))}>
          <Text style={st.stepTxt}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={st.item}>
      <View style={{flex: 1}}>
        <Text style={st.label}>{label}</Text>
        {hint ? <Text style={st.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{true: C.primary, false: C.border}}
        thumbColor="#fff"
      />
    </View>
  );
}

const HR_RULES: {key: ExtraHomeRunRule; label: string}[] = [
  {key: 'out', label: 'Es out'},
  {key: 'triple', label: 'Cuenta triple'},
  {key: 'double', label: 'Cuenta doble'},
  {key: 'allow', label: 'Se permite'},
];

export function SettingsScreen() {
  const {pop} = useNav();
  const {settings, updateSettings, resetSettings, currentGame} = useStore();
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) =>
    updateSettings({[k]: v} as Partial<Settings>);

  return (
    <Screen title="Ajustes" onBack={pop}>
      <SectionTitle>Reglas del juego</SectionTitle>
      <Card>
        <Stepper
          label="Duración del juego"
          hint={currentGame?.status === 'live' ? 'Aplica a partir del próximo juego' : undefined}
          value={settings.gameMinutes}
          min={5}
          max={180}
          step={5}
          suffix="min"
          onChange={set('gameMinutes')}
        />
        <Stepper
          label="Lanzamientos por bateador"
          hint="Al agotarlos sin poner la bola en juego es ponche"
          value={settings.maxPitches}
          min={1}
          max={15}
          onChange={set('maxPitches')}
        />
        <Stepper
          label="Outs para cambiar de equipo"
          value={settings.outsPerTurn}
          min={1}
          max={6}
          onChange={set('outsPerTurn')}
        />
        <Stepper
          label="Home runs por equipo"
          hint="0 = sin límite"
          value={settings.maxHomeRuns}
          min={0}
          max={20}
          onChange={set('maxHomeRuns')}
        />
        <View style={[st.item, {flexDirection: 'column', alignItems: 'flex-start'}]}>
          <Text style={st.label}>Home run después del límite</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 8}}>
            {HR_RULES.map(r => (
              <Chip
                key={r.key}
                label={r.label}
                selected={settings.extraHomeRunRule === r.key}
                onPress={() => set('extraHomeRunRule')(r.key)}
              />
            ))}
          </View>
        </View>
      </Card>

      <SectionTitle>Cronómetro</SectionTitle>
      <Card>
        <Stepper
          label="Avisar antes del final"
          hint="0 = sin aviso"
          value={settings.warningMinutes}
          min={0}
          max={30}
          suffix="min"
          onChange={set('warningMinutes')}
        />
        <Toggle label="Vibrar en avisos" value={settings.vibrate} onChange={set('vibrate')} />
        <Toggle
          label="Permitir pausar el reloj"
          hint="Útil por lesión, lluvia o falla de la máquina"
          value={settings.allowPause}
          onChange={set('allowPause')}
        />
      </Card>

      <SectionTitle>Captura</SectionTitle>
      <Card>
        <Toggle
          label="Contador de lanzamientos"
          value={settings.showPitchCounter}
          onChange={set('showPitchCounter')}
        />
        <Toggle
          label="Sugerir ponche al llegar al máximo"
          value={settings.promptStrikeoutOnMaxPitches}
          onChange={set('promptStrikeoutOnMaxPitches')}
        />
        <Toggle
          label="Sugerir avance de corredores"
          hint="Con un doble, los corredores avanzan 2 bases por defecto, etc. (siempre puedes corregirlo)"
          value={settings.suggestRunnerAdvance}
          onChange={set('suggestRunnerAdvance')}
        />
      </Card>

      <Btn
        title="Restaurar valores por defecto"
        variant="outline"
        color={C.neutral}
        onPress={() =>
          Alert.alert('Restaurar ajustes', '¿Regresar a los valores por defecto?', [
            {text: 'Cancelar', style: 'cancel'},
            {text: 'Restaurar', onPress: resetSettings},
          ])
        }
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    gap: 12,
  },
  label: {fontSize: 15, color: C.text, fontWeight: '600'},
  hint: {fontSize: 12, color: C.muted, marginTop: 2},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: 6},
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: {color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22},
  value: {minWidth: 52, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.text},
});
