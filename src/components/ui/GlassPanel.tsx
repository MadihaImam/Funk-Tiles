import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '@/theme/palette';

interface GlassPanelProps {
  children: React.ReactNode;
  variant?: 'default' | 'card' | 'overlay';
  style?: ViewStyle;
  blur?: boolean;
}

export default function GlassPanel({
  children,
  variant = 'default',
  style,
  blur = true,
}: GlassPanelProps) {
  const getGradientColors = () => {
    switch (variant) {
      case 'card':
        return ['rgba(20, 20, 37, 0.9)', 'rgba(20, 20, 37, 0.7)'];
      case 'overlay':
        return ['rgba(11, 11, 18, 0.8)', 'rgba(21, 21, 39, 0.6)'];
      default:
        return ['rgba(37, 37, 69, 0.8)', 'rgba(37, 37, 69, 0.6)'];
    }
  };

  const getBorderStyle = () => {
    switch (variant) {
      case 'card':
        return {
          borderWidth: 1,
          borderColor: 'rgba(155, 92, 255, 0.2)',
          borderRadius: 16,
        };
      case 'overlay':
        return {
          borderWidth: 0,
          borderRadius: 0,
        };
      default:
        return {
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
        };
    }
  };

  return (
    <View style={[styles.container, getBorderStyle(), style]}>
      <LinearGradient
        colors={getGradientColors()}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {blur && (
        <View style={[StyleSheet.absoluteFillObject, styles.blur]} />
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  blur: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
