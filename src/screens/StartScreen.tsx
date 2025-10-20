import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
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

    return () => { (async () => { try { await sound?.unloadAsync(); } catch {} })(); };
  }, []);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0b0b12", "#151527"]} style={StyleSheet.absoluteFillObject} />
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
  title: { color: colors.white, fontSize: 48, fontWeight: '800', letterSpacing: 4, textShadowColor: colors.neonPurple, textShadowRadius: 12 },
  subtitle: { color: '#cfd8ff', marginTop: 12, marginBottom: 24 },
  btn: { backgroundColor: colors.neonPurple, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: colors.white, fontWeight: '700', letterSpacing: 1 },
});
