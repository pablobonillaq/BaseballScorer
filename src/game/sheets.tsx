import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {BoxLegend, BoxScore, PlayLog} from '../components/BoxScore';
import {PlayerForm} from '../components/PlayerForm';
import {RosterPicker} from '../components/RosterPicker';
import {LineScore} from '../components/Scoreboard';
import {Avatar, Btn, Chip, Row, SectionTitle, Sheet, s} from '../components/ui';
import * as E from '../engine';
import {useStore} from '../store';
import {C} from '../theme';
import {
  BatResult,
  Dest,
  Game,
  ID,
  OutKind,
  RunnerEventKind,
  TeamIdx,
} from '../types';
import {FielderPicker} from './FielderPicker';

/* ------------------------------------------------------------------ */
/* Detalle del out: tipo + quién lo hizo                               */
/* ------------------------------------------------------------------ */

export function OutDetailSheet({
  visible,
  game,
  result,
  onClose,
  onDone,
}: {
  visible: boolean;
  game: Game;
  result: BatResult | null;
  onClose: () => void;
  onDone: (d: {outKind?: OutKind; fielders: ID[]}) => void;
}) {
  const [kind, setKind] = useState<OutKind | undefined>(undefined);
  const [fielders, setFielders] = useState<ID[]>([]);
  useEffect(() => {
    if (visible) {
      setKind(result === 'sacFly' ? 'fly' : undefined);
      setFielders([]);
    }
  }, [visible, result]);
  if (!result) return null;
  const showKind = result === 'out' || result === 'doublePlay';
  const title =
    result === 'fieldersChoice'
      ? 'Bola ocupada: ¿quién hizo el out?'
      : `${E.RESULT_LABEL[result]}: ¿quién hizo el out?`;
  return (
    <Sheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <Btn
          title={fielders.length ? 'Continuar' : 'Continuar sin especificar'}
          color={C.out}
          big
          onPress={() => onDone({outKind: kind, fielders})}
        />
      }>
      {showKind ? (
        <>
          <SectionTitle>Tipo de out</SectionTitle>
          <View style={st.wrap}>
            {(Object.keys(E.OUT_KIND_LABEL) as OutKind[]).map(k => (
              <Chip
                key={k}
                label={E.OUT_KIND_LABEL[k]}
                selected={kind === k}
                color={C.out}
                onPress={() => setKind(kind === k ? undefined : k)}
              />
            ))}
          </View>
        </>
      ) : null}
      <SectionTitle>
        Jugadores de {game.teams[E.fieldingIdx(game)].name} (en orden de la jugada)
      </SectionTitle>
      <FielderPicker
        game={game}
        idx={E.fieldingIdx(game)}
        selected={fielders}
        onChange={setFielders}
      />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Error: quién lo cometió                                             */
/* ------------------------------------------------------------------ */

export function ErrorSheet({
  visible,
  game,
  onClose,
  onDone,
}: {
  visible: boolean;
  game: Game;
  onClose: () => void;
  onDone: (fielderId?: ID) => void;
}) {
  const [sel, setSel] = useState<ID[]>([]);
  useEffect(() => {
    if (visible) setSel([]);
  }, [visible]);
  return (
    <Sheet
      visible={visible}
      title="¿Quién cometió el error?"
      onClose={onClose}
      footer={
        <Btn
          title={sel.length ? 'Continuar' : 'Continuar sin especificar'}
          color={C.info}
          big
          onPress={() => onDone(sel[0])}
        />
      }>
      <FielderPicker
        game={game}
        idx={E.fieldingIdx(game)}
        selected={sel}
        onChange={setSel}
        multi={false}
      />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Corredores: ¿quién anotó / quién fue out?                           */
/* ------------------------------------------------------------------ */

function destLabel(d: Dest) {
  return d === 'out' ? 'Out' : d === 4 ? 'Anotó' : `${d}ª`;
}

function DestPicker({
  from,
  value,
  onChange,
  allowStay,
}: {
  from: number;
  value: Dest;
  onChange: (d: Dest) => void;
  allowStay: boolean;
}) {
  const opts: Dest[] = [];
  for (let b = Math.max(1, allowStay ? from : from + 1); b <= 3; b++) {
    opts.push(b as Dest);
  }
  opts.push(4, 'out');
  return (
    <View style={st.wrap}>
      {opts.map(o => (
        <Chip
          key={String(o)}
          label={o === from ? `Se queda (${o}ª)` : destLabel(o)}
          selected={value === o}
          color={o === 'out' ? C.out : o === 4 ? C.hit : C.info}
          onPress={() => onChange(o)}
        />
      ))}
    </View>
  );
}

export function RunnersSheet({
  visible,
  game,
  result,
  initial,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  game: Game;
  result: BatResult | null;
  initial: E.Destinations | null;
  onClose: () => void;
  onConfirm: (d: E.Destinations) => void;
}) {
  const {photos} = useStore();
  const [dest, setDest] = useState<E.Destinations | null>(initial);
  useEffect(() => {
    if (visible) setDest(initial);
  }, [visible, initial]);
  if (!result || !dest) return null;
  const batterId = E.currentBatterId(game);
  const runners = E.runnersOnBase(game);
  const batterOut = E.isBatterOut(result);

  const confirm = () => {
    const err = E.validateDestinations(game, dest);
    if (err) {
      Alert.alert('Revisa los corredores', err);
      return;
    }
    onConfirm(dest);
  };

  const scored = [
    ...runners.filter(r => dest.runners[r.id] === 4).map(r => r.id),
    ...(dest.batter === 4 && !batterOut && batterId ? [batterId] : []),
  ];

  return (
    <Sheet
      visible={visible}
      title={`${E.RESULT_LABEL[result]} · Corredores`}
      onClose={onClose}
      footer={
        <>
          <Text style={[s.muted, {textAlign: 'center'}]}>
            {scored.length
              ? `Anotan ${scored.length}: ${scored
                  .map(id => game.players[id]?.name)
                  .join(', ')}`
              : 'Nadie anota en esta jugada'}
          </Text>
          <Btn title="Registrar jugada" big onPress={confirm} />
        </>
      }>
      <Text style={[s.muted, {marginBottom: 10}]}>
        Indica a dónde llegó cada corredor, si anotó carrera o si lo hicieron out.
      </Text>
      {runners.map(r => {
        const name = game.players[r.id]?.name ?? '?';
        return (
          <View key={r.id} style={st.runnerBox}>
            <View style={st.runnerHead}>
              <Avatar uri={photos[r.id]} name={name} size={36} />
              <Text style={s.name}>{name}</Text>
              <Text style={st.onBase}>en {r.base}ª</Text>
            </View>
            <DestPicker
              from={r.base}
              allowStay
              value={dest.runners[r.id] ?? r.base}
              onChange={d =>
                setDest({...dest, runners: {...dest.runners, [r.id]: d}})
              }
            />
          </View>
        );
      })}
      {batterId && !batterOut ? (
        <View style={[st.runnerBox, {borderColor: C.accent}]}>
          <View style={st.runnerHead}>
            <Avatar uri={photos[batterId]} name={game.players[batterId]?.name ?? '?'} size={36} />
            <Text style={s.name}>{game.players[batterId]?.name}</Text>
            <Text style={st.onBase}>bateador</Text>
          </View>
          <DestPicker
            from={0}
            allowStay={false}
            value={dest.batter}
            onChange={d => setDest({...dest, batter: d})}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Eventos de corredor sin turno al bat (robo, out por salir antes…)   */
/* ------------------------------------------------------------------ */

const RUNNER_KINDS: RunnerEventKind[] = [
  'leftEarly',
  'caughtStealing',
  'runnerOut',
  'steal',
  'advanceOnError',
  'advance',
];
const isOutKind = (k: RunnerEventKind) =>
  k === 'leftEarly' || k === 'caughtStealing' || k === 'runnerOut';

export function RunnerEventSheet({
  visible,
  game,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  game: Game;
  onClose: () => void;
  onConfirm: (i: E.RunnerEventInput) => void;
}) {
  const {photos} = useStore();
  const runners = E.runnersOnBase(game);
  const [runnerId, setRunnerId] = useState<ID | null>(null);
  const [kind, setKind] = useState<RunnerEventKind>('leftEarly');
  const [dest, setDest] = useState<Dest>('out');
  const [fielders, setFielders] = useState<ID[]>([]);

  useEffect(() => {
    if (visible) {
      setRunnerId(runners.length === 1 ? runners[0].id : null);
      setKind('leftEarly');
      setDest('out');
      setFielders([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const runner = runners.find(r => r.id === runnerId);
  const pickKind = (k: RunnerEventKind) => {
    setKind(k);
    setFielders([]);
    if (isOutKind(k)) setDest('out');
    else if (runner) setDest(Math.min(4, runner.base + 1) as Dest);
  };
  const pickRunner = (id: ID) => {
    setRunnerId(id);
    const r = runners.find(x => x.id === id)!;
    if (!isOutKind(kind)) setDest(Math.min(4, r.base + 1) as Dest);
  };

  const confirm = () => {
    if (!runner) {
      Alert.alert('Elige un corredor');
      return;
    }
    if (dest !== 'out' && dest !== 4) {
      const occupied = game.bases[dest - 1];
      if (occupied && occupied !== runner.id) {
        Alert.alert(
          'Base ocupada',
          `${game.players[occupied]?.name} está en ${dest}ª. Mueve primero a ese corredor.`,
        );
        return;
      }
    }
    onConfirm({
      kind,
      runnerId: runner.id,
      dest,
      fielders: isOutKind(kind) ? fielders : [],
      errorFielderId: kind === 'advanceOnError' ? fielders[0] : undefined,
    });
  };

  const destOpts: Dest[] = [];
  if (runner && !isOutKind(kind)) {
    for (let b = runner.base + 1; b <= 3; b++) destOpts.push(b as Dest);
    destOpts.push(4);
  }

  return (
    <Sheet
      visible={visible}
      title="Jugada de corredor"
      onClose={onClose}
      footer={<Btn title="Registrar" big onPress={confirm} disabled={!runner} />}>
      <SectionTitle>Corredor</SectionTitle>
      {runners.map(r => {
        const name = game.players[r.id]?.name ?? '?';
        return (
          <Row
            key={r.id}
            onPress={() => pickRunner(r.id)}
            style={runnerId === r.id ? {borderColor: C.primary, borderWidth: 2} : undefined}>
            <Avatar uri={photos[r.id]} name={name} size={34} />
            <Text style={s.name}>{name}</Text>
            <Text style={st.onBase}>en {r.base}ª</Text>
          </Row>
        );
      })}
      <SectionTitle>¿Qué pasó?</SectionTitle>
      <View style={st.wrap}>
        {RUNNER_KINDS.map(k => (
          <Chip
            key={k}
            label={E.RUNNER_EVENT_LABEL[k]}
            selected={kind === k}
            color={isOutKind(k) ? C.out : C.info}
            onPress={() => pickKind(k)}
          />
        ))}
      </View>
      {destOpts.length ? (
        <>
          <SectionTitle>Llegó a</SectionTitle>
          <View style={st.wrap}>
            {destOpts.map(d => (
              <Chip
                key={String(d)}
                label={destLabel(d)}
                selected={dest === d}
                color={d === 4 ? C.hit : C.info}
                onPress={() => setDest(d)}
              />
            ))}
          </View>
        </>
      ) : null}
      {isOutKind(kind) || kind === 'advanceOnError' ? (
        <>
          <SectionTitle>
            {kind === 'advanceOnError' ? '¿Quién cometió el error?' : '¿Quién hizo el out? (opcional)'}
          </SectionTitle>
          <FielderPicker
            game={game}
            idx={E.fieldingIdx(game)}
            selected={fielders}
            onChange={setFielders}
            multi={kind !== 'advanceOnError'}
          />
        </>
      ) : null}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Administrar line up durante el juego                                */
/* ------------------------------------------------------------------ */

export function LineupSheet({
  visible,
  game,
  onClose,
  onChange,
}: {
  visible: boolean;
  game: Game;
  onClose: () => void;
  onChange: (fn: (g: Game) => Game) => void;
}) {
  const {photos} = useStore();
  const [idx, setIdx] = useState<TeamIdx>(game.battingIdx ?? 0);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (visible) setIdx(game.battingIdx ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const team = game.teams[idx];
  const current = game.battingIdx === idx ? E.currentSlotIndex(team) : null;

  const toggle = (playerId: ID, active: boolean) => {
    const name = game.players[playerId]?.name;
    if (!active) {
      Alert.alert(
        'Quitar del line up',
        `${name} ya no batea en este juego (lesión, emergencia…). Puedes regresarlo después.`,
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Quitar',
            style: 'destructive',
            onPress: () => onChange(g => E.setSlotActive(g, idx, playerId, false)),
          },
        ],
      );
    } else {
      onChange(g => E.setSlotActive(g, idx, playerId, true));
    }
  };

  return (
    <Sheet visible={visible} title="Line up" onClose={onClose}>
      <View style={st.wrap}>
        {([0, 1] as TeamIdx[]).map(i => (
          <Chip
            key={i}
            label={game.teams[i].name}
            selected={idx === i}
            onPress={() => setIdx(i)}
          />
        ))}
      </View>
      {!team.lineupClosed ? (
        <Text style={[s.muted, {marginBottom: 8}]}>
          El line up se está armando conforme pasan a batear.
        </Text>
      ) : null}
      {team.lineup.length === 0 ? (
        <Text style={[s.muted, {marginVertical: 12}]}>Sin jugadores aún.</Text>
      ) : (
        team.lineup.map((sl, i) => {
          const name = game.players[sl.playerId]?.name ?? '?';
          const st2 = game.stats[sl.playerId];
          return (
            <View
              key={sl.playerId}
              style={[st.slot, !sl.active && {opacity: 0.45}, current === i && st.slotCurrent]}>
              <Text style={st.order}>{i + 1}</Text>
              <Avatar uri={photos[sl.playerId]} name={name} size={34} />
              <View style={{flex: 1}}>
                <Text style={s.name} numberOfLines={1}>
                  {name}
                  {!sl.active ? ' (fuera)' : ''}
                </Text>
                {st2 ? (
                  <Text style={s.muted}>
                    {st2.h}-{st2.ab} · {st2.r} C · {st2.rbi} CI
                  </Text>
                ) : null}
              </View>
              <Btn
                title={sl.active ? 'Quitar' : 'Regresar'}
                small
                variant="outline"
                color={sl.active ? C.danger : C.primary}
                onPress={() => toggle(sl.playerId, !sl.active)}
              />
            </View>
          );
        })
      )}
      <Btn
        title="+ Agregar jugador al final del orden"
        variant="outline"
        onPress={() => setPicking(true)}
        style={{marginTop: 12}}
      />
      {!team.lineupClosed && team.lineup.length > 0 ? (
        <Btn
          title="Terminar line up"
          color={C.accent}
          onPress={() => onChange(g => E.setLineupClosed(g, idx, true))}
          style={{marginTop: 8}}
        />
      ) : null}

      <RosterPicker
        visible={picking}
        teamId={team.teamId}
        excludeIds={team.lineup.map(sl => sl.playerId)}
        title={`Agregar a ${team.name}`}
        onClose={() => setPicking(false)}
        onPick={p => {
          onChange(g => E.addToLineup(g, idx, p));
          setPicking(false);
        }}
        onNew={() => {
          setPicking(false);
          setCreating(true);
        }}
      />
      <PlayerForm
        visible={creating}
        teamId={team.teamId}
        title={`Nuevo jugador · ${team.name}`}
        onClose={() => setCreating(false)}
        onSaved={p => onChange(g => E.addToLineup(g, idx, p))}
      />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Pizarra completa                                                    */
/* ------------------------------------------------------------------ */

export function BoardSheet({
  visible,
  game,
  onClose,
}: {
  visible: boolean;
  game: Game;
  onClose: () => void;
}) {
  const {settings} = useStore();
  const [tab, setTab] = useState<'box' | 'log'>('box');
  return (
    <Sheet visible={visible} title="Pizarra" onClose={onClose}>
      <LineScore game={game} maxHR={settings.maxHomeRuns} />
      <View style={[st.wrap, {marginTop: 12}]}>
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
    </Sheet>
  );
}

const st = StyleSheet.create({
  wrap: {flexDirection: 'row', flexWrap: 'wrap'},
  runnerBox: {
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  runnerHead: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8},
  onBase: {color: C.muted, fontWeight: '700'},
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  slotCurrent: {backgroundColor: '#FFF4D6', borderRadius: 8},
  order: {width: 22, fontWeight: '800', color: C.primary, textAlign: 'center'},
});
