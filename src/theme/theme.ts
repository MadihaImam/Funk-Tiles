export const colors = {
  bg: '#0b0b12',
  bgAlt: '#11111a',
  neonPurple: '#9b5cff',
  neonCyan: '#00e5ff',
  white: '#ffffff',
  danger: '#ff3864'
};

export const glow = {
  strong: {
    shadowColor: '#9b5cff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  cyan: {
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const spacing = (m: number) => m * 8;
