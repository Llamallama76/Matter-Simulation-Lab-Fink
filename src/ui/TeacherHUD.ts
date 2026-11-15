/**
 * Smartboard-Ready Teacher Mode HUD (Toggled via `T` key or top-right Teacher button).
 * Provides Wing A & Wing B 10-Station Quick-Jump, Simulation Freeze/Unfreeze,
 * Large Smartboard Text (`1.28x`), Runtime Graphics Quality Tier switching,
 * Reset All 10 Stations, Verified FL CPALMS Alignment, and JSON progress Export/Import.
 */

import {
  GRAPHICS_TIER_PRESETS,
  type GraphicsQualityTier,
} from '../config/graphicsTiers';
import type { StationFocusId } from '../engine/LabPropBuilder';
import { LAB_STATION_CATALOG, LAB_STATION_IDS } from '../science/MatterEngine';
import {
  type BenchmarkCode,
  FLORIDA_G5_UNIT4_BENCHMARKS,
} from '../science/SCIENCE_RULES';

export interface TeacherHudCallbacks {
  readonly onJumpStation: (stationId: StationFocusId) => void;
  readonly onToggleFreeze: (frozen: boolean) => void;
  readonly onToggleLargeText: (large: boolean) => void;
  readonly onChangeQualityTier: (tier: GraphicsQualityTier) => void;
  readonly onResetAllStations: () => void;
  readonly onExportJson: () => string;
  readonly onImportJson: (jsonText: string) => void;
  readonly onUiClick: () => void;
}

export class TeacherHUD {
  private readonly overlay: HTMLDivElement;
  private readonly callbacks: TeacherHudCallbacks;
  private readonly fileInput: HTMLInputElement;

  private isOpen = false;
  private frozen = false;
  private largeText = false;
  private qualityTier: GraphicsQualityTier;
  private statusEl!: HTMLParagraphElement;
  private freezeBtn!: HTMLButtonElement;
  private largeTextBtn!: HTMLButtonElement;
  private tierSelect!: HTMLSelectElement;
  private tierDescEl!: HTMLParagraphElement;

  constructor(
    parent: HTMLElement,
    initialTier: GraphicsQualityTier,
    callbacks: TeacherHudCallbacks,
  ) {
    this.qualityTier = initialTier;
    this.callbacks = callbacks;

    this.overlay = document.createElement('div');
    this.overlay.className = 'interactive-panel';
    this.overlay.style.cssText = `
      position: absolute;
      top: 64px;
      right: 14px;
      width: min(500px, calc(100vw - 28px));
      max-height: calc(100vh - 134px);
      overflow-y: auto;
      padding: 16px;
      border-radius: 14px;
      background: rgba(8, 15, 29, 0.96);
      border: 1px solid rgba(251, 191, 36, 0.55);
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.6);
      color: #f8fafc;
      display: none;
      z-index: 48;
      font-size: 0.88em;
      line-height: 1.45;
    `;

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,application/json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => this.handleFileSelected());

