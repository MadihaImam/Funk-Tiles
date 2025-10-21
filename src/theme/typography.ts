export const typography = {
  // Font weights
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Font sizes
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  
  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
    wider: 2,
    widest: 4,
  },
} as const;

// Predefined text styles
export const textStyles = {
  // Headers
  h1: {
    fontSize: typography.sizes['5xl'],
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.letterSpacing.widest,
    lineHeight: typography.lineHeights.tight,
  },
  h2: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.letterSpacing.wider,
    lineHeight: typography.lineHeights.tight,
  },
  h3: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.letterSpacing.wide,
    lineHeight: typography.lineHeights.normal,
  },
  
  // Body text
  body: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
    lineHeight: typography.lineHeights.normal,
  },
  bodyLarge: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.regular,
    lineHeight: typography.lineHeights.normal,
  },
  
  // UI text
  button: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.wide,
  },
  caption: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: typography.lineHeights.normal,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
} as const;
