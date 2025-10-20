import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
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
  const { width } = Dimensions.get('window');
  const isSmall = width < 380;
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
      Alert.alert('Preview unavailable', 'Add MP3 to ' + song.audio + '.');
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
        <Text style={[styles.header, { fontSize: isSmall ? 18 : 22 } ]}>Select Your Phonk Track 🎶</Text>
        <Pressable onPress={() => setMuted(m => !m)} style={[styles.smallBtn, { marginLeft: 'auto', paddingVertical: isSmall ? 6 : 8, paddingHorizontal: isSmall ? 10 : 12 }]}>
          <Text style={[styles.smallBtnText, { fontSize: isSmall ? 12 : 14 }]}>{muted ? 'Unmute' : 'Mute'}</Text>
        </Pressable>
      </View>
      {DifficultyButtons}
      <FlatList
        data={songs}
        keyExtractor={(item) => item.title}
        contentContainerStyle={{ paddingBottom: spacing(6) }}
        renderItem={({ item }) => (
          <View style={[styles.card, { padding: isSmall ? spacing(1.5) : spacing(2) }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { fontSize: isSmall ? 16 : 18 }]} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
              <Text style={[styles.artist, { fontSize: isSmall ? 12 : 14 }]} numberOfLines={1} ellipsizeMode="tail">{item.artist}</Text>
              <Text style={[styles.meta, { fontSize: isSmall ? 11 : 12 }]}>BPM {item.bpm} • Difficulty set: {selectedDifficulty}</Text>
            </View>
            <View style={[styles.actions, { gap: isSmall ? 6 : 8 }]}>
              <Pressable onPress={() => onPreview(item)} style={[styles.smallBtn, { paddingVertical: isSmall ? 6 : 8, paddingHorizontal: isSmall ? 10 : 12 }]}><Text style={[styles.smallBtnText, { fontSize: isSmall ? 12 : 14 }]}>Preview</Text></Pressable>
              <Pressable onPress={() => onPlay(item)} style={[styles.btn, { paddingVertical: isSmall ? 8 : 10, paddingHorizontal: isSmall ? 14 : 16 }]}><Text style={[styles.btnText, { fontSize: isSmall ? 14 : 16 }]}>Play</Text></Pressable>
            </View>
          </View>
        )}
      />
      <Pressable style={styles.back} onPress={() => navigation.replace('Start')}>
        <Text style={[styles.backText, { fontSize: isSmall ? 12 : 14 }]}>Back to Start</Text>
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
