/**
 * Slide-Out 3-Tab Student Investigation Data Sheet (`D` key or Top Bar button).
 * Syncs live instrument measurements from `MatterEngine`, lets students record or edit
 * observations directly, and provides 1-click Print / CSV / JSON exports.
 */

import type {
  LabDataSheetSnapshot,
  LusterCategory,
  MixtureSeparationRow,
  PropertyMeasurementRow,
  SolutionsAndStatesRow,
  SurfaceTextureCategory,
  YesNoBlank,
} from '../science/MatterEngine';
import { validateGrade5Copy } from '../science/SCIENCE_RULES';

export type DataSheetTabId = 'tab1' | 'tab2' | 'tab3';

export interface LabDataSheetCallbacks {
  readonly onUpdatePropertyRow: (
    materialId: string,
    patch: Partial<
      Pick<
        PropertyMeasurementRow,
        | 'color'
        | 'luster'
        | 'texture'
        | 'hardnessScratchResult'
        | 'magnetic'
        | 'massGrams'
        | 'displacedVolumeMl'
        | 'studentNotes'
      >
    >,
  ) => void;
  readonly onUpdateSeparationRow: (
    entryId: number,
    patch: Partial<
      Pick<
        MixtureSeparationRow,
        'propertyUsed' | 'toolSelected' | 'observation' | 'separatedComponents' | 'studentNotes'
      >
    >,
  ) => void;
  readonly onUpdateSolutionsRow: (
    entryId: number,
    patch: Partial<
      Pick<
        SolutionsAndStatesRow,
        'solubleInWater' | 'dissolvingRaceVariableAndTime' | 'stateOfMatterAndTemp' | 'studentNotes'
      >
    >,
  ) => void;
  readonly onExportCsv: () => string;
  readonly onExportPrintableHtml: () => string;
  readonly onExportJson: () => string;
  readonly onUiClick: () => void;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class LabDataSheet {
  private readonly drawer: HTMLDivElement;
  private readonly callbacks: LabDataSheetCallbacks;

  private isOpen = false;
  private activeTab: DataSheetTabId = 'tab1';
  private snapshot: LabDataSheetSnapshot | null = null;
  private lastRenderedSig = '';

  private tabButtons!: Record<DataSheetTabId, HTMLButtonElement>;
  private bodyEl!: HTMLDivElement;
  private statusEl!: HTMLSpanElement;

  constructor(parent: HTMLElement, callbacks: LabDataSheetCallbacks) {
    this.callbacks = callbacks;

    const violations = validateGrade5Copy(
      'Student Investigation Data Sheet Tab 1 Properties & Measurement Log Tab 2 Mixture Separation Log Tab 3 Solutions & States Log Color Luster Texture Hardness Scratch Magnetic Mass Displaced Volume Notes Print CSV JSON',
    );
    if (violations.length > 0) {
      throw new Error(`LabDataSheet Grade 5 compliance error: ${violations.join(', ')}`);
    }

    this.drawer = document.createElement('div');
    this.drawer.className = 'interactive-panel';
    this.drawer.style.cssText = `
      position: absolute;
      top: 64px;
      right: 14px;
      width: min(980px, calc(100vw - 28px));
      max-height: calc(100vh - 134px);
      display: none;
      flex-direction: column;
      border-radius: 14px;
      background: rgba(8, 15, 29, 0.96);
      border: 1px solid rgba(56, 189, 248, 0.52);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.62);
      backdrop-filter: blur(10px);
      color: #f8fafc;
      z-index: 45;
      overflow: hidden;
    `;

    this.buildShell();
    parent.appendChild(this.drawer);
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
    this.drawer.style.display = open ? 'flex' : 'none';
    if (open && this.snapshot) {
      this.renderBody(true);
    }
  }

  public setVisible(visible: boolean): void {
    if (!visible) {
      this.drawer.style.display = 'none';
    } else if (this.isOpen) {
      this.drawer.style.display = 'flex';
    }
  }

  public sync(snapshot: LabDataSheetSnapshot): void {
    this.snapshot = snapshot;
    if (!this.isOpen) return;

    // Preserve active typing/selection focus inside the drawer
    const activeEl = document.activeElement;
    if (activeEl && this.bodyEl.contains(activeEl)) {
      return;
    }

    this.renderBody(false);
  }

  public dispose(): void {
    this.drawer.remove();
  }

  private buildShell(): void {
    this.drawer.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; padding:12px 16px; border-bottom:1px solid rgba(148,163,184,0.22); background:rgba(15,23,42,0.92);">
        <div>
          <div style="font-weight:800; color:#38bdf8; letter-spacing:0.03em; font-size:0.96em;">STUDENT INVESTIGATION DATA SHEET</div>
          <div style="font-size:0.76em; color:#cbd5e1;">Live instrument readings auto-fill with green dots—edit or add notes anytime (Shortcut: D)</div>
        </div>
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <button data-tab="tab1" style="padding:6px 11px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.8em;">1. Properties &amp; Measurement</button>
          <button data-tab="tab2" style="padding:6px 11px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.8em;">2. Mixture Separation</button>
          <button data-tab="tab3" style="padding:6px 11px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.8em;">3. Solutions &amp; States</button>
          <button data-ds-close style="padding:6px 11px; border-radius:8px; background:rgba(51,65,85,0.85); color:#f8fafc; border:1px solid rgba(148,163,184,0.35); cursor:pointer; font-weight:700; font-size:0.8em;">Close</button>
        </div>
      </div>

      <div data-ds-body style="flex:1; overflow:auto; padding:12px 16px;"></div>

      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; padding:10px 16px; border-top:1px solid rgba(148,163,184,0.22); background:rgba(15,23,42,0.92);">
        <span data-ds-status style="font-size:0.78em; color:#5eead4;">Ready — all measurements saved locally in browser session.</span>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button data-export="print" style="padding:7px 12px; border-radius:8px; background:#0284c7; color:#ffffff; border:none; cursor:pointer; font-weight:800; font-size:0.8em;">Print Data Sheet</button>
          <button data-export="csv" style="padding:7px 12px; border-radius:8px; background:#0d9488; color:#ffffff; border:none; cursor:pointer; font-weight:800; font-size:0.8em;">Export CSV</button>
          <button data-export="json" style="padding:7px 12px; border-radius:8px; background:rgba(30,41,59,0.95); color:#e2e8f0; border:1px solid rgba(94,234,212,0.45); cursor:pointer; font-weight:700; font-size:0.8em;">Export JSON</button>
        </div>
      </div>
    `;

    this.tabButtons = {
      tab1: this.drawer.querySelector('[data-tab="tab1"]') as HTMLButtonElement,
      tab2: this.drawer.querySelector('[data-tab="tab2"]') as HTMLButtonElement,
      tab3: this.drawer.querySelector('[data-tab="tab3"]') as HTMLButtonElement,
    };
    this.bodyEl = this.drawer.querySelector('[data-ds-body]') as HTMLDivElement;
    this.statusEl = this.drawer.querySelector('[data-ds-status]') as HTMLSpanElement;

    for (const tabId of ['tab1', 'tab2', 'tab3'] as const) {
      this.tabButtons[tabId].addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.activeTab = tabId;
        this.updateTabStyles();
        this.renderBody(true);
      });
    }

    this.drawer.querySelector('[data-ds-close]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.setOpen(false);
    });

    this.drawer.querySelector('[data-export="print"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      const html = this.callbacks.onExportPrintableHtml();
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 250);
        this.statusEl.textContent = 'Opened printable Student Data Sheet view.';
      } else {
        this.downloadBlob(
          html,
          'text/html',
          `matterverse-lab-datasheet-${new Date().toISOString().slice(0, 10)}.html`,
        );
        this.statusEl.textContent = 'Popup blocked—downloaded printable HTML Data Sheet instead.';
      }
    });

    this.drawer.querySelector('[data-export="csv"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      const csv = this.callbacks.onExportCsv();
      this.downloadBlob(
        csv,
        'text/csv;charset=utf-8;',
        `matterverse-lab-datasheet-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      this.statusEl.textContent = 'Exported 3-tab Lab Data Sheet as CSV.';
    });

