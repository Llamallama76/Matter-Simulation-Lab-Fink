/**
 * Decluttered Smartboard-Ready Student HUD for MATTERVERSE 10-Station Lab.
 * - State A (Lab Roam): Slim top utility bar + single-line bottom dock with Turn Left/Right (Q/E)
 *   and quick station navigation.
 * - State B (Station Focus): One compact collapsible `?` corner guide card + `Step Back to Lab (Esc)`,
 *   1-line live observation strip, and contextual bottom tool dock with 360° Orbit & +/- Zoom.
 * - Global Hide/Show HUD (`H`) Clean View toggle.
 * - Voluntary ATOM-5 popover (zero blocking pre-action quizzes or forced modals).
 */

import type { CameraViewMode } from '../player/PlayerController';
import {
  LAB_STATION_CATALOG,
  LAB_STATION_IDS,
  type LabNavigationMode,
  type LabStationId,
  type RaceBeakerConfig,
  type RaceBeakerId,
  type SaltGrainSize,
  type ScratchToolId,
  STATION1_SPECIMENS,
  type Station1SpecimenId,
  type Station1State,
  STATION2_SPECIMENS,
  type Station2SpecimenId,
  type Station2State,
  STATION3_MAGNET_ITEMS,
  STATION3_SCENT_JARS,
  type Station3MagnetItemId,
  type Station3ScentJarId,
  type Station3State,
  STATION4_OBJECTS,
  type Station4ObjectId,
  type Station4State,
  type Station5State,
  type Station6CategoryId,
  type Station6State,
  type Station7State,
  type Station8State,
  type Station9Mode,
  type Station9State,
  type Station10BeakerMaterialId,
  type Station10State,
  type StationActionFeedback,
  type VoluntaryAtom5Prompt,
  type WaterTempPreset,
} from '../science/MatterEngine';
import {
  formatGrade5Temperature,
  MISCONCEPTION_GUARDRAILS,
  type MisconceptionId,
  validateGrade5Copy,
} from '../science/SCIENCE_RULES';

export interface GameHudCallbacks {
  // Navigation & View
  readonly onSelectStation: (stationId: LabStationId) => void;
  readonly onJumpOverview: () => void;
  readonly onExitStationFocus: () => void;
  readonly onTurnHold: (dir: -1 | 0 | 1) => void;
  readonly onTurnStep: (dir: -1 | 1) => void;
  readonly onZoomStep: (deltaRadius: number) => void;
  readonly onToggleParticleVision: () => void;
  readonly onToggleCameraMode: () => void;
  readonly onToggleMute: () => void;
  readonly onToggleDataSheet: () => void;
  readonly onToggleTeacherMode: () => void;
  readonly onToggleCleanView: () => void;

  // Voluntary ATOM-5
  readonly onRequestAtom5Tip: () => void;
  readonly onResolveMisconception: (id: MisconceptionId) => void;

  // Station 1–5 Actions (Wing A)
  readonly onStation1Inspect: (specimenId: Station1SpecimenId, magnifierActive: boolean) => void;
  readonly onStation2Scratch: (specimenId: Station2SpecimenId, tool: ScratchToolId) => void;
  readonly onStation2SelectTool: (tool: ScratchToolId) => void;
  readonly onStation3MagnetTest: (itemId: Station3MagnetItemId) => void;
  readonly onStation3WaftJar: (jarId: Station3ScentJarId) => void;
  readonly onStation4SelectObject: (objectId: Station4ObjectId) => void;
  readonly onStation4Weigh: (objectId: Station4ObjectId) => void;
  readonly onStation4Submerge: (objectId: Station4ObjectId) => void;
  readonly onStation4Clear: () => void;
  readonly onStation5SetTemp: (tempC: number) => void;

  // Station 6–10 Actions (Wing B)
  readonly onStation6PickNext: () => void;
  readonly onStation6SortCategory: (cat: Station6CategoryId | 'all') => void;
  readonly onStation6Reset: () => void;
  readonly onStation7Sweep: () => void;
  readonly onStation7Release: () => void;
  readonly onStation7Reset: () => void;
  readonly onStation8PourShake: () => void;
  readonly onStation8Reset: () => void;
  readonly onStation9SetMode: (mode: Station9Mode) => void;
  readonly onStation9Filter: () => void;
  readonly onStation9Evaporate: () => void;
  readonly onStation9Reset: () => void;
  readonly onStation10TestSolubility: (matId: Station10BeakerMaterialId) => void;
  readonly onStation10ConfigureRace: (
    beakerId: RaceBeakerId,
    patch: Partial<Pick<RaceBeakerConfig, 'waterTempPreset' | 'stirred' | 'grainSize'>>,
  ) => void;
  readonly onStation10StartRace: () => void;
  readonly onStation10ResetRace: () => void;

  readonly onUiClick: () => void;
}

export interface GameHudSyncState {
  navMode: LabNavigationMode;
  focusedStation: LabStationId | null;
  particleVision: boolean;
  cameraMode: CameraViewMode;
  muted: boolean;
  frozen: boolean;
  dataSheetOpen: boolean;
  cleanView: boolean;
  station1: Station1State;
  station2: Station2State;
  station3: Station3State;
  station4: Station4State;
  station5: Station5State;
  station6: Station6State;
  station7: Station7State;
  station8: Station8State;
  station9: Station9State;
  station10: Station10State;
}

export class GameHUD {
  private readonly callbacks: GameHudCallbacks;

  private topBar!: HTMLDivElement;
  private cleanViewToggleBtn!: HTMLButtonElement;
  private guideCard!: HTMLDivElement;
  private observationStrip!: HTMLDivElement;
  private bottomDock!: HTMLDivElement;
  private atom5Popover!: HTMLDivElement;

  private stationSelectEl!: HTMLSelectElement;
  private freezePillEl!: HTMLSpanElement;
  private dataSheetBtn!: HTMLButtonElement;
  private particleBtn!: HTMLButtonElement;
  private cameraBtn!: HTMLButtonElement;
  private muteBtn!: HTMLButtonElement;

