import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, spacing } from '@/theme/theme';
import { useGameStore } from '@/store/useGameStore';
import { getHighScore, setHighScore } from '@/storage/highscores';
import { Audio } from 'expo-av';
import { appAudioConfig } from '@/data/config';
import { audioMap } from '@/data/audioMap';

export default function GameOverScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'GameOver'>) {
  const { currentSong, difficulty, score, maxCombo, resetRun } = useGameStore();
  const [best, setBest] = useState<number>(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const sfxRef = useRef<Audio.Sound | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  const onRetry = () => {
    resetRun();
    navigation.replace('Game');
  };

  const onHome = () => {
    resetRun();
    navigation.replace('Home');
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!currentSong) return;
      const prev = await getHighScore(currentSong.title, difficulty);
      if (!mounted) return;
      setBest(prev);
      if (score > prev) {
        setIsNewBest(true);
        await setHighScore(currentSong.title, difficulty, score);
        // spawn simple confetti
        const colors = ['#9b5cff', '#00e5ff', '#ff3864', '#ffd166', '#06d6a0'];
        const items = Array.from({ length: 80 }).map((_, i) => ({
          id: i + 1,
          x: Math.random() * 340,
          y: Math.random() * 600,
          color: colors[Math.floor(Math.random() * colors.length)],
        }));
        setConfetti(items);
        setTimeout(() => setConfetti([]), 1500);
      }
      try {
        const key = appAudioConfig.gameOverSfx;
        if (key && audioMap[key]) {
          const { sound } = await Audio.Sound.createAsync(audioMap[key]);
          sfxRef.current = sound;
          await sound.playAsync();
        }
      } catch {}
    })();
    return () => { (async () => { try { await sfxRef.current?.unloadAsync(); } catch {} })(); };
  }, []);

  return (
    <View style={styles.container}>
      {confetti.length > 0 && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {confetti.map(c => (
            <View key={c.id} style={{ position: 'absolute', width: 6, height: 10, borderRadius: 2, backgroundColor: c.color, left: c.x, top: c.y, opacity: 0.9 }} />
          ))}
        </View>
      )}
      <Text style={styles.header}>Game Over!</Text>
      <Text style={styles.line}>Song: <Text style={styles.value}>{currentSong?.title ?? '-'}</Text></Text>
      <Text style={styles.line}>Score: <Text style={styles.value}>{score}</Text></Text>
      <Text style={styles.line}>Highest Combo: <Text style={styles.value}>{maxCombo}</Text></Text>
      <Text style={styles.line}>Difficulty: <Text style={styles.value}>{difficulty.toUpperCase()}</Text></Text>
      <Text style={styles.line}>Best: <Text style={styles.value}>{best}</Text> {isNewBest && <Text style={{ color: colors.neonCyan, fontWeight: '800' }}> NEW HIGH!</Text>}</Text>

      <View style={{ height: spacing(2) }} />
      <Pressable onPress={onRetry} style={styles.btn}><Text style={styles.btnText}>Retry</Text></Pressable>
      <View style={{ height: spacing(1) }} />
      <Pressable onPress={onHome} style={[styles.btn, styles.homeBtn]}><Text style={styles.btnText}>Home</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing(3) },
  header: { color: colors.white, fontSize: 36, fontWeight: '800', marginBottom: spacing(2) },
  line: { color: '#b8b8d8', fontSize: 16, marginTop: 4 },
  value: { color: colors.white, fontWeight: '700' },
  btn: { backgroundColor: colors.neonPurple, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  homeBtn: { backgroundColor: '#2a2140' },
  btnText: { color: colors.white, fontWeight: '700' },
});
