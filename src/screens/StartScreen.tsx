import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors } from '@/theme/theme';
import { palette } from '@/theme/palette';
import { textStyles } from '@/theme/typography';
import { Audio } from 'expo-av';
import { audioMap } from '@/data/audioMap';
import { appAudioConfig } from '@/data/config';
import RotatingDisc from '@/components/fx/RotatingDisc';
import PrimaryButton from '@/components/ui/PrimaryButton';
import GlassPanel from '@/components/ui/GlassPanel';

export default function StartScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Start'>) {
  const { width } = Dimensions.get('window');
  const isSmall = width < 380;
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shadeA = useRef(new Animated.Value(0)).current;
  const shadeB = useRef(new Animated.Value(1)).current;
  const particles = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shadeA, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(shadeA, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shadeB, { toValue: 0, duration: 12000, useNativeDriver: true }),
        Animated.timing(shadeB, { toValue: 1, duration: 12000, useNativeDriver: true }),
      ])
    ).start();

    // Optional 3s intro bass SFX
    let sound: Audio.Sound | null = null;
    (async () => {
      try {
        const key = appAudioConfig.startSfx;
        if (key && audioMap[key]) {
          const res = await Audio.Sound.createAsync(audioMap[key]);
          sound = res.sound;
          await sound.playAsync();
          setTimeout(async () => {
            try { await sound?.stopAsync(); await sound?.unloadAsync(); } catch {}
          }, 3000);
        }
      } catch {}
    })();

    // Particle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(particles, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(particles, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      (async () => { try { await sound?.unloadAsync(); } catch {} })();
    };
  }, []);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const shiftA = shadeA.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
  const rotA = shadeA.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });
  const shiftB = shadeB.interpolate({ inputRange: [0, 1], outputRange: [25, -25] });
  const rotB = shadeB.interpolate({ inputRange: [0, 1], outputRange: ['6deg', '-6deg'] });
  const particleOpacity = particles.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const particleScale = particles.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] });

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0b0b12", "#151527"]} style={StyleSheet.absoluteFillObject} />
      {/* Hero disc with glow */}
      <View style={styles.discWrap} pointerEvents="none">
        <View style={styles.discGlow} />
        <RotatingDisc
          size={160}
          centerColor={palette.neonPurple}
          grooveColor={palette.discGroove}
          outerColor={palette.discOuter}
          borderColor={palette.discBorder}
          rpm={3}
          pulseMs={1000}
          pulseIntensity={0.08}
        />
      </View>
      
      {/* Floating particles */}
      <Animated.View style={[styles.particles, { opacity: particleOpacity, transform: [{ scale: particleScale }] }]} pointerEvents="none">
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={[styles.particle, { 
            left: `${10 + (i * 7)}%`, 
            top: `${20 + Math.sin(i) * 30}%`
          }]} />
        ))}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject as any, { transform: [{ translateX: shiftA }, { translateY: Animated.multiply(shiftA, 0.4) }, { rotate: rotA }], opacity: 0.45 }] }>
        <LinearGradient colors={["#0b0b12", "#1a1130", "#151527"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject as any, { transform: [{ translateX: shiftB }, { translateY: Animated.multiply(shiftB, -0.3) }, { rotate: rotB }], opacity: 0.35 }] }>
        <LinearGradient colors={["#0b0b12", "#101a2e", "#151527"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', opacity: fade }}>
        <GlassPanel variant="overlay" style={styles.heroPanel}>
          <Animated.Text style={[styles.title, { fontSize: isSmall ? 36 : 48, transform: [{ scale }] }]}>PHONK TILES</Animated.Text>
          <Text style={[styles.subtitle, { marginTop: isSmall ? 8 : 12, marginBottom: isSmall ? 24 : 32 }]}>Tap to the Beat. Feel the Phonk.</Text>
          <PrimaryButton
            title="Start Game"
            onPress={() => navigation.replace('Home')}
            size={isSmall ? 'md' : 'lg'}
            style={styles.startButton}
          />
          <View style={styles.secondaryActions}>
            <PrimaryButton
              title="Settings"
              onPress={() => {}}
              variant="ghost"
              size="sm"
            />
            <PrimaryButton
              title="About"
              onPress={() => {}}
              variant="ghost"
              size="sm"
            />
          </View>
        </GlassPanel>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  discWrap: { position: 'absolute', top: 100, alignSelf: 'center' },
  discGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.neonPurple,
    opacity: 0.15,
    top: -20,
    left: -20,
  },
  particles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.neonCyan,
    opacity: 0.6,
  },
  heroPanel: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 80,
  },
  title: {
    ...textStyles.h1,
    color: palette.white,
    textShadowColor: palette.neonPurple,
    textShadowRadius: 12,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.bodyLarge,
    color: palette.textAccent,
    textAlign: 'center',
  },
  startButton: {
    marginBottom: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 24,
  },
});
