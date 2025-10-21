import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors } from '@/theme/theme';
import { Audio } from 'expo-av';
import { audioMap } from '@/data/audioMap';
import { appAudioConfig } from '@/data/config';

export default function StartScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Start'>) {
  const { width } = Dimensions.get('window');
  const isSmall = width < 380;
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shadeA = useRef(new Animated.Value(0)).current;
  const shadeB = useRef(new Animated.Value(1)).current;
  const t = useSharedValue(0);

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

    let raf = 0;
    const loop = () => { t.value = Date.now(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);

    return () => {
      (async () => { try { await sound?.unloadAsync(); } catch {} })();
      cancelAnimationFrame(raf);
    };
  }, []);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const shiftA = shadeA.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
  const rotA = shadeA.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });
  const shiftB = shadeB.interpolate({ inputRange: [0, 1], outputRange: [25, -25] });
  const rotB = shadeB.interpolate({ inputRange: [0, 1], outputRange: ['6deg', '-6deg'] });
  const discStyle = useAnimatedStyle(() => {
    const rot = ((t.value % 60000) / 60000) * 360 * 4;
    const phase = (t.value % 800) / 800;
    const scale = 1 + 0.05 * Math.exp(-6 * phase);
    return { transform: [{ rotate: `${rot}deg` }, { scale }] } as any;
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0b0b12", "#151527"]} style={StyleSheet.absoluteFillObject} />
      {/* Rotating disc behind title */}
      <View style={styles.discWrap} pointerEvents="none">
        <Reanimated.View style={[styles.discOuter, discStyle]}>
          <View style={styles.discGroove} />
          <View style={styles.discCenter} />
        </Reanimated.View>
      </View>
      <Animated.View style={[StyleSheet.absoluteFillObject as any, { transform: [{ translateX: shiftA }, { translateY: Animated.multiply(shiftA, 0.4) }, { rotate: rotA }], opacity: 0.45 }] }>
        <LinearGradient colors={["#0b0b12", "#1a1130", "#151527"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject as any, { transform: [{ translateX: shiftB }, { translateY: Animated.multiply(shiftB, -0.3) }, { rotate: rotB }], opacity: 0.35 }] }>
        <LinearGradient colors={["#0b0b12", "#101a2e", "#151527"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', opacity: fade }}>
        <Animated.Text style={[styles.title, { fontSize: isSmall ? 36 : 48, transform: [{ scale }] }]}>PHONK TILES</Animated.Text>
        <Text style={[styles.subtitle, { marginTop: isSmall ? 8 : 12, marginBottom: isSmall ? 18 : 24 }]}>Tap to the Beat. Feel the Phonk.</Text>
        <Pressable onPress={() => navigation.replace('Home')} style={({ pressed }) => [styles.btn, { paddingHorizontal: isSmall ? 22 : 28, paddingVertical: isSmall ? 12 : 14 }, pressed && { opacity: 0.8 }]}>
          <Text style={[styles.btnText, { fontSize: isSmall ? 14 : 16 }]}>Start Game</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  discWrap: { position: 'absolute', top: 120, alignSelf: 'center' },
  discOuter: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#0b0b0f', borderWidth: 2, borderColor: '#1d1d30', alignItems: 'center', justifyContent: 'center' },
  discGroove: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: '#202038' },
  discCenter: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#9b5cff' },
  title: { color: colors.white, fontSize: 48, fontWeight: '800', letterSpacing: 4, textShadowColor: colors.neonPurple, textShadowRadius: 12 },
  subtitle: { color: '#cfd8ff', marginTop: 12, marginBottom: 24 },
  btn: { backgroundColor: colors.neonPurple, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: colors.white, fontWeight: '700', letterSpacing: 1 },
});