  // Local non-blocking UI state
  private guideMinimized = false;
  private atom5Open = false;
  private activeAtom5Prompt: VoluntaryAtom5Prompt | null = null;
  private debateChallengeId: MisconceptionId | null = null;
  private station2Tool: ScratchToolId = 'copper_penny';
  private station4SelectedObject: Station4ObjectId = 'brass_cylinder';
  private latestFeedback: StationActionFeedback | null = null;

  private lastDockSignature = '';
  private lastGuideSignature = '';
  private lastSyncedState: GameHudSyncState | null = null;

  constructor(parent: HTMLElement, callbacks: GameHudCallbacks) {
    this.callbacks = callbacks;
    this.verifyGrade5Compliance();
    this.buildDom(parent);
  }

  public syncState(state: GameHudSyncState): void {
    this.lastSyncedState = state;
    this.station2Tool = state.station2.activeTool;

    // 1. Clean View (`H`) visibility
    const showHud = !state.cleanView;
    this.topBar.style.display = showHud ? 'flex' : 'none';
    this.bottomDock.style.display = showHud ? 'flex' : 'none';
    this.cleanViewToggleBtn.style.display = state.cleanView ? 'inline-flex' : 'none';

    if (!showHud) {
      this.guideCard.style.display = 'none';
      this.observationStrip.style.display = 'none';
      this.atom5Popover.style.display = 'none';
      return;
    }

    // 2. Top Utility Bar controls
    this.stationSelectEl.value =
      state.navMode === 'station_focus' && state.focusedStation ? state.focusedStation : 'overview';
    this.freezePillEl.style.display = state.frozen ? 'inline-flex' : 'none';

    this.dataSheetBtn.style.background = state.dataSheetOpen
      ? 'rgba(14, 165, 233, 0.42)'
      : 'rgba(15, 23, 42, 0.85)';
    this.dataSheetBtn.style.borderColor = state.dataSheetOpen
      ? '#38bdf8'
      : 'rgba(94, 234, 212, 0.38)';

    this.particleBtn.textContent = state.particleVision
      ? 'Particle Vision: ON (P)'
      : 'Particle Vision: OFF (P)';
    this.particleBtn.style.background = state.particleVision
      ? 'rgba(14, 165, 233, 0.42)'
      : 'rgba(15, 23, 42, 0.85)';
    this.particleBtn.style.borderColor = state.particleVision
      ? '#38bdf8'
      : 'rgba(148, 163, 184, 0.38)';

    this.cameraBtn.style.display = state.navMode === 'roam' ? 'inline-flex' : 'none';
    this.cameraBtn.textContent =
      state.cameraMode === 'first_person' ? 'View: 1st Person (V)' : 'View: 3rd Person (V)';

    this.muteBtn.textContent = state.muted ? 'Sound: MUTED (M)' : 'Sound: ON (M)';
    this.muteBtn.style.borderColor = state.muted ? '#fbbf24' : 'rgba(94, 234, 212, 0.38)';

    // 3. State B Corner Guide Card & Observation Strip
    if (state.navMode === 'station_focus' && state.focusedStation) {
      this.renderGuideCard(state.focusedStation);
      this.renderObservationStrip();
    } else {
      this.guideCard.style.display = 'none';
      this.observationStrip.style.display = 'none';
    }

    // 4. Contextual Bottom Dock (rebuild only when state signature changes & no input is active)
    const activeEl = document.activeElement;
    const isInteractingWithInput =
      activeEl !== null &&
      this.bottomDock.contains(activeEl) &&
      (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT');

    if (!isInteractingWithInput) {
      this.renderBottomDock(state);
    }
  }

  public showActionFeedback(feedback: StationActionFeedback): void {
    this.latestFeedback = feedback;
    if (this.lastSyncedState && !this.lastSyncedState.cleanView) {
      this.renderObservationStrip();
    }
  }

  public openAtom5Popover(prompt: VoluntaryAtom5Prompt): void {
    this.activeAtom5Prompt = prompt;
    this.debateChallengeId = null;
    this.atom5Open = true;
    this.renderAtom5Popover();
  }

  public closeAtom5Popover(): void {
    this.atom5Open = false;
    this.atom5Popover.style.display = 'none';
  }

  public dispose(): void {
    this.topBar.remove();
    this.cleanViewToggleBtn.remove();
    this.guideCard.remove();
    this.observationStrip.remove();
    this.bottomDock.remove();
    this.atom5Popover.remove();
  }

  // ============================================================================
  // PRIVATE BUILDERS & RENDERERS
  // ============================================================================

  private verifyGrade5Compliance(): void {
    const sampleStaticUi =
      'MATTERVERSE 10-Station Grade 5 Matter Lab Data Sheet Particle Vision Hide HUD Show HUD Turn Left Turn Right Step Back to Lab Orbit Left Orbit Right Copper Penny Steel Nail Mass Volume Displaced Solid Liquid Gas Dissolving Race Beaker Filter Evaporate';
    const violations = validateGrade5Copy(sampleStaticUi);
    if (violations.length > 0) {
      throw new Error(`GameHUD Grade 5 compliance violation: ${violations.join(', ')}`);
    }
  }

  private buildDom(parent: HTMLElement): void {
    // 1. Slim Top Utility Strip
    this.topBar = document.createElement('div');
    this.topBar.className = 'interactive-panel';
    this.topBar.style.cssText = `
      position: absolute;
      top: 10px;
      left: 14px;
      right: 14px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 12px;
      background: rgba(8, 15, 29, 0.88);
      border: 1px solid rgba(94, 234, 212, 0.34);
      backdrop-filter: blur(8px);
      z-index: 25;
    `;

    const wingAOptions = LAB_STATION_IDS.slice(0, 5)
      .map((id) => `<option value="${id}">Wing A • ${LAB_STATION_CATALOG[id].shortLabel}</option>`)
      .join('');
    const wingBOptions = LAB_STATION_IDS.slice(5)
      .map((id) => `<option value="${id}">Wing B • ${LAB_STATION_CATALOG[id].shortLabel}</option>`)
      .join('');

    this.topBar.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-weight:800; color:#2dd4bf; letter-spacing:0.04em;">MATTERVERSE</span>
        <span style="color:#cbd5e1; font-size:0.8em;">Grade 5 Matter &amp; Solutions Lab</span>
        <select data-nav-select style="padding:5px 9px; border-radius:8px; background:#0f172a; color:#f8fafc; border:1px solid rgba(56,189,248,0.45); font-weight:700; font-size:0.8em; cursor:pointer;">
          <option value="overview">Lab Hall Overview (Roam)</option>
          <optgroup label="Wing A — Properties &amp; States">${wingAOptions}</optgroup>
          <optgroup label="Wing B — Mixtures &amp; Solutions">${wingBOptions}</optgroup>
        </select>
        <span data-slot="freeze-pill" style="display:none; padding:3px 9px; border-radius:999px; background:rgba(217,119,6,0.35); border:1px solid #fbbf24; color:#fef3c7; font-weight:800; font-size:0.75em;">PAUSED</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <button data-btn="datasheet" style="padding:6px 10px; border-radius:8px; color:#f8fafc; border:1px solid rgba(94,234,212,0.38); cursor:pointer; font-weight:700; font-size:0.8em;">Data Sheet (D)</button>
        <button data-btn="particle" style="padding:6px 10px; border-radius:8px; color:#f8fafc; border:1px solid rgba(148,163,184,0.38); cursor:pointer; font-weight:700; font-size:0.8em;">Particle Vision: OFF (P)</button>
        <button data-btn="camera" style="padding:6px 10px; border-radius:8px; background:rgba(15,23,42,0.85); color:#f8fafc; border:1px solid rgba(94,234,212,0.38); cursor:pointer; font-weight:700; font-size:0.8em;">View: 3rd Person (V)</button>
        <button data-btn="mute" style="padding:6px 10px; border-radius:8px; background:rgba(15,23,42,0.85); color:#f8fafc; border:1px solid rgba(94,234,212,0.38); cursor:pointer; font-weight:700; font-size:0.8em;">Sound: ON (M)</button>
        <button data-btn="teacher" style="padding:6px 10px; border-radius:8px; background:rgba(217,119,6,0.28); color:#fde68a; border:1px solid rgba(251,191,36,0.55); cursor:pointer; font-weight:800; font-size:0.8em;">Teacher (T)</button>
        <button data-btn="hidehud" style="padding:6px 10px; border-radius:8px; background:rgba(51,65,85,0.8); color:#e2e8f0; border:1px solid rgba(148,163,184,0.4); cursor:pointer; font-weight:700; font-size:0.8em;">Hide HUD (H)</button>
      </div>
    `;

    this.stationSelectEl = this.topBar.querySelector('[data-nav-select]') as HTMLSelectElement;
    this.freezePillEl = this.topBar.querySelector('[data-slot="freeze-pill"]') as HTMLSpanElement;
    this.dataSheetBtn = this.topBar.querySelector('[data-btn="datasheet"]') as HTMLButtonElement;
    this.particleBtn = this.topBar.querySelector('[data-btn="particle"]') as HTMLButtonElement;
    this.cameraBtn = this.topBar.querySelector('[data-btn="camera"]') as HTMLButtonElement;
    this.muteBtn = this.topBar.querySelector('[data-btn="mute"]') as HTMLButtonElement;

    this.stationSelectEl.addEventListener('change', () => {
      this.callbacks.onUiClick();
      const val = this.stationSelectEl.value;
      if (val === 'overview') {
        this.callbacks.onJumpOverview();
      } else {
        this.callbacks.onSelectStation(val as LabStationId);
      }
    });
    this.dataSheetBtn.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onToggleDataSheet();
    });
    this.particleBtn.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onToggleParticleVision();
    });
    this.cameraBtn.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onToggleCameraMode();
    });
    this.muteBtn.addEventListener('click', () => {
      this.callbacks.onToggleMute();
    });
    this.topBar.querySelector('[data-btn="teacher"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onToggleTeacherMode();
    });
    this.topBar.querySelector('[data-btn="hidehud"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onToggleCleanView();
    });

    // 2. Floating Show HUD Pill for Clean View (`H`)
    this.cleanViewToggleBtn = document.createElement('button');
    this.cleanViewToggleBtn.className = 'interactive-panel';
    this.cleanViewToggleBtn.textContent = 'Show HUD (H)';
    this.cleanViewToggleBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 14px;
      display: none;
      align-items: center;
      padding: 7px 13px;
      border-radius: 999px;
      background: rgba(8, 15, 29, 0.82);
      color: #5eead4;
      border: 1px solid rgba(45, 212, 191, 0.55);
      font-weight: 800;
      font-size: 0.82em;
      cursor: pointer;
      z-index: 60;
    `;
    this.cleanViewToggleBtn.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onToggleCleanView();
    });

