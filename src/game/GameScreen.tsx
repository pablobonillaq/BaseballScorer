import React, {useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {PlayerForm} from '../components/PlayerForm';
import {Diamond, LineScore} from '../components/Scoreboard';
import {Avatar, Btn, Row, s} from '../components/ui';
import * as E from '../engine';
import {useNav} from '../nav';
import {useStore} from '../store';
import {C} from '../theme';
import {BatResult, Game, ID, OutKind} from '../types';
import {formatClock} from '../utils';
import {
  BoardSheet,
  ErrorSheet,
  LineupSheet,
  OutDetailSheet,
  RunnerEventSheet,
  RunnersSheet,
} from './sheets';

type Step = 'none' | 'outDetail' | 'error' | 'runners';

interface Pending {
  result: BatResult;
  outKind?: OutKind;
  fielders: ID[];
  errorFielderId?: ID;
  dest?: E.Destinations;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function GameScreen() {
  const insets = useSafeAreaInsets();
  const {reset, pop} = useNav();
  const {currentGame: game, settings, updateGame, archiveGame, photos} = useStore();
  const now = useNow(!!game?.timer.running);

  const [step, setStep] = useState<Step>('none');
  const [pending, setPending] = useState<Pending | null>(null);
  const [sheet, setSheet] = useState<'none' | 'lineup' | 'board' | 'runner'>('none');
  const [newPlayerOpen, setNewPlayerOpen] = useState(false);

  /* ---------------------------- avisos de tiempo ---------------------------- */
  const remaining = game ? E.remainingMs(game, now) : 0;
  useEffect(() => {
    if (!game || game.status !== 'live') return;
    const t = game.timer;
    if (remaining <= 0 && !t.expiredNotified) {
      updateGame(g => ({...g, timer: {...g.timer, expiredNotified: true, warned: true}}));
      if (settings.vibrate) Vibration.vibrate([0, 600, 300, 600, 300, 600]);
      Alert.alert(
        '⏱ Tiempo cumplido',
        `Se cumplieron los ${game.durationMin} minutos. Termina la jugada y finaliza el juego cuando estés listo.`,
      );
    } else if (
      settings.warningMinutes > 0 &&
      remaining > 0 &&
      remaining <= settings.warningMinutes * 60000 &&
      !t.warned
    ) {
      updateGame(g => ({...g, timer: {...g.timer, warned: true}}));
      if (settings.vibrate) Vibration.vibrate([0, 400, 200, 400]);
      Alert.alert('⏱ Aviso', `Quedan ${Math.ceil(remaining / 60000)} minutos de juego.`);
    }
  }, [remaining, game, settings.vibrate, settings.warningMinutes, updateGame]);

  if (!game || game.status !== 'live' || game.battingIdx === null) {
    return (
      <View style={[st.screen, {paddingTop: insets.top + 40, alignItems: 'center'}]}>
        <Text style={{color: '#fff', fontSize: 18}}>No hay juego en curso.</Text>
        <Btn title="Regresar" onPress={pop} style={{marginTop: 16}} />
      </View>
    );
  }

  const bi = game.battingIdx;
  const batting = game.teams[bi];
  const batterId = E.currentBatterId(game);
  const runners = E.runnersOnBase(game);
  const batterName = batterId ? game.players[batterId]?.name ?? '?' : '';
  const slotIdx = E.currentSlotIndex(batting);
  const upcoming = E.upcomingBatters(batting, 2);
  const bs = batterId ? game.stats[batterId] : undefined;

  /* -------------------------------- acciones -------------------------------- */

  const commit = (p: Pending) => {
    const dest = p.dest ?? E.defaultDestinations(game, p.result, settings.suggestRunnerAdvance);
    try {
      const out = E.recordAtBat(game, settings, {
        result: p.result,
        outKind: p.outKind,
        fielders: p.fielders,
        errorFielderId: p.errorFielderId,
        dest,
      });
      updateGame(() => out.game);
      afterPlay(out.switched, out.game);
    } catch (e: any) {
      Alert.alert('Error', String(e?.message ?? e));
    }
    setStep('none');
    setPending(null);
  };

  const afterPlay = (switched: boolean, g: Game) => {
    if (switched && g.battingIdx !== null) {
      if (settings.vibrate) Vibration.vibrate(200);
      Alert.alert(
        'Cambio',
        `${settings.outsPerTurn} outs. Ahora batea ${g.teams[g.battingIdx].name}.`,
      );
    }
  };

  /** Después de elegir resultado (y detalles), decide si hay que preguntar por corredores */
  const goRunnersOrCommit = (p: Pending) => {
    const needRunners =
      runners.length > 0 && p.result !== 'homerun' && p.result !== 'strikeout' &&
      p.result !== 'hrOverLimit';
    if (needRunners) {
      setPending({
        ...p,
        dest: E.defaultDestinations(game, p.result, settings.suggestRunnerAdvance),
      });
      setStep('runners');
    } else {
      commit(p);
    }
  };

  const choose = (result: BatResult) => {
    if (!batterId) return;
    let r = result;
    if (result === 'homerun') {
      r = E.resolveHomeRun(game, settings);
      if (r !== 'homerun') {
        const msg =
          r === 'hrOverLimit'
            ? 'se registra como OUT'
            : `se registra como ${E.RESULT_LABEL[r].toLowerCase()}`;
        Alert.alert(
          'Límite de home runs',
          `${batting.name} ya usó sus ${settings.maxHomeRuns} home runs. Este batazo ${msg}.`,
          [
            {text: 'Cancelar', style: 'cancel'},
            {text: 'Aceptar', onPress: () => goRunnersOrCommit({result: r, fielders: []})},
          ],
        );
        return;
      }
    }
    const p: Pending = {result: r, fielders: []};
    if (E.needsFielders(r)) {
      setPending(p);
      setStep('outDetail');
    } else if (r === 'reachedOnError') {
      setPending(p);
      setStep('error');
    } else {
      goRunnersOrCommit(p);
    }
  };

  const pitch = () => {
    const next = Math.min(settings.maxPitches, game.pitches + 1);
    updateGame(g => E.addPitch(g, 1, settings.maxPitches));
    if (next >= settings.maxPitches && settings.promptStrikeoutOnMaxPitches) {
      Alert.alert(
        `${settings.maxPitches} lanzamientos`,
        `¿Registrar ponche a ${batterName}?`,
        [
          {text: 'No', style: 'cancel'},
          {text: 'Ponche', style: 'destructive', onPress: () => choose('strikeout')},
        ],
      );
    }
  };

  const doUndo = () => {
    if (!E.canUndo(game)) return;
    const last = game.events[game.events.length - 1];
    Alert.alert('Deshacer', last ? `¿Deshacer "${last.description}"?` : '¿Deshacer el último cambio?', [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Deshacer', onPress: () => updateGame(E.undo)},
    ]);
  };

  const finish = () => {
    Alert.alert(
      'Finalizar juego',
      `${game.teams[0].name} ${game.teams[0].runs} – ${game.teams[1].runs} ${game.teams[1].name}\n\n¿Terminar el juego? Ya no se podrán registrar jugadas.`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: () => {
            const final = E.finishGame(game);
            archiveGame(final);
            reset([{name: 'home'}, {name: 'gameSummary', gameId: final.id}]);
          },
        },
      ],
    );
  };

  const togglePause = () =>
    updateGame(g => (g.timer.running ? E.pauseTimer(g) : E.resumeTimer(g)));

  const switchManually = () =>
    Alert.alert(
      'Cambiar equipo al bat',
      `¿Terminar el turno de ${batting.name} sin completar los ${settings.outsPerTurn} outs?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Cambiar', onPress: () => updateGame(E.forceSwitch)},
      ],
    );

  /* --------------------------------- render --------------------------------- */

  const overtime = remaining <= 0;
  const hrLeft =
    settings.maxHomeRuns > 0 ? settings.maxHomeRuns - batting.homeRuns : null;

  return (
    <View style={st.screen}>
      {/* Barra superior */}
      <View style={[st.top, {paddingTop: insets.top + 6}]}>
        <Pressable onPress={pop} hitSlop={10} style={{paddingRight: 10}}>
          <Text style={st.backTxt}>‹</Text>
        </Pressable>
        <View style={{flex: 1}}>
          <Text style={[st.clock, overtime && {color: '#FF6B61'}]}>
            {formatClock(remaining)}
          </Text>
          <Text style={st.clockSub}>
            {overtime
              ? 'Tiempo cumplido'
              : game.timer.running
              ? `de ${game.durationMin} min`
              : 'PAUSADO'}
          </Text>
        </View>
        {settings.allowPause || !game.timer.running ? (
          <Btn
            title={game.timer.running ? '❚❚ Pausa' : '▶ Reanudar'}
            small
            color={game.timer.running ? '#ffffff26' : C.accent}
            onPress={togglePause}
          />
        ) : null}
        <Btn title="Finalizar" small color={C.danger} onPress={finish} style={{marginLeft: 8}} />
      </View>

      <ScrollView contentContainerStyle={{padding: 12, paddingBottom: insets.bottom + 24}}>
        <Pressable onPress={() => setSheet('board')}>
          <LineScore game={game} maxHR={settings.maxHomeRuns} />
        </Pressable>

        {/* Situación */}
        <View style={st.situation}>
          <Diamond
            bases={game.bases}
            outs={game.outs}
            outsPerTurn={settings.outsPerTurn}
            names={game.players}
          />
          <View style={{flex: 1, paddingLeft: 12}}>
            <Text style={st.sitLabel}>AL BAT</Text>
            <Text style={st.sitTeam} numberOfLines={1}>
              {batting.name}
            </Text>
            <Text style={st.sitSmall}>
              Turno {Math.ceil(game.turns.length / 2)} ·{' '}
              {hrLeft === null ? 'HR sin límite' : `HR restantes: ${Math.max(0, hrLeft)}`}
            </Text>
            {upcoming.length ? (
              <Text style={st.sitSmall} numberOfLines={2}>
                En espera: {upcoming.map(id => game.players[id]?.name).join(', ')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Bateador o selección de bateador */}
        {batterId ? (
          <View style={st.batterCard}>
            <Avatar uri={photos[batterId]} name={batterName} size={96} />
            <View style={{flex: 1, marginLeft: 14}}>
              <Text style={st.batterOrder}>
                #{(slotIdx ?? 0) + 1} en el orden
              </Text>
              <Text style={st.batterName} numberOfLines={2}>
                {batterName}
              </Text>
              {bs ? (
                <Text style={s.muted}>
                  Hoy: {bs.h}-{bs.ab}
                  {bs.hr ? ` · ${bs.hr} HR` : ''}
                  {bs.rbi ? ` · ${bs.rbi} CI` : ''}
                  {bs.k ? ` · ${bs.k} K` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <BatterSelect
            game={game}
            onNew={() => setNewPlayerOpen(true)}
            onManage={() => setSheet('lineup')}
          />
        )}

        {batterId ? (
          <>
            {settings.showPitchCounter ? (
              <View style={st.pitchRow}>
                <Text style={st.pitchLbl}>Lanzamientos</Text>
                <View style={{flexDirection: 'row', gap: 6, flex: 1}}>
                  {Array.from({length: settings.maxPitches}, (_, i) => (
                    <View
                      key={i}
                      style={[st.pitchDot, i < game.pitches && st.pitchDotOn]}
                    />
                  ))}
                </View>
                <Btn
                  title="−"
                  small
                  color="#ffffff26"
                  onPress={() => updateGame(g => E.addPitch(g, -1, settings.maxPitches))}
                  disabled={game.pitches === 0}
                />
                <Btn title="+ Lanzamiento" small color={C.accent} onPress={pitch} style={{marginLeft: 6}} />
              </View>
            ) : null}

            <Text style={st.group}>Hit</Text>
            <View style={st.grid}>
              <ResultBtn label="Sencillo" color={C.hit} onPress={() => choose('single')} />
              <ResultBtn label="Doble" color={C.hit} onPress={() => choose('double')} />
              <ResultBtn label="Triple" color={C.hit} onPress={() => choose('triple')} />
              <ResultBtn
                label="Home run"
                color={hrLeft !== null && hrLeft <= 0 ? C.neutral : '#0E6B37'}
                sub={hrLeft !== null && hrLeft <= 0 ? 'Límite alcanzado' : undefined}
                onPress={() => choose('homerun')}
              />
            </View>
            <Text style={st.group}>Out</Text>
            <View style={st.grid}>
              <ResultBtn label="Ponche" color={C.out} onPress={() => choose('strikeout')} />
              <ResultBtn label="Out" sub="rodado, elevado…" color={C.out} onPress={() => choose('out')} />
              <ResultBtn
                label="Doble play"
                color={C.out}
                disabled={runners.length === 0}
                onPress={() => choose('doublePlay')}
              />
              <ResultBtn
                label="Elevado de sacrificio"
                color={C.out}
                disabled={!game.bases[2]}
                onPress={() => choose('sacFly')}
              />
            </View>
            <Text style={st.group}>Se embasa sin hit</Text>
            <View style={st.grid}>
              <ResultBtn label="Primera por regla" color={C.info} onPress={() => choose('ruleFirst')} />
              <ResultBtn label="Por error" color={C.info} onPress={() => choose('reachedOnError')} />
              <ResultBtn
                label="Bola ocupada"
                sub="out a otro corredor"
                color={C.info}
                disabled={runners.length === 0}
                onPress={() => choose('fieldersChoice')}
              />
            </View>
          </>
        ) : null}

        {/* Acciones secundarias */}
        <View style={[st.grid, {marginTop: 14}]}>
          <ResultBtn
            label="Corredores"
            sub="robo, out por salir antes…"
            color="#ffffff1f"
            disabled={runners.length === 0}
            onPress={() => setSheet('runner')}
          />
          <ResultBtn label="Line up" color="#ffffff1f" onPress={() => setSheet('lineup')} />
          <ResultBtn label="Pizarra" color="#ffffff1f" onPress={() => setSheet('board')} />
          <ResultBtn
            label="↶ Deshacer"
            color="#ffffff1f"
            disabled={!E.canUndo(game)}
            onPress={doUndo}
          />
        </View>
        <Btn
          title="Cambiar equipo al bat manualmente"
          small
          variant="ghost"
          color="#9FB5A6"
          onPress={switchManually}
          style={{marginTop: 8}}
        />
      </ScrollView>

      {/* Hojas */}
      <OutDetailSheet
        visible={step === 'outDetail'}
        game={game}
        result={pending?.result ?? null}
        onClose={() => setStep('none')}
        onDone={d => pending && goRunnersOrCommit({...pending, ...d})}
      />
      <ErrorSheet
        visible={step === 'error'}
        game={game}
        onClose={() => setStep('none')}
        onDone={f => pending && goRunnersOrCommit({...pending, errorFielderId: f})}
      />
      <RunnersSheet
        visible={step === 'runners'}
        game={game}
        result={pending?.result ?? null}
        initial={pending?.dest ?? null}
        onClose={() => setStep('none')}
        onConfirm={dest => pending && commit({...pending, dest})}
      />
      <RunnerEventSheet
        visible={sheet === 'runner'}
        game={game}
        onClose={() => setSheet('none')}
        onConfirm={input => {
          try {
            const out = E.recordRunnerEvent(game, settings, input);
            updateGame(() => out.game);
            setSheet('none');
            afterPlay(out.switched, out.game);
          } catch (e: any) {
            Alert.alert('Error', String(e?.message ?? e));
          }
        }}
      />
      <LineupSheet
        visible={sheet === 'lineup'}
        game={game}
        onClose={() => setSheet('none')}
        onChange={updateGame}
      />
      <BoardSheet visible={sheet === 'board'} game={game} onClose={() => setSheet('none')} />
      <PlayerForm
        visible={newPlayerOpen}
        teamId={batting.teamId}
        title={`Nuevo jugador · ${batting.name}`}
        onClose={() => setNewPlayerOpen(false)}
        onSaved={p => updateGame(g => E.addToLineup(g, bi, p))}
      />
    </View>
  );
}

/* ----------------------- Selección de bateador (sin lineup) ----------------------- */

function BatterSelect({
  game,
  onNew,
  onManage,
}: {
  game: Game;
  onNew: () => void;
  onManage: () => void;
}) {
  const {players, photos, updateGame} = useStore();
  const bi = game.battingIdx!;
  const team = game.teams[bi];
  const inLineup = team.lineup.map(sl => sl.playerId);
  const available = players
    .filter(p => p.teamId === team.teamId && !inLineup.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (team.lineupClosed) {
    return (
      <View style={st.selectBox}>
        <Text style={st.selectTitle}>No hay bateadores activos</Text>
        <Text style={[s.muted, {marginBottom: 10}]}>
          Todos los jugadores del line up de {team.name} están fuera. Regresa a alguno o
          agrega uno nuevo.
        </Text>
        <Btn title="Administrar line up" onPress={onManage} />
      </View>
    );
  }

  return (
    <View style={st.selectBox}>
      <Text style={st.selectTitle}>
        Elige al bateador #{team.lineup.length + 1} de {team.name}
      </Text>
      <Text style={[s.muted, {marginBottom: 10}]}>
        El line up se arma conforme pasan a batear. Cuando ya estén todos, presiona
        "Terminar line up" y el orden se repetirá.
      </Text>
      {available.map(p => (
        <Row key={p.id} onPress={() => updateGame(g => E.addToLineup(g, bi, p))}>
          <Avatar uri={photos[p.id]} name={p.name} size={40} />
          <Text style={s.name}>{p.name}</Text>
          <Text style={{color: C.primary, fontWeight: '700'}}>Batear ›</Text>
        </Row>
      ))}
      {available.length === 0 ? (
        <Text style={[s.muted, {marginVertical: 8}]}>
          No hay más jugadores registrados disponibles.
        </Text>
      ) : null}
      <Btn title="+ Agregar jugador nuevo" variant="outline" onPress={onNew} style={{marginTop: 4}} />
      {team.lineup.length > 0 ? (
        <Btn
          title={`Terminar line up (${team.lineup.length} jugadores)`}
          color={C.accent}
          onPress={() => updateGame(g => E.setLineupClosed(g, bi, true))}
          style={{marginTop: 8}}
        />
      ) : null}
    </View>
  );
}

function ResultBtn({
  label,
  sub,
  color,
  onPress,
  disabled,
}: {
  label: string;
  sub?: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Btn
      title={label}
      subtitle={sub}
      color={color}
      onPress={onPress}
      disabled={disabled}
      style={st.resultBtn}
    />
  );
}

const st = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#163A25'},
  top: {
    backgroundColor: C.board,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backTxt: {color: '#fff', fontSize: 34, lineHeight: 36, fontWeight: '300'},
  clock: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  clockSub: {color: '#9FB5A6', fontSize: 12, fontWeight: '700', marginTop: -2},
  situation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.board,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  sitLabel: {color: '#9FB5A6', fontSize: 11, fontWeight: '800', letterSpacing: 1},
  sitTeam: {color: C.accent, fontSize: 22, fontWeight: '800'},
  sitSmall: {color: C.boardText, fontSize: 13, marginTop: 2},
  batterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderLeftWidth: 6,
    borderLeftColor: C.accent,
  },
  batterOrder: {color: C.muted, fontWeight: '700', fontSize: 13},
  batterName: {fontSize: 26, fontWeight: '800', color: C.text},
  pitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: C.board,
    borderRadius: 12,
    padding: 10,
  },
  pitchLbl: {color: C.boardText, fontWeight: '700', marginRight: 10, fontSize: 13},
  pitchDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.boardText,
  },
  pitchDotOn: {backgroundColor: C.accent, borderColor: C.accent},
  group: {
    color: '#9FB5A6',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  resultBtn: {width: '48.5%', minHeight: 62},
  selectBox: {backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 10},
  selectTitle: {fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 4},
});
