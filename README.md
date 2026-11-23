# مقهى المحادثة: the card game

A conversation card game for the Concordia Language Villages Arabic program:

| | |
|---|---|
| Group | 4 students (up to 6 can join) |
| Schedule | 5 days × 50 minutes |
| Topics | One current news topic per day |

Each student holds 5 cards on their phone. Every card is a **sentence starter** with full harakat and a 1–5★ difficulty.

When a student uses a starter in the discussion, they play it on their phone:
- **Projector:** the card pops up with their nickname.
- **Phone:** they draw a new card.

There are no scores, grades or leaderboards.

The look is osu!-inspired, in a café dark-academia palette, and joining works like Kahoot (QR code or PIN). The music is an original maqam Ḥijāz lo-fi loop, generated in the browser.

## Three windows

| Address | Who | What |
|---|---|---|
| `#/host` | You, on the laptop | Password-protected. Choose the day, open the lobby, move through the questions. Model answers and fact notes (your eyes only), every player's hand, music, editing, printing, session log, backup. English, with an Arabic switch. |
| `#/screen` | The projector | Topic select, the lobby (QR + PIN), the current question with a clock that counts up, card pop-ups, and the wall of the day's cards at the end. |
| `#/join/PIN` | Students' phones | Join with an Arabic nickname, then see the current question and 5 cards. Tap a card, then «اِسْتَعْمَلْتُهَا ✓». |

## Running a day

1. Open `#/host` on the laptop and enter the password.
2. Click **Open projector window**, drag it to the projector, and press F there for full screen.
3. Choose the day, then **Open the lobby**. Students scan the QR code or type the PIN.
4. **Start: question 1**, then use **Next** and **Back** as you like. Nothing moves on by itself.
5. **End the day** shows the wall of cards. **Finish and save to the log** records the day.

If a phone drops off or reloads, it rejoins with the same nickname and the same cards. If your window reloads, it asks for the password, then carries on with the same PIN, and the phones reconnect by themselves.

## How phones connect

Phones connect to the laptop **peer-to-peer** (WebRTC):
- **Relay:** the free public PeerJS server (`0.peerjs.com`) only introduces the devices; cards and nicknames travel directly between them.
- **If it fails:** if a network blocks peer connections, you can play every student's cards from your window (click a card under their name), or use the printed decks from the Print tab.

## Content

- **Where it lives:** `src/data/week.json`. It holds the 40 shared starters, then the 5 days.
- **Each day has:**
  - 8 questions with model answers
  - 12 daily starters
  - dated fact notes with sources (as of 22 November 2026)
- **Before the program runs:** refresh the fact notes.
- **Editing in the app:** you can hide or reorder questions and hide cards in the **Edit content** tab. Those edits are stored in that browser; use **Backup** to move them.
- **Everything is public:** this is a static site in a public repo, so the content, including the model answers, can be read by anyone who looks at the code. The password is a soft lock that keeps students out of your window.

## Development

```bash
npm install
npm run dev
npx vite-node scripts/check-game.mjs   # game-rule checks
```

It deploys to GitHub Pages on every push to `main` (see `.github/workflows/deploy.yml`).
