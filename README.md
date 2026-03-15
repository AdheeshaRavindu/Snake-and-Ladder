# Snake & Ladder

A browser-based Snake and Ladder game with Firebase-powered online multiplayer, animated dice rolls, synced turn flow, voice callouts, custom sound effects, and responsive board play across devices.

## Live Demo

[Play now](https://snake-and-ladder-36d.pages.dev/)

## Features

- Online room-code multiplayer
- Up to 8 players in one match
- Real-time synced turns across devices
- Exact-roll rule for landing on 100
- Placement-based finishing so everyone can keep playing for 1st, 2nd, 3rd, and beyond
- Animated square-by-square movement
- Snake-slide and ladder-climb path animation
- Voice turn announcements with toggle
- Music and SFX toggles
- Mobile-friendly board layout

## Project Files

- `index.html` - app shell and UI layout
- `style.css` - responsive styling and animations
- `game.js` - Firebase room logic, turn flow, dice, and sync
- `board.js` - board rendering, token placement, snakes and ladders
- `audio.js` - music, effects, and announcer cues
- `firebase-config.js` - Firebase web config

## Firebase Setup

1. Create a Firebase project.
2. Add a Web App in Firebase.
3. Enable Realtime Database.
4. Paste your Firebase config into `firebase-config.js`.
5. Use test rules while developing:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Run Locally

Open the project with a local static server and load `index.html`.

If you already have Firebase configured:

1. Open the game on one device
2. Enter a name and create a room
3. Open the game on another device
4. Enter a name and join with the room code
5. Start the match

## Match Rules

- Players must land on square 100 with the exact roll
- After the first player finishes, the match continues so the remaining players can fight for the next placements
- Only the 1st-place finish triggers the win sound

## Audio

Custom audio files can be placed in:

- `assets/audio/snake.mp3`
- `assets/audio/ladder.mp3`
- `assets/audio/BGM.mp3`
- `assets/audio/yeboi.mp3`
- `assets/audio/win.mp3`

Fallback behavior:

1. Local audio file
2. Built-in synthesized sound

## Notes

- This project is now a normal browser multiplayer game.
- It no longer depends on blockchain, wallets, or smart contracts.
