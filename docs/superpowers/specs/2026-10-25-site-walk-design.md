# Site Walk — design

**Status:** approved by owner · 2026-10-25
**Site:** https://constructionagents-prompt-library.vercel.app (repo `ea21nj/constructionflows-prompt-library`, Vercel project `constructionflows-prompt-library`)

## Intent

Turn the prompt library's front door into a game. A contractor lands on a 3D construction site that looks and moves like *The Sims*, walks a worker around the job, and talks to the crew. Each crew member is one of the ten AI agents. In conversation they ask the discovery questions that agent would ask, so the visitor works out which agents fit their business without filling in a form.

The owner chose this because walking the site, meeting people and *going somewhere* to get results changes the experience from "answer a quiz" to "play through a jobsite". The navigation is the point, not a decoration.

## Goals

1. The first screen is the game. The visitor controls a worker walking the site.
2. Every one of the ten agents is a person on site, in an area that fits their role, doing something that fits their role.
3. Talking to a crew member starts a short discovery conversation (3 questions) in that agent's voice.
4. Results are **not** shown on the spot. They live in the **site office**. The visitor has to walk there.
5. It must feel like a real game: high-quality 3D characters, machines and props, good lighting, animation. The owner rejected the first two passes (flat sketches, then a blocky prototype) specifically for low visual quality.
6. Works on desktop (keyboard) **and** phones (touch).
7. A visitor who doesn't want to play can skip straight to the existing pages, and it is obvious from the start that this is possible and that results otherwise come from the site office.

## Non-goals

- No accounts, saving to a server or multiplayer. Progress is kept in the visitor's browser only.
- No free-form AI chat with the crew. Conversations are scripted multiple choice.
- No changes to the agent content itself (names, positioning, workflows, tracker fields, ROI, approval gates). The game reuses the existing data.
- No paid or custom 3D art (owner decision: free ready-made models only).

## Anti-goals (would be a failure even if it technically works)

- It feels like the old quiz in a 3D costume: the conversations read like form fields, or the site is just a backdrop.
- It looks cheap, blocky or "programmer art".
- People can't find their results, or don't understand that the site office is where they are.
- It's slow or janky on a normal phone, or shows a blank screen while loading.
- Someone who just wants the agent list is trapped in the game.

## What the owner decided

| Topic | Decision |
|---|---|
| Look | *The Sims*: real 3D, angled view from above, rotate and zoom, people walking around and working. |
| Placement | The game replaces the current homepage as the first thing people see. |
| Controls (desktop) | Keyboard: WASD / arrow keys to walk, Shift to run, E (also Space/Enter) to talk, 1–4 to answer, Esc to leave. Mouse drag rotates the camera. *(Implemented in the prototype and approved.)* |
| Controls (phone) | Must work on phones. Touch controls (on-screen joystick to walk, tap a worker to talk). |
| Results | Option 2: a clipboard in the corner fills in as you answer; full results are on a **results board in the site office trailer**, which the visitor walks into. |
| Skip | A menu, always available, to skip the game and use the existing pages (agent quiz, 10 agents, Discovery, About). |
| Clarity | The visitor must be told up front how it works: walk the site, talk to the crew, results are in the site office, or use the menu to skip. |
| Crew | All 10 agents on site. Each asks 3 questions. The site office opens after talking to 3 crew; more conversations sharpen the results. |
| Site size | Larger than the prototype, split into distinct areas you travel between, including a **food truck**. |
| Site plan | Approved layout (below). |
| Art | Free, ready-made 3D models (no custom art budget). Quality bar is high. |
| Visual identity | Keep the site's current green (`#008037`) industrial UI style (IBM Plex Mono / Plex Sans, 2px borders, square corners) for menus, panels and the results board. *(Carried over from the live site; not re-discussed for the game.)* |

## The site (approved plan)

Roughly four times the prototype's area. A street runs along the front; the visitor **starts at the gate**. A haul road connects the areas.

| Area | What's there | Crew (agent) and what they're doing |
|---|---|---|
| **Site office compound** (near the gate) | Office trailer = the **results board**; safety tent; plan table | **Bid Desk Agent** — estimator at the plan table outside the office · **AIA Billing / Pay App Agent** — in the office doorway with a laptop · **Safety / Compliance Agent** — at the safety tent with the toolbox-talk board |
| **Main building** (steel frame going up, tower crane) | Steel columns/beams, decks, scaffolding, CMU wall | **PM Second Brain** — inside, walking a punch list · **RFI / Submittal Agent** — at a column with drawings, flagging a conflict · **Change Order / Margin Protection Agent** — on the deck photographing extra work |
| **Excavation / earthwork** | Excavator digging, dump truck, spoil pile | **Field-to-Office Evidence Agent** — the foreman, logging the day |
| **Laydown yard** | Pallets, pipe stacks, a delivery truck | **Vendor / Subcontractor CRM Agent** — checking a delivery |
| **Parking + food truck** | Food truck, picnic tables, parked pickups | **Lead / Sales Follow-Up Agent** — at the food truck chatting up a GC · **Company Knowledge / Archiver Agent** — the veteran super on break at a picnic table |

