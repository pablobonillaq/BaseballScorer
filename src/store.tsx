import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as S from './storage';
import {DEFAULT_SETTINGS, Game, Player, Settings, Team} from './types';
import {uid} from './utils';

interface Store {
  loaded: boolean;
  teams: Team[];
  players: Player[];
  settings: Settings;
  currentGame: Game | null;
  games: Game[];
  photos: Record<string, string>;
  addTeam(name: string): Team;
  renameTeam(id: string, name: string): void;
  deleteTeam(id: string): void;
  /** photo: string = nueva foto, null = quitar foto, undefined = no cambiar */
  savePlayer(p: {
    id?: string;
    teamId: string;
    name: string;
    photo?: string | null;
  }): Player;
  deletePlayer(id: string): void;
  updateSettings(s: Partial<Settings>): void;
  resetSettings(): void;
  setCurrentGame(g: Game | null): void;
  updateGame(fn: (g: Game) => Game): void;
  archiveGame(g: Game): void;
  deleteGame(id: string): void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({children}: {children: React.ReactNode}) {
  const [loaded, setLoaded] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [currentGame, setGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const playersRef = useRef<Player[]>([]);
  playersRef.current = players;

  useEffect(() => {
    S.loadAll().then(d => {
      setTeams(d.teams);
      setPlayers(d.players);
      setSettings(d.settings);
      setGame(d.currentGame);
      setGames(d.games);
      setPhotos(d.photos);
      setLoaded(true);
    });
  }, []);

  // Persistencia automática
  useEffect(() => {
    if (loaded) S.saveTeams(teams);
  }, [teams, loaded]);
  useEffect(() => {
    if (loaded) S.savePlayers(players);
  }, [players, loaded]);
  useEffect(() => {
    if (loaded) S.saveSettings(settings);
  }, [settings, loaded]);
  useEffect(() => {
    if (loaded) S.saveCurrentGame(currentGame);
  }, [currentGame, loaded]);
  useEffect(() => {
    if (loaded) S.saveGames(games);
  }, [games, loaded]);

  const addTeam = useCallback((name: string) => {
    const t: Team = {id: uid(), name: name.trim(), createdAt: Date.now()};
    setTeams(ts => [...ts, t]);
    return t;
  }, []);

  const renameTeam = useCallback((id: string, name: string) => {
    setTeams(ts => ts.map(t => (t.id === id ? {...t, name: name.trim()} : t)));
  }, []);

  const deleteTeam = useCallback((id: string) => {
    setTeams(ts => ts.filter(t => t.id !== id));
    setPlayers(ps => {
      ps.filter(p => p.teamId === id && p.hasPhoto).forEach(p =>
        S.savePhoto(p.id, null),
      );
      return ps.filter(p => p.teamId !== id);
    });
  }, []);

  const savePlayer = useCallback<Store['savePlayer']>(input => {
    const id = input.id ?? uid();
    const prev = playersRef.current.find(p => p.id === id);
    const hasPhoto =
      input.photo === undefined ? prev?.hasPhoto ?? false : !!input.photo;
    const result: Player = {
      id,
      teamId: input.teamId,
      name: input.name.trim(),
      hasPhoto,
      createdAt: prev?.createdAt ?? Date.now(),
    };
    setPlayers(ps =>
      ps.some(p => p.id === id)
        ? ps.map(p => (p.id === id ? result : p))
        : [...ps, result],
    );
    if (input.photo !== undefined) {
      S.savePhoto(id, input.photo);
      setPhotos(ph => {
        const n = {...ph};
        if (input.photo) n[id] = input.photo;
        else delete n[id];
        return n;
      });
    }
    return result;
  }, []);

  const deletePlayer = useCallback((id: string) => {
    setPlayers(ps => ps.filter(p => p.id !== id));
    S.savePhoto(id, null);
    setPhotos(ph => {
      const n = {...ph};
      delete n[id];
      return n;
    });
  }, []);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings(prev => ({...prev, ...s}));
  }, []);
  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const setCurrentGame = useCallback((g: Game | null) => setGame(g), []);
  const updateGame = useCallback((fn: (g: Game) => Game) => {
    setGame(g => (g ? fn(g) : g));
  }, []);

  const archiveGame = useCallback((g: Game) => {
    setGames(gs => [{...g, undo: []}, ...gs.filter(x => x.id !== g.id)]);
    setGame(null);
  }, []);

  const deleteGame = useCallback((id: string) => {
    setGames(gs => gs.filter(g => g.id !== id));
  }, []);

  const value = useMemo<Store>(
    () => ({
      loaded,
      teams,
      players,
      settings,
      currentGame,
      games,
      photos,
      addTeam,
      renameTeam,
      deleteTeam,
      savePlayer,
      deletePlayer,
      updateSettings,
      resetSettings,
      setCurrentGame,
      updateGame,
      archiveGame,
      deleteGame,
    }),
    [
      loaded,
      teams,
      players,
      settings,
      currentGame,
      games,
      photos,
      addTeam,
      renameTeam,
      deleteTeam,
      savePlayer,
      deletePlayer,
      updateSettings,
      resetSettings,
      setCurrentGame,
      updateGame,
      archiveGame,
      deleteGame,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}
