# HANDOFF PACKET 1 FOR HYDROGEN (`HANDOFF_HYDROGEN.md`)

## Role & Mission for Hydrogen
You are **Hydrogen**, Lead 3D Graphics, Audio, UI, and Gameplay Engineer.
**Carbon** has completed the project scaffold, verified and locked in the official Florida Grade 5 Science Unit 4 benchmarks (`src/science/SCIENCE_RULES.ts`), built the pure TypeScript separation & mass-conservation state machine (`src/science/MatterEngine.ts`), and defined the runtime quality tier presets (`src/config/graphicsTiers.ts`).

Your mission is to implement the studio-grade, zero-Blender 3D vertical slice for **World 2: "The Great Mixture Rescue" (`MagneticMines`)** and wire it into `src/main.ts`.

> **IMPORTANT ENVIRONMENT NOTE (Windows District Laptop Group Policy)**:
> On this machine, `node.exe` (`v22.14.0`) is installed under `AppData\Local\Programs\nodejs\`, and Windows Group Policy blocks `.ps1` and `.cmd` scripts (`npm.ps1` and `npm.cmd`). **Do NOT attempt to bypass, circumvent, or work around Group Policy restrictions.** Write clean, strict-mode-compliant TypeScript (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noUncheckedIndexedAccess: true`) that adheres strictly to `@types/three` (`^0.172.0`) and standard DOM/Web Audio types so Netlify's build (`npm run build`) compiles cleanly on deployment.

---

## Existing Core Contracts You Must Import (Do Not Duplicate or Weaken)
1. **`src/science/SCIENCE_RULES.ts`**:
   - `FLORIDA_G5_UNIT4_BENCHMARKS`, `MISCONCEPTION_GUARDRAILS`, `ATOM5_FEEDBACK_TEMPLATES`, `GRADE5_VOCABULARY_BANK`, `formatGrade5Temperature`, `validateGrade5Copy`.
   - **Strict Curriculum Rule**: Never display a periodic table, subatomic particles (protons/neutrons/electrons), atomic mass/number, chemical formulas/equations, density math, or middle-school solution terms (*solute, solvent, saturation, catalyst*). Always use `formatGrade5Temperature(c)` (e.g., `100°C (212°F)`).
2. **`src/science/MatterEngine.ts`**:
   - `MatterEngine`, `MATERIAL_CATALOG`, `SIEVE_MESH_OPENING_MM`, `FILTER_PAPER_PORE_MM`, and types `MaterialId`, `ContainerId`, `SeparationOperation`, `OperationResult`, `SeparationProgressSummary`, `InvestigationLogEntry`.
   - Every lab separation action in 3D **must** call `engine.recordPrediction(...)` (before running) and `engine.applyOperation(...)` (when triggered), then drive 3D animations and digital balance readouts from `engine.getContainers()`, `engine.getContainerMassGrams(id)`, and `engine.getSeparationProgress()`.
3. **`src/config/graphicsTiers.ts`**:
   - `GRAPHICS_TIER_PRESETS`, `DEFAULT_GRAPHICS_TIER`, `GraphicsQualityTier`, `GraphicsTierConfig`.

---

## Deliverables Hydrogen Must Implement

### 1. `src/engine/MaterialFactory.ts`
Build a caching procedural PBR texture, material, and IBL lighting factory:
- **Procedural Offscreen Canvas PBR Generator**:
  - Generate tileable heightfields (`256x256` or `512x512` from `tierConfig.proceduralTextureSize`) using deterministic multi-octave value/hash noise + directional streaks/weave patterns.
  - Derive tangent-space `normalMap` via a 3x3 Sobel filter over the heightfield (`THREE.CanvasTexture`, `NoColorSpace`, `RepeatWrapping`), alongside `albedo` (`SRGBColorSpace`), `roughnessMap`, and `metalnessMap`.
  - Provide named surface presets:
    - `brushedSteel` (directional anisotropic-look streaks, high metalness, crisp normal detail)
    - `labBenchEpoxy` (matte dark slate chemical-resistant benchtop with subtle micro-speckle roughness)
    - `sieveWireMesh` (crisscross woven metallic grid normal + alpha/cutout grid pattern representing `2.0 mm` openings)
    - `ceramicDish` (smooth glazed white porcelain with subtle rim roughness variation)
    - `filterPaper` (fibrous off-white cellulose texture)
    - `mineRockWall` (layered subterranean basalt/magnetite cavern rock with glowing cyan/amber mineral veins for the Magnetic Mines backdrop)
