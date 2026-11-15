# MATTERVERSE: THE FRACTURED LABORATORY — System Architecture (`SPEC.md`)

## 1. Mission & Deployment Contract
- **Stack**: Three.js (`^0.172.0`) + TypeScript (`strict: true`) + Vite (`base: './'`), configured via `netlify.toml` (`publish = "dist"`).
- **100% Offline Self-Contained Bundle**: Zero external CDNs, zero external web fonts, zero external `.glb`/`.3ds` 3D files, zero `.mp3`/`.wav` audio files, and zero external runtime APIs or student logins. Every texture, mesh, shader/lighting environment, and sound effect is synthesized procedurally in TypeScript at runtime.

---

## 2. Florida Grade 5 Science Curriculum Architecture (`src/science/SCIENCE_RULES.ts`)

### Verified Official CPALMS Benchmarks (Unit 4: Properties & Changes in Matter)
| Code | Verified CPALMS Wording | Key FLDOE Grade 5 Assessment Boundary |
| :--- | :--- | :--- |
| **SC.5.P.8.1** | *Compare and contrast the basic properties of solids, liquids, and gases, such as mass, volume, color, texture, and temperature.* | Conceptual comparison of observable/measurable properties. **No** kinetic molecular particle motion testing across states; **no** density math ($D = m/V$). |
| **SC.5.P.8.2** | *Investigate and identify materials that will dissolve in water and those that will not and identify the conditions that will speed up or slow down the dissolving process.* | Dissolving rate factors strictly limited to **temperature, stirring, and surface area (grain size)**. **No** testing of *solute, solvent, solution, saturation,* or *catalyst*. |
| **SC.5.P.8.3** | *Demonstrate and explain that mixtures of solids can be separated based on observable properties of their parts such as particle size, shape, color, and magnetic attraction.* | Multiple valid tool sequences accepted based on real physical properties (magnetism, sieve mesh size, water solubility + filtration + evaporation). |
| **SC.5.P.8.4** | *Explore the scientific theory of atoms (also called atomic theory) by recognizing that all matter is composed of parts that are too small to be seen without magnification.* | Strictly conceptual recognition of tiny unseen parts. **No** periodic table, atomic mass/number, or protons/neutrons/electrons. |
| **SC.5.P.9.1** | *Investigate and describe that many physical and chemical changes are affected by temperature.* | Heating/cooling effects on physical changes (melting, freezing, evaporating, condensing, dissolving speed) and chemical changes (cooking, burning, rusting). Display `°C` with `°F` equivalents. **No** chemical equations or balancing. |

### Hardcoded Misconception Guardrails
1. **Dissolving Conserves Matter (`DISSOLVING_DESTROYS_MATTER`)**: Dissolving salt in water is a physical change; all 25.0 g of salt remains present as tiny unseen parts (`100.0 g water + 25.0 g salt = 125.0 g`), recoverable as solid crystals via evaporation.
2. **Steam/Mist vs. Water Vapor (`STEAM_IS_WATER_VAPOR_GAS`)**: Visible white steam or mist above hot water consists of tiny **liquid** water droplets condensing in cooler air; true **water vapor** is a completely **invisible gas**.
3. **Bubbles as Evidence, Not Proof (`BUBBLES_PROVE_CHEMICAL_CHANGE`)**: Bubbles or fizzing indicate gas movement/presence, **not** automatic proof of a chemical change (boiling liquid water into water vapor bubbles at `100°C / 212°F` is a physical state change).

---

## 3. Pure Science State Machine (`src/science/MatterEngine.ts`)
- **Zero Three.js Coupling**: Deterministic state machine modeling `iron_filings` (`30 g`, magnetic, `0.6 mm`), `glass_shards` (`40 g`, `6.5 mm`), `sand` (`50 g`, `0.5 mm`), `salt` (`25 g`, soluble, `0.4 mm`), and `water` (`100 g` liquid).
- **Closed-System Mass Conservation**: Tracks exact milligram-rounded mass (`245.0 g` total) across 7 lab containers (`mixture_beaker`, `water_beaker`, `magnet_tray`, `sieve_tray`, `filter_funnel`, `evaporating_dish`, `vapor_hood`), verifying `verifyMassConservation() === true` after every step.
- **Order-Independent Valid Sequences**: Supports any physically valid sequence of `magnet`, `sieve` (`2.0 mm` screen), `add_water` (with temperature & stirring rate modifiers), `filter` (`0.02 mm` filter paper), and `evaporate` (`100°C / 212°F`), plus `condenseCapturedVaporToWaterBeaker()` so early-evaporation mistakes become reversible learning moments rather than soft-locks.
- **Inquiry Cycle & Save Files**: Pairs student predictions (`recordPrediction`) with timestamped observations (`InvestigationLogEntry`) and serializes/restores state via `exportStateJson()` / `importStateJson()`.

---

## 4. Zero-Blender Photorealistic PBR & Graphics Quality Architecture