    // 3. Station Focus Collapsible Corner Guide Card (Max 340px, 2 lines + Step Back)
    this.guideCard = document.createElement('div');
    this.guideCard.className = 'interactive-panel';
    this.guideCard.style.cssText = `
      position: absolute;
      top: 64px;
      left: 14px;
      width: min(340px, calc(100vw - 28px));
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(8, 15, 29, 0.86);
      border: 1px solid rgba(56, 189, 248, 0.42);
      backdrop-filter: blur(8px);
      display: none;
      z-index: 20;
    `;

    // 4. Voluntary ATOM-5 Non-Blocking Corner Popover
    this.atom5Popover = document.createElement('div');
    this.atom5Popover.className = 'interactive-panel';
    this.atom5Popover.style.cssText = `
      position: absolute;
      top: 64px;
      right: 14px;
      width: min(360px, calc(100vw - 28px));
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(8, 15, 29, 0.94);
      border: 1px solid rgba(45, 212, 191, 0.55);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      display: none;
      z-index: 30;
    `;

    // 5. Sleek 1-Line Live Observation Strip above Bottom Dock
    this.observationStrip = document.createElement('div');
    this.observationStrip.className = 'interactive-panel';
    this.observationStrip.style.cssText = `
      position: absolute;
      bottom: 66px;
      left: 50%;
      transform: translateX(-50%);
      max-width: min(980px, calc(100vw - 28px));
      padding: 6px 12px;
      border-radius: 10px;
      background: rgba(8, 15, 29, 0.86);
      border: 1px solid rgba(56, 189, 248, 0.36);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 0.82em;
      z-index: 22;
    `;