A **minimap** in a corner shows the areas, the visitor's position, which crew they've met, and the site office once it's open.

## How it plays

1. **Load.** A branded loading screen with a progress bar while models load (never a blank screen).
2. **Opening card** over the paused scene, in plain words: *Walk the site and talk to the crew — each one is an AI agent that could help your business. After you've met 3, head to the site office for your results. Prefer the classic pages? Use the menu.* Shows the controls for the visitor's device. Buttons: **Start walking** and **Skip to the agents** (opens the menu).
3. **Walk.** Camera follows the player at the Sims angle; the visitor can rotate/zoom. Crew go about their tasks (walking short routes, working animations). Each has a floating green "plumbob" marker; it changes once met.
4. **Talk.** Near a crew member, a prompt appears ("Press E to talk to Maria — Bid Desk" / a Talk button on phones). The conversation panel slides up: portrait, name, role, the question typed out in their voice, 4 answers. Player and worker turn to face each other; the worker gestures. 3 questions, then a sign-off that hints at what they could take off your plate.
5. **Clipboard.** A collapsible clipboard (top corner) shows a fit bar per met agent that rises with answers, plus an objective line: *Talk to the crew · 1 of 3* → *Site office is open — head there*.
6. **Office unlocks** after 3 conversations: a toast ("The site office is open"), the minimap pin lights up, the trailer door glows / a marker floats over it. A crew member may call it out in their sign-off.
7. **Results board.** Walking into the trailer (or tapping its door when near) opens a full-screen results board:
   - top agents ranked, with a short "why" built from the visitor's own answers;
   - the recommended first step for the top agent;
   - "View details" opens the existing tabbed agent view;
   - list of crew not yet met ("talk to more of the crew to sharpen this") with a way back to the site;
   - **discovery document** of all answers: download Word / Markdown, copy, print/PDF (reuse the existing Discovery document and print layout);
   - links to the classic pages.
8. **Menu** (button always visible, keyboard shortcut M): Skip the game → Agent quiz · 10 Agents · Discovery · About · Back to the site. Also: reset progress, sound on/off.