### Procedural Rendering Pipeline
- **Tone Mapping & Color**: `THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })`, `outputColorSpace = THREE.SRGBColorSpace`, `toneMapping = THREE.ACESFilmicToneMapping`, `toneMappingExposure = 1.05`.
- **Image-Based Lighting (IBL)**: `THREE.PMREMGenerator` builds an environment cubemap from a procedural studio-lab equirectangular room scene (overhead softbox key panels, cool cyan rim strips, warm lab bench bounce) so metallic surfaces and borosilicate glassware show crisp realistic reflections.
- **Multi-Channel Canvas PBR Textures**: Offscreen `<canvas>` generator synthesizes tileable `albedo` (`CanvasTexture` in `SRGBColorSpace`), tangent-space `normalMap` (Sobel gradient from procedural heightfields), `roughnessMap`, and `metalnessMap` (`NoColorSpace`) for brushed stainless steel, anodized aluminum, epoxy lab benchtop, woven wire mesh, ceramic hot plate, and mineral grains.
- **Parametric Lab Geometry**: Built exclusively with `LatheGeometry` (beakers, Erlenmeyer-style rims, funnels, ceramic evaporating dish), `TubeGeometry` (horseshoe/wand electromagnet coils, power conduits, condenser tubing), `ExtrudeGeometry` (structural brackets, digital balance chassis, capsule ribs), and `InstancedMesh` (thousands of individual glass shards, iron filings, sand grains, and salt crystals).
- **Post-Processing**: `EffectComposer` -> `RenderPass` -> `UnrealBloomPass` -> `OutputPass` (dynamically bypassed on `Classroom Safe` tier).

### Runtime Graphics Quality Tiers (`src/config/graphicsTiers.ts`)
| Tier | Max DPR | Shadows | Glassware Material | Bloom | Procedural Map Size |
| :--- | :---: | :--- | :--- | :---: | :---: |
| **Ultra** *(Default)* | `2.0` | `PCFSoftShadowMap` (`2048px`) | `MeshPhysicalMaterial` (`transmission: 1`, `ior: 1.47`, `thickness`) | Enabled | `512px` |
| **Balanced** | `1.5` | `PCFSoftShadowMap` (`1024px`) | Clearcoat physical specular glass (no multi-pass transmission) | Light | `512px` |
| **Classroom Safe** | `1.25` | Off | Crisp Fresnel transparent `MeshStandardMaterial` | Off | `256px` |

---

## 5. Camera, Smartboard Input, Companion Robot & HUDs

### Dual-Mode Camera & Input (`src/player/PlayerController.ts`)
- **Toggle (`V` key or HUD button)**: Smoothly switches between **First-Person Lab View** (eye-level bench inspection) and **Third-Person Explorer View** (over-the-shoulder view of the explorer avatar + floating companion robot **ATOM-5**).
- **Classroom & Smartboard Safe Input**:
  - `WASD` / Arrow keys move between stations; right-drag or optional `PointerLock` rotates camera (`Esc` always exits cleanly).
  - **Click / Tap-to-Interact**: Clicking or tapping any 3D station/tool raycasts directly, glides the camera to a clear framing of that station, and opens its prediction/action controls—playable 100% mouse-only or on a classroom touch Smartboard.

### Teacher Mode HUD (`T` key or Top-Right Button — `src/ui/TeacherHUD.ts`)
- **Station / World Quick-Jump**: Teleport immediately to Overview, Crashed Capsule, Magnet Station, Sieve Station, Dissolving & Balance Station, Filter Station, or Hot Plate Evaporator (plus future Unit 4 World slots labeled clearly).
- **Simulation Freeze / Unfreeze**: Pauses all particle physics, animations, and timers while keeping camera orbit/inspection active for whole-class Socratic discussion.
- **Large Smartboard Text Toggle**: Toggles `html.smartboard-large-text` (`1.28x` UI typography scale + high-contrast borders) readable from the back of a classroom.
- **Live Graphics Tier Switcher**: Instant runtime switch between `Ultra`, `Balanced`, and `Classroom Safe`.
- **Reset Station & JSON Progress Export/Import**: Resets `MatterEngine` + 3D props cleanly, or downloads/loads a local `.json` investigation file with zero student accounts or PII.

### Procedural Web Audio Synthesizer (`src/audio/SoundEngine.ts`)
- Pure `AudioContext` synthesis (unlocked automatically on first pointer/key gesture) with a prominent persistent **Mute / Unmute** HUD toggle (`M` key + top bar icon):
  - **Borosilicate Clink**: Modal high-Q sine bank (`1820 Hz`, `2740 Hz`, `4190 Hz`) with fast exponential decay.
  - **Electromagnet Hum**: Detuned `120 Hz` + `180 Hz` triangle/saw oscillators through a modulated low-pass filter, plus metallic zip-clicks as iron filings snap to the pole.
  - **Vibrating Sieve**: Rapid bandpass-filtered mechanical rattle + crystalline clatter bursts.
  - **Water Pour & Boiling Bubbles**: Bandpass noise stream + randomized upward pitch-swept sine bubble pops (`280 Hz -> 620 Hz`).
  - **Hot Plate Sizzle & Evaporation**: High-pass filtered noise envelope paired with subtle thermal hum.
  - **ATOM-5 & Discovery Chimes**: Warm pentatonic major-9th FM bell arpeggios.
