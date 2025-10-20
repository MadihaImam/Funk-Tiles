import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, spacing } from '@/theme/theme';
import { songs, type Song, type DifficultyKey } from '@/data/songs';
import { useGameStore } from '@/store/useGameStore';
import { Audio } from 'expo-av';
import { audioMap } from '@/data/audioMap';
import { appAudioConfig } from '@/data/config';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const setSong = useGameStore(s => s.setSong);
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyKey>('normal');
  const previewRef = useRef<Audio.Sound | null>(null);
  const loopRef = useRef<Audio.Sound | null>(null);
  const [muted, setMuted] = useState(false);

  const onPlay = async (song: Song) => {
    setSong(song);
    setDifficulty(selectedDifficulty);
    navigation.navigate('Game');
  };

  // Background browsing loop (focus-aware)
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const key = appAudioConfig.homeLoop;
          if (!key || !audioMap[key] || muted) return;
          const { sound } = await Audio.Sound.createAsync(audioMap[key], { isLooping: true, volume: appAudioConfig.homeLoopVolume });
          loopRef.current = sound;
          if (!muted && isActive) await sound.playAsync();
        } catch {}
      })();
      return () => { isActive = false; (async () => { try { await loopRef.current?.stopAsync(); await loopRef.current?.unloadAsync(); } catch {} })(); };
    }, [muted])
  );

  const onPreview = async (song: Song) => {
    try {
      if (song.previewUrl) {
        const can = await Linking.canOpenURL(song.previewUrl);
        if (can) {
          await Linking.openURL(song.previewUrl);
          return;
        }
      }
      if (previewRef.current) {
        await previewRef.current.unloadAsync();
        previewRef.current = null;
      }
      const source = audioMap[song.audio];
      if (!source) throw new Error('missing-audio');
      const { sound } = await Audio.Sound.createAsync(source);
      previewRef.current = sound;
      await sound.playAsync();
      setTimeout(async () => {
        try { await sound.stopAsync(); await sound.unloadAsync(); } catch {}
      }, 3000);
    } catch (e) {
      Alert.alert('Preview unavailable', 'Add MP3 to ' + song.audio + ' or provide a previewUrl.');
    }
  };

  const DifficultyButtons = useMemo(() => (
    <View style={styles.diffRow}>
      {(['easy','normal','hard'] as DifficultyKey[]).map(d => (
        <Pressable key={d} onPress={() => setSelectedDifficulty(d)} style={[styles.diffBtn, selectedDifficulty === d && styles.diffBtnActive]}>
          <Text style={styles.diffText}>{d.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  ), [selectedDifficulty]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Select Your Phonk Track 🎶</Text>
        <Pressable onPress={() => setMuted(m => !m)} style={[styles.smallBtn, { marginLeft: 'auto' }]}>
          <Text style={styles.smallBtnText}>{muted ? 'Unmute' : 'Mute'}</Text>
        </Pressable>
      </View>
      {DifficultyButtons}
      <FlatList
        data={songs}
        keyExtractor={(item) => item.title}
        contentContainerStyle={{ paddingBottom: spacing(6) }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.artist}>{item.artist}</Text>
              <Text style={styles.meta}>BPM {item.bpm} • Difficulty set: {selectedDifficulty}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => onPreview(item)} style={styles.smallBtn}><Text style={styles.smallBtnText}>Preview</Text></Pressable>
              <Pressable onPress={() => onPlay(item)} style={styles.btn}><Text style={styles.btnText}>Play</Text></Pressable>
            </View>
          </View>
        )}
      />
      <Pressable style={styles.back} onPress={() => navigation.replace('Start')}>
        <Text style={styles.backText}>Back to Start</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing(5), paddingHorizontal: spacing(2) },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(1) },
  header: { color: colors.white, fontSize: 22, fontWeight: '800', marginBottom: spacing(2) },
  diffRow: { flexDirection: 'row', gap: 8, marginBottom: spacing(2) },
  diffBtn: { borderWidth: 1, borderColor: '#3a3a5a', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  diffBtnActive: { backgroundColor: '#2a2140', borderColor: colors.neonPurple },
  diffText: { color: colors.white, fontWeight: '700', letterSpacing: 1 },
  card: { backgroundColor: '#141425', borderRadius: 16, padding: spacing(2), marginBottom: spacing(2), flexDirection: 'row', alignItems: 'center' },
  title: { color: colors.white, fontSize: 18, fontWeight: '700' },
  artist: { color: '#b8b8d8', marginTop: 2 },
  meta: { color: '#899', marginTop: 6 },
  actions: { gap: 8 },
  smallBtn: { backgroundColor: '#252545', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  smallBtnText: { color: colors.white },
  btn: { backgroundColor: colors.neonPurple, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  btnText: { color: colors.white, fontWeight: '700' },
  back: { position: 'absolute', top: spacing(2), left: spacing(2) },
  backText: { color: '#bfbfff' },
});
