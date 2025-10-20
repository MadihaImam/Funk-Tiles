import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (songTitle: string, difficulty: string) => `ft:hs:${songTitle}:${difficulty}`;

export async function getHighScore(songTitle: string, difficulty: string): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(keyFor(songTitle, difficulty));
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

export async function setHighScore(songTitle: string, difficulty: string, score: number): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(songTitle, difficulty), String(score));
  } catch {}
}
