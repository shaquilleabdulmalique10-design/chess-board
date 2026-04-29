# ♜ CHESS MASTER — Enhanced Multiplayer & AI

A fully-featured online chess game with real-time multiplayer, advanced AI, and a beautiful modern UI.

---

## 🚀 Features

### ✨ Online Multiplayer
- **Real-time sync** via Firebase Realtime Database
- **Presence system** — see when your opponent is online/offline
- **Auto-reconnect** — restores game state if connection drops
- **Move history** — full game notation displayed in sidebar
- **Draw offers & resign** — complete game flow
- **Board flipping** — black player sees board from their perspective
- **Toast notifications** — for all game events

### 🤖 AI Opponents
- **4 difficulty levels:**
  - 🟢 **Easy** — Random moves with occasional captures
  - 🟡 **Medium** — Greedy captures + 1-ply lookahead
  - 🔴 **Hard** — Depth 3 minimax with alpha-beta pruning
  - ⚫ **Expert** — Depth 4 minimax + opening book + positional evaluation

- **Advanced evaluation:**
  - Material counting
  - Positional bonus tables for all piece types
  - Mobility bonus
  - Doubled pawn penalty
  - Endgame detection

### 🎨 Modern UI
- Responsive design (desktop & mobile)
- Animated board highlights (selected, valid moves, last move, check)
- Rank/file labels (a-h, 1-8)
- Connection status bar
- Player presence indicators
- Game over modal with win/lose/draw messaging
- Reconnecting overlay with spinner
- Toast notifications

---

## 🔧 Setup Instructions

### 1. **Get Firebase Realtime Database URL**

To enable online multiplayer, you need a Firebase Realtime Database:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. In the left sidebar, click **Build** → **Realtime Database**
4. Click **Create Database**
5. Choose a location (e.g., `us-central1`)
6. Start in **Test mode** (for development) or **Locked mode** (for production)
7. Copy your database URL — it looks like:
   ```
   https://your-project-name-default-rtdb.firebaseio.com
   ```

### 2. **Configure Security Rules (Important!)**

In the Firebase Console, go to **Realtime Database** → **Rules** tab and paste:

```json
{
  "rules": {
    "games": {
      "$roomCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

⚠️ **Note:** These rules allow anyone to read/write. For production, you should add authentication and restrict access.

### 3. **Run the Game**

1. Open `index.html` in your browser
2. Click the **☰** menu button (on mobile) or see the sidebar (on desktop)
3. Under **🌐 ONLINE MULTIPLAYER**, paste your Firebase Database URL
4. Click **💾 SAVE & CONNECT**
5. Once connected, click **🎮 CREATE NEW GAME** or **🔗 JOIN GAME**

---

## 🎮 How to Play

### Local Modes
- **🤖 VS COMPUTER** — Play against AI (choose difficulty: Easy/Medium/Hard/Expert)
- **👥 LOCAL TWO PLAYER** — Pass-and-play on the same device

### Online Multiplayer
1. **Create a game:**
   - Click **🎮 CREATE NEW GAME**
   - Share the 6-character code with your friend
   - Wait for them to join

2. **Join a game:**
   - Get the game code from your friend
   - Enter it in the input field
   - Click **🔗 JOIN GAME**

3. **During the game:**
   - Click a piece to select it (shows valid moves as green dots)
   - Click a highlighted square to move
   - Pawn promotion: choose Queen/Rook/Bishop/Knight when reaching the end
   - **🤝 OFFER DRAW** — propose a draw to your opponent
   - **🏳️ RESIGN** — forfeit the game

---

## 📱 Mobile Support

Fully responsive! Works great on phones and tablets:
- Touch-friendly piece selection
- Swipe-friendly sidebar menu
- Optimized board size for small screens

---

## 🛠️ Technical Details

### Stack
- **Frontend:** Vanilla JavaScript (no frameworks)
- **Backend:** Firebase Realtime Database
- **Styling:** Pure CSS with gradients, animations, and backdrop filters

### Key Features
- **Minimax AI** with alpha-beta pruning (up to depth 4)
- **Positional evaluation** using piece-square tables
- **Move validation** with check/checkmate detection
- **Firebase presence** with heartbeat monitoring
- **Sequence numbers** to prevent race conditions
- **Auto-reconnect** with exponential backoff

### Browser Compatibility
- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 12+)

---

## 🐛 Troubleshooting

### "Firebase not connected"
- Check your database URL format: `https://PROJECT-NAME-default-rtdb.firebaseio.com`
- Verify your Firebase project has Realtime Database enabled
- Check browser console for errors

### "Room not found"
- Make sure the game code is correct (6 characters, case-insensitive)
- The game creator must stay connected for the room to exist
- Try creating a new game

### Opponent shows "Offline"
- Check their internet connection
- They may have closed the browser tab
- Wait 20 seconds — the presence system has a timeout

### Moves not syncing
- Check the connection status bar (should be green)
- Refresh both players' browsers
- Check Firebase Console → Realtime Database to see if data is being written

---

## 📄 License

Free to use and modify. Built with ❤️ by ABDULMALIQUE.

---

## 🎯 Future Enhancements

Possible additions:
- User authentication (Firebase Auth)
- Game history & replay
- ELO rating system
- Timed games (chess clock)
- Chat between players
- Spectator mode
- Tournament brackets

---

**Enjoy playing! ♟️**
