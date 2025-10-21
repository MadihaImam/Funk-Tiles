export type DifficultyKey = 'easy' | 'normal' | 'hard';
export type Difficulty = { speed: number; density: number };
export type Song = {
  title: string;
  artist: string;
  audio: string; // path within assets
  bpm: number;
  difficulties: Record<DifficultyKey, Difficulty>;
  // Optional deterministic lane pattern; each entry is a beat, array of lanes allows chords
  pattern?: number[][];
};

export const songs: Song[] = [
  {
    title: 'Acelerada',
    artist: 'DJ Duzz',
    audio: 'assets/audio/acelerada.mp3',
    bpm: 120,
    difficulties: {
      easy: { speed: 1.0, density: 0.8 },
      normal: { speed: 1.1, density: 1.0 },
      hard: { speed: 1.3, density: 1.3 },
    },
    pattern: [[0],[1],[2],[3],[2],[1],[0,2],[3],[1],[0]],
  },
  {
    title: 'Não Era Amor',
    artist: 'MC Rita',
    audio: 'assets/audio/nao_era_amor.mp3',
    bpm: 105,
    difficulties: {
      easy: { speed: 0.9, density: 0.8 },
      normal: { speed: 1.0, density: 1.0 },
      hard: { speed: 1.2, density: 1.3 },
    },
    pattern: [[1],[1],[2],[2],[3],[3],[1,3],[0],[0],[2]],
  },
  {
    title: 'Montagem Xonada',
    artist: 'DJ LK da Escócia',
    audio: 'assets/audio/montagem_xonada.mp3',
    bpm: 118,
    difficulties: {
      easy: { speed: 1.0, density: 0.8 },
      normal: { speed: 1.15, density: 1.0 },
      hard: { speed: 1.3, density: 1.4 },
    },
    pattern: [[0],[2],[1],[3],[0,3],[2],[1],[1],[2],[0]],
  },
  {
    title: 'Montagem Coma',
    artist: 'MC GW',
    audio: 'assets/audio/montagem_coma.mp3',
    bpm: 122,
    difficulties: {
      easy: { speed: 1.0, density: 0.8 },
      normal: { speed: 1.2, density: 1.0 },
      hard: { speed: 1.4, density: 1.5 },
    },
    pattern: [[3],[2],[1],[0],[1,3],[2],[0],[2],[3],[1]],
  },
  {
    title: 'Dia Delícia',
    artist: 'MCs FunkMix',
    audio: 'assets/audio/dia_delicia.mp3',
    bpm: 110,
    difficulties: {
      easy: { speed: 0.9, density: 0.8 },
      normal: { speed: 1.0, density: 1.0 },
      hard: { speed: 1.2, density: 1.2 },
    },
    pattern: [[0],[0],[1],[1],[2],[2],[3],[3],[1,2],[0]],
  },
  {
    title: 'Mente Má',
    artist: 'MC Magalhães',
    audio: 'assets/audio/mente_ma.mp3',
    bpm: 114,
    difficulties: {
      easy: { speed: 0.95, density: 0.85 },
      normal: { speed: 1.05, density: 1.0 },
      hard: { speed: 1.25, density: 1.3 },
    },
    pattern: [[2],[1],[2],[3],[0],[1,3],[2],[0],[1],[3]],
  },
];
