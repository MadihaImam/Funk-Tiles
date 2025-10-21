export const palette = {
  // Base colors
  bg: '#0b0b12',
  bgSecondary: '#151527',
  bgCard: '#141425',
  bgButton: '#252545',
  
  // Text colors
  white: '#ffffff',
  textSecondary: '#b8b8d8',
  textMuted: '#899',
  textAccent: '#cfd8ff',
  
  // Accent colors
  neonPurple: '#9b5cff',
  neonCyan: '#00e5ff',
  
  // Border colors
  border: '#22223a',
  borderLane: '#151532',
  borderActive: '#3a3a5a',
  
  // Tile colors
  tileBlack: '#000000',
  tileWhite: '#ffffff',
  
  // Status colors
  success: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
  
  // Gradients
  gradientStart: '#0b0b12',
  gradientMid: '#1a1130',
  gradientEnd: '#151527',
  
  // Disc colors
  discOuter: '#0b0b0f',
  discBorder: '#1d1d30',
  discGroove: '#202038',
  discCenter: '#9b5cff',
} as const;

export type PaletteKey = keyof typeof palette;
