/**
 * MATTERVERSE: 10-STATION GRADE 5 MATTER & SOLUTIONS LABORATORY
 * Application Entry Point — Mounts the sunlit two-wing interactive 3D science laboratory.
 */

import { MatterLabWorld } from './worlds/MatterLabWorld';

function mountMatterverse(): void {
  const canvas = document.getElementById('viewport-canvas') as HTMLCanvasElement | null;
  const hudRoot = document.getElementById('hud-root') as HTMLElement | null;

  if (!canvas || !hudRoot) {
    return;
  }

  try {
    const world = new MatterLabWorld(canvas, hudRoot);
    window.addEventListener('beforeunload', () => {
      world.dispose();
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to initialize 3D WebGL context.';
    hudRoot.innerHTML = `
      <div class="interactive-panel" style="
        max-width: 540px;
        margin: 64px auto;
        padding: 24px;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid #f87171;
        color: #f8fafc;
        line-height: 1.5;
      ">
        <h2 style="color: #fca5a5; margin-bottom: 8px;">Graphics Context Required</h2>
        <p>${message}</p>
      </div>
    `;
  }
}

mountMatterverse();