- **Tier-Aware Refractive Borosilicate Glassware (`createGlassMaterial(tier)`)**:
  - `Ultra`: `THREE.MeshPhysicalMaterial` with `transmission: 0.96`, `ior: 1.47`, `thickness: 0.08`, `roughness: 0.05`, `clearcoat: 1.0`, `envMapIntensity: 1.4`.
  - `Balanced`: `THREE.MeshPhysicalMaterial` with `transparent: true`, `opacity: 0.28`, `roughness: 0.06`, `clearcoat: 1.0`, `reflectivity: 0.95` (zero costly transmission pass).
  - `Classroom Safe`: `THREE.MeshStandardMaterial` with `transparent: true`, `opacity: 0.30`, `roughness: 0.12`, `metalness: 0.15`.
- **Studio-Lab IBL Environment (`buildLabEnvironment(renderer)`)**:
  - Use `THREE.PMREMGenerator` (`fromScene`) with a procedural interior dome containing warm/cool overhead softbox emitter panels and cyan accent strips so glass rims and steel tools catch realistic specular highlights.
- Provide `applyQualityTier(tier: GraphicsQualityTier)` to update materials in-place and dispose stale textures cleanly.

### 2. `src/engine/LabPropBuilder.ts`
Construct high-detail parametric 3D laboratory equipment (**zero primitive cube/cylinder block placeholders**):
- **Graduated Beakers (`mixture_beaker`, `water_beaker`)**: Double-walled `THREE.LatheGeometry` profile with flared pouring lip/spout, rounded base meniscus, and procedural white graduation tick markings + volume labels on a curved decal cylinder.
- **Crashed Cargo Capsule**: Angled metallic sci-fi sample pod (`LatheGeometry` hull + `ExtrudeGeometry` structural ribs, cracked viewport, glowing amber beacon, scorch marks) resting beside the main lab bench.
- **Electromagnet Wand (`magnet` tool) + `magnet_tray`**: Curved `TubeGeometry` copper-wound U-core / probe wand with glowing status ring, coiled power cable, and brushed steel recovery dish.
- **Vibrating Mesh Sieve (`sieve` tool, `2.0 mm` screen) + `sieve_tray`**: Spun brass/steel collar (`LatheGeometry`), woven `sieveWireMesh` disc, rubber isolation mounts on a motorized shaker base that physically oscillates during sieving.
- **Filter Funnel Stand (`filter` tool) + `filter_funnel`**: Ring-stand clamp (`TubeGeometry` + `ExtrudeGeometry`), conical `LatheGeometry` glass funnel, pleated conical `filterPaper` liner, positioned over the evaporating dish.
- **Digital Hot Plate Evaporator (`evaporate` tool) + `evaporating_dish` + `vapor_hood`**: Brushed steel chassis with emissive ceramic heating element (shifts dark slate -> warm orange glow at `100°C / 212°F`), wide `LatheGeometry` porcelain evaporating dish, overhead transparent vapor hood with condenser coil (`TubeGeometry`), and live digital temperature/mass LED canvas readouts!
- **Digital Mass Balance**: Dedicated bench scale with live `<canvas>` LCD showing container mass (`g`) and closed-system total (`245.0 g`) so mass conservation is visually unmistakable.
- **Multi-Material `InstancedMesh` Granular System**:
  - Render realistic distinct particle geometries inside containers based on `MatterEngine` state:
    - `glass_shards`: faceted translucent cyan-tinted polyhedra (`IcosahedronGeometry(1, 0)` scaled irregularly, larger `6.5 mm` visual scale).
    - `iron_filings`: elongated dark metallic splinters/needles that bristle and arc toward the electromagnet pole.
    - `sand`: warm tan rounded mineral grains (`DodecahedronGeometry`).
    - `salt`: crisp white tiny cubic crystals (`BoxGeometry`) when dry/recrystallized; when `isDissolved === true`, hide macroscopic crystals in normal view and reveal tiny glowing white dispersed particles scattered evenly among cyan water particles when **Particle Vision** (`SC.5.P.8.4`) is active!
  - **Evaporation Visual Guardrail (`STEAM_IS_WATER_VAPOR_GAS`)**: During `evaporate`, leave a visibly **clear/transparent gap** immediately above the `100°C (212°F)` boiling surface (representing invisible water vapor gas, revealed as tiny rising gas particles only in Particle Vision), with soft wispy condensed **liquid mist droplets** forming slightly higher up in the cooler air beneath the hood!

