export const appAudioConfig = {
  startSfx: null as null | string, // e.g., 'assets/audio/start_intro.mp3'
  homeLoop: null as null | string, // e.g., 'assets/audio/home_loop.mp3'
  homeLoopVolume: 0.2,
  gameOverSfx: null as null | string, // e.g., 'assets/audio/game_over.mp3'
  hitSfx: null as null | string, // e.g., 'assets/audio/hit.mp3'
  missSfx: null as null | string, // e.g., 'assets/audio/miss.mp3'
};

export const timingConfig = {
  perfectPx: 20,
  greatPx: 40,
  goodPx: 60,
};

export const vfxConfig = {
  laneNearHitPx: 80,
};
