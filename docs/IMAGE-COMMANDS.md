# PILLOW CPR — MASTER IMAGE COMMAND
For: github.com/ALENZACODES/pillow-cpr · Live demo: https://alenzacodes.github.io/pillow-cpr/
Event: Next Byte Hacks V5 (Devpost) — deadline Nov 7, 2026, 5:00 PM EST.
Mission: produce every image the repo, the Devpost page and the demo video need.
Two kinds of items: **IMG-xx = generate** (illustration) · **CAP-xx = capture** (real
screenshots of the live app — never fake a screenshot with a generator).

## STYLE LOCK (applies to every generated image)
- Flat modern vector illustration, clean geometric shapes, generous white space.
  No photorealism, no 3-D render look, no gradients except a single soft red-to-white wash where stated.
- Palette, exact: CPR red `#D7263D` · deep red `#A51228` · ink `#17202B` ·
  soft ink `#45536A` · clinical white `#FFFFFF` · paper `#F7F8FA` · go-green `#1F9D66`.
- The mark, everywhere identical: a white pillow (rounded rectangle, plump, subtle
  seam) with a red ECG pulse line across its centre — flat segment, sharp peak,
  flat segment. Never a heart shape instead of the pillow; the pillow IS the brand.
- People: illustrated figures only, never real faces. Skin tones varied across the
  set (light, medium, deep), simple clothing in ink/grey/green, no logos on clothes.
- Text inside generated images: FORBIDDEN except where an item explicitly lists
  exact text. Generators garble words; where text is listed, it is the ONLY text,
  large, in a clean geometric sans-serif, and the acceptance check includes reading it.
- No third-party logos anywhere (no AHA logo, no MediaPipe logo, no Devpost logo) —
  text attribution only, added outside the image.
- Every file lands in `assets/` under the exact filename given. PNG unless stated.

## GENERATED IMAGES

