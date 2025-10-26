Funk Tiles
Funk Tiles is a mobile rhythm game inspired by “Magic Tiles,” where players tap glowing tiles in sync with funky music beats. The game features multiple difficulty levels, a neon aesthetic, and dynamic music-driven gameplay.

Features
Tap tiles in 4 lanes in sync with music.
Automatic tile generation based on BPM.
Multiple difficulty levels: Easy, Normal, Hard.
High score and combo tracking.
Neon-themed visuals with smooth animations.
Expandable song list: add new music tracks easily.
Start page, song selection page, gameplay page, and game over page.
Replay and retry functionality.

Project Structure
FunkTiles/
├─ assets/
│  ├─ audio/           # Store MP3/OGG music files here
│  └─ images/          # Icons, background images, logos
├─ src/
│  ├─ components/      # UI components like buttons, tile, score display
│  ├─ screens/
│  │  ├─ StartScreen.js
│  │  ├─ HomeScreen.js
│  │  ├─ GameScreen.js
│  │  └─ GameOverScreen.js
│  └─ utils/           # Helper functions (BPM timing, tile generation)
├─ app.json             # Expo configuration
├─ eas.json             # EAS build profiles
├─ package.json
└─ README.md

Setup Instructions

Clone the repository
git clone <your-repo-url>
cd FunkTiles

Install dependencies
npm install
# or
yarn install

Run the app locally
expo start
Use the Expo Go app on your mobile device or an emulator to test.

Add new songs
Place audio files in assets/audio/.
Update the songs array in HomeScreen.js or a dedicated config file:
const songs = [
  {
    title: "New Song",
    artist: "Artist Name",
    audio: "assets/audio/new_song.mp3",
    bpm: 120,
    difficulties: {
      easy: { speed: 1.0, density: 0.8 },
      normal: { speed: 1.1, density: 1.0 },
      hard: { speed: 1.3, density: 1.2 },
    },
  },
];

Build Instructions (EAS)
Install EAS CLI
npm install -g eas-cli

Login
eas login

Initialize EAS in project
eas init
eas build:configure
Check eas.json
Ensure you have a preview or development profile with "buildType": "apk" for testing.

Run Android build
eas build -p android --profile preview
When the build completes, EAS provides an APK download link.
Gameplay Instructions
Start the game from the Start Screen.
Choose a song from the song selection screen.
Tap the glowing tiles in sync with the music.
Earn points for each correct tap and build combos.
The game ends when you miss a tile or the song ends.
Tap Retry to replay the same song or Home to select a new song.

Dependencies
React Native / Expo – Mobile app framework.
expo-av – Audio playback and control.
EAS CLI – Build and distribution tool for mobile apps.
Optional: Zustand or React Context for state management.

Future Improvements
Leaderboards and high score tracking.
Unlockable skins or tile themes.
Custom user-uploaded songs.
Power-ups and special effects during combos.

License
MIT License – feel free to use and modify this project.
