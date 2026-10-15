import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEFAULT_SETTINGS, Game, Player, Settings, Team} from './types';

const K = {
  teams: 'bs:teams',
  players: 'bs:players',
  settings: 'bs:settings',
  current: 'bs:currentGame',
  games: 'bs:games',
  photo: (id: string) => `bs:photo:${id}`,
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    console.warn('Error leyendo', key, e);
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Error guardando', key, e);
  }
}

export interface Persisted {
  teams: Team[];
  players: Player[];
  settings: Settings;
  currentGame: Game | null;
  games: Game[];
  photos: Record<string, string>;
}

export async function loadAll(): Promise<Persisted> {
  const [teams, players, settings, currentGame, games] = await Promise.all([
    readJSON<Team[]>(K.teams, []),
    readJSON<Player[]>(K.players, []),
    readJSON<Partial<Settings>>(K.settings, {}),
    readJSON<Game | null>(K.current, null),
    readJSON<Game[]>(K.games, []),
  ]);
  const photos: Record<string, string> = {};
  const withPhoto = players.filter(p => p.hasPhoto);
  if (withPhoto.length) {
    try {
      const pairs = await AsyncStorage.multiGet(withPhoto.map(p => K.photo(p.id)));
      pairs.forEach(([key, val]) => {
        if (val) {
          photos[key.replace('bs:photo:', '')] = val;
        }
      });
    } catch (e) {
      console.warn('Error leyendo fotos', e);
    }
  }
  return {
    teams,
    players,
    settings: {...DEFAULT_SETTINGS, ...settings},
    currentGame,
    games,
    photos,
  };
}

export const saveTeams = (t: Team[]) => writeJSON(K.teams, t);
export const savePlayers = (p: Player[]) => writeJSON(K.players, p);
export const saveSettings = (s: Settings) => writeJSON(K.settings, s);
export const saveGames = (g: Game[]) => writeJSON(K.games, g);
export const saveCurrentGame = (g: Game | null) =>
  g ? writeJSON(K.current, g) : AsyncStorage.removeItem(K.current);

export async function savePhoto(id: string, dataUri: string | null) {
  try {
    if (dataUri) {
      await AsyncStorage.setItem(K.photo(id), dataUri);
    } else {
      await AsyncStorage.removeItem(K.photo(id));
    }
  } catch (e) {
    console.warn('Error guardando foto', e);
  }
}
