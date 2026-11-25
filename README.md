# مقهى المحادثة: the card table

A turn-based conversation table for the Concordia Language Villages Arabic program:

| | |
|---|---|
| Group | 4 students (up to 6 can join) |
| Schedule | 5 days × 50 minutes |
| Topics | One current news topic per day |

**A turn:** the student whose seat lights up draws a card with their own question about the day's topic, reads it out loud and answers it in their own words. There are no sentence frames: the back of every card is just the star-panel art. Then the next student in seat order asks them one follow-up question, using starters on their phone, and their own turn begins.

It is not a game: there are no scores, grades or leaderboards. Answered cards stack face down by each seat as a quiet record of turns.

The look is a lamp-lit café table in CSS 3D, in a café dark-academia palette, with an emblem for each student. The music is an original maqam Ḥijāz lo-fi loop, and the card sounds are generated in the browser too.

## Three windows

| Address | Who | What |
|---|---|---|
| `#/host` | You, on the laptop | Password-protected. Choose the day, open the lobby, start the turns. You can do any step for a student, skip a turn, and see the model answer and the fact notes (your eyes only). Also music, editing, printing, session log and backup. English, with an Arabic switch. |
| `#/screen` | The projector | Topic select, the lobby (QR + PIN, seats filling), the table with the current card, and the wall of the day's questions at the end. |
| `#/join/PIN` | Students' phones | Join with an Arabic nickname and choose an emblem. On your turn: Draw, read and answer, «قُلْتُهَا ✓». When you ask: the follow-up starters, then «سَأَلْتُ ✓». Otherwise: the speaker's card and "your turn in N". |

## Running a day

1. Open `#/host` on the laptop and enter the password.
2. Click **Open projector window**, drag it to the projector, and press F there for full screen.
3. Choose the day, then **Open the lobby**. Students scan the QR code or type the PIN, then pick an emblem. Seat order is join order; late joiners sit at the end.
4. **Start: first turn**. The first student to join goes first. There is no timer.
5. **End the day** shows the wall of questions. **Finish and save to the log** records the day.

The 16 question cards are drawn easy to hard (by stars); reorder or hide them in **Edit content**. If all 16 are used, your window offers to shuffle the answered cards back in.

If a phone drops off or reloads, it rejoins in the same seat. If your window reloads, it asks for the password, then carries on with the same PIN, and the phones reconnect by themselves.

## How phones connect

Phones connect to the laptop **peer-to-peer** (WebRTC):
- **Relay:** the free public PeerJS server (`0.peerjs.com`) only introduces the devices; turns and nicknames travel directly between them.
- **If it fails:** if a network blocks peer connections, you can run every turn from your window, or use the printed question cards from the Print tab (8 per A4 page).

## Content

- **Question cards:** `src/data/cards.json`. 16 cards per day: the question, its stars and a model answer; plus the shared follow-up starters.
- **Days:** `src/data/week.json` holds each day's title, stars and dated fact notes with sources (as of 22 November 2026). **Refresh the fact notes before the program runs.**
- **Editing in the app:** the **Edit content** tab hides or reorders cards and hides follow-up starters. Those edits are stored in that browser; use **Backup** to move them.
- **Everything is public:** this is a static site in a public repo, so the content, including the model answers, can be read by anyone who looks at the code. The password is a soft lock that keeps students out of your window.

## Image credits

- Table top: "Wood Table Worn" texture by [Poly Haven](https://polyhaven.com/a/wood_table_worn) (CC0).
- Card back: Jules Bourgoin, *Les Arts arabes* (1873), plate 51, "Panneau et détails à Jérusalem", public domain, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Panneau_et_d%C3%A9tails_%C3%A0_J%C3%A9rusalem_%E2%80%93_Les_Arts_Arabes_pl.51.jpg).

`scripts/prepare-assets.cjs` turns the downloaded originals (kept out of git in `source/`) into the small WebP files in `public/assets/`. The emblems are drawn in code.

## Development

```bash
npm install
npm run dev
npx vite-node scripts/check-game.mjs   # turn-rule and content checks
```

It deploys to GitHub Pages on every push to `main` (see `.github/workflows/deploy.yml`).
