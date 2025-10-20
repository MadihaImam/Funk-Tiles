import { create } from 'zustand';
import type { DifficultyKey, Song } from '@/data/songs';

export type GameState = {
  currentSong?: Song;
  difficulty: DifficultyKey;
  score: number;
  combo: number;
  maxCombo: number;
  isPaused: boolean;
  setSong: (s?: Song) => void;
  setDifficulty: (d: DifficultyKey) => void;
  resetRun: () => void;
  addScore: (v: number) => void;
  hit: () => void;
  hitWith: (points: number) => void;
  miss: () => void;
  pause: () => void;
  resume: () => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  difficulty: 'normal',
  score: 0,
  combo: 0,
  maxCombo: 0,
  isPaused: false,
  setSong: (s) => set({ currentSong: s }),
  setDifficulty: (d) => set({ difficulty: d }),
  resetRun: () => set({ score: 0, combo: 0, maxCombo: 0, isPaused: false }),
  addScore: (v) => set({ score: get().score + v }),
  hit: () => {
    const combo = get().combo + 1;
    set({ combo, maxCombo: Math.max(get().maxCombo, combo) });
    set({ score: get().score + 1 });
  },
  hitWith: (points: number) => {
    const combo = get().combo + 1;
    set({ combo, maxCombo: Math.max(get().maxCombo, combo) });
    set({ score: get().score + points });
  },
  miss: () => {
    // handled in GameScreen by navigating to GameOver
  },
  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),
}));
