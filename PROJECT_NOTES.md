# TreasureUp Project Notes

## How to Run & Verify

### Running the App
TreasureUp is a vanilla HTML/JS/CSS offline-first web application.
- Open `index.html` directly in a browser, or run a local static server:
  ```bash
  python -m http.server 8000
  ```
- Browse to `http://localhost:8000/index.html`.

### Verification Suite
- **Syntax & Parse Check**:
  ```bash
  node tools/check-parse.mjs
  ```
- **Content & Integrity Verification** (checks all weeks, quotes, references, and approval hashes):
  ```bash
  node tools/verify.mjs
  ```
- **RTS Engine & Game Tests**:
  ```bash
  node tools/test-liberty.mjs
  node tools/test-liberty-touch.mjs
  ```

---

## Key Architectural Decisions

1. **Vanilla JS & Offline-First**:
   - Zero framework dependencies.
   - All assets, scripture chapters, and reading cards are local or lazily cached for offline operation.

2. **Per-Device vs. Family Sync State**:
   - Family sync (`mergeProgress`) handles shared study progress (XP, streaks, history, impressions, marks).
   - Local device UI settings that should not bleed across users (such as `preferredTrans`) are stored strictly in `localStorage` under `NS + 'trans'` and excised from `mergeProgress`.

3. **Come Follow Me Lesson Chunking**:
   - Long scripture passages are broken into 2–4 bite-sized cards per guide section.
   - Constraints: 2 to 4 lines per card, max 30 words per line, max 25 words for reflection asks.
   - Quotes must match the KJV source verbatim with parenthetical citations immediately adjacent to the closing quotation mark so `tools/verify.mjs` validates them.
   - Section integrity is verified via canonical FNV-1a approval hashes.

4. **Media Scoping**:
   - Embedded videos and lesson media in `CFM_MEDIA` are scoped by `${week.dates}:${sectionId}` to prevent media leaking into other weeks sharing the same section anchor.

5. **Title of Liberty RTS Engine (`liberty/`)**:
   - Isometric canvas rendering with touch grammar (Red Alert 2 touch model).
   - Any modified game asset requires incrementing the `?v=` cache buster in `liberty/index.html`.

---

## Current Status (October 2026)
- **Active Branch**: `gemini/conference-story-decks`
- **Live Hosting (Private Repo → Firebase Hosting)**:
  - Primary Live URL: **`https://treasureup.web.app`** (Firebase project `treasure-up-54eeb`, site `treasureup`).
  - To build chapters and deploy to live Firebase Hosting:
    ```bash
    node tools/check-parse.mjs && node tools/wika-words.mjs && node tools/build-reading.mjs
    npx -y firebase-tools@latest deploy --only hosting --project treasure-up-54eeb
    ```
- **Interactive Wireframes & Coaching Prototypes (For Home PC Continuation)**:
  1. **`coaching_discovery_exercise_mockup.html`** — **4-Step Self-Discovery Coaching Exercise**:
     - *Step 1 (Broad Values Card Sort)*: Gut-sort 12–16 real human value cards into a "🔥 This is Me" pile (5–8 cards).
     - *Step 2 (The Crucible — Narrow to 3)*: Uses two psychological mirror questions (*🏔️ Peak Alive Moment* and *⚡ Frustration Shadow / ACT Mirror*) to crown the **Top 3 Bedrock Pillars**, while remaining pulled cards become **Supporting Sub-Values**.
     - *Step 3 (Strengths S.I.G.N. Scenario Mirror)*: Real-life instinct scenarios (first 10 minutes on a new problem, 9 PM daily fuel, acting under pressure) to map CliftonStrengths across the 4 Gallup Domains.
     - *Step 4 (Truth Portrait, Blind-Spot Radar & Daily Seeding)*: Generates the Best Self Charter, highlights each strength's overuse blind spot, and shows how the discovered Values + Strengths seed Morning Council and Evening Return & Report.
  2. **`app_flow_wireframe_canvas.html`** — **4-Column System Wireframe & Data-Wiring Storyboard**:
     - Visualizes the 4 color-coded data wires connecting **Column 1 (Upstream Coaching & Season/Pro Modals)** → **Column 2 (`🌅 Morning Council` Sheet)** → **Column 3 (`☀️ Today` Main Screen)** → **Column 4 (`🌙 Evening` & `🌱 Season` Sync)** for both Adult and Youth personas.
     - Documents the 3 Morning Council seeding gaps to wire next:
       - **Wire B (`#bpOneThing`)**: Connect `activeGoalChipsHtml()` to ✨ Pro Weekly Big Rocks (`S.pro`) and Growth Coach interest quests (`coachSuggestedIdeas()`), not just Simple Mode `S.seasons` goals.
       - **Wire C (`#bpUplift`)**: Seed from actual Family members (`F.members`), Pro Roles (`S.pro.roles`), and Signature Strengths.
       - **Wire D (`#bpGratitude` & Stillness)**: Surface today's rotating `gratefulPrompt(dayKey()).q` and inline 60s *Be Still* breath at the top of Morning Council.
  3. **`phase2_visual_walkthrough_mockup.html`** — **5-Pillar Side-by-Side UI Workbench**:
     - Compares current `45df1e6` implementation against dialed-in UI upgrades across Today/Morning Council, Best Self & Values Deck, Swipeable Story Decks, Instagram Poster Cards + Google Veo Family Cartoon Studio, and Tabbed Verse Commentary Notes.
