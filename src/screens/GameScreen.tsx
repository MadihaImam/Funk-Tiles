import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// Tile structure
interface Tile { id: number; lane: number; y: number; speed: number; spawnTs: number; arrivalTs: number; holdMs: number; endTs: number; }

export default function GameScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const { currentSong, difficulty, hit, hitWith, resetRun, isPaused, pause, resume } = useGameStore();
  // Prefer full effects on native; keep perf mode on web for smoothness
  const performanceMode = Platform.OS === 'web';
  const [tiles, setTiles] = useState<Tile[]>([]);
  const tilesRef = useRef<Tile[]>([]);
  const [startTs, setStartTs] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef<Audio.Sound | null>(null);
  const nextTileId = useRef(1);
  const [ended, setEnded] = useState(false);
  const timeRef = useRef<number>(0);
  // Robust hit line position based on current window height
  const hitLineYLocal = Math.max(220, Dimensions.get('window').height - 140);
  const laneWidthLocal = Dimensions.get('window').width / LANES;
  const laneFlashRef = useRef<number[]>([0, 0, 0, 0]); // timestamps of last hit per lane
  const [floatTexts, setFloatTexts] = useState<{ id: number; lane: number; y: number; label: string }[]>([]);
  const [particles, setParticles] = useState<{ id: number; lane: number; y: number; x: number; born: number; dx: number }[]>([]);
  const nextFloatId = useRef(1);
  const nextParticleId = useRef(1);
  const hitSfxRef = useRef<Audio.Sound | null>(null);
  const missSfxRef = useRef<Audio.Sound | null>(null);
  const laneQualityTsRef = useRef<number[]>([0, 0, 0, 0]);
  const laneQualityStrengthRef = useRef<number[]>([0, 0, 0, 0]); // 1..3, decays over time
  const heldLanesRef = useRef<Set<number>>(new Set());
  const holdingTileIdsRef = useRef<Set<number>>(new Set());
  const spawnedCountRef = useRef<number>(0);
  const playbackStartedRef = useRef<boolean>(false);
  const firstArrivalTsRef = useRef<number | null>(null);
  const posMsRef = useRef<number>(0);
  const nextBeatIdxRef = useRef<number>(0);
  const baseBeatStepRef = useRef<number>(2); // spawn every 2 beats by default

  const diffConf = useMemo(() => currentSong?.difficulties[difficulty], [currentSong, difficulty]);
  const beatInterval = useMemo(() => currentSong ? 60 / currentSong.bpm : 0.5, [currentSong]);
  // Base spawn cadence: one tile every 2 beats; burst mode will temporarily spawn every beat
  const spawnInterval = useMemo(() => beatInterval * 2, [beatInterval]);
  const time = useSharedValue(0);
  // Pattern support: if currentSong has pattern, follow it deterministically; else random with optional chords
  const doubleChance = useRef(0.05); // 5% chance to spawn two simultaneous lanes when no pattern
  const patternIdxRef = useRef(0);
  const beatsSinceChordRef = useRef(10); // limit chord frequency
  const burstBeatsRef = useRef(0); // when >0, spawn every beat to create quick sequences

  const endGame = useCallback(async () => {
    try { await audioRef.current?.stopAsync(); } catch {}
    try { await audioRef.current?.unloadAsync(); } catch {}
    navigation.replace('GameOver');
  }, [navigation]);

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
          if (s?.isLoaded) {
            posMsRef.current = s.positionMillis ?? posMsRef.current;
            if (s.positionMillis > 0) playbackStartedRef.current = true;
          }
          if (s?.didJustFinish && mounted && playbackStartedRef.current) {
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

  // spawner: audio-locked beat syncing (Magic Tiles style: tiles arrive on-beat)
  useEffect(() => {
    if (!startTs || !currentSong || !diffConf) return;
    // reset pattern and burst counters at (re)start
    patternIdxRef.current = 0;
    beatsSinceChordRef.current = 10;
    burstBeatsRef.current = 0;
    // fewer notes when performance mode: spawn every 4 beats (native keeps 2)
    baseBeatStepRef.current = performanceMode ? 4 : 2;
    // seed next beat index to current audio position so first spawn happens immediately
    const beatMs = beatInterval * 1000;
    const posBeats = beatMs > 0 ? Math.floor((posMsRef.current || 0) / beatMs) : 0;
    nextBeatIdxRef.current = posBeats; // allow immediate spawn
    let lastTime = startTs;
    let lastUpdate = startTs;

    const tick = (t: number) => {
      if (isPaused) { rafRef.current = requestAnimationFrame(tick); return; }
      // audio-locked beat spawning
      const beatMsLocal = beatInterval * 1000;
      const posMs = posMsRef.current;
      const posBeatsNow = beatMsLocal > 0 ? Math.floor(posMs / beatMsLocal) : 0;
      const currentStep = burstBeatsRef.current > 0 ? 1 : baseBeatStepRef.current;
      while (nextBeatIdxRef.current <= posBeatsNow) {
        const startY = -100;
        const distancePx = Math.max(220, Dimensions.get('window').height - 140) - startY;
        // Global ramp based on elapsed beats
        const elapsedBeats = beatMsLocal > 0 ? ((t - (startTs || t)) / beatMsLocal) : 0;
        const rampK = 0.004;
        const minTravelBeats = 1.4;
        const travelBeats = Math.max(minTravelBeats, 2.0 - rampK * elapsedBeats);
        const travelMs = travelBeats * beatMsLocal;
        const speed = distancePx / travelMs;
        const spawnTs = t;
        const arrivalTs = spawnTs + travelMs;
        const spawnTiles: { lane: number; holdMs?: number }[] = [];
        const pat = currentSong?.pattern;
        if (pat && pat.length > 0) {
          let step = pat[patternIdxRef.current % pat.length];
          patternIdxRef.current++;
          step = Array.from(new Set(step)).slice(0, 2);
          for (const ln of step) spawnTiles.push({ lane: Math.max(0, Math.min(LANES - 1, ln)), holdMs: 0 });
          beatsSinceChordRef.current = step.length > 1 ? 0 : (beatsSinceChordRef.current + 1);
        } else {
          const allowChord = beatsSinceChordRef.current >= 5;
          if (allowChord && Math.random() < doubleChance.current) {
            const first = Math.floor(Math.random() * LANES);
            let second = Math.floor(Math.random() * LANES);
            if (second === first) second = (second + 1) % LANES;
            spawnTiles.push({ lane: first, holdMs: 0 }, { lane: second, holdMs: 0 });
            beatsSinceChordRef.current = 0;
          } else {
            const ln = Math.floor(Math.random() * LANES);
            // no holds in first 8 beats of gameplay
            const isHold = elapsedBeats >= 8 ? (Math.random() < 0.05) : false;
            const holdMs = isHold ? (beatMsLocal * (1.0 + Math.random() * 0.8)) : 0;
            spawnTiles.push({ lane: ln, holdMs });
            beatsSinceChordRef.current += 1;
          }
        }
        if (spawnTiles.length > 0) {
          // Cap simultaneous tiles for smoothness, stricter on web
          const maxPerLane = performanceMode ? 1 : 3;
          const maxTotal = performanceMode ? 12 : 24;
          const current = tilesRef.current;
          const perLaneCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
          for (const t of current) perLaneCount[t.lane] = (perLaneCount[t.lane] ?? 0) + 1;
          let totalAllowed = Math.max(0, maxTotal - current.length);
          const allowed: typeof spawnTiles = [];
          for (const s of spawnTiles) {
            if (totalAllowed <= 0) break;
            if ((perLaneCount[s.lane] ?? 0) >= maxPerLane) continue;
            allowed.push(s);
            perLaneCount[s.lane] = (perLaneCount[s.lane] ?? 0) + 1;
            totalAllowed--;
          }
          if (allowed.length > 0) {
            setTiles(prev => [
              ...prev,
              ...allowed.map(s => ({ id: nextTileId.current++, lane: s.lane, y: startY, speed, spawnTs, arrivalTs, holdMs: s.holdMs ?? 0, endTs: arrivalTs + (s.holdMs ?? 0) }))
            ]);
            spawnedCountRef.current += allowed.length;
            if (firstArrivalTsRef.current == null) firstArrivalTsRef.current = arrivalTs;
          }
        }
        // optionally start a short burst (disabled in performance mode)
        if (!performanceMode && burstBeatsRef.current <= 0 && Math.random() < 0.1) {
          burstBeatsRef.current = 3;
        }
        if (burstBeatsRef.current > 0) burstBeatsRef.current -= 1;
        nextBeatIdxRef.current += currentStep;
      }
      // advance shared time for Reanimated tiles
      const dt = t - lastTime;
      time.value = t;
      // strict fail: if any tile passes window or hold broken -> game over (slightly wider window)
      const goodWindowMs = 220;
      // small grace at the very start so first tiles are visible
      const failChecksActive = firstArrivalTsRef.current != null ? (t > firstArrivalTsRef.current + 400) : false;
      const liveTiles = tilesRef.current;
      if (failChecksActive) for (const tile of liveTiles) {
        if (tile.holdMs > 0) {
          const laneHeld = heldLanesRef.current.has(tile.lane);
          // must be holding shortly after arrival
          if (t > tile.arrivalTs + goodWindowMs && !holdingTileIdsRef.current.has(tile.id)) {
            // never started holding in time
            try { missSfxRef.current?.replayAsync(); } catch {}
            endGame();
            return;
          }
          // if started holding, releasing early before endTs - window is a fail
          if (holdingTileIdsRef.current.has(tile.id)) {
            if (!laneHeld && t < tile.endTs - goodWindowMs) {
              try { missSfxRef.current?.replayAsync(); } catch {}
              endGame();
              return;
            }
            // complete hold when past endTs within window
            if (t >= tile.endTs - goodWindowMs) {
              // success: remove tile and score
              setTiles(prev => prev.filter(x => x.id !== tile.id));
              holdingTileIdsRef.current.delete(tile.id);
              hitWith(3);
              try { hitSfxRef.current?.replayAsync(); } catch {}
              laneQualityTsRef.current[tile.lane] = performance.now();
              laneQualityStrengthRef.current[tile.lane] = 3;
              break;
            }
          }
        } else {
          // tap tile: if it passes window unhit -> fail
          if (t > tile.arrivalTs + goodWindowMs) {
            try { missSfxRef.current?.replayAsync(); } catch {}
            endGame();
            return;
          }
        }
      }

      // end condition: avoid premature end; require tiles spawned first
      if (ended && spawnedCountRef.current > 0 && tilesRef.current.length === 0) {
        navigation.replace('GameOver');
        return;
      }

      lastTime = t;
      timeRef.current = t;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startTs, diffConf, beatInterval, isPaused, ended]);

  // cleanup audio
  useEffect(() => {
    return () => { (async () => { try { await audioRef.current?.unloadAsync(); } catch {} })(); };
  }, []);

  const onTapLane = useCallback((laneIdx: number, touchY?: number) => {
    // find nearest tile in the lane close to hit line
    setTiles(prev => {
      let hitIndex = -1;
      for (let i = 0; i < prev.length; i++) {
        const tile = prev[i];
        // Only allow tap if the tile for THIS lane is within window; ignore wrong-lane taps
        const now = timeRef.current;
        if (tile.lane !== laneIdx || tile.holdMs !== 0) continue;
        // time-gated
        if (Math.abs(now - tile.arrivalTs) >= 180) continue;
        // pressing area is the whole lane; no vertical overlap check required
        hitIndex = i; break;
      }
      if (hitIndex >= 0) {
        const newArr = [...prev];
        const tile = newArr.splice(hitIndex, 1)[0];
        const now = timeRef.current;
        const deltaMs = Math.abs(now - tile.arrivalTs);
        let pts = 1; let label = 'GOOD';
        if (deltaMs < 60) { pts = 3; label = 'PERFECT'; }
        else if (deltaMs < 120) { pts = 2; label = 'GREAT'; }
        hitWith(pts);
        try { hitSfxRef.current?.replayAsync(); } catch {}
        laneFlashRef.current[laneIdx] = performance.now();
        laneQualityTsRef.current[laneIdx] = performance.now();
        laneQualityStrengthRef.current[laneIdx] = pts;
        if (!performanceMode) {
          const ft = { id: nextFloatId.current++, lane: laneIdx, y: hitLineYLocal - 20, label };
          setFloatTexts(arr => [...arr, ft]);
          setTimeout(() => setFloatTexts(arr => arr.filter(x => x.id !== ft.id)), 500);
        }
        if (!performanceMode && label === 'PERFECT') {
          // spawn simple particles near the hit line in this lane
          const burst = Array.from({ length: 6 }).map(() => ({
            id: nextParticleId.current++,
            lane: laneIdx,
            y: hitLineYLocal - 20 - Math.random() * 30,
            x: Math.random() * (laneWidthLocal - 24) + 12,
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
        // wrong-lane/off-time tap -> ignore (no instant fail)
        return prev;
      }
    });
  }, [endGame]);

  // Multi-finger: mark holds by lane on press in/out
  const onLanePressIn = useCallback((laneIdx: number, touchY?: number) => {
    heldLanesRef.current.add(laneIdx);
    // if a hold tile is arriving now, mark as started holding
    const now = timeRef.current;
    for (const tile of tilesRef.current) {
      if (tile.lane !== laneIdx || tile.holdMs <= 0) continue;
      if (Math.abs(now - tile.arrivalTs) >= 180) continue;
      // pressing area is the whole lane; no vertical overlap check required
      holdingTileIdsRef.current.add(tile.id);
    }
  }, []);

  const onLanePressOut = useCallback((laneIdx: number) => {
    heldLanesRef.current.delete(laneIdx);
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
  const tilesByLane = useMemo(() => {
    const map: Record<number, Tile[]> = { 0: [], 1: [], 2: [], 3: [] };
    for (const t of tiles) map[t.lane]?.push(t);
    return map;
  }, [tiles]);
  const now = timeRef.current;
  const beatMs = (beatInterval || 0.5) * 1000;
  const phase = startTs ? ((now - startTs) % beatMs) / beatMs : 0;
  const pulseOpacity = 0.45 * Math.exp(-6 * phase); // smooth exponential decay flash per beat

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{currentSong?.title ?? ''}</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text style={styles.topMeta}>Score: {useGameStore.getState().score}</Text>
          <Text style={styles.topMeta}>Combo: {useGameStore.getState().combo}</Text>
          <Pressable onPress={onPauseToggle}><Text style={styles.pause}>{isPaused ? 'Resume' : 'Pause'}</Text></Pressable>
        </View>
      </View>

      {/* Rotating disc HUD (perf-light) */}
      {!performanceMode && (
        <RotatingDisc
          sharedTime={time}
          beatMs={(beatInterval || 0.5) * 1000}
          startTs={startTs ?? 0}
        />
      )}

      <View style={[styles.hitLine, { top: hitLineYLocal }]} pointerEvents="none" />

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {lanes.map((_, laneIdx) => (
          <View
            key={laneIdx}
            style={[styles.lane, { width: laneWidthLocal }]}
          >
            {/* Lane hit flash */}
            {now - laneFlashRef.current[laneIdx] < 120 && (
              <View style={styles.laneFlash} />
            )}
            {/* Near-hit highlight and lane quality disabled in performance mode */}
            {!performanceMode && (() => {
              const anyNear = tiles.some(t => {
                const elapsed = time.value - t.spawnTs;
                const yNow = t.y + t.speed * elapsed;
                return t.lane === laneIdx && yNow > hitLineYLocal - vfxConfig.laneNearHitPx && yNow < hitLineYLocal;
              });
              return anyNear ? <View style={styles.laneNear} /> : null;
            })()}
            {!performanceMode && (() => {
              const age = now - laneQualityTsRef.current[laneIdx];
              const strength = laneQualityStrengthRef.current[laneIdx];
              const decay = Math.max(0, 1 - age / 220);
              const opacity = 0.08 * strength * decay;
              if (opacity <= 0) return null;
              return <View style={[styles.laneQuality, { opacity }]} />;
            })()}
            {tilesByLane[laneIdx].map(tile => (
              <TileView key={tile.id} tile={tile} sharedTime={time} laneWidth={laneWidthLocal} performanceMode={performanceMode} />
            ))}
            {particles.filter(p => p.lane === laneIdx).map(p => (
              <ParticleView key={p.id} p={p} sharedTime={time.value} />
            ))}
          </View>
        ))}
        {/* Central multi-touch overlay: maps finger positions to lanes and only hits if inside tile rect */}
        <View
          style={StyleSheet.absoluteFill}
          onTouchStart={(e) => {
            const touches = e.nativeEvent.touches as any[];
            for (const t of touches) {
              const x = (t.locationX ?? 0);
              const y = (t.locationY ?? 0);
              const lane = Math.max(0, Math.min(LANES - 1, Math.floor(x / laneWidthLocal)));
              onLanePressIn(lane, y);
              // Attempt tap for non-hold tiles arriving now in that lane only if inside tile rect
              onTapLane(lane, y);
            }
          }}
          onTouchEnd={(e) => {
            const touches = (e.nativeEvent.changedTouches as any[]) || [];
            for (const t of touches) {
              const x = (t.locationX ?? 0);
              const y = (t.locationY ?? 0);
              const lane = Math.max(0, Math.min(LANES - 1, Math.floor(x / laneWidthLocal)));
              onLanePressOut(lane);
            }
          }}
          onTouchCancel={(e) => {
            const touches = (e.nativeEvent.changedTouches as any[]) || [];
            for (const t of touches) {
              const x = (t.locationX ?? 0);
              const y = (t.locationY ?? 0);
              const lane = Math.max(0, Math.min(LANES - 1, Math.floor(x / laneWidthLocal)));
              onLanePressOut(lane);
            }
          }}
          pointerEvents="auto"
        />
        {/* BPM pulse overlay disabled in performance mode */}
        {!performanceMode && (
          <View pointerEvents="none" style={[styles.pulseOverlay, { opacity: pulseOpacity }]} />
        )}
      </View>
    </SafeAreaView>
  );
}

// Child component so hooks are used safely per tile
function TileView({ tile, sharedTime, laneWidth, performanceMode }: { tile: Tile; sharedTime: Animated.SharedValue<number>; laneWidth: number; performanceMode: boolean }) {
  const aStyle = useAnimatedStyle(() => {
    const elapsed = sharedTime.value - tile.spawnTs;
    const yNow = tile.y + tile.speed * elapsed;
    return { transform: [{ translateY: yNow }]} as any;
  });
  return (
    <Animated.View style={[aStyle, { position: 'absolute', left: 6, right: 6 }]}>
      <View style={[styles.tile, !performanceMode && styles.tileGlow]} />
    </Animated.View>
  );
}

// Rotating vinyl-like disc with beat-synced scaling
function RotatingDisc({ sharedTime, beatMs, startTs }: { sharedTime: Animated.SharedValue<number>; beatMs: number; startTs: number }) {
  const discStyle = useAnimatedStyle(() => {
    const t = sharedTime.value;
    const rot = (t * 0.06) % 360; // deg per ms (slow spin)
    const phase = beatMs > 0 ? (((t - startTs) % beatMs) / beatMs) : 0;
    const scale = 1 + 0.05 * Math.exp(-6 * phase);
    return {
      transform: [{ rotate: `${rot}deg` }, { scale }],
    } as any;
  });
  return (
    <View style={styles.discWrap} pointerEvents="none">
      <Animated.View style={[styles.discOuter, discStyle]}>
        <View style={styles.discGroove} />
        <View style={styles.discCenter} />
      </Animated.View>
    </View>
  );
}

function ParticleView({ p, sharedTime }: { p: { id: number; lane: number; y: number; x: number; born: number; dx: number }; sharedTime: number }) {
  const pStyle = useAnimatedStyle(() => {
    const dt = sharedTime - p.born;
    const alpha = Math.max(0, 1 - dt / 400);
    const driftX = p.dx * dt * 0.05;
    return {
      opacity: alpha,
      transform: [{ translateY: p.y }, { translateX: driftX }],
    } as any;
  });
  return <Animated.View style={[styles.particle, pStyle as any, { left: p.x }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { height: 64, borderBottomWidth: 1, borderBottomColor: '#22223a', paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  topTitle: { color: colors.white, fontWeight: '800' },
  topMeta: { color: '#cfd8ff' },
  pause: { color: colors.neonCyan, fontWeight: '800' },
  discWrap: { position: 'absolute', right: 12, top: 72 },
  discOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#0b0b0f', borderWidth: 2, borderColor: '#1d1d30', alignItems: 'center', justifyContent: 'center' },
  discGroove: { position: 'absolute', width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#202038' },
  discCenter: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#9b5cff' },
  lane: { flex: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#151532', justifyContent: 'flex-start', overflow: 'hidden' },
  tile: { position: 'absolute', height: 200, borderRadius: 8, backgroundColor: '#000000', opacity: 0.98, borderWidth: 2, borderColor: '#ffffff' },
  // stronger glow on tiles
  // @ts-ignore shadow props iOS/Android
  tileGlow: {},
  holdTail: { backgroundColor: '#0a0a0a', borderRadius: 10, opacity: 0.9, marginHorizontal: 0, marginBottom: 6 },
  hitLine: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: '#2a2140', zIndex: 1 },
  laneFlash: { ...StyleSheet.absoluteFillObject as any, backgroundColor: '#ffffff20' },
  laneNear: { ...StyleSheet.absoluteFillObject as any, backgroundColor: '#00e5ff10' },
  laneQuality: { ...StyleSheet.absoluteFillObject as any, backgroundColor: '#9b5cff20' },
  pulseOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#9b5cff15' },
  floatText: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  floatTextLabel: { color: colors.white, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 6 },
  particle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e5ff', opacity: 0.8 },
});