### IMG-01 — Logo, symbol + horizontal lockup
- Files: `assets/logo-symbol.png` (1024×1024, transparent) · `assets/logo-lockup.png` (2000×620, transparent)
- Purpose: README header, Devpost page, video end card, presentation use.
- Prompt: "Minimal flat vector logo on a transparent background: a plump white pillow
  shown front-on, rounded corners, outlined in bold CPR red (#D7263D), with a red ECG
  pulse line running horizontally through its centre — flat, sharp peak, flat. Nothing
  else in the frame. Generous padding around the pillow."
- Lockup variant: same symbol on the left; to its right the word "Pillow" in ink
  (#17202B) and "CPR" in CPR red, bold geometric sans-serif, one line. Exact text: `Pillow CPR`.
- Accept: pulse peak is a single sharp spike; pillow reads as a pillow at 32 px; no extra words.

### IMG-02 — README hero banner
- File: `assets/hero-banner.png` (1920×1080)
- Purpose: top of the GitHub README; the project's first impression.
- Prompt: "Flat vector illustration, wide 16:9 scene on a paper-white (#F7F8FA)
  background. A person kneels on the floor pressing with both hands, arms straight,
  on a white pillow with a red pulse line (the brand mark). In front of them a laptop
  shows a simple coaching screen: one huge number, a horizontal gauge with a green
  middle band, and a speech bubble. A soft red circular pulse ring radiates from the
  pillow. Left third of the frame left calm and empty for a headline added later.
  Palette locked: red #D7263D, ink #17202B, green #1F9D66. No text anywhere."
- Accept: figure's arms are straight and shoulders are over the hands (correct CPR
  posture — this is a teaching image); laptop screen contains shapes, not words.

### IMG-03 — Social / Open Graph card
- File: `assets/og-card.png` (1200×630)
- Purpose: GitHub repo social preview; link shares everywhere.
- Prompt: "Flat vector social card, white background, thick red border inset.
  Left half: the pillow-and-pulse brand mark, large. Right half: bold geometric
  sans-serif text, exactly three lines: 'Pillow CPR' / 'Learn CPR in 2 minutes' /
  'with a pillow.' — 'Pillow CPR' in ink with CPR in red, the other lines in ink.
  Nothing else."
- Accept: read every word letter by letter; any garble = regenerate. If text fails
  twice, deliver the card text-free with the mark centred and flag it.

### IMG-04 — How-it-works diagram
- File: `assets/how-it-works-diagram.png` (2000×1250)
- Purpose: README "How the counting works" section; Devpost gallery.
- Prompt: "Flat vector technical diagram in three panels on white, thin ink dividers.
  Panel 1: a webcam frame containing a simple human figure made of dots and lines
  (pose skeleton), with the two wrist dots and shoulder dots highlighted in green.
  Panel 2: a smooth wave line (wrist height over time) with two plateaus marked by
  small red dots at each bottom point. Panel 3: three simple round gauges.
  A thin arrow flows from panel to panel. Numbers '1', '2', '3' above the panels are
  the only text. Palette locked."
- Accept: skeleton is dots-and-lines (not a photo); wave reads as a repeating cycle.

### IMG-05 — Set-up position illustration
- File: `assets/setup-position.png` (1600×1200)
- Purpose: in-app setup help + README + Devpost gallery.
- Prompt: "Flat vector side-view instructional illustration on white. A pillow lies
  flat on the floor. A kneeling figure behind it leans forward, both hands stacked at
  the pillow's centre, arms perfectly straight, shoulders directly above the hands.
  A laptop sits on the floor in front, its screen facing the figure; a soft grey
  trapezoid (camera view cone) runs from the laptop to the figure's upper body.
  A dashed vertical guide line drops from the shoulders to the hands. No text.
  Palette locked."
- Accept: posture is textbook (straight arms, shoulders over hands, kneeling) — a
  first-aid instructor would approve this drawing.

### IMG-06 — Emergency mode illustration
- File: `assets/emergency-illustration.png` (1600×1000)
- Purpose: README emergency section; Devpost gallery; video B-roll card.
- Prompt: "Flat vector scene on a deep red (#A51228) background. Centre: a phone in
  speaker mode drawn simply, with concentric white pulse rings radiating from it.
  Below, a pair of hands presses a white pillow (brand mark). High contrast,
  urgent but calm. The only text: '911' on the phone screen, large and clean.
  Palette locked (whites and ink on deep red)."
- Accept: reads instantly as "call for help + start compressions"; no other words.

### IMG-07 — Devpost cover image
- File: `assets/devpost-cover.png` (1600×1000)
- Purpose: the Devpost project cover — the single most-seen image of the entry.
- Prompt: "Flat vector illustration, energetic composition on paper white. Foreground:
  a person mid-compression on the pillow (brand mark), motion shown by two soft red
  pulse rings. Behind them, oversized, a laptop coaching screen: one giant number,
  a gauge with a glowing green middle band, and a speech bubble containing exactly
  the word 'Faster!'. Top-left corner kept empty for the Devpost title overlay.
  Palette locked. No other text."
- Accept: at thumbnail size (320 px wide) a stranger can tell: person, pillow,
  laptop coach, urgency. Speech-bubble word spelled exactly `Faster!`.

### IMG-08 — Impact stat card (square)
- File: `assets/impact-stats.png` (1200×1200)
- Purpose: Devpost gallery; social posts; video end card.
- Prompt: "Flat vector infographic card, white background, red border inset. Three
  stacked rows, each with a simple red icon on the left and bold text on the right.
  Exact text, line by line: '2–3× — survival when CPR starts immediately' /
  '100–120 — compressions per minute' / '~90% — of out-of-hospital cardiac arrests
  are fatal'. Small final line: 'Source: American Heart Association'. Nothing else."
- Accept: every number and word verified against this spec character by character
  (statistics are AHA-verified; a wrong digit fails the image).

### IMG-09 — App icon source
- File: `assets/app-icon.png` (1024×1024) → also export 512, 192, 180, 32, 16 px as
  `assets/icon-512.png` etc.
- Purpose: favicon/PWA icon set; replaces the interim SVG if raster is needed.
- Prompt: "Flat app-icon: solid CPR red (#D7263D) rounded square filling the frame;
  centred white pillow glyph with a red pulse line (the brand mark, simplified bold
  strokes so it survives at 16 px). No text."
- Accept: at 32 px the pillow + pulse still reads; no thin lines.

### IMG-10 — Certificate backdrop art
- File: `assets/certificate-art.png` (2400×1600)
- Purpose: decorative backdrop variant of the practice card for the Devpost gallery
  and the video (the in-app card itself is drawn by the app — this is presentation art).
- Prompt: "Flat vector certificate backdrop on white, landscape 3:2. Double border:
  thick red outer line, thin ink inner line. Across the top centre, the pillow-and-
  pulse brand mark. Faint oversized pulse line watermark runs diagonally behind the
  (empty) centre at 6% opacity. Bottom corners carry small laurel sprigs in ink.
  Centre two-thirds completely empty for text added later. No text anywhere."
- Accept: centre is truly empty; watermark is subtle, not busy.

## CAPTURED IMAGES (real screenshots — from the live app only)
Capture at the sizes given, from https://alenzacodes.github.io/pillow-cpr/ (or the
local build), browser chrome cropped out. Demo-mode captures must show the app's own
"demo mode" label where the app displays it — never crop the label away.

