import { useState, useEffect } from 'react';
import type { AppState } from './types';

const KEY = 'girl-math-v1';

const DEFAULT: AppState = {
  settings: { ownerName: '', currency: 'ZAR' },
  accounts: [],
  moves: [],
  received: [],
  expenses: [],
  assets: [],
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage quota exceeded — fail silently
    }
  }, [state]);

  function update(partial: Partial<AppState>) {
    setState(prev => ({ ...prev, ...partial }));
  }

  return { state, update };
}