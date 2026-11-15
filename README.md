# MATTERVERSE: 10-Station Grade 5 Matter & Solutions Laboratory

A 100% self-contained, zero-external-asset Three.js + TypeScript + Vite **10-Station 3D Science Laboratory** aligned to **Florida Grade 5 Science Unit 4 (Properties and Changes in Matter)**:
`SC.5.P.8.1`, `SC.5.P.8.2`, `SC.5.P.8.3`, `SC.5.P.8.4`, and `SC.5.P.9.1`.

This repository includes the full TypeScript source (`src/`), prebuilt production bundle (`dist/`), and Netlify Drop archive (`matterverse-dist.zip`), plus a GitHub Actions workflow (`.github/workflows/build-dist.yml`) that rebuilds `dist/` on pushes.

---

## 10 Interactive Research Stations

- **Wing A — Properties & States of Matter (`SC.5.P.8.1`, `SC.5.P.8.4`, `SC.5.P.9.1`)**
  1. **Color, Luster & Texture Table**: Illuminated inspection tray and magnifier for metallic, glassy, and dull solids.
  2. **Hardness Scratch Bench**: Scratch-test minerals with a copper penny or steel nail.
  3. **Magnetism & Safe Wafting**: Test magnetic vs. non-magnetic metals and practice hand-wafting scent jars.
  4. **Mass & Volume Displacement**: Digital 0.1 g balance and 100 mL graduated cylinder with curved meniscus reading.
  5. **States of Matter Thermal Chamber**: Smooth transitions across solid ice, liquid water, boiling, and invisible water vapor gas (`-10°C` / `14°F` to `110°C` / `230°F`).

- **Wing B — Mixtures, Separation & Solutions (`SC.5.P.8.2`, `SC.5.P.8.3`, `SC.5.P.8.4`, `SC.5.P.9.1`)**
  6. **Hand & Tweezers Sorting Tray**: Sort acrylic spheres and white cubes by color and shape.
  7. **Iron Filings & Sand Magnet Tray**: Separate 30.0 g iron filings from 50.0 g quartz sand with a sleeved bar magnet.
  8. **Sand & Gravel Sieve Bench**: Separate gravel pebbles from fine sand with a 2.0 mm wire-mesh sieve.
  9. **Filtration & Hot Plate Evaporation**: Filter sand from water/saltwater, then evaporate and condense water to crystallize pure table salt.
  10. **Solutions & Dissolving Rate Lab**: Test solubility across 4 solids and run controlled side-by-side Beaker A vs. Beaker B dissolving races (Temperature, Stirring, Grain Size) with live stopwatch and Particle Vision.

---

## Controls & Classroom Shortcuts

- **Walk & Explore (Roam Mode)**: `WASD` / Arrow Keys, `Q`/`E` or on-screen `⟲ Turn Left` / `Turn Right ⟳` buttons, or click any 3D station bench to walk over and zoom in
- **Inspect Bench (Station Focus)**: Drag or `Q`/`E` for 360° orbit, `+`/`−` or scroll wheel to zoom, `Esc` (`← Step Back to Lab`) to return to Roam Mode
- **`D`**: Toggle the 3-Tab **Student Investigation Data Sheet** (live auto-fill + inline notes + Print / CSV / JSON exports)
- **`P`**: Toggle **Particle Vision** (`SC.5.P.8.4`)
- **`V`**: Toggle 1st-Person / 3rd-Person camera in Roam Mode
- **`H`**: Toggle Clean View (Hide/Show HUD for unobstructed Smartboard projection)
- **`M`**: Mute / Unmute procedural Web Audio SFX
- **`T`**: Open **Teacher Mode HUD** (Station Quick-Jump, Freeze Simulation, `1.28x` Smartboard Text, `Ultra` / `Balanced` / `Classroom Safe` Graphics Tiers, Reset All 10 Stations, JSON Export/Import)
- **Click `ATOM-5`** (or *Ask ATOM-5*): Optional non-blocking science tips and misconception check
