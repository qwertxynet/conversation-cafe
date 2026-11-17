# مقهى المحادثة: المجلس

A conversation-café site about the culture of the Arab majlis: three timed 50-minute sessions for mixed-level
learners of Arabic.
- **الضيف (the guest):** the seven-episode "The Emirati Majlis" series by The Knot, then pair talk, greetings,
  do/don't cards and a quiz.
- **المضيف (the host):** hosting phrases, a real Arabic-coffee round, and gift and dining role-plays.
- **المجلس (the majlis):** the sweets-tray story, seating and roles, then two majlis circles with topic cards.

Everything students see is فصحى with full tashkeel.

## Three views

| Address | Who | What |
|---|---|---|
| `#/` | Students, on their phones | The sessions you have unlocked. Each one has its phrases and words, the videos with Arabic captions, and a self-marking practice quiz. |
| `#/watch` | Students, during the session 1 videos | Viewing guide: questions for each episode, plus the word hunt. A "check" button at the end of each block is for the pair talk that follows. Answers stay on the phone. |
| `#/screen` | The projector | Follows the teacher window: segment, timer, cards, video. No answers, notes or controls. |
| `#/teacher` | You | Password-protected. The password is asked for every time you enter the teacher view. |

### Teacher view
- **Language:** English or Arabic, with a switch in the top bar. The student content always stays in Arabic.
- **Sessions:**
  - open the presenter
  - customise a session
  - print its handouts
  - show the QR code that unlocks the session on students' phones
- **Presenter:**
  - timer controls, which also work with Space, the arrow keys and presentation clickers (PageUp/PageDown)
  - play/pause controls for the video on the projector
  - lesson notes for each segment (aim and steps)
  - the answer key before you reveal it
  - what's next, and a run sheet with planned and actual times
  - **End session** saves the session to the log
- **Student view:** a phone-sized live preview of the student site, with a button to open it in a new tab.
  - Everything is unlocked there, and nothing is saved.
  - It only works from the teacher view; typing `#/preview` elsewhere goes back to the student home.
- **Viewing guide:**
  - **Students:** its QR code is on the Sessions tab and in the presenter during the videos.
  - **Projector:** a "watch for" box beside each episode.
  - **You:** its answer key appears in the presenter during the video and the pair talk that follows.
  - **Paper:** printable copies and a key, for students without phones.
- **Materials:** a checklist for each session.
- **Students:** your roster with three levels.
  - Mixed-level pairs.
  - Majlis groups with roles (elder, host, server, newcomer, guests).
  - Either can be shown on the projector.
- **Session log:** what was covered (planned and actual times) and your notes.
- **Customise:** skip, reorder or retime segments, and choose which cards and questions to use.
- **Backup:** export or import everything above as a file.

The roster, log, ticks and customisations stay in that browser. Nothing goes online.

**About the password:** this is a static site with no server, so the password is a soft lock. It keeps students
out of the teacher screens, and only a hash is stored in the code. But anyone using the browser's developer tools
could get past it, so don't put anything confidential there. To change the password, put the SHA-256 hash of the
new one in `PASSWORD_HASH` in `src/data/teacher.js`.

## Running a session

1. Open `#/teacher` on the laptop and enter the password.
2. Click **Open projector window** and drag that window to the projector.
   - Click it once, so its videos are allowed to play.
   - Press F for full screen.
3. Open the session's presenter. The projector follows everything you do on the laptop.
4. At the end, click **Share with students** → **Show on projector**. Students scan the code to unlock that
   session (and the earlier ones) on their phones.

Each segment counts down. It turns amber in the last minute, then chimes, turns red and counts the overtime. It
never moves on by itself.

## Editing

- **Student content:** `src/data/sessions.js`. Durations are in seconds; each session adds up to 3000.
- **Teacher content:** `src/data/teacher.js`. This has the lesson notes in both languages, the materials, the
  interface text, the password hash and the unlock codes.
- **Background:** `PLAN.md` has the decisions behind the sessions, and `VIDEO-NOTES.md` has notes on every episode.

```bash
npm install
npm run dev
```

It deploys to GitHub Pages on every push to `main` (see `.github/workflows/deploy.yml`).
