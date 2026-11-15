/**
 * Two-State Camera & Explorer Controller for MATTERVERSE 10-Station Research Hall:
 *  - State A (Lab Roam Mode): Walk 3D Junior Science Explorer + ATOM-5 across the 34m x 24m hall
 *    via WASD/Arrows, Q/E + on-screen Turn Left/Right buttons, or click-to-walk station selection.
 *  - State B (Station Focus Mode): Smooth camera fly-in onto the selected station workbench with
 *    free 360° orbit and +/-/wheel zoom, plus clickable voluntary ATOM-5 companion.
 */

import * as THREE from 'three';
import type { StationFocusId, StationMetadata } from '../engine/LabPropBuilder';
import type { MaterialFactory } from '../engine/MaterialFactory';
import type { LabNavigationMode, LabStationId } from '../science/MatterEngine';

export type CameraViewMode = 'first_person' | 'third_person';
export type Atom5Mood = 'happy' | 'curious' | 'alert' | 'celebrate';

export interface PlayerControllerOptions {
  readonly camera: THREE.PerspectiveCamera;
  readonly domElement: HTMLElement;
  readonly scene: THREE.Scene;
  readonly materials: MaterialFactory;
  readonly stations: Record<StationFocusId, StationMetadata>;
  readonly interactiveMeshes: readonly THREE.Object3D[];
  readonly obstacleBoxes: ReadonlyArray<{
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }>;
  readonly onStationSelected?: (stationId: LabStationId) => void;
  readonly onAtom5Clicked?: () => void;
  readonly onNavigationModeChange?: (
    mode: LabNavigationMode,
    stationId: LabStationId | null,
  ) => void;
  readonly onCameraModeChange?: (mode: CameraViewMode) => void;
}