### 3. `src/audio/SoundEngine.ts`
Procedural Web Audio API synthesizer with zero external audio files:
- Safe lazy `AudioContext` initialization/resumption on first user click/keydown.
- Persistent `isMuted` state (`toggleMute()`, `setMuted(bool)`) defaulting to unmuted once unlocked, wired to HUD button + `M` shortcut.
- Synthesize distinct, pleasant, non-harsh laboratory SFX:
  - `playGlassClink()`
  - `playMagnetHum()` (with metallic filing zip clicks)
  - `playSieveRattle()`
  - `playWaterPour()`
  - `playFilterDrip()`
  - `playBoilingAndSizzle()`
  - `playAtom5Chime()` / `playSuccessFanfare()` / `playUiClick()`

### 4. `src/player/PlayerController.ts` + Companion Robot **ATOM-5**
- **Camera Modes (`V` key or HUD button)**:
  - **First-Person**: Eye-height (`1.55 m`) lab bench navigation (`WASD`/Arrows + right-mouse drag or optional PointerLock).
  - **Third-Person**: Smooth damped orbital follow camera behind a stylized articulated sci-fi Grade-5 Explorer suit avatar (`CapsuleGeometry` / `LatheGeometry` visor helmet + backpack—no blocky stick figures).
- **Click/Tap Station Focus (Smartboard Ready)**:
  - Clicking/tapping any lab station smoothly tweens camera focus onto that station and highlights its interactive halo—ensuring 100% playability with mouse-only or touch Smartboards without requiring `WASD` or `PointerLock`.
- **Simple Lab Bench & Room Bounds Collision**: Prevent walking through the central lab island, capsule, or cavern walls.
- **Articulated Companion Robot `ATOM-5`**:
  - Floating spherical/gyroscopic drone built with `LatheGeometry` shell, dual rotating `TorusGeometry` gimbal rings, articulated antenna ears, and an expressive procedural `<canvas>` LED visor face (happy, curious/questioning during misconception checks, celebrating on pure sample recovery) hovering gently beside the player or active station.

