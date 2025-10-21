import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

interface RotatingDiscProps {
  size?: number;
  centerColor?: string;
  grooveColor?: string;
  outerColor?: string;
  borderColor?: string;
  rpm?: number;
  pulseMs?: number;
  pulseIntensity?: number;
  style?: any;
}

export default function RotatingDisc({
  size = 88,
  centerColor = '#9b5cff',
  grooveColor = '#202038',
  outerColor = '#0b0b0f',
  borderColor = '#1d1d30',
  rpm = 4,
  pulseMs = 800,
  pulseIntensity = 0.05,
  style,
}: RotatingDiscProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      t.value = Date.now();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const rot = ((t.value % 60000) / 60000) * 360 * rpm;
    const phase = (t.value % pulseMs) / pulseMs;
    const scale = 1 + pulseIntensity * Math.exp(-6 * phase);
    return {
      transform: [{ rotate: `${rot}deg` }, { scale }],
    } as any;
  });

  const radius = size / 2;
  const grooveSize = size * 0.8;
  const grooveRadius = grooveSize / 2;
  const centerSize = size * 0.18;
  const centerRadius = centerSize / 2;

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: outerColor,
            borderWidth: 2,
            borderColor: borderColor,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        <View
          style={{
            position: 'absolute',
            width: grooveSize,
            height: grooveSize,
            borderRadius: grooveRadius,
            borderWidth: 2,
            borderColor: grooveColor,
          }}
        />
        <View
          style={{
            width: centerSize,
            height: centerSize,
            borderRadius: centerRadius,
            backgroundColor: centerColor,
          }}
        />
      </Animated.View>
    </View>
  );
}