    this.drawer.querySelector('[data-export="json"]')?.addEventListener('click', () => {
      this.callbacks.onUiClick();
      const json = this.callbacks.onExportJson();
      this.downloadBlob(
        json,
        'application/json',
        `matterverse-lab-state-${new Date().toISOString().slice(0, 10)}.json`,
      );
      this.statusEl.textContent = 'Exported full 10-station progress JSON.';
    });

    this.updateTabStyles();
  }

  private updateTabStyles(): void {
    for (const tabId of ['tab1', 'tab2', 'tab3'] as const) {
      const btn = this.tabButtons[tabId];
      const active = tabId === this.activeTab;
      btn.style.background = active ? 'rgba(14, 165, 233, 0.35)' : 'rgba(30, 41, 59, 0.85)';
      btn.style.border = active
        ? '1px solid #38bdf8'
        : '1px solid rgba(148, 163, 184, 0.32)';
      btn.style.color = active ? '#ffffff' : '#cbd5e1';
    }
  }

  private renderBody(force: boolean): void {
    if (!this.snapshot) return;

    const sig = `${this.activeTab}::${JSON.stringify(
      this.activeTab === 'tab1'
        ? this.snapshot.tab1PropertiesRows
        : this.activeTab === 'tab2'
          ? this.snapshot.tab2SeparationRows
          : this.snapshot.tab3SolutionsStatesRows,
    )}`;
    if (!force && sig === this.lastRenderedSig) return;
    this.lastRenderedSig = sig;

    const cellInputCss =
      'width:100%; min-width:74px; padding:4px 6px; border-radius:6px; background:#0f172a; color:#f8fafc; border:1px solid rgba(148,163,184,0.32); font-size:0.78em;';
    const thCss =
      'text-align:left; padding:7px 8px; background:rgba(15,23,42,0.95); color:#7dd3fc; border-bottom:1px solid rgba(56,189,248,0.35); font-size:0.76em; position:sticky; top:0; z-index:2;';
    const tdCss =
      'padding:6px 7px; border-bottom:1px solid rgba(148,163,184,0.14); vertical-align:middle; font-size:0.78em;';
    const autoDot = (flag: boolean) =>
      flag
        ? '<span title="Auto-measured at bench" style="display:inline-block; width:7px; height:7px; border-radius:999px; background:#34d399; margin-right:4px;"></span>'
        : '';

    if (this.activeTab === 'tab1') {
      const rowsHtml = this.snapshot.tab1PropertiesRows
        .map(
          (r) => `
          <tr data-mat="${escapeAttr(r.materialId)}">
            <td style="${tdCss}">
              <div style="font-weight:700; color:#f8fafc;">${escapeAttr(r.materialName)}</div>
              <div style="font-size:0.86em; color:#94a3b8;">${escapeAttr(r.stationBadge)}</div>
            </td>
            <td style="${tdCss}">
              <div style="display:flex; align-items:center;">${autoDot(r.autoMeasured.surface)}
                <input data-t1="color" value="${escapeAttr(r.color)}" placeholder="Color" style="${cellInputCss}" />
              </div>
            </td>
            <td style="${tdCss}">
              <select data-t1="luster" style="${cellInputCss}">
                <option value="" ${r.luster === '' ? 'selected' : ''}>—</option>
                <option value="metallic" ${r.luster === 'metallic' ? 'selected' : ''}>Metallic</option>
                <option value="glassy" ${r.luster === 'glassy' ? 'selected' : ''}>Glassy</option>
                <option value="dull" ${r.luster === 'dull' ? 'selected' : ''}>Dull</option>
              </select>
            </td>
            <td style="${tdCss}">
              <select data-t1="texture" style="${cellInputCss}">
                <option value="" ${r.texture === '' ? 'selected' : ''}>—</option>
                <option value="smooth" ${r.texture === 'smooth' ? 'selected' : ''}>Smooth</option>
                <option value="rough" ${r.texture === 'rough' ? 'selected' : ''}>Rough</option>
              </select>
            </td>
            <td style="${tdCss}">
              <div style="display:flex; align-items:center;">${autoDot(r.autoMeasured.scratch)}
                <input data-t1="hardnessScratchResult" value="${escapeAttr(r.hardnessScratchResult)}" placeholder="Scratch test" style="${cellInputCss} min-width:110px;" />
              </div>
            </td>
            <td style="${tdCss}">
              <div style="display:flex; align-items:center;">${autoDot(r.autoMeasured.magnetic)}
                <select data-t1="magnetic" style="${cellInputCss} min-width:64px;">
                  <option value="" ${r.magnetic === '' ? 'selected' : ''}>—</option>
                  <option value="yes" ${r.magnetic === 'yes' ? 'selected' : ''}>Yes</option>
                  <option value="no" ${r.magnetic === 'no' ? 'selected' : ''}>No</option>
                </select>
              </div>
            </td>
            <td style="${tdCss}">
              <div style="display:flex; align-items:center;">${autoDot(r.autoMeasured.mass)}
                <input data-t1="massGrams" value="${escapeAttr(r.massGrams)}" placeholder="g" style="${cellInputCss} min-width:58px;" />
              </div>
            </td>
            <td style="${tdCss}">
              <div style="display:flex; align-items:center;">${autoDot(r.autoMeasured.volume)}
                <input data-t1="displacedVolumeMl" value="${escapeAttr(r.displacedVolumeMl)}" placeholder="mL" style="${cellInputCss} min-width:58px;" />
              </div>
            </td>
            <td style="${tdCss}">
              <input data-t1="studentNotes" value="${escapeAttr(r.studentNotes)}" placeholder="Notes..." style="${cellInputCss} min-width:120px;" />
            </td>
          </tr>
        `,
        )
        .join('');

      this.bodyEl.innerHTML = `
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${thCss}">Material</th>
              <th style="${thCss}">Color</th>
              <th style="${thCss}">Luster</th>
              <th style="${thCss}">Texture</th>
              <th style="${thCss}">Hardness Scratch</th>
              <th style="${thCss}">Magnetic</th>
              <th style="${thCss}">Mass (g)</th>
              <th style="${thCss}">Displaced Vol (mL)</th>
              <th style="${thCss}">Student Notes</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `;

      this.bodyEl.querySelectorAll('tr[data-mat]').forEach((tr) => {
        const materialId = tr.getAttribute('data-mat');
        if (!materialId) return;
        tr.querySelectorAll('[data-t1]').forEach((el) => {
          const field = el.getAttribute('data-t1');
          const evtName = el.tagName === 'SELECT' ? 'change' : 'input';
          el.addEventListener(evtName, () => {
            const val = (el as HTMLInputElement | HTMLSelectElement).value;
            if (field === 'color') this.callbacks.onUpdatePropertyRow(materialId, { color: val });
            else if (field === 'luster')
              this.callbacks.onUpdatePropertyRow(materialId, {
                luster: val as LusterCategory | '',
              });
            else if (field === 'texture')
              this.callbacks.onUpdatePropertyRow(materialId, {
                texture: val as SurfaceTextureCategory | '',
              });
            else if (field === 'hardnessScratchResult')
              this.callbacks.onUpdatePropertyRow(materialId, { hardnessScratchResult: val });
            else if (field === 'magnetic')
              this.callbacks.onUpdatePropertyRow(materialId, { magnetic: val as YesNoBlank });
            else if (field === 'massGrams')
              this.callbacks.onUpdatePropertyRow(materialId, { massGrams: val });
            else if (field === 'displacedVolumeMl')
              this.callbacks.onUpdatePropertyRow(materialId, { displacedVolumeMl: val });
            else if (field === 'studentNotes')
              this.callbacks.onUpdatePropertyRow(materialId, { studentNotes: val });
          });
        });
      });
      return;
    }

    if (this.activeTab === 'tab2') {
      if (this.snapshot.tab2SeparationRows.length === 0) {
        this.bodyEl.innerHTML = `
          <div style="padding:26px; text-align:center; color:#cbd5e1;">
            <strong style="color:#34d399; display:block; margin-bottom:6px;">No Mixture Separation Entries Yet</strong>
            Visit <strong>Wing B (Stations 6–9)</strong> to sort with tweezers, pull iron with a magnet, sift sand &amp; gravel, or filter and evaporate saltwater!
          </div>
        `;
        return;
      }

      const rowsHtml = this.snapshot.tab2SeparationRows
        .map(
          (r) => `
          <tr data-t2-id="${r.entryId}">
            <td style="${tdCss}; font-weight:700; color:#34d399;">${escapeAttr(r.stationBadge)}</td>
            <td style="${tdCss}; font-weight:700;">${escapeAttr(r.mixtureName)}</td>
            <td style="${tdCss}">${escapeAttr(r.propertyUsed)}</td>
            <td style="${tdCss}">${escapeAttr(r.toolSelected)}</td>
            <td style="${tdCss}">${escapeAttr(r.observation)}</td>
            <td style="${tdCss}">${escapeAttr(r.separatedComponents)}</td>
            <td style="${tdCss}">
              <input data-t2-notes value="${escapeAttr(r.studentNotes)}" placeholder="Add reflection..." style="${cellInputCss} min-width:130px;" />
            </td>
          </tr>
        `,
        )
        .join('');

      this.bodyEl.innerHTML = `
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${thCss}">Station</th>
              <th style="${thCss}">Mixture</th>
              <th style="${thCss}">Property Used</th>
              <th style="${thCss}">Tool Selected</th>
              <th style="${thCss}">Observation</th>
              <th style="${thCss}">Separated Components</th>
              <th style="${thCss}">Student Notes</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `;

      this.bodyEl.querySelectorAll('tr[data-t2-id]').forEach((tr) => {
        const entryId = Number(tr.getAttribute('data-t2-id'));
        const input = tr.querySelector('[data-t2-notes]') as HTMLInputElement | null;
        input?.addEventListener('input', () => {
          this.callbacks.onUpdateSeparationRow(entryId, { studentNotes: input.value });
        });
      });
      return;
    }

    // Tab 3: Solutions & States Log
    if (this.snapshot.tab3SolutionsStatesRows.length === 0) {
      this.bodyEl.innerHTML = `
        <div style="padding:26px; text-align:center; color:#cbd5e1;">
          <strong style="color:#fbbf24; display:block; margin-bottom:6px;">No Solutions or Thermal State Entries Yet</strong>
          Adjust temperature in <strong>Station 5 (Thermal Chamber)</strong> or run solubility &amp; dissolving races in <strong>Station 10</strong>!
        </div>
      `;
      return;
    }

    const rowsHtml = this.snapshot.tab3SolutionsStatesRows
      .map(
        (r) => `
        <tr data-t3-id="${r.entryId}">
          <td style="${tdCss}; font-weight:700; color:#fbbf24;">${escapeAttr(r.stationBadge)}</td>
          <td style="${tdCss}; font-weight:700;">${escapeAttr(r.investigationItem)}</td>
          <td style="${tdCss}; text-transform:uppercase;">${escapeAttr(r.solubleInWater || '—')}</td>
          <td style="${tdCss}">${escapeAttr(r.dissolvingRaceVariableAndTime)}</td>
          <td style="${tdCss}">${escapeAttr(r.stateOfMatterAndTemp)}</td>
          <td style="${tdCss}">
            <input data-t3-notes value="${escapeAttr(r.studentNotes)}" placeholder="Conclusion notes..." style="${cellInputCss} min-width:130px;" />
          </td>
        </tr>
      `,
      )
      .join('');

    this.bodyEl.innerHTML = `
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="${thCss}">Station</th>
            <th style="${thCss}">Investigation Item / Trial</th>
            <th style="${thCss}">Soluble in Water</th>
            <th style="${thCss}">Dissolving Race Variable &amp; Time</th>
            <th style="${thCss}">State of Matter &amp; Temp</th>
            <th style="${thCss}">Student Notes</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    this.bodyEl.querySelectorAll('tr[data-t3-id]').forEach((tr) => {
      const entryId = Number(tr.getAttribute('data-t3-id'));
      const input = tr.querySelector('[data-t3-notes]') as HTMLInputElement | null;
      input?.addEventListener('input', () => {
        this.callbacks.onUpdateSolutionsRow(entryId, { studentNotes: input.value });
      });
    });
  }

  private downloadBlob(content: string, mime: string, filename: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