### 5. `src/ui/GameHUD.ts` & `src/ui/TeacherHUD.ts`
- **`GameHUD.ts`**:
  - Top bar: World title, **Closed-System Mass Ledger Badge** (`245.0 g Conserved`), **Particle Vision Toggle (`P` key)** *(framed strictly around `SC.5.P.8.4`: magnifying matter to see tiny unseen parts—no subatomic particles!)*, **Camera View Toggle (`V`)**, **Mute/Unmute (`M`)**, and **Teacher Mode Button (`T`)**.
  - **Recovery Progress Tracker**: Visual cards for the 4 target solids (`Iron Filings 30g`, `Safety Glass Shards 40g`, `Quartz Sand 50g`, `Table Salt 25g`) lighting up green as each achieves `isPureAndDry: true`.
  - **Inquiry Prediction-Before-Action Modal/Drawer**: Whenever the student selects one of the 5 separation operations (`Magnet`, `2.0 mm Sieve`, `Add Water` [with Cool `10°C`, Room `22°C`, or Warm `60°C` + `Stir` toggles for `SC.5.P.8.2`!], `Filter Paper`, `Hot Plate Evaporate`), prompt a quick 1-click Grade-5 prediction choice before calling `engine.recordPrediction(...)` and `engine.applyOperation(...)`, then display the resulting observation + Science Journal log!
  - **ATOM-5 Misconception Challenge Modal**: Automatically trigger interactive Socratic multiple-choice cards from `MISCONCEPTION_GUARDRAILS` when `result.triggeredMisconceptions` fires (`DISSOLVING_DESTROYS_MATTER` on salt dissolving; `STEAM_IS_WATER_VAPOR_GAS` and `BUBBLES_PROVE_CHEMICAL_CHANGE` on boiling/evaporation), calling `engine.markMisconceptionResolved(id)` once mastered.
- **`TeacherHUD.ts`**:
  - Toggled via `T` key or top-right button.
  - Includes: **Station Quick-Jump** buttons (Overview, Crashed Capsule, Magnet, Sieve, Water & Balance, Filter, Hot Plate, plus preview badges for Unit 4 Worlds 1/3/4), **Freeze / Unfreeze Simulation** toggle, **Large Smartboard Text** toggle (`document.documentElement.classList.toggle('smartboard-large-text')`), **Graphics Quality Tier** selector (`Ultra` / `Balanced` / `Classroom Safe`), **Reset Station** button, **Standards Alignment Drawer** (displaying verified CPALMS codes from `FLORIDA_G5_UNIT4_BENCHMARKS`), and **Export / Import JSON Progress** (`Blob` download + file picker).

### 6. `src/worlds/MagneticMines.ts` & `src/main.ts`
- Assemble the subterranean **Magnetic Mines Rescue Laboratory**: arched basalt cavern with glowing mineral seams, overhead industrial lighting rigs, central epoxy laboratory island housing all 5 interactive stations in a logical ergonomic arc, crashed cargo capsule, explorer + ATOM-5, `EffectComposer` with `UnrealBloomPass` (respecting `GRAPHICS_TIER_PRESETS`), and smooth choreographed animations for every tool operation (`magnet` sweep, `sieve` shake, `add_water` beaker tilt/pour + dissolving transition, `filter` pour/drip, `evaporate` heating glow + bubbles + mist + salt recrystallization, plus `Condense Captured Vapor` button on the hood if needed).
- Update `src/main.ts` to mount the full interactive experience, handle `window` resize cleanly, pause animations when Teacher Freeze is active, and switch render pipeline settings live when Graphics Quality Tier changes.

---

## Acceptance Checklist Before Hydrogen Finishes
- [ ] Zero external `.glb`, `.png`, `.jpg`, `.mp3`, `.wav`, or CDN font/script URLs anywhere in `index.html` or `src/`.
- [ ] All 4 solid materials (`iron_filings`, `glass_shards`, `sand`, `salt`) can be separated in multiple valid tool orders, and total system mass remains `245.0 g` throughout.
- [ ] Dissolving salt triggers ATOM-5's `DISSOLVING_DESTROYS_MATTER` challenge; boiling/evaporation triggers `STEAM_IS_WATER_VAPOR_GAS` and `BUBBLES_PROVE_CHEMICAL_CHANGE` challenges.
- [ ] Particle Vision (`P`), Camera Toggle (`V`), Teacher Mode (`T`), Mute (`M`), Large Smartboard Text, Graphics Quality Tier switching (`Ultra` / `Balanced` / `Classroom Safe`), and JSON Export/Import all work seamlessly via both keyboard and mouse/touch clicks.
- [ ] Zero forbidden middle/high-school chemistry terms (`validateGrade5Copy` returns `[]` across all UI strings).
