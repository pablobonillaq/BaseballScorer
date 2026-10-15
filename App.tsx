/**
 * Baseball Scorer
 * @format
 */
import React from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GameScreen} from './src/game/GameScreen';
import {NavProvider, useNav} from './src/nav';
import {GameSetupScreen} from './src/screens/GameSetupScreen';
import {GameSummaryScreen} from './src/screens/GameSummaryScreen';
import {HistoryScreen} from './src/screens/HistoryScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {PlayerStatsScreen} from './src/screens/PlayerStatsScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {StatsScreen} from './src/screens/StatsScreen';
import {TeamDetailScreen} from './src/screens/TeamDetailScreen';
import {TeamsScreen} from './src/screens/TeamsScreen';
import {StoreProvider, useStore} from './src/store';
import {C} from './src/theme';

function Router() {
  const {route} = useNav();
  const {loaded} = useStore();
  if (!loaded) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg}}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }
  switch (route.name) {
    case 'teams':
      return <TeamsScreen />;
    case 'team':
      return <TeamDetailScreen teamId={route.teamId} />;
    case 'settings':
      return <SettingsScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'gameSetup':
      return <GameSetupScreen />;
    case 'game':
      return <GameScreen />;
    case 'gameSummary':
      return <GameSummaryScreen gameId={route.gameId} />;
    case 'stats':
      return <StatsScreen teamId={route.teamId} />;
    case 'playerStats':
      return (
        <PlayerStatsScreen
          playerId={route.playerId}
          teamId={route.teamId}
          includeLive={route.includeLive}
        />
      );
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />
      <StoreProvider>
        <NavProvider>
          <Router />
        </NavProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
