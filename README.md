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
| Easy   | Random / prefer captures |
| Normal | Minimax depth 2       |
| Hard   | Minimax depth 3       |
| Expert | Minimax depth 4       |
