import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Alert, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors } from '@/theme/theme';
import { useGameStore } from '@/store/useGameStore';
import { Audio } from 'expo-av';
import { audioMap } from '@/data/audioMap';
import { appAudioConfig, vfxConfig } from '@/data/config';

const LANES = 4;
const { height, width } = Dimensions.get('window');
const laneWidth = width / LANES;
const hitLineY = height - 140; // target line

// Tile structure
interface Tile { id: number; lane: number; y: number; speed: number; time: number; }

export default function GameScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const { currentSong, difficulty, hit, hitWith, resetRun, isPaused, pause, resume } = useGameStore();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const tilesRef = useRef<Tile[]>([]);
  const [startTs, setStartTs] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef<Audio.Sound | null>(null);
  const nextTileId = useRef(1);
  const [ended, setEnded] = useState(false);
  const timeRef = useRef<number>(0);
  const laneFlashRef = useRef<number[]>([0, 0, 0, 0]); // timestamps of last hit per lane
  const [floatTexts, setFloatTexts] = useState<{ id: number; lane: number; y: number; label: string }[]>([]);
  const [particles, setParticles] = useState<{ id: number; lane: number; y: number; x: number; born: number; dx: number }[]>([]);
  const nextFloatId = useRef(1);
  const nextParticleId = useRef(1);
  const hitSfxRef = useRef<Audio.Sound | null>(null);
  const missSfxRef = useRef<Audio.Sound | null>(null);
  const laneQualityTsRef = useRef<number[]>([0, 0, 0, 0]);
  const laneQualityStrengthRef = useRef<number[]>([0, 0, 0, 0]); // 1..3, decays over time

  const diffConf = useMemo(() => currentSong?.difficulties[difficulty], [currentSong, difficulty]);
  const beatInterval = useMemo(() => currentSong ? 60 / currentSong.bpm : 0.5, [currentSong]);
  const spawnInterval = useMemo(() => diffConf ? beatInterval / (diffConf.density || 1) : beatInterval, [beatInterval, diffConf]);
  const time = useSharedValue(0);

  // keep a live ref of tiles to avoid stale closure in RAF loop
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);

  // load and start audio; start gameplay timer immediately so the game runs even if audio is blocked
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!currentSong) { Alert.alert('No song selected'); navigation.replace('Home'); return; }
      try {
        // start gameplay clock immediately
        if (mounted && !startTs) setStartTs(performance.now());

        const source = audioMap[currentSong.audio];
        if (!source) throw new Error('missing-audio');
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
        audioRef.current = sound;
        // if audio starts later due to permissions, gameplay continues regardless
        sound.setOnPlaybackStatusUpdate((s: any) => {
          if (s.didJustFinish && mounted) {
            setEnded(true);
          }
        });
      } catch (e) {
        // If audio missing/blocked, fallback to a silent timer-only gameplay
        if (mounted && !startTs) setStartTs(performance.now());
      }
    })();
    return () => { mounted = false; };
  }, []);

  // preload small SFX
  useEffect(() => {
    (async () => {
      try {
        if (appAudioConfig.hitSfx && audioMap[appAudioConfig.hitSfx]) {
          const { sound } = await Audio.Sound.createAsync(audioMap[appAudioConfig.hitSfx]);
          hitSfxRef.current = sound;
        }
      } catch {}
      try {
        if (appAudioConfig.missSfx && audioMap[appAudioConfig.missSfx]) {
          const { sound } = await Audio.Sound.createAsync(audioMap[appAudioConfig.missSfx]);
          missSfxRef.current = sound;
        }
      } catch {}
    })();
    return () => { (async () => { try { await hitSfxRef.current?.unloadAsync(); } catch {}; try { await missSfxRef.current?.unloadAsync(); } catch {} })(); };
  }, []);

  // spawner based on BPM & difficulty
  useEffect(() => {
    if (!startTs || !currentSong || !diffConf) return;
    let lastSpawn = startTs;
    let lastTime = startTs;
    let lastUpdate = startTs;

    const tick = (t: number) => {
      if (isPaused) { rafRef.current = requestAnimationFrame(tick); return; }
      // spawn
      if (t - lastSpawn >= spawnInterval * 1000) {
        const lane = Math.floor(Math.random() * LANES);
        const speed = 0.15 * (diffConf.speed || 1); // px per ms
        setTiles(prev => [...prev, { id: nextTileId.current++, lane, y: -80, speed, time: t }]);
        lastSpawn = t;
      }
      // advance shared time for Reanimated tiles
      const dt = t - lastTime;
      let gameOver = false;
      time.value = t;
      // compute misses from derived positions without committing React state updates
      const liveTiles = tilesRef.current;
      for (const tile of liveTiles) {
        const yNow = tile.y + tile.speed * (t - tile.time);
        if (yNow > hitLineY + 70) { gameOver = true; break; }
      }

      if (gameOver) {
        try { missSfxRef.current?.replayAsync(); } catch {}
        navigation.replace('GameOver');
        return;
      }

      // end condition: if audio ended and no tiles left, navigate
      if (ended && tilesRef.current.length === 0) {
        navigation.replace('GameOver');
        return;
      }

      lastTime = t;
      timeRef.current = t;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startTs, diffConf, spawnInterval, isPaused, ended, tiles.length]);

  // cleanup audio
  useEffect(() => {
    return () => { (async () => { try { await audioRef.current?.unloadAsync(); } catch {} })(); };
  }, []);

  const onTapLane = useCallback((laneIdx: number) => {
    // find nearest tile in the lane close to hit line
    setTiles(prev => {
      let hitIndex = -1;
      for (let i = 0; i < prev.length; i++) {
        const tile = prev[i];
        if (tile.lane === laneIdx && Math.abs(tile.y - hitLineY) < 60) { hitIndex = i; break; }
      }
      if (hitIndex >= 0) {
        const newArr = [...prev];
        const tile = newArr.splice(hitIndex, 1)[0];
        const delta = Math.abs(tile.y - hitLineY);
        let pts = 1; let label = 'GOOD';
        if (delta < 20) { pts = 3; label = 'PERFECT'; }
        else if (delta < 40) { pts = 2; label = 'GREAT'; }
        hitWith(pts);
        try { hitSfxRef.current?.replayAsync(); } catch {}
        laneFlashRef.current[laneIdx] = performance.now();
        laneQualityTsRef.current[laneIdx] = performance.now();
        laneQualityStrengthRef.current[laneIdx] = pts;
        const ft = { id: nextFloatId.current++, lane: laneIdx, y: hitLineY - 20, label };
        setFloatTexts(arr => [...arr, ft]);
        setTimeout(() => setFloatTexts(arr => arr.filter(x => x.id !== ft.id)), 500);
        if (label === 'PERFECT') {
          // spawn simple particles near the hit line in this lane
          const burst = Array.from({ length: 6 }).map(() => ({
            id: nextParticleId.current++,
            lane: laneIdx,
            y: hitLineY - 20 - Math.random() * 30,
            x: Math.random() * (laneWidth - 24) + 12,
            born: performance.now(),
            dx: Math.random() < 0.5 ? -1 : 1,
          }));
          setParticles(p => [...p, ...burst]);
          setTimeout(() => {
            const ids = burst.map(b => b.id);
            setParticles(p => p.filter(q => !ids.includes(q.id)));
          }, 400);
        }
        return newArr;
      } else {
        // miss -> end game
        try { missSfxRef.current?.replayAsync(); } catch {}
        navigation.replace('GameOver');
        return prev;
      }
    });
  }, []);

  const onPauseToggle = async () => {
    if (isPaused) {
      resume();
      try { await audioRef.current?.playAsync(); } catch {}
    } else {
      pause();
      try { await audioRef.current?.pauseAsync(); } catch {}
    }
  };

  // Web keyboard controls: A,S,D,F -> lanes 0..3
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const map: Record<string, number> = { 'a': 0, 's': 1, 'd': 2, 'f': 3 };
      if (key in map) {
        e.preventDefault();
        onTapLane(map[key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTapLane]);

  const lanes = new Array(LANES).fill(0);
  const now = timeRef.current;
  const beatMs = (beatInterval || 0.5) * 1000;
  const phase = startTs ? ((now - startTs) % beatMs) / beatMs : 0;
  const pulseOpacity = 0.45 * Math.exp(-6 * phase); // smooth exponential decay flash per beat

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{currentSong?.title ?? ''}</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text style={styles.topMeta}>Score: {useGameStore.getState().score}</Text>
          <Text style={styles.topMeta}>Combo: {useGameStore.getState().combo}</Text>
          <Pressable onPress={onPauseToggle}><Text style={styles.pause}>{isPaused ? 'Resume' : 'Pause'}</Text></Pressable>
        </View>
      </View>

      <View style={styles.hitLine} />

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {lanes.map((_, laneIdx) => (
          <Pressable key={laneIdx} style={[styles.lane, { width: laneWidth }]} onPress={() => onTapLane(laneIdx)}>
            {/* Lane hit flash */}
            {now - laneFlashRef.current[laneIdx] < 120 && (
              <View style={styles.laneFlash} />
            )}
            {/* Near-hit highlight */}
            {tiles.some(t => t.lane === laneIdx && t.y > hitLineY - vfxConfig.laneNearHitPx && t.y < hitLineY) && (
              <View style={styles.laneNear} />
            )}
            {/* Quality-based glow with decay */}
            {(() => {
              const age = now - laneQualityTsRef.current[laneIdx];
              const strength = laneQualityStrengthRef.current[laneIdx];
              const decay = Math.max(0, 1 - age / 220);
              const opacity = 0.08 * strength * decay;
              if (opacity <= 0) return null;
              return <View style={[styles.laneQuality, { opacity }]} />;
            })()}
            {tiles.filter(t => t.lane === laneIdx).map(tile => {
              const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: tile.y + tile.speed * (time.value - tile.time) }] }));
              return (
                <Animated.View key={tile.id} style={[styles.tile, styles.tileGlow, aStyle, { left: 8, right: 8 }]} />
              );
            })}
            {particles.filter(p => p.lane === laneIdx).map(p => {
              const pStyle = useAnimatedStyle(() => {
                const dt = time.value - p.born;
                const alpha = Math.max(0, 1 - dt / 400);
                const driftX = p.dx * dt * 0.05;
                return {
                  opacity: alpha,
                  transform: [{ translateY: p.y }, { translateX: driftX }],
                } as any;
              });
              return (
                <Animated.View key={p.id} style={[styles.particle, pStyle as any, { left: p.x }]} />
              );
            })}
          </Pressable>
        ))}
        {/* BPM pulse overlay */}
        <View pointerEvents="none" style={[styles.pulseOverlay, { opacity: pulseOpacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { height: 64, borderBottomWidth: 1, borderBottomColor: '#22223a', paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  topTitle: { color: colors.white, fontWeight: '800' },
  topMeta: { color: '#cfd8ff' },
  pause: { color: colors.neonCyan, fontWeight: '800' },
  lane: { flex: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#151532', justifyContent: 'flex-start', overflow: 'hidden' },
  tile: { position: 'absolute', height: 100, borderRadius: 12, backgroundColor: '#6a3cff', opacity: 0.9 },
  // stronger glow on tiles
  // @ts-ignore shadow props iOS/Android
  tileGlow: { shadowColor: '#9b5cff', shadowOpacity: 0.6, shadowRadius: 10, elevation: 6 },
  hitLine: { position: 'absolute', left: 0, right: 0, top: hitLineY, height: 4, backgroundColor: '#2a2140', zIndex: 1 },
  laneFlash: { ...StyleSheet.absoluteFillObject as any, backgroundColor: '#ffffff20' },
  laneNear: { ...StyleSheet.absoluteFillObject as any, backgroundColor: '#00e5ff10' },
  laneQuality: { ...StyleSheet.absoluteFillObject as any, backgroundColor: '#9b5cff20' },
  pulseOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#9b5cff15' },
  floatText: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  floatTextLabel: { color: colors.white, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 6 },
  particle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e5ff', opacity: 0.8 },
});
