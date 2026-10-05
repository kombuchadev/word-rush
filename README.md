# 🔤 Word Rush

A loud, colourful **host screen for a team word game**. Each round, 10 letters spin onto the screen like a slot machine, a countdown starts, and teams race to build the **longest word** they can from those letters.

Built for game nights on a TV or projector: big animations, a colour-shifting countdown, ticking-clock sound effects, and a scoreboard the host controls.

---

## ⚡ Setup (no install needed)

It's plain HTML, CSS and JavaScript — no build step, no server, no dependencies.

1. Download the repo (**Code → Download ZIP**) and unzip it, or clone it:
   ```bash
   git clone https://github.com/kombuchadev/word-rush.git
   ```
2. Double-click **`index.html`** to open it in a browser (Chrome or Edge recommended).
3. Press **F** for fullscreen and put it on the big screen.

> Fonts load from Google Fonts. Offline, the game still works — it just falls back to system fonts.
> All sound effects are generated in the browser, so there are no audio files to manage.

---

## 🎮 How to play

1. Split everyone into **2–6 teams**.
2. Each round, **10 letters** spin onto the screen.
3. Teams get **30 seconds** to huddle and build the **longest word** they can.
4. Use any of the letters, **each one only once** — you don't have to use them all.
5. Real English words only. The host has the final say.
6. When time's up, teams reveal their words. The **longest valid word wins the round**.
7. The host can then reveal the longest words that *were* possible.

The game runs **10 rounds**. After that the host can keep going with **bonus rounds** (up to 15) or end the game and reveal the winner.

> Press **❓** (or **H**) during the game to show these rules on screen.

---

## 🎤 Hosting

| Control | What it does |
|---|---|
| **Start / Next Round** (`Space`) | Spins the letters, then starts the countdown |
| **⏸ Pause** (`P`) | Pauses / resumes the timer |
| **+10s** | Adds 10 seconds to the clock |
| **⏭ End now** | Ends the round immediately |
| **💡 Reveal Words** (`R`) | After time's up, shows the longest possible words with their lengths |
| **Team + / −** (`1`–`6`, `Shift` for −) | Adjust a team's score |
| **🎲 One More Round / 🏁 Game Over** | Appear after the main rounds — keep going or end the game |
| **👥** | Number of teams (2–6) and their names |
| **⚙** | Round length, number of main rounds, letter-set order, reset |
| **🔊 / ⛶** (`M` / `F`) | Mute sound effects / fullscreen |

**Timer effects:** the screen shifts green → yellow → red as time runs out, the clock ticks faster in the last 10 seconds, and the last 5 seconds get a heartbeat and red pulses before the buzzer.

**Progress is saved** in the browser, so refreshing the page won't lose scores or the round you're on. Use **⚙ → Reset** to start over.

---

## ✏️ Customising

### Change the letters
The 15 letter sets live at the top of **`script.js`** in `LETTER_SETS`. Each set has its 10 letters and the longest words you can make from them (shown by **💡 Reveal Words**):

```js
const LETTER_SETS = [
  { letters: "STRAENILOP", words: ["PRELATIONS", "RELATIONS", "TRAPLINES"] },
  { letters: "COMPUTERSA", words: ["COMPUTERS", "MOUSETRAP", "SPECTRUM"] },
  // ...
];
```

- Use **10 different letters** per set.
- The letter order is shuffled each time it's shown, so the hidden words aren't obvious.
- Sets play in this order — tick **⚙ → Shuffle letter-set order** to randomise per game.
- An online anagram solver is handy for finding each set's longest words.

### Other settings
- **Round length** (20 / 30 / 45 / 60 s) and **main rounds** (5 / 10 / 15): in **⚙ Settings**.
- **Teams**: up to 6, named in the **👥** panel.

---

## 📁 Files

```
index.html   – page layout
style.css    – look, colours and animations
script.js    – game logic, sounds, letter sets
```