- **Latest Implemented Work on Branch**:
  - **Phase 1: Conference Story Decks (`openTalk`)**:
    - Replaced the legacy bulleted worksheet layout with a modern 3-Slide Swipeable Story Deck (`.ins-deck`).
    - **Slide 1 (The Living Word)**: Conference session kicker, talk title, speaker, core quick summary, hero power quote, and Gospel Library link.
    - **Slide 2 (Core Truths & Insights)**: Doctrinal takeaways styled as sleek cards with purple glass borders (`.ins-deck .talk-list li`), secondary speaker quotes, cited scriptures, and deep dive exploration.
    - **Slide 3 (The Apostle's Invitation & Reflection)**: Apostle invitations and promises (`talkInviteHtml`), discussion questions (`talkTryHtml`), 1-tap `✍️ Save Takeaway to My Notes` (persisted into `S.impressions`), and `✓ I studied this talk · +15 XP` completion button.
    - Full interactive deck controls: top progress bars (`.ins-deck-bars`), jump pills (`.ins-deck-pills`), smooth horizontal swipe, and slide persistence when marking done.
  - **Daily Walk, Best Self PRO / Youth Coach, Social Learning Feed & Verse Commentary Integration**:
    - **Best Self & Core Values Triad (`CORE_VALUES_DECK`, `GALLUP_STRENGTHS`)**: Interactive 3-pillar values deck (`FAITH`, `ADVENTURE`, `INTEGRITY`, `HESED / LOVE`, `WISDOM`, `VITALITY`) + supporting sub-values, CliftonStrengths talent picker, removable custom interest chips (`[data-coach-rm-custom]`) with Luke 2:52 4-quadrant area tagging (`customAreas`), and adult executive defaults (`Business / Building`, `Writing / Creating`, `Financial Stewardship`).
    - **Morning Council (`blueprintSheetHtml`) & Season Mission (`proMissionHtml`)**: Displays the Core Values Triad touchstone banner, Gary Keller's *The ONE Thing* lead-domino question, and the *Hesed & Agape* covenant love prompt.
    - **Instagram / TikTok-Style Social Learning Feed (`✨ Social Feed`, `socialFeedHtml`)**: Vertical learning stream in the Study tab combining personal/family reflections, 2-min Come, Follow Me shorts, videos, Hebrew/Greek treasure words, and scholar/Church cards with filter pills (`All`, `⚡ Shorts`, `🎬 Videos`, `💎 Words`, `💡 Scholar`, `✍️ Family`) and 1-tap `❤️ Love`, `✍️ Save`, and `💬 Share to Chat`.
    - **Verse-by-Verse Commentary & Scripture Notes (`verseCommentariesOf`, `verseBarHtml`, `verseNoteHtml`, `openInsNote`)**: Tapping any verse surfaces Plain English, Berean Standard Bible (BSB), Scripture Central / Church margin notes, Joseph Smith Papers, and Hebrew/Greek word studies directly inside the note sheet with 1-tap `+ Quote in Note` (`[data-vn-insert]`).
    - **Family Chat Quick-Share & Sync**: Added 1-tap quick-share pills (`chatQuickPillsHtml`, `shareToFamilyChat`) and full multi-device family sync (`mergeProgress`, `compactSaved`) for `feedLikes` and `profile.coreValues`.
  - Fully green on `tools/check-parse.mjs`, `tools/verify.mjs`, and all 11 Playwright browser test suites (266 assertions).