    // 6. Single-Line Bottom Dock
    this.bottomDock = document.createElement('div');
    this.bottomDock.className = 'interactive-panel';
    this.bottomDock.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 14px;
      right: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 12px;
      background: rgba(8, 15, 29, 0.9);
      border: 1px solid rgba(94, 234, 212, 0.34);
      backdrop-filter: blur(8px);
      z-index: 25;
      overflow-x: auto;
    `;

    parent.append(
      this.topBar,
      this.cleanViewToggleBtn,
      this.guideCard,
      this.atom5Popover,
      this.observationStrip,
      this.bottomDock,
    );
  }

  private renderGuideCard(stationId: LabStationId): void {
    const sig = `${stationId}_${this.guideMinimized}`;
    if (sig === this.lastGuideSignature && this.guideCard.style.display === 'block') return;
    this.lastGuideSignature = sig;

    const desc = LAB_STATION_CATALOG[stationId];
    this.guideCard.style.display = 'block';
    const accent = desc.wing === 'wing_a_properties' ? '#38bdf8' : '#34d399';

    this.guideCard.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
        <div style="font-weight:800; color:${accent}; font-size:0.84em;">${desc.title}</div>
        <button data-guide-toggle title="Minimize or restore guide" style="padding:2px 8px; border-radius:6px; background:rgba(30,41,59,0.9); color:#e2e8f0; border:1px solid rgba(148,163,184,0.4); cursor:pointer; font-weight:800; font-size:0.78em;">
          ${this.guideMinimized ? '?' : '—'}
        </button>
      </div>
      ${
        this.guideMinimized
          ? ''
          : `<div style="margin-top:6px; font-size:0.78em; color:#e2e8f0; line-height:1.38;">
              <div>${desc.compactGuideLines[0]}</div>
              <div style="color:#94a3b8; margin-top:2px;">${desc.compactGuideLines[1]}</div>
            </div>`
      }
      <div style="margin-top:8px; display:flex; align-items:center; justify-content:space-between; gap:6px;">
        <button data-step-back style="padding:5px 10px; border-radius:8px; background:rgba(51,65,85,0.85); color:#f8fafc; border:1px solid rgba(148,163,184,0.45); cursor:pointer; font-weight:800; font-size:0.78em;">
          &larr; Step Back to Lab (Esc)
        </button>
        <span style="font-size:0.72em; color:#fbbf24; font-weight:700;">${desc.benchmarks.join(' • ')}</span>
      </div>
    `;

