/**
 * Navegación mínima tipo "stack" sin dependencias nativas extra.
 */
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {BackHandler} from 'react-native';

export type Route =
  | {name: 'home'}
  | {name: 'teams'}
  | {name: 'team'; teamId: string}
  | {name: 'settings'}
  | {name: 'history'}
  | {name: 'gameSetup'}
  | {name: 'game'}
  | {name: 'gameSummary'; gameId: string}
  | {name: 'stats'; teamId?: string}
  | {name: 'playerStats'; playerId: string; teamId: string; includeLive: boolean};

interface Nav {
  route: Route;
  push(r: Route): void;
  pop(): void;
  reset(r: Route[]): void;
}

const Ctx = createContext<Nav | null>(null);

export function NavProvider({children}: {children: React.ReactNode}) {
  const [stack, setStack] = useState<Route[]>([{name: 'home'}]);

  const push = useCallback((r: Route) => setStack(s => [...s, r]), []);
  const pop = useCallback(
    () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)),
    [],
  );
  const reset = useCallback((r: Route[]) => setStack(r), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack, pop]);

  const value = useMemo(
    () => ({route: stack[stack.length - 1], push, pop, reset}),
    [stack, push, pop, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav(): Nav {
  const n = useContext(Ctx);
  if (!n) throw new Error('useNav fuera de NavProvider');
  return n;
}