export class PlayerController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLElement;
  private readonly stations: Record<StationFocusId, StationMetadata>;
  private readonly interactiveMeshes: readonly THREE.Object3D[];
  private readonly obstacleBoxes: ReadonlyArray<{
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }>;
  private readonly onStationSelected?: (stationId: LabStationId) => void;
  private readonly onAtom5Clicked?: () => void;
  private readonly onNavigationModeChange?: (
    mode: LabNavigationMode,
    stationId: LabStationId | null,
  ) => void;
  private readonly onCameraModeChange?: (mode: CameraViewMode) => void;

  // Navigation & Camera State
  private cameraViewMode: CameraViewMode = 'third_person';
  private navMode: LabNavigationMode = 'roam';
  private focusedStation: LabStationId | null = null;
  private walkToStationPending: LabStationId | null = null;

  // Player ground coordinates & facing angles (State A: Roam)
  private readonly playerPos = new THREE.Vector3(0, 0, 10.2);
  private yaw = 0; // Facing -Z (North down central promenade)
  private pitch = -0.16;

  // Station Focus 360° Orbit & Zoom (State B: Station Focus)
  private orbitAzimuth = Math.PI / 2;
  private orbitPolar = 1.08;
  private orbitRadius = 1.65;
  private continuousTurnDir: -1 | 0 | 1 = 0;

  // Camera smoothing targets
  private readonly currentCamPos = new THREE.Vector3(0, 3.2, 12.2);
  private readonly currentLookAt = new THREE.Vector3(0, 1.15, 2.0);
  private readonly targetCamPos = new THREE.Vector3(0, 3.2, 12.2);
  private readonly targetLookAt = new THREE.Vector3(0, 1.15, 2.0);

  // Input tracking
  private readonly keys = new Set<string>();
  private pointerDown = false;
  private pointerMovedDist = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();

  // Stylized Explorer Avatar & ATOM-5 Companion Robot
  private readonly explorerGroup = new THREE.Group();
  private explorerLeftArm!: THREE.Mesh;
  private explorerRightArm!: THREE.Mesh;
  private explorerLeftLeg!: THREE.Mesh;
  private explorerRightLeg!: THREE.Mesh;

  private readonly atom5Group = new THREE.Group();
  private atom5OuterRing!: THREE.Mesh;
  private atom5InnerRing!: THREE.Mesh;
  private atom5VisorCanvas!: HTMLCanvasElement;
  private atom5VisorTex!: THREE.CanvasTexture;
  private atom5Mood: Atom5Mood = 'happy';
  private lastDrawnMood: Atom5Mood | null = null;
  private readonly atom5TargetPos = new THREE.Vector3(1.15, 1.72, 9.5);

  private walkCycle = 0;

  // Bound event listeners
  private readonly handleKeyDownBound: (e: KeyboardEvent) => void;
  private readonly handleKeyUpBound: (e: KeyboardEvent) => void;
  private readonly handlePointerDownBound: (e: PointerEvent) => void;
  private readonly handlePointerMoveBound: (e: PointerEvent) => void;
  private readonly handlePointerUpBound: (e: PointerEvent) => void;
  private readonly handleWheelBound: (e: WheelEvent) => void;

  constructor(opts: PlayerControllerOptions) {
    this.camera = opts.camera;
    this.domElement = opts.domElement;
    this.stations = opts.stations;
    this.interactiveMeshes = opts.interactiveMeshes;
    this.obstacleBoxes = opts.obstacleBoxes;
    if (opts.onStationSelected) this.onStationSelected = opts.onStationSelected;
    if (opts.onAtom5Clicked) this.onAtom5Clicked = opts.onAtom5Clicked;
    if (opts.onNavigationModeChange) this.onNavigationModeChange = opts.onNavigationModeChange;
    if (opts.onCameraModeChange) this.onCameraModeChange = opts.onCameraModeChange;

    this.buildExplorerAvatar(opts.materials);
    this.buildAtom5Companion(opts.materials);
    opts.scene.add(this.explorerGroup);
    opts.scene.add(this.atom5Group);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);

    this.handleKeyDownBound = (e) => this.onKeyDown(e);
    this.handleKeyUpBound = (e) => this.onKeyUp(e);
    this.handlePointerDownBound = (e) => this.onPointerDown(e);
    this.handlePointerMoveBound = (e) => this.onPointerMove(e);
    this.handlePointerUpBound = (e) => this.onPointerUp(e);
    this.handleWheelBound = (e) => this.onWheel(e);

    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    this.domElement.addEventListener('pointerdown', this.handlePointerDownBound);
    this.domElement.addEventListener('wheel', this.handleWheelBound, { passive: false });
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound);
  }

  public getCameraMode(): CameraViewMode {
    return this.cameraViewMode;
  }

  public toggleCameraMode(): CameraViewMode {
    this.setCameraMode(this.cameraViewMode === 'first_person' ? 'third_person' : 'first_person');
    return this.cameraViewMode;
  }

  public setCameraMode(nextMode: CameraViewMode): void {
    this.cameraViewMode = nextMode;
    this.explorerGroup.visible = nextMode === 'third_person' && this.navMode === 'roam';
    this.onCameraModeChange?.(nextMode);
  }

  public getNavigationMode(): LabNavigationMode {
    return this.navMode;
  }

  public getFocusedStation(): LabStationId | null {
    return this.focusedStation;
  }

  public setAtom5Mood(mood: Atom5Mood): void {
    this.atom5Mood = mood;
  }

  /**
   * Continuous Smartboard Turn / Orbit button hold handler.
   * `+1` turns/orbits Left, `-1` turns/orbits Right, `0` stops.
   */
  public setContinuousTurn(dir: -1 | 0 | 1): void {
    this.continuousTurnDir = dir;
  }

  /** Single-click Smartboard turn or orbit step */
  public stepTurn(dir: -1 | 1): void {
    const step = 0.28 * dir;
    if (this.navMode === 'station_focus') {
      this.orbitAzimuth -= step;
    } else {
      this.yaw += step;
    }
  }

  /** Zooms closer (negative delta) or farther (positive delta) in Station Focus Mode */
  public zoomBy(deltaRadius: number): void {
    if (this.navMode !== 'station_focus') return;
    this.orbitRadius = THREE.MathUtils.clamp(this.orbitRadius + deltaRadius, 0.78, 2.85);
  }

  /** Smoothly walks the Explorer to the selected bench (if in Roam) and flies camera in */
  public walkToAndFocusStation(stationId: LabStationId): void {
    if (this.navMode === 'station_focus') {
      this.jumpToStationFocus(stationId);
      return;
    }
    const meta = this.stations[stationId];
    const dist = Math.hypot(
      meta.walkTarget.x - this.playerPos.x,
      meta.walkTarget.z - this.playerPos.z,
    );
    if (dist < 0.35) {
      this.enterStationFocus(stationId);
    } else {
      this.walkToStationPending = stationId;
    }
  }

  /** Instant/direct camera fly-in for Teacher Quick-Jump or switching between stations */
  public jumpToStationFocus(stationId: LabStationId): void {
    this.walkToStationPending = null;
    const meta = this.stations[stationId];
    this.playerPos.set(meta.walkTarget.x, 0, meta.walkTarget.z);
    this.yaw = meta.walkYaw;
    this.pitch = -0.2;
    this.enterStationFocus(stationId);
  }

  /** Smoothly steps back from Station Focus Mode into Lab Roam Mode */
  public exitStationFocus(): void {
    if (this.navMode === 'roam') return;
    this.walkToStationPending = null;
    this.navMode = 'roam';
    this.focusedStation = null;
    this.pitch = -0.18;
    this.explorerGroup.visible = this.cameraViewMode === 'third_person';
    this.onNavigationModeChange?.('roam', null);
  }

  /** Returns to central sunlit research hall overview in Roam Mode */
  public jumpToOverview(): void {
    this.walkToStationPending = null;
    this.navMode = 'roam';
    this.focusedStation = null;
    const meta = this.stations.overview;
    this.playerPos.copy(meta.walkTarget);
    this.yaw = meta.walkYaw;
    this.pitch = -0.16;
    this.explorerGroup.visible = this.cameraViewMode === 'third_person';
    this.onNavigationModeChange?.('roam', null);
  }

  public update(deltaSeconds: number, timeSeconds: number, simulationFrozen: boolean): void {
    const dt = Math.min(deltaSeconds, 0.05);

    // 1. Continuous turning / orbiting from Q/E keys or on-screen Turn buttons
    let turnInput = this.continuousTurnDir;
    if (this.keys.has('KeyQ')) turnInput += 1;
    if (this.keys.has('KeyE')) turnInput -= 1;

    if (turnInput !== 0) {
      const turnRate = 1.65;
      if (this.navMode === 'station_focus') {
        this.orbitAzimuth -= Math.sign(turnInput) * turnRate * dt;
      } else {
        this.yaw += Math.sign(turnInput) * turnRate * dt;
      }
    }

    // 2. State A (Roam) Movement — either WASD/Arrows OR automatic click-to-walk
    let isMoving = false;
    if (this.navMode === 'roam') {
      let moveForward = 0;
      let moveRight = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveForward += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveForward -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveRight += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveRight -= 1;

      if (moveForward !== 0 || moveRight !== 0) {
        // Manual movement cancels click-to-walk
        this.walkToStationPending = null;
        isMoving = true;

        const forwardX = -Math.sin(this.yaw);
        const forwardZ = -Math.cos(this.yaw);
        const rightX = Math.cos(this.yaw);
        const rightZ = -Math.sin(this.yaw);

        const dirX = forwardX * moveForward + rightX * moveRight;
        const dirZ = forwardZ * moveForward + rightZ * moveRight;
        const len = Math.hypot(dirX, dirZ) || 1;
        const speed = 3.85;

        const nextX = this.playerPos.x + (dirX / len) * speed * dt;
        const nextZ = this.playerPos.z + (dirZ / len) * speed * dt;

        if (!this.isPointBlocked(nextX, this.playerPos.z)) {
          this.playerPos.x = nextX;
        }
        if (!this.isPointBlocked(this.playerPos.x, nextZ)) {
          this.playerPos.z = nextZ;
        }
      } else if (this.walkToStationPending) {
        const targetMeta = this.stations[this.walkToStationPending];
        const dx = targetMeta.walkTarget.x - this.playerPos.x;
        const dz = targetMeta.walkTarget.z - this.playerPos.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= 0.24) {
          const arrivedId = this.walkToStationPending;
          this.walkToStationPending = null;
          this.playerPos.set(targetMeta.walkTarget.x, 0, targetMeta.walkTarget.z);
          this.yaw = targetMeta.walkYaw;
          this.enterStationFocus(arrivedId);
        } else {
          isMoving = true;
          const speed = 4.6;
          const step = Math.min(dist, speed * dt);
          const nx = this.playerPos.x + (dx / dist) * step;
          const nz = this.playerPos.z + (dz / dist) * step;

          // Steer cleanly around benches via promenade lane (x = 0) if needed
          if (!this.isPointBlocked(nx, nz)) {
            this.playerPos.set(nx, 0, nz);
          } else {
            // Pull back toward central promenade if skirting another bench
            const steerX = this.playerPos.x + Math.sign(0 - this.playerPos.x) * speed * dt;
            if (!this.isPointBlocked(steerX, this.playerPos.z)) {
              this.playerPos.x = steerX;
            }
            if (!this.isPointBlocked(this.playerPos.x, nz)) {
              this.playerPos.z = nz;
            }
          }

          const desiredYaw = Math.atan2(-dx, -dz);
          const diff = Math.atan2(Math.sin(desiredYaw - this.yaw), Math.cos(desiredYaw - this.yaw));
          this.yaw += diff * Math.min(1, dt * 8.0);
        }
      }
    }

    if (isMoving) {
      this.walkCycle += dt * 9.8;
    } else {
      this.walkCycle = THREE.MathUtils.lerp(this.walkCycle, 0, 0.14);
    }

    // 3. Explorer avatar transforms & limb swing
    this.explorerGroup.visible =
      this.navMode === 'roam' && this.cameraViewMode === 'third_person';
    this.explorerGroup.position.copy(this.playerPos);
    this.explorerGroup.rotation.y = this.yaw;
    const swing = isMoving ? Math.sin(this.walkCycle) * 0.48 : 0;
    this.explorerLeftArm.rotation.x = swing;
    this.explorerRightArm.rotation.x = -swing;
    this.explorerLeftLeg.rotation.x = -swing;
    this.explorerRightLeg.rotation.x = swing;

    // 4. Camera Target Computation (State A Roam vs State B Station Focus)
    if (this.navMode === 'station_focus' && this.focusedStation) {
      const meta = this.stations[this.focusedStation];
      const sinP = Math.sin(this.orbitPolar);
      const cosP = Math.cos(this.orbitPolar);
      const ox = Math.sin(this.orbitAzimuth) * sinP * this.orbitRadius;
      const oy = cosP * this.orbitRadius;
      const oz = Math.cos(this.orbitAzimuth) * sinP * this.orbitRadius;

      this.targetCamPos.set(
        meta.orbitTarget.x + ox,
        Math.max(0.95, meta.orbitTarget.y + oy),
        meta.orbitTarget.z + oz,
      );
      this.targetLookAt.copy(meta.orbitTarget);

      // ATOM-5 hovers beside the bench corner without blocking glassware
      const sideSign = meta.anchorPosition.x < 0 ? 1 : -1;
      this.atom5TargetPos.set(
        meta.anchorPosition.x + sideSign * 0.55,
        1.72,
        meta.anchorPosition.z + 1.05,
      );
    } else {
      const lookDirX = -Math.sin(this.yaw) * Math.cos(this.pitch);
      const lookDirY = Math.sin(this.pitch);
      const lookDirZ = -Math.cos(this.yaw) * Math.cos(this.pitch);

      if (this.cameraViewMode === 'first_person') {
        this.targetCamPos.set(this.playerPos.x, 1.56, this.playerPos.z);
        this.targetLookAt.set(
          this.targetCamPos.x + lookDirX * 3.0,
          this.targetCamPos.y + lookDirY * 3.0,
          this.targetCamPos.z + lookDirZ * 3.0,
        );
      } else {
        const followDist = 2.65;
        this.targetCamPos.set(
          this.playerPos.x - lookDirX * followDist,
          Math.max(1.25, 1.85 - lookDirY * 1.35),
          this.playerPos.z - lookDirZ * followDist,
        );
        this.targetLookAt.set(
          this.playerPos.x + lookDirX * 1.6,
          1.25 + lookDirY * 0.6,
          this.playerPos.z + lookDirZ * 1.6,
        );
      }

      // ATOM-5 flies smoothly near the Explorer's right shoulder
      this.atom5TargetPos.set(
        this.playerPos.x + Math.cos(this.yaw) * 0.92 - Math.sin(this.yaw) * 0.35,
        1.68,
        this.playerPos.z - Math.sin(this.yaw) * 0.92 - Math.cos(this.yaw) * 0.35,
      );
    }

    const damp = 1 - Math.exp(-8.2 * dt);
    this.currentCamPos.lerp(this.targetCamPos, damp);
    this.currentLookAt.lerp(this.targetLookAt, damp);
    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);

    // 5. ATOM-5 Companion hover & gyroscopic rings
    this.atom5Group.position.lerp(this.atom5TargetPos, 1 - Math.exp(-5.0 * dt));
    if (!simulationFrozen) {
      this.atom5Group.position.y += Math.sin(timeSeconds * 2.6) * 0.0024;
      this.atom5OuterRing.rotation.z += dt * 1.65;
      this.atom5OuterRing.rotation.x = Math.sin(timeSeconds * 1.3) * 0.35;
      this.atom5InnerRing.rotation.y -= dt * 2.25;
    }
    this.atom5Group.lookAt(
      this.camera.position.x,
      this.atom5Group.position.y,
      this.camera.position.z,
    );
    this.updateAtom5VisorCanvas();
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    this.domElement.removeEventListener('pointerdown', this.handlePointerDownBound);
    this.domElement.removeEventListener('wheel', this.handleWheelBound);
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
    this.atom5VisorTex.dispose();
  }

  // ============================================================================
  // PRIVATE STATE TRANSITIONS, INPUT & COLLISION
  // ============================================================================

  private enterStationFocus(stationId: LabStationId): void {
    const meta = this.stations[stationId];
    this.navMode = 'station_focus';
    this.focusedStation = stationId;
    this.orbitAzimuth = meta.defaultOrbitAzimuth;
    this.orbitPolar = meta.defaultOrbitPolar;
    this.orbitRadius = meta.defaultOrbitRadius;
    this.explorerGroup.visible = false;
    this.onNavigationModeChange?.('station_focus', stationId);
    this.onStationSelected?.(stationId);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    this.keys.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.button !== 2) return;
    this.pointerDown = true;
    this.pointerMovedDist = 0;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.pointerDown) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerMovedDist += Math.hypot(dx, dy);

    if (this.pointerMovedDist > 6) {
      if (this.navMode === 'station_focus') {
        // Free 360° orbit around focused bench
        this.orbitAzimuth -= dx * 0.0062;
        this.orbitPolar = THREE.MathUtils.clamp(this.orbitPolar - dy * 0.0048, 0.34, 1.42);
      } else {
        // Free look in Roam Mode
        this.yaw -= dx * 0.0045;
        this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0038, -0.85, 0.52);
      }
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointerDown) return;
    this.pointerDown = false;

    if (e.button === 0 && this.pointerMovedDist < 7) {
      const rect = this.domElement.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);

      // 1. Check voluntary ATOM-5 click first
      const atomHits = this.raycaster.intersectObject(this.atom5Group, true);
      if (atomHits.length > 0) {
        this.onAtom5Clicked?.();
        return;
      }

      // 2. Check station workbenches / overhead placards
      const hits = this.raycaster.intersectObjects([...this.interactiveMeshes], true);
      const firstHit = hits[0];
      if (firstHit) {
        let cur: THREE.Object3D | null = firstHit.object;
        while (cur) {
          const stationId = cur.userData['stationId'] as StationFocusId | undefined;
          if (stationId && stationId !== 'overview') {
            this.walkToAndFocusStation(stationId);
            break;
          }
          cur = cur.parent;
        }
      }
    }
  }

  private onWheel(e: WheelEvent): void {
    if (this.navMode === 'station_focus') {
      e.preventDefault();
      this.zoomBy(e.deltaY * 0.0018);
    }
  }

  private isPointBlocked(x: number, z: number): boolean {
    if (Math.abs(x) > 15.6 || Math.abs(z) > 11.2) {
      return true;
    }
    const margin = 0.36;
    for (const box of this.obstacleBoxes) {
      if (
        x >= box.minX - margin &&
        x <= box.maxX + margin &&
        z >= box.minZ - margin &&
        z <= box.maxZ + margin
      ) {
        return true;
      }
    }
    return false;
  }

  // ============================================================================
  // AVATAR & ATOM-5 COMPANION GEOMETRY
  // ============================================================================

  private buildExplorerAvatar(materials: MaterialFactory): void {
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.38,
      metalness: 0.14,
    });
    const coatMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.65,
      metalness: 0.05,
    });
    const trimMat = materials.getStandardMaterial('anodizedDark', 1, 1);
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      roughness: 0.08,
      metalness: 0.25,
      clearcoat: 1.0,
    });

    // Helmet via LatheGeometry
    const helmetPts = [
      new THREE.Vector2(0.08, 1.3),
      new THREE.Vector2(0.15, 1.38),
      new THREE.Vector2(0.155, 1.52),
      new THREE.Vector2(0.11, 1.62),
      new THREE.Vector2(0, 1.65),
    ];
    const helmet = new THREE.Mesh(new THREE.LatheGeometry(helmetPts, 24), suitMat);
    helmet.castShadow = true;
    this.explorerGroup.add(helmet);

    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 18, 12, 0, Math.PI, 0.3, 1.2),
      visorMat,
    );
    visor.position.set(0, 1.48, -0.055);
    visor.rotation.y = Math.PI;
    this.explorerGroup.add(visor);

    // Lab Jacket Torso & Field Backpack
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.34, 8, 16), coatMat);
    torso.position.y = 1.02;
    torso.castShadow = true;
    this.explorerGroup.add(torso);

    const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 6, 12), trimMat);
    pack.position.set(0, 1.04, 0.16);
    pack.castShadow = true;
    this.explorerGroup.add(pack);

    // Articulated arms & legs
    const armGeo = new THREE.CapsuleGeometry(0.052, 0.28, 6, 10);
    armGeo.translate(0, -0.14, 0);
    this.explorerLeftArm = new THREE.Mesh(armGeo, coatMat);
    this.explorerLeftArm.position.set(-0.21, 1.18, 0);
    this.explorerRightArm = new THREE.Mesh(armGeo, coatMat);
    this.explorerRightArm.position.set(0.21, 1.18, 0);

    const legGeo = new THREE.CapsuleGeometry(0.064, 0.38, 6, 10);
    legGeo.translate(0, -0.24, 0);
    this.explorerLeftLeg = new THREE.Mesh(legGeo, trimMat);
    this.explorerLeftLeg.position.set(-0.085, 0.72, 0);
    this.explorerRightLeg = new THREE.Mesh(legGeo, trimMat);
    this.explorerRightLeg.position.set(0.085, 0.72, 0);

    this.explorerGroup.add(
      this.explorerLeftArm,
      this.explorerRightArm,
      this.explorerLeftLeg,
      this.explorerRightLeg,
    );
  }

  private buildAtom5Companion(materials: MaterialFactory): void {
    const shellMat = materials.getStandardMaterial('ceramicDish', 1, 1);
    const steelMat = materials.getStandardMaterial('brushedSteel', 1, 1);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x14b8a6,
      emissiveIntensity: 1.35,
      roughness: 0.2,
    });

    const bodyPts = [
      new THREE.Vector2(0.0, -0.14),
      new THREE.Vector2(0.11, -0.11),
      new THREE.Vector2(0.16, 0.0),
      new THREE.Vector2(0.135, 0.11),
      new THREE.Vector2(0.05, 0.15),
      new THREE.Vector2(0.0, 0.16),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 28), shellMat);
    body.castShadow = true;
    body.userData['isAtom5'] = true;
    this.atom5Group.add(body);

    this.atom5OuterRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.011, 10, 36), steelMat);
    this.atom5InnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.008, 10, 32), glowMat);
    this.atom5OuterRing.userData['isAtom5'] = true;
    this.atom5InnerRing.userData['isAtom5'] = true;
    this.atom5Group.add(this.atom5OuterRing, this.atom5InnerRing);

    for (const side of [-1, 1]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.09, 8), steelMat);
      stem.position.set(side * 0.085, 0.17, 0);
      stem.rotation.z = -side * 0.22;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), glowMat);
      tip.position.set(side * 0.098, 0.215, 0);
      this.atom5Group.add(stem, tip);
    }

    const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.08, 16), glowMat);
    thruster.rotation.x = Math.PI;
    thruster.position.y = -0.175;
    this.atom5Group.add(thruster);

    this.atom5VisorCanvas = document.createElement('canvas');
    this.atom5VisorCanvas.width = 256;
    this.atom5VisorCanvas.height = 128;
    this.atom5VisorTex = new THREE.CanvasTexture(this.atom5VisorCanvas);
    this.atom5VisorTex.colorSpace = THREE.SRGBColorSpace;

    const visorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.17, 0.085),
      new THREE.MeshBasicMaterial({ map: this.atom5VisorTex, transparent: true }),
    );
    visorPlane.position.set(0, 0.02, 0.156);
    visorPlane.userData['isAtom5'] = true;
    this.atom5Group.add(visorPlane);

    this.atom5Group.position.copy(this.atom5TargetPos);
    this.updateAtom5VisorCanvas();
  }

  private updateAtom5VisorCanvas(): void {
    if (this.lastDrawnMood === this.atom5Mood) return;
    this.lastDrawnMood = this.atom5Mood;

    const ctx = this.atom5VisorCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#06131f';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 120, 26);
    ctx.fill();
    ctx.strokeStyle = this.atom5Mood === 'alert' ? '#fbbf24' : '#2dd4bf';
    ctx.lineWidth = 6;
    ctx.stroke();

    const eyeColor =
      this.atom5Mood === 'alert'
        ? '#fbbf24'
        : this.atom5Mood === 'celebrate'
          ? '#4ade80'
          : '#38bdf8';

    ctx.fillStyle = eyeColor;
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    if (this.atom5Mood === 'celebrate') {
      for (const cx of [82, 174]) {
        ctx.beginPath();
        ctx.arc(cx, 68, 22, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    } else if (this.atom5Mood === 'curious' || this.atom5Mood === 'alert') {
      ctx.beginPath();
      ctx.arc(82, 64, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(174, 58, 22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(64, 44, 34, 40, 14);
      ctx.roundRect(158, 44, 34, 40, 14);
      ctx.fill();
    }

    this.atom5VisorTex.needsUpdate = true;
  }
}