    this.guideCard.querySelector('[data-guide-toggle]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.guideMinimized = !this.guideMinimized;
      this.renderGuideCard(stationId);
    });
    this.guideCard.querySelector('[data-step-back]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onExitStationFocus();
    });
  }

  private renderObservationStrip(): void {
    const fb = this.latestFeedback;
    this.observationStrip.style.display = 'flex';
    const text = fb
      ? `<strong style="color:#5eead4;">${fb.headline}:</strong> <span style="color:#e2e8f0;">${fb.observation}</span>`
      : `<span style="color:#cbd5e1;">Drag to 360° orbit bench • Scroll or +/- to zoom • Use controls below to investigate!</span>`;

    this.observationStrip.innerHTML = `
      <div style="flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${text}</div>
      <button data-ask-atom5 style="flex-shrink:0; padding:4px 9px; border-radius:999px; background:rgba(20,184,166,0.22); color:#5eead4; border:1px solid rgba(45,212,191,0.5); cursor:pointer; font-weight:700; font-size:0.86em;">
        Ask ATOM-5
      </button>
    `;

    this.observationStrip.querySelector('[data-ask-atom5]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onRequestAtom5Tip();
    });
  }

  private renderAtom5Popover(): void {
    if (!this.atom5Open || !this.activeAtom5Prompt) {
      this.atom5Popover.style.display = 'none';
      return;
    }

    const prompt = this.activeAtom5Prompt;
    this.atom5Popover.style.display = 'block';

    let debateHtml = '';
    if (this.debateChallengeId) {
      const rule = MISCONCEPTION_GUARDRAILS[this.debateChallengeId];
      debateHtml = `
        <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(148,163,184,0.25);">
          <div style="font-weight:700; color:#fbbf24; font-size:0.82em; margin-bottom:5px;">${rule.atom5ChallengeQuestion}</div>
          <div style="display:flex; flex-direction:column; gap:5px;">
            ${rule.choices
              .map(
                (c) => `
              <button data-mc-choice="${c.id}" style="text-align:left; padding:6px 9px; border-radius:8px; background:rgba(30,41,59,0.9); color:#f8fafc; border:1px solid rgba(251,191,36,0.38); cursor:pointer; font-size:0.78em;">
                ${c.text}
              </button>
            `,
              )
              .join('')}
          </div>
          <div data-mc-reply style="display:none; margin-top:6px; padding:6px 8px; border-radius:8px; font-size:0.78em;"></div>
        </div>
      `;
    } else if (prompt.optionalMisconceptionId) {
      debateHtml = `
        <div style="margin-top:8px;">
          <button data-start-debate="${prompt.optionalMisconceptionId}" style="padding:5px 10px; border-radius:8px; background:rgba(217,119,6,0.25); color:#fde68a; border:1px solid rgba(251,191,36,0.5); cursor:pointer; font-weight:700; font-size:0.78em;">
            Check Common Lab Myth (Optional)
          </button>
        </div>
      `;
    }

    this.atom5Popover.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-weight:800; color:#2dd4bf; font-size:0.84em;">${prompt.tipTitle}</span>
        <button data-atom5-close style="background:rgba(51,65,85,0.85); color:#f8fafc; border:none; border-radius:6px; padding:2px 8px; cursor:pointer; font-weight:800;">&times;</button>
      </div>
      <div style="color:#e2e8f0; font-size:0.82em; line-height:1.42;">${prompt.tipBody}</div>
      ${debateHtml}
    `;

    this.atom5Popover.querySelector('[data-atom5-close]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.closeAtom5Popover();
    });

    this.atom5Popover.querySelector('[data-start-debate]')?.addEventListener('click', (e) => {
      this.callbacks.onUiClick();
      const id = (e.currentTarget as HTMLElement).getAttribute(
        'data-start-debate',
      ) as MisconceptionId | null;
      if (id) {
        this.debateChallengeId = id;
        this.renderAtom5Popover();
      }
    });

    this.atom5Popover.querySelectorAll('[data-mc-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.debateChallengeId) return;
        const rule = MISCONCEPTION_GUARDRAILS[this.debateChallengeId];
        const cid = btn.getAttribute('data-mc-choice');
        const chosen = rule.choices.find((c) => c.id === cid);
        if (!chosen) return;
        this.callbacks.onUiClick();

        const reply = this.atom5Popover.querySelector('[data-mc-reply]') as HTMLDivElement;
        reply.style.display = 'block';
        reply.style.background = chosen.isCorrect
          ? 'rgba(16,185,129,0.22)'
          : 'rgba(217,119,6,0.22)';
        reply.style.border = chosen.isCorrect ? '1px solid #34d399' : '1px solid #fbbf24';
        reply.style.color = chosen.isCorrect ? '#d1fae5' : '#fef3c7';
        reply.textContent = chosen.atom5Response;
        if (chosen.isCorrect) {
          this.callbacks.onResolveMisconception(this.debateChallengeId);
        }
      });
    });
  }

  private renderBottomDock(state: GameHudSyncState): void {
    const activeStation =
      state.navMode === 'station_focus' && state.focusedStation ? state.focusedStation : null;

    const sig = JSON.stringify({
      navMode: state.navMode,
      activeStation,
      tool2: this.station2Tool,
      obj4: this.station4SelectedObject,
      s1: activeStation === 'station_1_luster_texture' ? state.station1 : null,
      s2: activeStation === 'station_2_hardness_scratch' ? state.station2 : null,
      s3: activeStation === 'station_3_magnetism_wafting' ? state.station3 : null,
      s4: activeStation === 'station_4_mass_volume' ? state.station4 : null,
      s5: activeStation === 'station_5_thermal_states' ? state.station5.temperatureCelsius : null,
      s6: activeStation === 'station_6_tweezers_sorting' ? state.station6.unsortedCount : null,
      s7: activeStation === 'station_7_iron_sand_magnet' ? state.station7 : null,
      s8: activeStation === 'station_8_sand_gravel_sieve' ? state.station8.sieveShaken : null,
      s9: activeStation === 'station_9_filtration_evaporation' ? state.station9 : null,
      s10:
        activeStation === 'station_10_solutions_dissolving'
          ? {
              sol: state.station10.solubilityBeakers,
              a: state.station10.beakerA.config,
              b: state.station10.beakerB.config,
              aSt: state.station10.beakerA.status,
              bSt: state.station10.beakerB.status,
              run: state.station10.stopwatchRunning,
            }
          : null,
    });

    if (sig === this.lastDockSignature) return;
    this.lastDockSignature = sig;

    const turnBtnStyle =
      'padding:7px 12px; border-radius:8px; background:rgba(15,23,42,0.92); color:#5eead4; border:1px solid rgba(45,212,191,0.48); cursor:pointer; font-weight:800; font-size:0.8em; white-space:nowrap;';
    const zoomBtnStyle =
      'padding:7px 10px; border-radius:8px; background:rgba(15,23,42,0.92); color:#7dd3fc; border:1px solid rgba(56,189,248,0.45); cursor:pointer; font-weight:800; font-size:0.82em;';

    const leftTurnControls =
      state.navMode === 'station_focus'
        ? `<div style="display:flex; gap:5px; flex-shrink:0;">
             <button data-turn-hold="1" data-turn-label="left" style="${turnBtnStyle}">&#10226; Orbit Left (Q)</button>
             <button data-zoom="-0.28" title="Zoom In" style="${zoomBtnStyle}">+</button>
             <button data-zoom="0.28" title="Zoom Out" style="${zoomBtnStyle}">&minus;</button>
           </div>`
        : `<button data-turn-hold="1" style="${turnBtnStyle}; flex-shrink:0;">&#10226; Turn Left (Q)</button>`;

    const rightTurnControls =
      state.navMode === 'station_focus'
        ? `<button data-turn-hold="-1" data-turn-label="right" style="${turnBtnStyle}; flex-shrink:0;">Orbit Right (E) &#10227;</button>`
        : `<button data-turn-hold="-1" style="${turnBtnStyle}; flex-shrink:0;">Turn Right (E) &#10227;</button>`;

    const centerHtml = activeStation
      ? this.buildStationDockHtml(activeStation, state)
      : this.buildRoamDockHtml();

    this.bottomDock.innerHTML = `
      ${leftTurnControls}
      <div style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap; min-width:0;">
        ${centerHtml}
      </div>
      ${rightTurnControls}
    `;

    // Wire hold-to-turn buttons
    this.bottomDock.querySelectorAll('[data-turn-hold]').forEach((btn) => {
      const dir = Number(btn.getAttribute('data-turn-hold')) as -1 | 1;
      let downAt = 0;
      const startHold = () => {
        downAt = performance.now();
        this.callbacks.onTurnHold(dir);
      };
      const endHold = () => {
        this.callbacks.onTurnHold(0);
        if (downAt > 0 && performance.now() - downAt < 160) {
          this.callbacks.onTurnStep(dir);
        }
        downAt = 0;
      };
      btn.addEventListener('pointerdown', startHold);
      btn.addEventListener('pointerup', endHold);
      btn.addEventListener('pointerleave', () => this.callbacks.onTurnHold(0));
      btn.addEventListener('pointercancel', () => this.callbacks.onTurnHold(0));
    });

    // Wire zoom +/-
    this.bottomDock.querySelectorAll('[data-zoom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onUiClick();
        const delta = Number(btn.getAttribute('data-zoom'));
        this.callbacks.onZoomStep(delta);
      });
    });

    this.wireStationDockEvents(activeStation, state);
  }

  private buildRoamDockHtml(): string {
    const pills = LAB_STATION_IDS.map((id) => {
      const desc = LAB_STATION_CATALOG[id];
      const accent = desc.wing === 'wing_a_properties' ? '#38bdf8' : '#34d399';
      return `<button data-roam-jump="${id}" style="padding:5px 9px; border-radius:999px; background:rgba(15,23,42,0.88); color:#f8fafc; border:1px solid ${accent}; cursor:pointer; font-weight:700; font-size:0.75em; white-space:nowrap;">S${desc.stationNumber}: ${desc.shortLabel.replace(/^\d+\.\s*/, '')}</button>`;
    }).join('');
    return `
      <span style="font-size:0.76em; color:#94a3b8; white-space:nowrap;">WASD / Arrows to walk • Click any 3D bench or pill:</span>
      ${pills}
    `;
  }

  private buildStationDockHtml(stationId: LabStationId, state: GameHudSyncState): string {
    const pillCss = (active: boolean, accent = '#38bdf8') =>
      `padding:6px 10px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.78em; white-space:nowrap; color:#f8fafc; background:${active ? 'rgba(14,165,233,0.34)' : 'rgba(15,23,42,0.9)'}; border:1px solid ${active ? accent : 'rgba(148,163,184,0.34)'};`;

    switch (stationId) {
      case 'station_1_luster_texture': {
        const btns = (Object.keys(STATION1_SPECIMENS) as Station1SpecimenId[])
          .map((id) => {
            const sp = STATION1_SPECIMENS[id];
            const active = state.station1.activeSpecimenId === id;
            return `<button data-s1-spec="${id}" style="${pillCss(active)}">${sp.displayName}</button>`;
          })
          .join('');
        return `${btns}
          <button data-s1-mag style="${pillCss(state.station1.magnifierActive, '#2dd4bf')}">
            Magnifier: ${state.station1.magnifierActive ? 'ON' : 'OFF'}
          </button>`;
      }

      case 'station_2_hardness_scratch': {
        const specs = (Object.keys(STATION2_SPECIMENS) as Station2SpecimenId[])
          .map((id) => {
            const sp = STATION2_SPECIMENS[id];
            const active = state.station2.activeSpecimenId === id;
            return `<button data-s2-spec="${id}" style="${pillCss(active, '#fbbf24')}">Scratch ${sp.displayName}</button>`;
          })
          .join('');
        return `
          <button data-s2-tool="copper_penny" style="${pillCss(this.station2Tool === 'copper_penny', '#f97316')}">Tool: Copper Penny</button>
          <button data-s2-tool="steel_nail" style="${pillCss(this.station2Tool === 'steel_nail', '#38bdf8')}">Tool: Steel Nail</button>
          <span style="color:#64748b;">|</span>
          ${specs}
        `;
      }

      case 'station_3_magnetism_wafting': {
        const magBtns = (Object.keys(STATION3_MAGNET_ITEMS) as Station3MagnetItemId[])
          .map((id) => {
            const item = STATION3_MAGNET_ITEMS[id];
            const active = state.station3.activeMagnetItemId === id;
            return `<button data-s3-mag="${id}" style="${pillCss(active, '#f87171')}">${item.displayName}</button>`;
          })
          .join('');
        const jarBtns = (Object.keys(STATION3_SCENT_JARS) as Station3ScentJarId[])
          .map((id) => {
            const jar = STATION3_SCENT_JARS[id];
            const active = state.station3.activeWaftingJarId === id;
            return `<button data-s3-waft="${id}" style="${pillCss(active, '#34d399')}">Waft ${jar.label}</button>`;
          })
          .join('');
        return `${magBtns}<span style="color:#64748b;">|</span>${jarBtns}`;
      }

      case 'station_4_mass_volume': {
        const objBtns = (Object.keys(STATION4_OBJECTS) as Station4ObjectId[])
          .map((id) => {
            const obj = STATION4_OBJECTS[id];
            const active = this.station4SelectedObject === id;
            return `<button data-s4-obj="${id}" style="${pillCss(active)}">${obj.displayName}</button>`;
          })
          .join('');
        return `
          ${objBtns}
          <span style="color:#64748b;">|</span>
          <button data-s4-act="weigh" style="${pillCss(false, '#2dd4bf')}">Weigh on Balance (g)</button>
          <button data-s4-act="submerge" style="${pillCss(false, '#38bdf8')}">Submerge in Cylinder (mL)</button>
          <button data-s4-act="clear" style="${pillCss(false, '#94a3b8')}">Clear</button>
        `;
      }

      case 'station_5_thermal_states': {
        const c = state.station5.temperatureCelsius;
        return `
          <span style="font-weight:800; color:#fbbf24; font-size:0.82em; min-width:118px;">${formatGrade5Temperature(c)}</span>
          <input data-s5-slider type="range" min="-10" max="110" step="2" value="${c}" style="width:170px; cursor:pointer;" />
          <button data-s5-preset="-8" style="${pillCss(c <= 0, '#38bdf8')}">Ice (-8&deg;C / 18&deg;F)</button>
          <button data-s5-preset="22" style="${pillCss(c > 0 && c < 100, '#34d399')}">Liquid (22&deg;C / 72&deg;F)</button>
          <button data-s5-preset="100" style="${pillCss(c >= 100, '#f97316')}">Boiling (100&deg;C / 212&deg;F)</button>
        `;
      }

      case 'station_6_tweezers_sorting': {
        return `
          <button data-s6-act="next" style="${pillCss(false, '#2dd4bf')}">Pick Next Piece</button>
          <button data-s6-cat="red_bead" style="${pillCss(false, '#ef4444')}">Sort Red (${state.station6.sortedCounts.red_bead}/4)</button>
          <button data-s6-cat="blue_bead" style="${pillCss(false, '#3b82f6')}">Sort Blue (${state.station6.sortedCounts.blue_bead}/4)</button>
          <button data-s6-cat="yellow_bead" style="${pillCss(false, '#eab308')}">Sort Yellow (${state.station6.sortedCounts.yellow_bead}/4)</button>
          <button data-s6-cat="white_cube" style="${pillCss(false, '#f8fafc')}">Sort Cubes (${state.station6.sortedCounts.white_cube}/4)</button>
          <button data-s6-cat="all" style="${pillCss(state.station6.allSorted, '#34d399')}">Sort All</button>
          <button data-s6-act="reset" style="${pillCss(false, '#94a3b8')}">Reset</button>
        `;
      }

      case 'station_7_iron_sand_magnet': {
        return `
          <button data-s7-act="sweep" style="${pillCss(state.station7.ironOnMagnetGrams > 0, '#ef4444')}">1. Sweep Bar Magnet</button>
          <button data-s7-act="release" style="${pillCss(state.station7.isSeparatedPure, '#34d399')}">2. Release into Dish</button>
          <button data-s7-act="reset" style="${pillCss(false, '#94a3b8')}">Reset</button>
        `;
      }

      case 'station_8_sand_gravel_sieve': {
        return `
          <button data-s8-act="shake" style="${pillCss(state.station8.sieveShaken, '#34d399')}">Pour &amp; Shake 2.0 mm Sieve</button>
          <button data-s8-act="reset" style="${pillCss(false, '#94a3b8')}">Reset</button>
        `;
      }

      case 'station_9_filtration_evaporation': {
        const m = state.station9.mode;
        return `
          <button data-s9-mode="mode_a_sand_water" style="${pillCss(m === 'mode_a_sand_water')}">Mode A: Sand+Water</button>
          <button data-s9-mode="mode_b_salt_sand_water" style="${pillCss(m === 'mode_b_salt_sand_water')}">Mode B: Salt+Sand+Water</button>
          <span style="color:#64748b;">|</span>
          <button data-s9-act="filter" style="${pillCss(state.station9.stage === 'filtered', '#34d399')}">1. Pour Through Filter</button>
          <button data-s9-act="evaporate" style="${pillCss(state.station9.stage === 'evaporated', '#f97316')}">2. Evaporate 100&deg;C (212&deg;F)</button>
          <button data-s9-act="reset" style="${pillCss(false, '#94a3b8')}">Reset</button>
        `;
      }

      case 'station_10_solutions_dissolving': {
        const s = state.station10;
        const partABtns = (
          ['table_salt', 'granulated_sugar', 'quartz_sand', 'pepper_specks'] as Station10BeakerMaterialId[]
        )
          .map((id) => {
            const b = s.solubilityBeakers[id];
            return `<button data-s10-parta="${id}" style="${pillCss(b.tested, '#38bdf8')}">${b.displayName.split(' ')[1] ?? b.displayName}</button>`;
          })
          .join('');

        const renderRaceCfg = (beakerId: RaceBeakerId, label: string, cfg: RaceBeakerConfig, accent: string) => `
          <div style="display:inline-flex; align-items:center; gap:3px; padding:3px 6px; border-radius:8px; border:1px solid ${accent}; background:rgba(15,23,42,0.9); font-size:0.74em;">
            <strong style="color:${accent};">${label}</strong>
            <select data-s10-temp="${beakerId}" style="background:#0f172a; color:#f8fafc; border:1px solid #475569; border-radius:4px; padding:2px;">
              <option value="cool" ${cfg.waterTempPreset === 'cool' ? 'selected' : ''}>Cool 10&deg;C</option>
              <option value="room" ${cfg.waterTempPreset === 'room' ? 'selected' : ''}>Room 22&deg;C</option>
              <option value="warm" ${cfg.waterTempPreset === 'warm' ? 'selected' : ''}>Warm 60&deg;C</option>
            </select>
            <button data-s10-stir="${beakerId}" style="padding:2px 6px; border-radius:4px; background:${cfg.stirred ? '#0284c7' : '#334155'}; color:#fff; border:none; cursor:pointer; font-weight:700;">
              ${cfg.stirred ? 'Stir' : 'Still'}
            </button>
            <button data-s10-grain="${beakerId}" style="padding:2px 6px; border-radius:4px; background:${cfg.grainSize === 'fine' ? '#0d9488' : '#7c3aed'}; color:#fff; border:none; cursor:pointer; font-weight:700;">
              ${cfg.grainSize === 'fine' ? 'Fine' : 'Coarse'}
            </button>
          </div>
        `;

        return `
          <span style="font-size:0.72em; color:#94a3b8;">Test:</span>
          ${partABtns}
          <span style="color:#64748b;">|</span>
          ${renderRaceCfg('beaker_a', 'A', s.beakerA.config, '#38bdf8')}
          ${renderRaceCfg('beaker_b', 'B', s.beakerB.config, '#fb923c')}
          <button data-s10-race="start" style="padding:6px 11px; border-radius:8px; background:#059669; color:#fff; border:none; cursor:pointer; font-weight:800; font-size:0.78em;">
            ${s.stopwatchRunning ? 'Running...' : '&#9654; Start Race'}
          </button>
          <button data-s10-race="reset" style="${pillCss(false, '#94a3b8')}">Reset</button>
        `;
      }
    }
  }

  private wireStationDockEvents(activeStation: LabStationId | null, state: GameHudSyncState): void {
    if (!activeStation) {
      this.bottomDock.querySelectorAll('[data-roam-jump]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          const id = btn.getAttribute('data-roam-jump') as LabStationId | null;
          if (id) this.callbacks.onSelectStation(id);
        });
      });
      return;
    }

    if (activeStation === 'station_1_luster_texture') {
      this.bottomDock.querySelectorAll('[data-s1-spec]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          const id = btn.getAttribute('data-s1-spec') as Station1SpecimenId;
          this.callbacks.onStation1Inspect(id, true);
        });
      });
      this.bottomDock.querySelector('[data-s1-mag]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation1Inspect(
          state.station1.activeSpecimenId,
          !state.station1.magnifierActive,
        );
      });
    } else if (activeStation === 'station_2_hardness_scratch') {
      this.bottomDock.querySelectorAll('[data-s2-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          const tool = btn.getAttribute('data-s2-tool') as ScratchToolId;
          this.station2Tool = tool;
          this.callbacks.onStation2SelectTool(tool);
        });
      });
      this.bottomDock.querySelectorAll('[data-s2-spec]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          const specId = btn.getAttribute('data-s2-spec') as Station2SpecimenId;
          this.callbacks.onStation2Scratch(specId, this.station2Tool);
        });
      });
    } else if (activeStation === 'station_3_magnetism_wafting') {
      this.bottomDock.querySelectorAll('[data-s3-mag]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          this.callbacks.onStation3MagnetTest(
            btn.getAttribute('data-s3-mag') as Station3MagnetItemId,
          );
        });
      });
      this.bottomDock.querySelectorAll('[data-s3-waft]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          this.callbacks.onStation3WaftJar(btn.getAttribute('data-s3-waft') as Station3ScentJarId);
        });
      });
    } else if (activeStation === 'station_4_mass_volume') {
      this.bottomDock.querySelectorAll('[data-s4-obj]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          this.station4SelectedObject = btn.getAttribute('data-s4-obj') as Station4ObjectId;
          this.callbacks.onStation4SelectObject(this.station4SelectedObject);
        });
      });
      this.bottomDock.querySelectorAll('[data-s4-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          const act = btn.getAttribute('data-s4-act');
          if (act === 'weigh') this.callbacks.onStation4Weigh(this.station4SelectedObject);
          else if (act === 'submerge') this.callbacks.onStation4Submerge(this.station4SelectedObject);
          else if (act === 'clear') this.callbacks.onStation4Clear();
        });
      });
    } else if (activeStation === 'station_5_thermal_states') {
      const slider = this.bottomDock.querySelector('[data-s5-slider]') as HTMLInputElement | null;
      slider?.addEventListener('input', () => {
        this.callbacks.onStation5SetTemp(Number(slider.value));
      });
      this.bottomDock.querySelectorAll('[data-s5-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          this.callbacks.onStation5SetTemp(Number(btn.getAttribute('data-s5-preset')));
        });
      });
    } else if (activeStation === 'station_6_tweezers_sorting') {
      this.bottomDock.querySelector('[data-s6-act="next"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation6PickNext();
      });
      this.bottomDock.querySelector('[data-s6-act="reset"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation6Reset();
      });
      this.bottomDock.querySelectorAll('[data-s6-cat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          this.callbacks.onStation6SortCategory(
            btn.getAttribute('data-s6-cat') as Station6CategoryId | 'all',
          );
        });
      });
    } else if (activeStation === 'station_7_iron_sand_magnet') {
      this.bottomDock.querySelector('[data-s7-act="sweep"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation7Sweep();
      });
      this.bottomDock.querySelector('[data-s7-act="release"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation7Release();
      });
      this.bottomDock.querySelector('[data-s7-act="reset"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation7Reset();
      });
    } else if (activeStation === 'station_8_sand_gravel_sieve') {
      this.bottomDock.querySelector('[data-s8-act="shake"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation8PourShake();
      });
      this.bottomDock.querySelector('[data-s8-act="reset"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation8Reset();
      });
    } else if (activeStation === 'station_9_filtration_evaporation') {
      this.bottomDock.querySelectorAll('[data-s9-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          this.callbacks.onStation9SetMode(btn.getAttribute('data-s9-mode') as Station9Mode);
        });
      });
      this.bottomDock.querySelector('[data-s9-act="filter"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation9Filter();
      });
      this.bottomDock.querySelector('[data-s9-act="evaporate"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation9Evaporate();
      });
      this.bottomDock.querySelector('[data-s9-act="reset"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation9Reset();
      });
    } else if (activeStation === 'station_10_solutions_dissolving') {
      this.bottomDock.querySelectorAll('[data-s10-parta]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          this.callbacks.onStation10TestSolubility(
            btn.getAttribute('data-s10-parta') as Station10BeakerMaterialId,
          );
        });
      });
      this.bottomDock.querySelectorAll('[data-s10-temp]').forEach((sel) => {
        sel.addEventListener('change', () => {
          this.callbacks.onUiClick();
          const beakerId = sel.getAttribute('data-s10-temp') as RaceBeakerId;
          const val = (sel as HTMLSelectElement).value as WaterTempPreset;
          this.callbacks.onStation10ConfigureRace(beakerId, { waterTempPreset: val });
        });
      });
      this.bottomDock.querySelectorAll('[data-s10-stir]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          const beakerId = btn.getAttribute('data-s10-stir') as RaceBeakerId;
          const curr =
            beakerId === 'beaker_a'
              ? state.station10.beakerA.config.stirred
              : state.station10.beakerB.config.stirred;
          this.callbacks.onStation10ConfigureRace(beakerId, { stirred: !curr });
        });
      });
      this.bottomDock.querySelectorAll('[data-s10-grain]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.callbacks.onUiClick();
          const beakerId = btn.getAttribute('data-s10-grain') as RaceBeakerId;
          const curr =
            beakerId === 'beaker_a'
              ? state.station10.beakerA.config.grainSize
              : state.station10.beakerB.config.grainSize;
          const next: SaltGrainSize = curr === 'fine' ? 'coarse' : 'fine';
          this.callbacks.onStation10ConfigureRace(beakerId, { grainSize: next });
        });
      });
      this.bottomDock.querySelector('[data-s10-race="start"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation10StartRace();
      });
      this.bottomDock.querySelector('[data-s10-race="reset"]')?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.callbacks.onStation10ResetRace();
      });
    }
  }
}