### CAP-01 — Home page → `assets/screenshot-home.png` (1440×900)
Full home view: hero headline, the two mode buttons, stat strip visible.
### CAP-02 — Setup, framed → `assets/screenshot-setup.png` (1280×960)
Camera on, a real person (or the builder) kneeling at a real pillow, all three
framing checks green. If no person is available, capture the camera-on state and
flag it — do not generate a fake person into a screenshot.
### CAP-03 — Practice HUD in the zone → `assets/screenshot-practice.png` (1280×900)
Mid-session: BPM between 100–120 in green, needle inside the green band, count ≥ 15,
feedback banner showing a praise line. (A demo-mode capture already exists in the
repo; replace it with a camera capture when a person is available.)
### CAP-04 — Results + practice card → `assets/screenshot-results.png` (1280×900)
After a real 2-minute session if possible (early-ended demo session acceptable —
the app labels it honestly). Scores and the top of the certificate visible.
(One already exists in the repo.)
### CAP-05 — Emergency mode running → `assets/screenshot-emergency.png` (1280×900)
Metronome on, count ≥ 10, pulse ring mid-beat. (One already exists in the repo.)
### CAP-06 — Video thumbnail → `assets/video-thumbnail.png` (1280×720)
Compose from the CAP-03 capture: app HUD on the right two-thirds; left third a flat
red panel with exact text added in an editor (not generated): 'I LEARNED CPR' /
'ON A PILLOW' in bold white, and a small '2:00' badge. Text set in the project's
sans-serif, checked letter by letter.

## PLACEMENT MAP
- README.md → IMG-02 (hero), IMG-04 (how it works), CAP-03/04/05 (screenshots table)
- Repo social preview (GitHub settings) → IMG-03
- index.html `og:image` → IMG-03 (already referenced)
- Devpost gallery (in order) → IMG-07 cover, CAP-01, CAP-03, CAP-04, CAP-05, IMG-05, IMG-08, IMG-04
- Demo video → IMG-01 lockup (end card), IMG-06 (emergency B-roll), IMG-10 (closing stats), CAP-06 (thumbnail)

## FINAL CHECKS BEFORE DELIVERY
1. Every file in `assets/` at its exact name and pixel size; open each one.
2. Read every in-image word against its spec (IMG-01, 03, 06, 07, 08, CAP-06).
3. Posture check on IMG-02 and IMG-05 (straight arms, shoulders over hands).
4. Palette spot-check: red is #D7263D, green is #1F9D66 — no off-brand colours.
5. No third-party logos, no real faces, no medical claims beyond the AHA lines in IMG-08.
6. Commit with the message "Add Pillow CPR image set" (author: John Khan) and list
   landed / substituted / missing per item in the delivery note.
