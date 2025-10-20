export type DifficultyKey = 'easy' | 'normal' | 'hard';
export type Difficulty = { speed: number; density: number };
export type Song = {
  title: string;
  artist: string;
  audio: string; // path within assets
  bpm: number;
  difficulties: Record<DifficultyKey, Difficulty>;
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
  },
];
