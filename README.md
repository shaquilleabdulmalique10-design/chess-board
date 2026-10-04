# Chess Arena

Mobile-first chess app built with HTML, CSS, JavaScript, and Tailwind CDN.

## Features

- Home, Learn, Play, Matches, More screens with floating bottom nav
- Practice puzzles for new learners
- VS AI with Easy / Normal / Hard / Expert difficulty
- Local 2-player and online multiplayer rooms
- In-game chat for online matches

## Run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## AI difficulty

| Level  | Behavior              |
|--------|-----------------------|
| Easy   | Fast random legal move; occasionally prefers a capture |
| Normal | Up to 0.5 seconds of tactical search, with slight move variety |
| Hard   | Up to 1.4 seconds of iterative deepening (maximum depth 4) |
| Expert | Up to 3.2 seconds of iterative deepening (maximum depth 6) |