    this.render();
    parent.appendChild(this.overlay);
    parent.appendChild(this.fileInput);
  }

  public isOpened(): boolean {
    return this.isOpen;
  }

  public toggle(): boolean {
    this.setOpen(!this.isOpen);
    return this.isOpen;
  }

  public setOpen(open: boolean): void {
    this.isOpen = open;
    this.overlay.style.display = open ? 'block' : 'none';
  }

  public setVisible(visible: boolean): void {
    if (!visible) {
      this.overlay.style.display = 'none';
    } else if (this.isOpen) {
      this.overlay.style.display = 'block';
    }
  }

  public isSimulationFrozen(): boolean {
    return this.frozen;
  }

  public setQualityTier(tier: GraphicsQualityTier): void {
    this.qualityTier = tier;
    this.tierSelect.value = tier;
    this.tierDescEl.textContent = GRAPHICS_TIER_PRESETS[tier].description;
  }

  public dispose(): void {
    this.overlay.remove();
    this.fileInput.remove();
  }

  private render(): void {
    const benchmarkRows = (Object.keys(FLORIDA_G5_UNIT4_BENCHMARKS) as BenchmarkCode[])
      .map((code) => {
        const b = FLORIDA_G5_UNIT4_BENCHMARKS[code];
        return `
          <div style="padding: 8px 10px; border-radius: 8px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.22); margin-bottom: 6px;">
            <div style="font-weight: 700; color: #38bdf8;">${b.code} — ${b.cognitiveComplexity}</div>
            <div style="color: #e2e8f0; margin: 2px 0 4px;">${b.officialText}</div>
            <div style="color: #94a3b8; font-size: 0.86em;">Limit: ${b.assessmentLimits[0] ?? ''}</div>
          </div>
        `;
      })
      .join('');

    const stationJumpButtons = LAB_STATION_IDS.map((id) => {
      const desc = LAB_STATION_CATALOG[id];
      const accent =
        desc.wing === 'wing_a_properties'
          ? 'rgba(56, 189, 248, 0.42)'
          : 'rgba(52, 211, 153, 0.42)';
      return `
        <button data-jump="${id}" style="
          padding: 7px 9px;
          border-radius: 8px;
          background: rgba(30, 41, 59, 0.92);
          color: #f8fafc;
          border: 1px solid ${accent};
          cursor: pointer;
          text-align: left;
          font-weight: 600;
          font-size: 0.86em;
        ">${desc.shortLabel}</button>
      `;
    }).join('');

    this.overlay.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(251,191,36,0.28); padding-bottom: 8px;">
        <div>
          <div style="font-weight: 800; color: #fbbf24; letter-spacing: 0.03em;">TEACHER MODE HUD</div>
          <div style="color: #cbd5e1; font-size: 0.85em;">10-Station Smartboard &amp; Whole-Class Controls (Shortcut: T)</div>
        </div>
        <button data-action="close" style="background: rgba(51,65,85,0.8); color: #f8fafc; border: 1px solid rgba(148,163,184,0.35); border-radius: 8px; padding: 6px 10px; cursor: pointer; font-weight: 700;">Close</button>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight: 700; color: #2dd4bf;">Quick-Jump Any Station (Wing A &amp; Wing B)</span>
          <button data-jump="overview" style="padding: 4px 10px; border-radius: 999px; background: rgba(14,165,233,0.24); color: #7dd3fc; border: 1px solid #38bdf8; cursor: pointer; font-weight: 700; font-size: 0.82em;">Lab Hall Overview</button>
        </div>
        <div data-slot="jump-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px;">
          ${stationJumpButtons}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <button data-action="freeze" style="padding: 9px; border-radius: 8px; background: #1e293b; color: #f8fafc; border: 1px solid rgba(56,189,248,0.45); cursor: pointer; font-weight: 700;">
          Pause / Freeze Sim
        </button>
        <button data-action="large-text" style="padding: 9px; border-radius: 8px; background: #1e293b; color: #f8fafc; border: 1px solid rgba(56,189,248,0.45); cursor: pointer; font-weight: 700;">
          Smartboard Text: 1x
        </button>
      </div>

      <div style="margin-bottom: 12px; padding: 10px; border-radius: 10px; background: rgba(15,23,42,0.85); border: 1px solid rgba(148,163,184,0.25);">
        <label style="display: block; font-weight: 700; color: #2dd4bf; margin-bottom: 6px;">Graphics Quality Tier</label>
        <select data-action="quality-tier" style="width: 100%; padding: 8px; border-radius: 8px; background: #0f172a; color: #f8fafc; border: 1px solid rgba(94,234,212,0.4); font-weight: 600;">
          <option value="Ultra">Ultra (Studio PBR)</option>
          <option value="Balanced">Balanced</option>
          <option value="Classroom Safe">Classroom Safe (District Laptop)</option>
        </select>
        <p data-slot="tier-desc" style="color: #cbd5e1; font-size: 0.82em; margin-top: 6px;"></p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-bottom: 10px;">
        <button data-action="reset" style="padding: 8px; border-radius: 8px; background: rgba(185,28,28,0.35); color: #fecaca; border: 1px solid rgba(248,113,113,0.5); cursor: pointer; font-weight: 700;">Reset All 10 Stations</button>
        <button data-action="export" style="padding: 8px; border-radius: 8px; background: rgba(14,116,144,0.45); color: #cffafe; border: 1px solid rgba(34,211,238,0.5); cursor: pointer; font-weight: 700;">Export JSON</button>
        <button data-action="import" style="padding: 8px; border-radius: 8px; background: rgba(14,116,144,0.45); color: #cffafe; border: 1px solid rgba(34,211,238,0.5); cursor: pointer; font-weight: 700;">Import JSON</button>
      </div>

      <p data-slot="status" style="color: #fbbf24; font-size: 0.84em; min-height: 18px; margin-bottom: 10px;"></p>

      <details style="border-top: 1px solid rgba(148,163,184,0.22); padding-top: 8px;">
        <summary style="cursor: pointer; font-weight: 700; color: #38bdf8; margin-bottom: 8px;">
          Verified FL Grade 5 CPALMS Benchmarks (Unit 4)
        </summary>
        ${benchmarkRows}
      </details>
    `;

    this.statusEl = this.overlay.querySelector('[data-slot="status"]') as HTMLParagraphElement;
    this.freezeBtn = this.overlay.querySelector('[data-action="freeze"]') as HTMLButtonElement;
    this.largeTextBtn = this.overlay.querySelector('[data-action="large-text"]') as HTMLButtonElement;
    this.tierSelect = this.overlay.querySelector('[data-action="quality-tier"]') as HTMLSelectElement;
    this.tierDescEl = this.overlay.querySelector('[data-slot="tier-desc"]') as HTMLParagraphElement;

    this.tierSelect.value = this.qualityTier;
    this.tierDescEl.textContent = GRAPHICS_TIER_PRESETS[this.qualityTier].description;

    this.overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.setOpen(false);
    });

    this.overlay.querySelectorAll('[data-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-jump') as StationFocusId | null;
        if (!id) return;
        this.callbacks.onUiClick();
        this.callbacks.onJumpStation(id);
        this.statusEl.textContent = `Camera jumped to: ${id === 'overview' ? 'Lab Hall Overview' : LAB_STATION_CATALOG[id].title}`;
      });
    });

    this.freezeBtn.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.frozen = !this.frozen;
      this.freezeBtn.textContent = this.frozen ? 'Resume Sim (FROZEN)' : 'Pause / Freeze Sim';
      this.freezeBtn.style.background = this.frozen ? 'rgba(217,119,6,0.45)' : '#1e293b';
      this.callbacks.onToggleFreeze(this.frozen);
      this.statusEl.textContent = this.frozen
        ? 'Simulation paused for whole-class discussion (orbit & zoom remain active).'
        : 'Simulation resumed.';
    });

    this.largeTextBtn.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.largeText = !this.largeText;
      document.documentElement.classList.toggle('smartboard-large-text', this.largeText);
      this.largeTextBtn.textContent = this.largeText
        ? 'Smartboard Text: LARGE'
        : 'Smartboard Text: 1x';
      this.largeTextBtn.style.background = this.largeText ? 'rgba(20,184,166,0.4)' : '#1e293b';
      this.callbacks.onToggleLargeText(this.largeText);
    });

    this.tierSelect.addEventListener('change', () => {
      this.callbacks.onUiClick();
      const next = this.tierSelect.value as GraphicsQualityTier;
      this.qualityTier = next;
      this.tierDescEl.textContent = GRAPHICS_TIER_PRESETS[next].description;
      this.callbacks.onChangeQualityTier(next);
      this.statusEl.textContent = `Graphics tier switched to ${next}.`;
    });

    this.overlay.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.callbacks.onResetAllStations();
      this.statusEl.textContent = 'All 10 stations & 3-tab Data Sheet reset to clean defaults.';
    });

    this.overlay.querySelector('[data-action="export"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      const json = this.callbacks.onExportJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matterverse-10station-progress-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.statusEl.textContent = 'Exported 10-station investigation JSON (no student login required).';
    });

    this.overlay.querySelector('[data-action="import"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.fileInput.value = '';
      this.fileInput.click();
    });
  }

  private handleFileSelected(): void {
    const file = this.fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        this.callbacks.onImportJson(text);
        this.statusEl.textContent = `Restored progress from ${file.name}.`;
      } catch (err) {
        this.statusEl.textContent =
          err instanceof Error ? `Import error: ${err.message}` : 'Invalid JSON save file.';
      }
    };
    reader.readAsText(file);
  }
}
