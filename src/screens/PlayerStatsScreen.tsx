import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Avatar, Card, Empty, Screen, SectionTitle, s} from '../components/ui';
import {useNav} from '../nav';
import {useStore} from '../store';
import {careerFor, fmt1, fmt3, fmtPct, gamesFor, leagueContext, rates} from '../stats';
import {C} from '../theme';
import {formatDate} from '../utils';

function Tile({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[st.tile, highlight && st.tileHi]}>
      <Text style={[st.tileValue, highlight && {color: '#fff'}]}>{value}</Text>
      <Text style={[st.tileLabel, highlight && {color: C.accent}]}>{label}</Text>
      {hint ? <Text style={[st.tileHint, highlight && {color: '#ffffffaa'}]}>{hint}</Text> : null}
    </View>
  );
}

export function PlayerStatsScreen({
  playerId,
  teamId,
  includeLive,
}: {
  playerId: string;
  teamId: string;
  includeLive: boolean;
}) {
  const {pop, push} = useNav();
  const {players, teams, games, currentGame, photos} = useStore();
  const [showInfo, setShowInfo] = useState(false);

  const pool = useMemo(
    () => gamesFor(games, currentGame, includeLive),
    [games, currentGame, includeLive],
  );
  const league = useMemo(() => leagueContext(pool), [pool]);
  const player = players.find(p => p.id === playerId);
  const team = teams.find(t => t.id === teamId);
  const career = useMemo(
    () => careerFor(playerId, pool, player?.name ?? '', teamId),
    [playerId, pool, player, teamId],
  );
  const r = rates(career.s, league);
  const x = career.s;

  return (
    <Screen title="Estadísticas del jugador" onBack={pop}>
      <View style={st.head}>
        <Avatar uri={photos[playerId]} name={career.name || '?'} size={88} />
        <View style={{flex: 1, marginLeft: 14}}>
          <Text style={st.name}>{career.name || 'Jugador'}</Text>
          <Text style={s.muted}>
            {team?.name ?? ''} · {career.g} juego{career.g === 1 ? '' : 's'}
          </Text>
          <Text style={st.slash}>
            {fmt3(r.avg)} / {fmt3(r.obp)} / {fmt3(r.slg)}
          </Text>
          <Text style={st.slashLbl}>AVG / OBP / SLG</Text>
        </View>
      </View>

      {x.pa === 0 && career.g === 0 ? (
        <Empty text="Este jugador aún no tiene juegos registrados." />
      ) : (
        <>
          <SectionTitle>Promedios</SectionTitle>
          <View style={st.grid}>
            <Tile label="AVG" value={fmt3(r.avg)} hint="Promedio de bateo" highlight />
            <Tile label="OPS" value={fmt3(r.ops)} hint="OBP + SLG" highlight />
            <Tile label="WAR" value={fmt1(r.war)} hint="Aprox. ofensivo" highlight />
            <Tile label="OBP" value={fmt3(r.obp)} hint="Porcentaje en base" />
            <Tile label="SLG" value={fmt3(r.slg)} hint="Slugging" />
            <Tile label="wOBA" value={fmt3(r.woba)} hint={`Liga: ${fmt3(league.woba)}`} />
            <Tile label="ISO" value={fmt3(r.iso)} hint="Poder aislado" />
            <Tile label="BABIP" value={fmt3(r.babip)} hint="Prom. bola en juego" />
            <Tile label="K%" value={fmtPct(r.kPct)} hint="Ponches / turnos" />
            <Tile label="CC" value={fmt1(r.rc)} hint="Carreras creadas" />
            <Tile label="wRAA" value={fmt1(r.wraa)} hint="Carreras sobre prom." />
            <Tile label="BT" value={r.tb} hint="Bases totales" />
          </View>

          <SectionTitle>Totales</SectionTitle>
          <View style={st.grid}>
            <Tile label="J" value={career.g} hint="Juegos" />
            <Tile label="TB" value={x.pa} hint="Turnos al bat" />
            <Tile label="VB" value={x.ab} hint="Veces al bat" />
            <Tile label="H" value={x.h} hint="Hits" />
            <Tile label="1B" value={x.b1} hint="Sencillos" />
            <Tile label="2B" value={x.b2} hint="Dobles" />
            <Tile label="3B" value={x.b3} hint="Triples" />
            <Tile label="HR" value={x.hr} hint="Home runs" />
            <Tile label="C" value={x.r} hint="Carreras" />
            <Tile label="CI" value={x.rbi} hint="Impulsadas" />
            <Tile label="K" value={x.k} hint="Ponches" />
            <Tile label="PR" value={x.ruleFirst} hint="Primera por regla" />
            <Tile label="EE" value={x.roe} hint="Embasado x error" />
            <Tile label="SF" value={r.sf} hint="Elevado sacrificio" />
            <Tile label="BR" value={x.sb} hint="Bases robadas" />
            <Tile label="EXB" value={r.xbh} hint="Extra bases" />
          </View>

          <SectionTitle>Defensa</SectionTitle>
          <View style={st.grid}>
            <Tile label="OD" value={x.defOuts} hint="Outs en que participó" />
            <Tile label="E" value={x.e} hint="Errores" />
          </View>

          <Pressable onPress={() => setShowInfo(v => !v)}>
            <Text style={st.infoLink}>
              {showInfo ? '▾' : '▸'} ¿Cómo se calcula el WAR?
            </Text>
          </Pressable>
          {showInfo ? (
            <Card>
              <Text style={st.info}>
                El WAR oficial necesita datos que esta liga no registra (posición, defensa
                avanzada, ajustes de parque), así que aquí es una aproximación sólo
                ofensiva:{'\n\n'}• Se calcula el wOBA del jugador (sencillo 0.89, doble 1.27,
                triple 1.62, HR 2.10 y primera por regla 0.69).{'\n'}• Se compara con el wOBA
                promedio de todos los juegos registrados para obtener las carreras sobre el
                promedio (wRAA).{'\n'}• Se suman ~20 carreras por cada 600 turnos (nivel de
                reemplazo) y se dividen entre las carreras por victoria, que aquí son las
                carreras promedio por juego de la liga ({fmt1(league.runsPerWin)}).{'\n\n'}Úsalo para
                comparar jugadores de la liga entre sí. Con pocos juegos el número cambia
                bastante.
              </Text>
            </Card>
          ) : null}

          <SectionTitle>Juego por juego</SectionTitle>
          <ScrollView horizontal>
            <View>
              <View style={[st.logRow, st.logHead]}>
                <Text style={[st.logDate, st.headTxt]}>Fecha</Text>
                <Text style={[st.logRival, st.headTxt]}>Rival</Text>
                <Text style={[st.logRes, st.headTxt]}>Res.</Text>
                {['VB', 'H', '2B', '3B', 'HR', 'C', 'CI', 'K'].map(h => (
                  <Text key={h} style={[st.logCell, st.headTxt]}>
                    {h}
                  </Text>
                ))}
              </View>
              {career.games.map(l => {
                const res =
                  l.teamRuns > l.rivalRuns ? 'G' : l.teamRuns < l.rivalRuns ? 'P' : 'E';
                return (
                  <Pressable
                    key={l.gameId}
                    disabled={l.live}
                    onPress={() => push({name: 'gameSummary', gameId: l.gameId})}
                    style={st.logRow}>
                    <Text style={st.logDate}>
                      {l.live ? 'En curso' : formatDate(l.date).slice(0, 5)}
                    </Text>
                    <Text style={st.logRival} numberOfLines={1}>
                      {l.rival}
                    </Text>
                    <Text
                      style={[
                        st.logRes,
                        {color: res === 'G' ? C.hit : res === 'P' ? C.out : C.muted},
                      ]}>
                      {res} {l.teamRuns}-{l.rivalRuns}
                    </Text>
                    {[l.s.ab, l.s.h, l.s.b2, l.s.b3, l.s.hr, l.s.r, l.s.rbi, l.s.k].map(
                      (v, i) => (
                        <Text key={i} style={st.logCell}>
                          {v}
                        </Text>
                      ),
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.board,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  name: {fontSize: 24, fontWeight: '800', color: '#fff'},
  slash: {
    fontSize: 18,
    fontWeight: '800',
    color: C.accent,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  slashLbl: {fontSize: 11, color: '#9FB5A6', fontWeight: '700'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  tile: {
    width: '31.5%',
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  tileHi: {backgroundColor: C.primary, borderColor: C.primary},
  tileValue: {fontSize: 22, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums']},
  tileLabel: {fontSize: 12, fontWeight: '800', color: C.primary, marginTop: 2},
  tileHint: {fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 2},
  infoLink: {color: C.info, fontWeight: '700', marginTop: 14, marginBottom: 8},
  info: {fontSize: 13, color: C.text, lineHeight: 19},
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  logHead: {backgroundColor: C.bg},
  headTxt: {fontWeight: '700', color: C.muted, fontSize: 12},
  logDate: {width: 70, paddingLeft: 8, fontSize: 13, color: C.text},
  logRival: {width: 110, fontSize: 13, color: C.text},
  logRes: {width: 64, fontSize: 13, fontWeight: '700'},
  logCell: {width: 32, textAlign: 'center', fontSize: 13, color: C.text, fontVariant: ['tabular-nums']},
});