Progress (who you've met, answers, whether the office is open) is saved in the browser so a returning visitor continues where they left off, with an option to start over.

## Conversations and scoring

- Each agent gets **3 questions**, written in the crew member's voice, drawn from that agent's existing pain points and the existing Discovery questions. Answers are 4 choices ordered from "this is fine" to "this hurts".
- Each answer gives that agent a pain score (e.g. 0–3). An agent's fit = sum of its scores (0–9). Ranking = fit, ties broken by agents the visitor talked to more recently.
- The "why" lines on the results board quote back the visitor's highest-pain answers for that agent.
- Crew have human first names and faces; their role label uses the agent's name.

## Constraints

- **Hosting/stack:** stays on the existing Vercel project and Vite build. 3D with Three.js (used by the approved prototype). Code can move from the single `index.html` into modules under `src/` since Vite is already in place.
- **Assets:** free models under licences that allow commercial use without attribution requirements (CC0 or equivalent), in glTF/GLB. Downloading assets needs the owner's go-ahead per pack (list source, licence and size).
- **Performance:** smooth on a recent laptop and acceptable on a mid-range phone; keep the total download reasonable and load progressively behind the loading screen. Lower effects (shadows, post-processing, pixel ratio) automatically on weaker devices.
- **Fallback:** if WebGL isn't available or the device is too weak, go straight to the classic pages with a short note.
- **Accessibility:** everything reachable by keyboard; conversation panel and results board work with a screen reader; respect reduced-motion; the skip menu is always reachable.
- **Privacy:** answers stay in the browser, as today.
- **Existing pages keep working** (quiz, 10 agents with the tabbed dialog, Discovery voice interview and document, About, contact API).

## Left to the builder

- Choosing specific free asset packs (characters with walk/idle/talk/work animations; construction vehicles, crane, building parts, food truck, props) that meet the licence and quality bar; recolouring vests/hard hats to fit.
- Exact question wording and answer choices for all 10 agents (owner will review the copy before launch).
- Camera details (zoom limits, collision with buildings), joystick design, minimap style, sound effects, day lighting/sky, post-processing choices.
- Whether tapping a distant worker on a phone auto-walks the player to them.
- How the classic pages are reached technically (same page "faces" as today or separate routes), as long as the menu reaches them and links keep working.
- Performance budgets and device detection thresholds.

## Builder's calls already made (owner can override)

- Office unlock threshold is 3 conversations (proposed by Claude, accepted by the owner implicitly with the crew proposal).
- Green UI style carried over from the live site.
- Scoring model above (simple pain-sum) — a simple, explainable ranking.
- Progress saved in the browser with a "start over" option.
- No contact or lead form on the results board for now (owner approved the design without choosing; it can reuse `/api/contact` later).
- The old homepage content (hero, stats, how-it-works) is retired; its key message moves into the opening card. The other classic pages stay.

## Owner additions (2026-10-26)

- **Faster walker.** Default pace is a brisk jog (7 m/s), Shift sprints (12 m/s); the jog animation speeds up to match.
- **Jump to anyone, GTA-style.** Q (or the on-screen Jump button) opens a wheel of all ten crew, plus the site office once it's open. Picking one lifts the camera into the sky, sweeps across the site and drops down beside them (an instant cut with reduced motion). The person you picked waits for you; landing at the office opens the results board.
- **Clickable site map.** Clicking (or tapping) the minimap opens a full site map with everyone on site as a named marker at their live position, the visitor, and the site office. Clicking a person flies you to them and opens the conversation on landing; clicking the open office takes you to your results. Phones also get a tap-friendly list of everyone under the map.
- **Blueprint map.** The site map and minimap are drawn as a construction blueprint: blue grid paper, white line work, the building's structural grid with bubbles, crane swing radius, excavation contours, dimensions, scale bar, north arrow, a title block (Sheet A-101 · Site plan), callout bubbles for the crew and an "OPEN · YOUR RESULTS" stamp on the office.
- **Site audit.** Seven audit checkpoints (inspection boards with an orange clipboard marker) around the site, one per section of the owner's 35-question audit (Bidding & Pipeline, Project Kickoff, Scheduling, RFIs & Submittals, Project Visibility, Field Execution, Closeout). Each asks its 5 questions (A–D; A = 3 points … D = 0); a section is out of 15 and rated Strong / Fair / Weak / At risk with its biggest gaps. A separate audit scorecard (from the "Site audit · n of 7" tracker) shows every section, an overall score and the audit report (Word / Markdown / copy / print). It does not change the agent ranking (owner's choice).
- **Site score.** Points for every conversation (100), audit section (150), office visit (200), saved report (100) and full-crew / full-audit bonuses (300 each), ranks from Visitor to Project Executive, and six objectives with a checklist. A score badge sits top centre; earned points float up; completed objectives and promotions announce themselves.
- **Everything on screen is a shortcut.** Clicking a crew member or their marker, an audit board or clipboard, or the office door/arrow takes you there (walk if close, sky-swoop if not) and starts the conversation, audit or results. Objectives have Go buttons, clipboard rows go back to that person, and the results board's crew-to-meet list goes to them.
- **Levels, free roam, stars, no timer** (owner's choices). The walk is four levels in the order a job runs, each its own part of the site:
  1. **Preconstruction** — site office & front gate: Maria, Rosa; Bidding & Pipeline and Project Kickoff audits.
  2. **Structure** — main building: Dave, Jess, Sam; Scheduling and RFIs & Submittals audits.
  3. **Field operations** — excavation & laydown yard: Luis, Kim, Andre; Project Visibility and Field Execution audits.
  4. **Closeout & cash** — parking, food truck & site office: Priya, Tom; Closeout audit; visit the site office; take your results with you.

  Nothing is locked: the levels are a guided path. The current level is the first one not finished; its card (top left) lists its objectives (each one a shortcut), gold beams rise over what's left in it, and walking into a level's part of the site shows its title card. Each level earns 1 star for any progress, 2 for half, 3 for all (12 in total); finishing one adds a 250-point level bonus and opens the level board ("Level 1 complete", the stars, "Start level 2 →"). The level board also opens from the level card to pick any level. The score badge shows level and stars, and its checklist is grouped by level. The site map outlines the four zones; the level signs on site say which level each area is.
  - Builder's calls: Rosa and Priya swapped places (Rosa to the office, Priya to the food truck); Kim and the safety tent moved to the excavation; the Kickoff board moved to the west side of the gate, so each level sits in one part of the site. The full-crew and full-audit bonuses were replaced by the level bonus (maximum 3,350 points); ranks are now Apprentice 400, Foreman 900, Superintendent 1,800, Project Executive 2,800.
- **Phone-first, everywhere** (owner, 2026-10-30): one experience on every device so it's easy to understand. On a laptop or tablet the site walk sits in a phone-shaped screen in the middle of the page (dark site backdrop, "Workflow Playbook · Site walk" in the corner); phones and short/landscape screens fill the screen as before. Everyone gets the phone controls: the joystick (drag with a mouse on a laptop), tap someone to go to them, the big Talk / Audit button, Jump, the map and the menu; the opening card explains only these. The level card shows just the next objective, the clipboard starts folded away, and conversations, audits, the level board, the site map, results, the scorecard and agent details all open inside the phone. The classic pages from the menu still open as the full website.
  - Builder's calls: the keyboard keys (WASD, E, Q, 1–4, Esc, M) still work quietly but are never mentioned; wording says "tap" rather than "click"; the phone screen is up to 430 × 900 px (about 9:19), scaled to the window height.
- **One-tap PDF from the results** (owner, 2026-10-30): "Download PDF" sits at the top of the results board (and first in "Take your results with you") and downloads a real PDF built on the device in milliseconds — no print dialog. US Letter, branded: date and crew met, "Start here" (first step, first win), the ranked agents with fit bars, then every question and answer. Word, Markdown and Copy text stay; the print option is gone (the PDF prints fine).
