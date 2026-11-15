/**
 * Sunlit Two-Wing 10-Station Research Hall, Parametric Laboratory Equipment, and Dynamic
 * Granular/State Particle Builder for MATTERVERSE.
 * Zero external .glb/.3ds models: built 100% procedurally with LatheGeometry, TubeGeometry,
 * ExtrudeGeometry, InstancedMesh, and live CanvasTextures.
 */

import * as THREE from 'three';
import type { GraphicsQualityTier } from '../config/graphicsTiers';
import {
  LAB_STATION_CATALOG,
  type LabStationId,
  type Station1SpecimenId,
  STATION1_SPECIMENS,
  type Station1State,
  type Station2SpecimenId,
  STATION2_SPECIMENS,
  type Station2State,
  type Station3MagnetItemId,
  STATION3_MAGNET_ITEMS,
  type Station3ScentJarId,
  STATION3_SCENT_JARS,
  type Station3State,
  type Station4ObjectId,
  STATION4_OBJECTS,
  type Station4State,
  type Station5State,
  type Station6CategoryId,
  type Station6State,
  type Station7State,
  type Station8State,
  type Station9State,
  type Station10State,
} from '../science/MatterEngine';
import { formatGrade5Temperature } from '../science/SCIENCE_RULES';
import type { MaterialFactory } from './MaterialFactory';

export type StationFocusId = 'overview' | LabStationId;

export interface StationMetadata {
  readonly id: StationFocusId;
  readonly stationId?: LabStationId;
  readonly label: string;
  readonly anchorPosition: THREE.Vector3;
  readonly walkTarget: THREE.Vector3;
  readonly walkYaw: number;
  readonly orbitTarget: THREE.Vector3;
  readonly defaultOrbitAzimuth: number;
  readonly defaultOrbitPolar: number;
  readonly defaultOrbitRadius: number;
  readonly cameraPosition: THREE.Vector3;
  readonly lookTarget: THREE.Vector3;
}

export interface StationTransientAnims {
  scratchPulse: number;
  waftPulse: number;
  tweezersPulse: number;
  magnetSweepPulse: number;
  sieveShakePulse: number;
  filterPourPulse: number;
  evaporatePulse: number;
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function createGraduationTexture(maxMl: number, labelText: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.96)';
    ctx.lineWidth = 3;
    ctx.font = 'bold 19px system-ui, sans-serif';

    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const y = 232 - i * 38;
      ctx.beginPath();
      ctx.moveTo(192, y);
      ctx.lineTo(252, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(192, y + 19);
      ctx.lineTo(222, y + 19);
      ctx.stroke();

      const val = Math.round((maxMl / steps) * i);
      ctx.fillText(`${val} mL`, 262, y + 7);
    }

    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
    ctx.fillText(labelText, 168, 26);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createPlacardTexture(title: string, subtitle: string, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(6, 6, 628, 148, 18);
    ctx.fill();

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(subtitle, 28, 50);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(title, 28, 108);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class LabPropBuilder {
  public readonly root = new THREE.Group();
  public readonly interactiveMeshes: THREE.Object3D[] = [];
  public readonly stations: Record<StationFocusId, StationMetadata>;
  public readonly obstacleBoxes: Array<{
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }> = [];

  private readonly materials: MaterialFactory;
  private readonly glassMeshes: THREE.Mesh[] = [];
  private readonly disposableTextures: THREE.Texture[] = [];
  private qualityTier: GraphicsQualityTier;
  private particleVisionEnabled = false;

  private selectionRing!: THREE.Mesh;

  // Station 1 refs
  private s1SpecimenMeshes = new Map<Station1SpecimenId, THREE.Object3D>();
  private s1MagnifierGroup = new THREE.Group();

  // Station 2 refs
  private s2ScratchGrooves = new Map<Station2SpecimenId, THREE.Mesh[]>();
  private s2ToolGroup = new THREE.Group();
  private s2PennyMesh!: THREE.Mesh;
  private s2NailMesh!: THREE.Mesh;

  // Station 3 refs
  private s3MagnetItems = new Map<Station3MagnetItemId, THREE.Object3D>();
  private s3MagnetBar = new THREE.Group();
  private s3WaftPlumes: THREE.Mesh[] = [];
  private s3JarPositions = new Map<Station3ScentJarId, THREE.Vector3>();

  // Station 4 refs
  private s4ObjectMeshes = new Map<Station4ObjectId, THREE.Object3D>();
  private s4WaterColumn!: THREE.Mesh;
  private s4MeniscusMesh!: THREE.Mesh;
  private s4BalanceCanvas!: HTMLCanvasElement;
  private s4BalanceTex!: THREE.CanvasTexture;
  private lastS4BalanceSig = '';

  // Station 5 refs
  private s5IceBlock!: THREE.Mesh;
  private s5LiquidPool!: THREE.Mesh;
  private s5BoilingBubbles!: THREE.InstancedMesh;
  private s5VaporVision!: THREE.InstancedMesh;
  private s5UpperMist!: THREE.InstancedMesh;
  private s5VisionLattice!: THREE.InstancedMesh;
  private s5ThermalCanvas!: HTMLCanvasElement;
  private s5ThermalTex!: THREE.CanvasTexture;
  private lastS5Sig = '';

  // Station 6 refs
  private s6PieceMeshes = new Map<string, THREE.Mesh>();
  private s6TweezersGroup = new THREE.Group();

  // Station 7 refs
  private s7SandInstances!: THREE.InstancedMesh;
  private s7IronTrayInstances!: THREE.InstancedMesh;
  private s7IronMagnetInstances!: THREE.InstancedMesh;
  private s7IronDishInstances!: THREE.InstancedMesh;
  private s7MagnetGroup = new THREE.Group();

  // Station 8 refs
  private s8SieveBasket = new THREE.Group();
  private s8CupGrains!: THREE.InstancedMesh;
  private s8GravelInstances!: THREE.InstancedMesh;
  private s8CatchSandInstances!: THREE.InstancedMesh;

  // Station 9 refs
  private s9BeakerLiquid!: THREE.Mesh;
  private s9BeakerSand!: THREE.InstancedMesh;
  private s9BeakerSaltVision!: THREE.InstancedMesh;
  private s9FilterSand!: THREE.InstancedMesh;
  private s9DishLiquid!: THREE.Mesh;
  private s9DishSaltCrystals!: THREE.InstancedMesh;
  private s9DishSaltVision!: THREE.InstancedMesh;
  private s9CondenserWater!: THREE.Mesh;
  private s9HotPlateGlowMat!: THREE.MeshStandardMaterial;
  private s9BoilingBubbles!: THREE.InstancedMesh;
  private s9VaporVision!: THREE.InstancedMesh;
  private s9UpperMist!: THREE.InstancedMesh;
  private s9HotPlateCanvas!: HTMLCanvasElement;
  private s9HotPlateTex!: THREE.CanvasTexture;
  private lastS9Sig = '';

  // Station 10 refs
  private s10PartASaltCrystals!: THREE.InstancedMesh;
  private s10PartASaltVision!: THREE.InstancedMesh;
  private s10PartASugarCrystals!: THREE.InstancedMesh;
  private s10PartASugarVision!: THREE.InstancedMesh;
  private s10PartASandGrains!: THREE.InstancedMesh;
  private s10PartAPepperSpecks!: THREE.InstancedMesh;

  private s10BeakerARingMat!: THREE.MeshStandardMaterial;
  private s10BeakerBRingMat!: THREE.MeshStandardMaterial;
  private s10StirRodA!: THREE.Mesh;
  private s10StirRodB!: THREE.Mesh;
  private s10CrystalARemain!: THREE.InstancedMesh;
  private s10CrystalBRemain!: THREE.InstancedMesh;
  private s10CoarseCubeA!: THREE.Mesh;
  private s10CoarseCubeB!: THREE.Mesh;
  private s10VisionSaltA!: THREE.InstancedMesh;
  private s10VisionSaltB!: THREE.InstancedMesh;
  private s10StopwatchCanvas!: HTMLCanvasElement;
  private s10StopwatchTex!: THREE.CanvasTexture;
  private lastS10Sig = '';

  private readonly dummy = new THREE.Object3D();

  constructor(materials: MaterialFactory) {
    this.materials = materials;
    this.qualityTier = materials.getTier();

    this.stations = this.createStationMetadata();
    this.buildSunlitResearchHall();
    this.buildAllTenBenches();
    this.buildSelectionRing();

    // Register Wing A Stations (1–5) & Wing B Stations (6–10)
    this.buildStation1();
    this.buildStation2();
    this.buildStation3();
    this.buildStation4();
    this.buildStation5();
    this.buildStation6();
    this.buildStation7();
    this.buildStation8();
    this.buildStation9();
    this.buildStation10();
  }

  public highlightStation(stationId: StationFocusId): void {
    if (stationId === 'overview') {
      this.selectionRing.visible = false;
      return;
    }
    const meta = this.stations[stationId];
    this.selectionRing.visible = true;
    this.selectionRing.position.set(meta.anchorPosition.x, 0.02, meta.anchorPosition.z);
  }

  public setParticleVision(enabled: boolean): void {
    this.particleVisionEnabled = enabled;
  }

  public setQualityTier(tier: GraphicsQualityTier): void {
    this.qualityTier = tier;
  }

  public onGlassMaterialReplaced(oldMat: THREE.Material, newMat: THREE.Material): void {
    for (const mesh of this.glassMeshes) {
      if (mesh.material === oldMat) {
        mesh.material = newMat;
      }
    }
  }

  /**
   * Synchronizes all 10 interactive stations' 3D physical reactions, instanced particles,
   * meniscus levels, scratch grooves, and live LCD screens from MatterEngine state.
   */
  public syncFromEngine(params: {
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
    anims: StationTransientAnims;
    simTimeSeconds: number;
  }): void {
    const t = params.simTimeSeconds;
    const { anims } = params;

    if (this.selectionRing.visible) {
      const mat = this.selectionRing.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + Math.sin(t * 3.5) * 0.14;
    }

    this.syncStation1(params.station1, t);
    this.syncStation2(params.station2, anims.scratchPulse);
    this.syncStation3(params.station3, anims.waftPulse, t);
    this.syncStation4(params.station4, t);
    this.syncStation5(params.station5, t);
    this.syncStation6(params.station6, anims.tweezersPulse, t);
    this.syncStation7(params.station7, anims.magnetSweepPulse, t);
    this.syncStation8(params.station8, anims.sieveShakePulse, t);
    this.syncStation9(params.station9, anims.filterPourPulse, anims.evaporatePulse, t);
    this.syncStation10(params.station10, t);
  }

  public dispose(): void {
    for (const tex of this.disposableTextures) {
      tex.dispose();
    }
    this.disposableTextures.length = 0;

    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
  }

  // ============================================================================
  // STATION COORDINATES & CAMERA FRAMING
  // ============================================================================

  private createStationMetadata(): Record<StationFocusId, StationMetadata> {
    const wingAZ = [-8.4, -4.2, 0.0, 4.2, 8.4];
    const wingBZ = [-8.4, -4.2, 0.0, 4.2, 8.4];

    const wingAIds: LabStationId[] = [
      'station_1_luster_texture',
      'station_2_hardness_scratch',
      'station_3_magnetism_wafting',
      'station_4_mass_volume',
      'station_5_thermal_states',
    ];
    const wingBIds: LabStationId[] = [
      'station_6_tweezers_sorting',
      'station_7_iron_sand_magnet',
      'station_8_sand_gravel_sieve',
      'station_9_filtration_evaporation',
      'station_10_solutions_dissolving',
    ];

    const map = {
      overview: {
        id: 'overview',
        label: 'Lab Hall Overview',
        anchorPosition: new THREE.Vector3(0, 0, 0),
        walkTarget: new THREE.Vector3(0, 0, 10.2),
        walkYaw: 0,
        orbitTarget: new THREE.Vector3(0, 1.1, -1.5),
        defaultOrbitAzimuth: 0,
        defaultOrbitPolar: 1.25,
        defaultOrbitRadius: 11,
        cameraPosition: new THREE.Vector3(0, 3.6, 12.2),
        lookTarget: new THREE.Vector3(0, 1.1, -1.5),
      },
    } as Record<StationFocusId, StationMetadata>;

    wingAIds.forEach((id, i) => {
      const z = wingAZ[i] ?? 0;
      const x = -7.5;
      const desc = LAB_STATION_CATALOG[id];
      map[id] = {
        id,
        stationId: id,
        label: desc.shortLabel,
        anchorPosition: new THREE.Vector3(x, 0, z),
        walkTarget: new THREE.Vector3(x + 2.05, 0, z),
        walkYaw: Math.PI / 2, // Facing -X toward Wing A bench
        orbitTarget: new THREE.Vector3(x, 1.06, z),
        defaultOrbitAzimuth: Math.PI / 2,
        defaultOrbitPolar: 1.08,
        defaultOrbitRadius: 1.65,
        cameraPosition: new THREE.Vector3(x + 1.45, 1.65, z),
        lookTarget: new THREE.Vector3(x, 1.06, z),
      };
    });

    wingBIds.forEach((id, i) => {
      const z = wingBZ[i] ?? 0;
      const x = 7.5;
      const desc = LAB_STATION_CATALOG[id];
      map[id] = {
        id,
        stationId: id,
        label: desc.shortLabel,
        anchorPosition: new THREE.Vector3(x, 0, z),
        walkTarget: new THREE.Vector3(x - 2.05, 0, z),
        walkYaw: -Math.PI / 2, // Facing +X toward Wing B bench
        orbitTarget: new THREE.Vector3(x, 1.06, z),
        defaultOrbitAzimuth: -Math.PI / 2,
        defaultOrbitPolar: 1.08,
        defaultOrbitRadius: 1.68,
        cameraPosition: new THREE.Vector3(x - 1.48, 1.68, z),
        lookTarget: new THREE.Vector3(x, 1.06, z),
      };
    });

    return map;
  }

  // ============================================================================
  // SUNLIT TWO-WING ARCHITECTURAL HALL & BENCH CHASSIS
  // ============================================================================

  private buildSunlitResearchHall(): void {
    const floorMat = this.materials.getStandardMaterial('terrazzoFloor', 14, 10);
    const wallMat = this.materials.getStandardMaterial('labWallPanel', 8, 2);
    const steelMat = this.materials.getStandardMaterial('brushedSteel', 2, 1);
    const oakMat = this.materials.getStandardMaterial('oakWoodTrim', 4, 1);
    const skylightMat = this.materials.getStandardMaterial('skylightGlass', 2, 2);

    // 34m x 24m sunlit floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.root.add(floor);

    // Wide central promenade walkway accent strips
    const promenadeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.42,
      metalness: 0.05,
    });
    const promenade = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 21.5), promenadeMat);
    promenade.rotation.x = -Math.PI / 2;
    promenade.position.y = 0.005;
    promenade.receiveShadow = true;
    this.root.add(promenade);

    // Subtle Wing A (Sky Blue) and Wing B (Emerald Teal) floor lane stripes
    const wingALane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 19.5),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }),
    );
    wingALane.rotation.x = -Math.PI / 2;
    wingALane.position.set(-4.9, 0.008, 0);

    const wingBLane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 19.5),
      new THREE.MeshBasicMaterial({ color: 0x10b981 }),
    );
    wingBLane.rotation.x = -Math.PI / 2;
    wingBLane.position.set(4.9, 0.008, 0);
    this.root.add(wingALane, wingBLane);

    // Perimeter daylight walls (height 5.6m)
    const wallSpecs: Array<[number, number, number, number, number, number]> = [
      [0, 2.8, -12, 34, 5.6, 0.3], // North wall
      [0, 2.8, 12, 34, 5.6, 0.3], // South wall
      [-17, 2.8, 0, 0.3, 5.6, 24], // West wall (Wing A)
      [17, 2.8, 0, 0.3, 5.6, 24], // East wall (Wing B)
    ];
    for (const [x, y, z, w, h, d] of wallSpecs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, y, z);
      wall.receiveShadow = true;
      this.root.add(wall);
    }

    // Warm oak acoustic wainscoting bands along East/West walls
    for (const sx of [-16.82, 16.82]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 23.6), oakMat);
      band.position.set(sx, 0.55, 0);
      this.root.add(band);
    }

    // Ceiling & 3 large sunlit skylight bays
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5.6;
    this.root.add(ceiling);

    for (const z of [-6.8, 0, 6.8]) {
      const skylight = new THREE.Mesh(new THREE.PlaneGeometry(18, 3.6), skylightMat);
      skylight.rotation.x = Math.PI / 2;
      skylight.position.set(0, 5.56, z);
      this.root.add(skylight);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.14, 3.9), steelMat);
      frame.position.set(0, 5.59, z);
      this.root.add(frame);
    }

    // Overhead Wing A & Wing B Architectural Banners
    this.addWallBanner(
      -16.75,
      3.9,
      0,
      Math.PI / 2,
      'WING A: PROPERTIES & STATES OF MATTER',
      'Stations 1–5 • Florida Benchmarks SC.5.P.8.1 & SC.5.P.9.1',
      '#38bdf8',
    );
    this.addWallBanner(
      16.75,
      3.9,
      0,
      -Math.PI / 2,
      'WING B: MIXTURES, SEPARATION & SOLUTIONS',
      'Stations 6–10 • Florida Benchmarks SC.5.P.8.2 & SC.5.P.8.3',
      '#34d399',
    );
    this.addWallBanner(
      0,
      3.95,
      -11.75,
      0,
      'MATTERVERSE RESEARCH HALL',
      'Explore All 10 Interactive Stations • Click Any Workbench to Zoom In',
      '#fbbf24',
    );
  }

  private addWallBanner(
    x: number,
    y: number,
    z: number,
    rotY: number,
    title: string,
    sub: string,
    accent: string,
  ): void {
    const tex = createPlacardTexture(title, sub, accent);
    this.disposableTextures.push(tex);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.55),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    panel.position.set(x, y, z);
    panel.rotation.y = rotY;
    this.root.add(panel);
  }

  private buildAllTenBenches(): void {
    const epoxyMat = this.materials.getStandardMaterial('labBenchEpoxy', 2, 1);
    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);
    const oakMat = this.materials.getStandardMaterial('oakWoodTrim', 1, 1);

    for (const id of Object.keys(this.stations) as StationFocusId[]) {
      if (id === 'overview') continue;
      const meta = this.stations[id];
      const desc = LAB_STATION_CATALOG[id];
      const bx = meta.anchorPosition.x;
      const bz = meta.anchorPosition.z;
      const isWingA = bx < 0;
      const accentHex = isWingA ? '#38bdf8' : '#34d399';
      const accentColor = isWingA ? 0x0ea5e9 : 0x10b981;

      const benchGroup = new THREE.Group();
      benchGroup.position.set(bx, 0, bz);
      benchGroup.userData['stationId'] = id;

      // Table dimensions: 1.25 m along X (depth), 2.5 m along Z (width)
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 2.5), epoxyMat);
      topMesh.position.y = 0.88;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      topMesh.userData['stationId'] = id;
      benchGroup.add(topMesh);

      // Cabinet base + oak trim fascia
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.84, 2.34), oakMat);
      cab.position.y = 0.42;
      cab.castShadow = true;
      cab.receiveShadow = true;
      cab.userData['stationId'] = id;
      benchGroup.add(cab);

      // Brushed steel corner legs
      for (const lx of [-0.56, 0.56]) {
        for (const lz of [-1.18, 1.18]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.86, 12), steelMat);
          leg.position.set(lx, 0.43, lz);
          benchGroup.add(leg);
        }
      }

      // Glowing wing accent bar along promenade edge
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 2.38),
        new THREE.MeshStandardMaterial({
          color: accentColor,
          emissive: accentColor,
          emissiveIntensity: 0.7,
        }),
      );
      strip.position.set(isWingA ? 0.62 : -0.62, 0.84, 0);
      benchGroup.add(strip);

      // Overhead steel arch & crisp readable station placard facing promenade
      const archX = isWingA ? -0.52 : 0.52;
      for (const pz of [-1.05, 1.05]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.22, 10), steelMat);
        post.position.set(archX, 1.5, pz);
        benchGroup.add(post);
      }
      const headerBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.18), steelMat);
      headerBar.position.set(archX, 2.1, 0);
      benchGroup.add(headerBar);

      const placardTex = createPlacardTexture(
        desc.shortLabel.toUpperCase(),
        `${desc.benchmarks[0]} • STATION ${desc.stationNumber}`,
        accentHex,
      );
      this.disposableTextures.push(placardTex);
      const placard = new THREE.Mesh(
        new THREE.PlaneGeometry(1.75, 0.44),
        new THREE.MeshBasicMaterial({ map: placardTex }),
      );
      placard.position.set(archX + (isWingA ? 0.04 : -0.04), 2.12, 0);
      placard.rotation.y = isWingA ? Math.PI / 2 : -Math.PI / 2;
      placard.userData['stationId'] = id;
      benchGroup.add(placard);

      // Invisible enlarged tap pad for effortless Smartboard click-to-focus
      const hitPad = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.3, 2.6),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hitPad.position.y = 1.1;
      hitPad.userData['stationId'] = id;
      benchGroup.add(hitPad);
      this.interactiveMeshes.push(topMesh, placard, hitPad);

      this.root.add(benchGroup);
      this.obstacleBoxes.push({
        minX: bx - 0.72,
        maxX: bx + 0.72,
        minZ: bz - 1.32,
        maxZ: bz + 1.32,
      });
    }
  }

  private buildSelectionRing(): void {
    const geo = new THREE.RingGeometry(1.38, 1.52, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
    this.selectionRing = new THREE.Mesh(geo, mat);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.visible = false;
    this.root.add(this.selectionRing);
  }

  // ============================================================================
  // STATION 1: COLOR, LUSTER & TEXTURE INSPECTION TABLE
  // ============================================================================

  private buildStation1(): void {
    const meta = this.stations.station_1_luster_texture;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);
    const brassMat = this.materials.getStandardMaterial('brassCollar', 1, 1);
    const dullMat = this.materials.getStandardMaterial('mineralDull', 1, 1);
    const roughMat = this.materials.getStandardMaterial('mineralRough', 1, 1);

    // Illuminated inspection stage
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.31, 0.035, 32),
      this.materials.getStandardMaterial('ceramicDish', 1, 1),
    );
    stage.position.set(0.18, 0.018, 0);
    g.add(stage);

    // Gooseneck inspection lamp (TubeGeometry)
    const lampCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.32, 0.02, -0.35),
      new THREE.Vector3(-0.32, 0.45, -0.25),
      new THREE.Vector3(-0.08, 0.56, -0.08),
      new THREE.Vector3(0.12, 0.46, 0),
    ]);
    const lampNeck = new THREE.Mesh(new THREE.TubeGeometry(lampCurve, 20, 0.016, 10, false), steelMat);
    const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.11, 18), steelMat);
    lampHead.position.set(0.14, 0.43, 0);
    lampHead.rotation.z = 0.5;
    g.add(lampNeck, lampHead);

    // Movable magnifying glass lens
    const lensRim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 10, 32), brassMat);
    lensRim.rotation.x = Math.PI / 2;
    const lensGlass = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 24), this.materials.createGlassMaterial(0xe0f2fe)),
    );
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.18, 10), steelMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.x = 0.2;
    this.s1MagnifierGroup.add(lensRim, lensGlass, handle);
    this.s1MagnifierGroup.position.set(0.18, 0.24, 0);
    g.add(this.s1MagnifierGroup);

    // 7 Specimens arranged cleanly on left rack + active stage
    const ids = Object.keys(STATION1_SPECIMENS) as Station1SpecimenId[];
    ids.forEach((id, idx) => {
      const spec = STATION1_SPECIMENS[id];
      const mat =
        spec.luster === 'metallic'
          ? new THREE.MeshStandardMaterial({ color: spec.colorHex, metalness: 0.92, roughness: spec.texture === 'smooth' ? 0.2 : 0.42 })
          : spec.luster === 'glassy'
            ? new THREE.MeshPhysicalMaterial({ color: spec.colorHex, roughness: 0.08, metalness: 0.05, clearcoat: 1.0, transmission: this.qualityTier === 'Ultra' ? 0.55 : 0, opacity: 0.9, transparent: true })
            : (spec.texture === 'rough' ? roughMat.clone() : dullMat.clone());

      if (spec.luster === 'dull' && mat instanceof THREE.MeshStandardMaterial) {
        mat.color.setHex(spec.colorHex);
      }

      const geo =
        id === 'brushed_aluminum_bar'
          ? new THREE.BoxGeometry(0.13, 0.045, 0.06)
          : id === 'quartz_crystal_s1'
            ? new THREE.CylinderGeometry(0.035, 0.04, 0.11, 6)
            : id === 'colored_acrylic_beads'
              ? new THREE.SphereGeometry(0.04, 18, 14)
              : id === 'smooth_river_glass'
                ? new THREE.SphereGeometry(0.045, 16, 12)
                : new THREE.DodecahedronGeometry(0.05, 0);

      const mesh = new THREE.Mesh(geo, mat);
      if (id === 'smooth_river_glass') mesh.scale.set(1.2, 0.55, 0.95);
      mesh.castShadow = true;
      mesh.position.set(-0.22, 0.06, -0.78 + idx * 0.26);
      mesh.userData['stationId'] = 'station_1_luster_texture';
      mesh.userData['homePos'] = mesh.position.clone();
      g.add(mesh);
      this.s1SpecimenMeshes.set(id, mesh);
    });

    this.root.add(g);
  }

  private syncStation1(state: Station1State, t: number): void {
    for (const [id, mesh] of this.s1SpecimenMeshes) {
      const home = mesh.userData['homePos'] as THREE.Vector3;
      const isActive = state.activeSpecimenId === id;
      const targetX = isActive ? 0.18 : home.x;
      const targetY = isActive ? 0.095 : home.y;
      const targetZ = isActive ? 0 : home.z;
      mesh.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.18);
      if (isActive) {
        mesh.rotation.y = t * 0.65;
      } else {
        mesh.rotation.y = 0;
      }
    }
    this.s1MagnifierGroup.position.y = state.magnifierActive ? 0.24 + Math.sin(t * 2) * 0.01 : 0.36;
    this.s1MagnifierGroup.position.x = state.magnifierActive ? 0.18 : -0.15;
  }

  // ============================================================================
  // STATION 2: HARDNESS SCRATCH BENCH
  // ============================================================================

  private buildStation2(): void {
    const meta = this.stations.station_2_hardness_scratch;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const ids = Object.keys(STATION2_SPECIMENS) as Station2SpecimenId[];
    ids.forEach((id, idx) => {
      const spec = STATION2_SPECIMENS[id];
      const zPos = -0.82 + idx * 0.41;

      const tile = new THREE.Mesh(
        id === 'quartz_crystal_s2'
          ? new THREE.CylinderGeometry(0.08, 0.09, 0.07, 6)
          : new THREE.BoxGeometry(0.24, 0.045, 0.22),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          roughness: spec.luster === 'dull' ? 0.85 : 0.2,
          metalness: spec.luster === 'metallic' ? 0.85 : 0.05,
        }),
      );
      tile.position.set(0.02, 0.025, zPos);
      tile.castShadow = true;
      g.add(tile);

      // Two scratch groove strips (Penny groove + Steel Nail groove) revealed when scratched!
      const grooves: THREE.Mesh[] = [];
      for (const offset of [-0.045, 0.045]) {
        const groove = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.008, 0.014),
          new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xfacc15,
            emissiveIntensity: 0.35,
            roughness: 0.9,
          }),
        );
        groove.position.set(0.02, 0.052 + (id === 'quartz_crystal_s2' ? 0.015 : 0), zPos + offset);
        groove.rotation.y = 0.22;
        groove.visible = false;
        g.add(groove);
        grooves.push(groove);
      }
      this.s2ScratchGrooves.set(id, grooves);
    });

    // Scratch tools (Copper Penny & Steel Nail)
    this.s2PennyMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.012, 24),
      this.materials.getStandardMaterial('copperCoil', 1, 1),
    );
    this.s2NailMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.014, 0.18, 12),
      this.materials.getStandardMaterial('brushedSteel', 1, 1),
    );
    this.s2NailMesh.rotation.x = Math.PI;
    this.s2ToolGroup.add(this.s2PennyMesh, this.s2NailMesh);
    this.s2ToolGroup.position.set(0.22, 0.16, 0);
    g.add(this.s2ToolGroup);

    this.root.add(g);
  }

  private syncStation2(state: Station2State, scratchPulse: number): void {
    const ids = Object.keys(STATION2_SPECIMENS) as Station2SpecimenId[];
    ids.forEach((id, idx) => {
      const rec = state.scratchRecords[id];
      const grooves = this.s2ScratchGrooves.get(id);
      if (grooves && grooves[0] && grooves[1]) {
        grooves[0].visible = rec.scratchedByPenny;
        grooves[1].visible = rec.scratchedByNail;
      }
      if (id === state.activeSpecimenId) {
        const zPos = -0.82 + idx * 0.41;
        const sweep = scratchPulse > 0 ? Math.sin(scratchPulse * Math.PI * 3) * 0.08 : 0;
        this.s2ToolGroup.position.lerp(
          new THREE.Vector3(0.05 + sweep, scratchPulse > 0 ? 0.095 : 0.18, zPos),
          0.25,
        );
      }
    });
    this.s2PennyMesh.visible = state.activeTool === 'copper_penny';
    this.s2NailMesh.visible = state.activeTool === 'steel_nail';
  }

  // ============================================================================
  // STATION 3: MAGNETISM & SAFE WAFTING STATION
  // ============================================================================

  private buildStation3(): void {
    const meta = this.stations.station_3_magnetism_wafting;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);

    // Left half (z < 0): 5 metal/plastic test items + red/silver bar magnet
    const itemIds = Object.keys(STATION3_MAGNET_ITEMS) as Station3MagnetItemId[];
    itemIds.forEach((id, idx) => {
      const spec = STATION3_MAGNET_ITEMS[id];
      const mat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: spec.isShinyMetal ? 0.9 : 0.08,
        roughness: spec.isShinyMetal ? 0.24 : 0.6,
      });

      let mesh: THREE.Object3D;
      if (id === 'iron_nail') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.16, 10), mat);
        mesh.rotation.z = Math.PI / 2;
      } else if (id === 'steel_paperclip') {
        const loop = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.05, 0, -0.02),
          new THREE.Vector3(0.05, 0, -0.02),
          new THREE.Vector3(0.05, 0, 0.02),
          new THREE.Vector3(-0.04, 0, 0.02),
        ]);
        mesh = new THREE.Mesh(new THREE.TubeGeometry(loop, 20, 0.006, 8, false), mat);
      } else if (id === 'copper_wire') {
        mesh = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 10, 22), mat);
        mesh.rotation.x = Math.PI / 2;
      } else if (id === 'aluminum_foil') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.09), mat);
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), mat);
      }

      const zPos = -0.95 + idx * 0.23;
      mesh.position.set(0.05, 0.04, zPos);
      mesh.userData['homePos'] = mesh.position.clone();
      g.add(mesh);
      this.s3MagnetItems.set(id, mesh);
    });

    // Red/Silver Bar Magnet
    const redPole = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.045, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 }),
    );
    redPole.position.x = -0.055;
    const silverPole = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.06), steelMat);
    silverPole.position.x = 0.055;
    this.s3MagnetBar.add(redPole, silverPole);
    this.s3MagnetBar.position.set(0.28, 0.28, -0.45);
    g.add(this.s3MagnetBar);

    // Right half (z > 0): 3 Sealed Scent Jars + Safe Wafting Airflow Plumes
    const jarIds = Object.keys(STATION3_SCENT_JARS) as Station3ScentJarId[];
    const glassMat = this.materials.createGlassMaterial(0xe0f2fe);
    jarIds.forEach((id, idx) => {
      const jarSpec = STATION3_SCENT_JARS[id];
      const zPos = 0.35 + idx * 0.34;
      const jarPts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.075, 0),
        new THREE.Vector2(0.078, 0.17),
        new THREE.Vector2(0.05, 0.21),
        new THREE.Vector2(0.054, 0.24),
      ];
      const jarMesh = this.registerGlass(new THREE.Mesh(new THREE.LatheGeometry(jarPts, 24), glassMat));
      jarMesh.position.set(0.05, 0, zPos);
      g.add(jarMesh);

      const liq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.068, 0.09, 18),
        new THREE.MeshPhysicalMaterial({ color: jarSpec.liquidColorHex, roughness: 0.1, opacity: 0.85, transparent: true }),
      );
      liq.position.set(0.05, 0.05, zPos);
      g.add(liq);

      const stopper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.046, 0.04, 0.04, 16),
        this.materials.getStandardMaterial('oakWoodTrim', 1, 1),
      );
      stopper.position.set(0.05, 0.25, zPos);
      g.add(stopper);

      this.s3JarPositions.set(id, new THREE.Vector3(0.05, 0.27, zPos));
    });

    for (let i = 0; i < 3; i++) {
      const ribbon = new THREE.Mesh(
        new THREE.TorusGeometry(0.08 + i * 0.035, 0.012, 8, 20, Math.PI * 0.85),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 }),
      );
      ribbon.visible = false;
      g.add(ribbon);
      this.s3WaftPlumes.push(ribbon);
    }

    this.root.add(g);
  }

  private syncStation3(state: Station3State, waftPulse: number, t: number): void {
    const activeId = state.activeMagnetItemId;
    if (activeId) {
      const itemMesh = this.s3MagnetItems.get(activeId);
      if (itemMesh) {
        const home = itemMesh.userData['homePos'] as THREE.Vector3;
        this.s3MagnetBar.position.lerp(new THREE.Vector3(home.x + 0.04, 0.16, home.z), 0.2);
      }
    } else {
      this.s3MagnetBar.position.lerp(new THREE.Vector3(0.28, 0.28, -0.45), 0.12);
    }

    for (const [id, mesh] of this.s3MagnetItems) {
      const home = mesh.userData['homePos'] as THREE.Vector3;
      const attracted = state.magnetTested[id] && state.magnetAttracted[id] && activeId === id;
      const target = attracted ? new THREE.Vector3(home.x + 0.03, 0.135, home.z) : home;
      mesh.position.lerp(target, 0.22);
    }

    const jarPos = state.activeWaftingJarId ? this.s3JarPositions.get(state.activeWaftingJarId) : null;
    this.s3WaftPlumes.forEach((ribbon, i) => {
      if (jarPos && waftPulse > 0) {
        ribbon.visible = true;
        const phase = (t * 2.5 + i * 0.3) % 1;
        ribbon.position.set(jarPos.x + phase * 0.16, jarPos.y + 0.05 + phase * 0.22, jarPos.z);
        ribbon.rotation.z = t * 2 + i;
      } else {
        ribbon.visible = false;
      }
    });
  }

  // ============================================================================
  // STATION 4: MASS & VOLUME DISPLACEMENT BENCH
  // ============================================================================

  private buildStation4(): void {
    const meta = this.stations.station_4_mass_volume;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);
    const darkMat = this.materials.getStandardMaterial('anodizedDark', 1, 1);

    // Digital Mass Balance (0.1 g precision)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.44), darkMat);
    chassis.position.set(0.05, 0.04, -0.58);
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.016, 28), steelMat);
    pan.position.set(0.05, 0.09, -0.64);
    g.add(chassis, pan);

    this.s4BalanceCanvas = document.createElement('canvas');
    this.s4BalanceCanvas.width = 256;
    this.s4BalanceCanvas.height = 96;
    this.s4BalanceTex = new THREE.CanvasTexture(this.s4BalanceCanvas);
    this.s4BalanceTex.colorSpace = THREE.SRGBColorSpace;
    this.disposableTextures.push(this.s4BalanceTex);

    const lcd = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.095),
      new THREE.MeshBasicMaterial({ map: this.s4BalanceTex }),
    );
    lcd.position.set(0.265, 0.045, -0.45);
    lcd.rotation.y = Math.PI / 2;
    lcd.rotation.x = -0.35;
    g.add(lcd);

    // Tall 100 mL Refractive Graduated Cylinder + Curved Meniscus Water Column
    const cylBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.025, 6), steelMat);
    cylBase.position.set(0.05, 0.013, 0.12);
    g.add(cylBase);

    const cylGlassPts = [
      new THREE.Vector2(0.082, 0.025),
      new THREE.Vector2(0.082, 0.56),
      new THREE.Vector2(0.094, 0.58),
      new THREE.Vector2(0.074, 0.58),
      new THREE.Vector2(0.074, 0.03),
      new THREE.Vector2(0, 0.03),
    ];
    const cylGlass = this.registerGlass(
      new THREE.Mesh(new THREE.LatheGeometry(cylGlassPts, 32), this.materials.createGlassMaterial(0xe0f2fe)),
    );
    cylGlass.position.set(0.05, 0, 0.12);
    g.add(cylGlass);

    const gradTex = createGraduationTexture(100, 'GRADUATED 100 mL');
    this.disposableTextures.push(gradTex);
    const decal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.084, 0.084, 0.48, 24, 1, true),
      new THREE.MeshBasicMaterial({ map: gradTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    decal.position.set(0.05, 0.29, 0.12);
    decal.rotation.y = -Math.PI / 2;
    g.add(decal);

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.52,
      roughness: 0.06,
      clearcoat: 1,
    });
    this.s4WaterColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 24), waterMat);
    this.s4WaterColumn.position.set(0.05, 0.03, 0.12);
    g.add(this.s4WaterColumn);

    // Concave meniscus ring at top of water column
    this.s4MeniscusMesh = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.008, 10, 28), waterMat);
    this.s4MeniscusMesh.rotation.x = Math.PI / 2;
    this.s4MeniscusMesh.position.set(0.05, 0.27, 0.12);
    g.add(this.s4MeniscusMesh);

    // 3 Solid Test Objects (Brass Cylinder, Quartz Pebble, Red Acrylic Cube)
    const objIds = Object.keys(STATION4_OBJECTS) as Station4ObjectId[];
    objIds.forEach((id, idx) => {
      const spec = STATION4_OBJECTS[id];
      const mat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: spec.luster === 'metallic' ? 0.9 : 0.05,
        roughness: spec.luster === 'metallic' ? 0.25 : 0.12,
        transparent: id === 'acrylic_cube',
        opacity: id === 'acrylic_cube' ? 0.85 : 1.0,
      });
      const geo =
        id === 'brass_cylinder'
          ? new THREE.CylinderGeometry(0.036, 0.036, 0.075, 20)
          : id === 'quartz_pebble'
            ? new THREE.DodecahedronGeometry(0.044, 1)
            : new THREE.BoxGeometry(0.065, 0.065, 0.065);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.position.set(0.05, 0.045, 0.56 + idx * 0.24);
      mesh.userData['homePos'] = mesh.position.clone();
      g.add(mesh);
      this.s4ObjectMeshes.set(id, mesh);
    });

    this.root.add(g);
  }

  private syncStation4(state: Station4State, _t: number): void {
    // 1. Scale water column height smoothly to currentWaterVolumeMl (50 mL -> 0.24 m, 100 mL -> 0.48 m)
    const targetHeight = (state.currentWaterVolumeMl / 100) * 0.46;
    this.s4WaterColumn.scale.y = THREE.MathUtils.lerp(this.s4WaterColumn.scale.y, targetHeight, 0.18);
    this.s4WaterColumn.position.y = 0.03 + this.s4WaterColumn.scale.y * 0.5;
    this.s4MeniscusMesh.position.y = 0.03 + this.s4WaterColumn.scale.y;

    // 2. Position each object on balance, submerged in cylinder, or at rest tray
    for (const [id, mesh] of this.s4ObjectMeshes) {
      const home = mesh.userData['homePos'] as THREE.Vector3;
      let target = home;
      if (state.objectOnBalance === id) {
        target = new THREE.Vector3(0.05, 0.135, -0.64);
      } else if (state.submergedObject === id) {
        target = new THREE.Vector3(0.05, 0.075, 0.12);
      }
      mesh.position.lerp(target, 0.18);
    }

    // 3. Redraw balance LCD when changed
    const sig = `${state.balanceReadoutGrams.toFixed(1)}_${state.currentWaterVolumeMl.toFixed(1)}`;
    if (sig !== this.lastS4BalanceSig) {
      this.lastS4BalanceSig = sig;
      const ctx = this.s4BalanceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#04121b';
        ctx.fillRect(0, 0, 256, 96);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, 250, 90);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText('DIGITAL BALANCE', 18, 26);
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 38px monospace';
        ctx.fillText(`${state.balanceReadoutGrams.toFixed(1)} g`, 20, 74);
        this.s4BalanceTex.needsUpdate = true;
      }
    }
  }

  // ============================================================================
  // STATION 5: STATES OF MATTER THERMAL CHAMBER
  // ============================================================================

  private buildStation5(): void {
    const meta = this.stations.station_5_thermal_states;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);
    const darkMat = this.materials.getStandardMaterial('anodizedDark', 1, 1);

    // Thermal pedestal
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.56), darkMat);
    base.position.set(0.05, 0.045, 0);
    g.add(base);

    // Transparent glass cylinder chamber
    const chamberGlass = this.registerGlass(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.54, 32, 1, true),
        this.materials.createGlassMaterial(0xe0f2fe),
      ),
    );
    chamberGlass.position.set(0.05, 0.36, 0);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 28), steelMat);
    cap.position.set(0.05, 0.64, 0);
    g.add(chamberGlass, cap);

    // Digital temp screen
    this.s5ThermalCanvas = document.createElement('canvas');
    this.s5ThermalCanvas.width = 256;
    this.s5ThermalCanvas.height = 96;
    this.s5ThermalTex = new THREE.CanvasTexture(this.s5ThermalCanvas);
    this.s5ThermalTex.colorSpace = THREE.SRGBColorSpace;
    this.disposableTextures.push(this.s5ThermalTex);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.11),
      new THREE.MeshBasicMaterial({ map: this.s5ThermalTex }),
    );
    screen.position.set(0.335, 0.05, 0);
    screen.rotation.y = Math.PI / 2;
    g.add(screen);

    // Solid Ice Cube (definite shape!)
    this.s5IceBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        roughness: 0.14,
        transparent: true,
        opacity: 0.85,
        clearcoat: 1,
      }),
    );
    this.s5IceBlock.position.set(0.05, 0.18, 0);
    g.add(this.s5IceBlock);

    // Pooled Liquid Water (takes container shape!)
    this.s5LiquidPool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.195, 0.14, 28),
      new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        roughness: 0.06,
        transparent: true,
        opacity: 0.58,
      }),
    );
    this.s5LiquidPool.position.set(0.05, 0.16, 0);
    g.add(this.s5LiquidPool);

    // Boiling bubbles, clear-zone Particle Vision vapor, upper condensed mist, & Particle Vision lattice
    this.s5BoilingBubbles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.011, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.8 }),
      36,
    );
    this.s5VaporVision = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.013, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0284c7, emissiveIntensity: 0.9 }),
      48,
    );
    this.s5UpperMist = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.026, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.34, depthWrite: false }),
      28,
    );
    this.s5VisionLattice = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.7 }),
      64,
    );
    for (const im of [this.s5BoilingBubbles, this.s5VaporVision, this.s5UpperMist, this.s5VisionLattice]) {
      im.position.set(0.05, 0, 0);
      g.add(im);
    }

    this.root.add(g);
  }

  private syncStation5(state: Station5State, t: number): void {
    this.s5IceBlock.visible = state.iceFraction > 0.05;
    this.s5IceBlock.scale.setScalar(Math.max(0.01, state.iceFraction));

    this.s5LiquidPool.visible = state.liquidFraction > 0.05;
    this.s5LiquidPool.scale.y = Math.max(0.01, state.liquidFraction);
    this.s5LiquidPool.position.y = 0.09 + 0.07 * this.s5LiquidPool.scale.y;

    // Boiling bubbles inside liquid
    this.s5BoilingBubbles.visible = state.boilingIntensity > 0.1;
    if (this.s5BoilingBubbles.visible) {
      for (let i = 0; i < 36; i++) {
        const ang = i * 2.1;
        const r = 0.03 + ((i * 19) % 100) * 0.0014;
        const h = 0.1 + ((t * 0.45 + i * 0.09) % 0.12);
        this.dummy.position.set(Math.cos(ang) * r, h, Math.sin(ang) * r);
        this.dummy.scale.setScalar(0.7 + (i % 3) * 0.25);
        this.dummy.updateMatrix();
        this.s5BoilingBubbles.setMatrixAt(i, this.dummy.matrix);
      }
      this.s5BoilingBubbles.instanceMatrix.needsUpdate = true;
    }

    // Clear invisible-vapor gap directly above surface (0.24..0.41m) -> visible ONLY in Particle Vision (P)
    this.s5VaporVision.visible = this.particleVisionEnabled && state.boilingIntensity > 0.1;
    if (this.s5VaporVision.visible) {
      for (let i = 0; i < 48; i++) {
        const ang = i * 1.7 + t;
        const r = 0.02 + ((i * 23) % 100) * 0.0015;
        const y = 0.24 + ((t * 0.28 + i * 0.07) % 0.36);
        this.dummy.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s5VaporVision.setMatrixAt(i, this.dummy.matrix);
      }
      this.s5VaporVision.instanceMatrix.needsUpdate = true;
    }

    // Condensed liquid mist droplets form HIGHER UP (y = 0.43..0.60m), leaving clear gap above liquid
    this.s5UpperMist.visible = state.upperMistIntensity > 0.05;
    if (this.s5UpperMist.visible) {
      for (let i = 0; i < 28; i++) {
        const ang = i * 2.4 + t * 0.4;
        const r = 0.03 + ((i * 17) % 100) * 0.0013;
        const y = 0.43 + ((t * 0.12 + i * 0.05) % 0.16);
        this.dummy.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
        this.dummy.scale.setScalar(state.upperMistIntensity * (0.9 + Math.sin(t + i) * 0.2));
        this.dummy.updateMatrix();
        this.s5UpperMist.setMatrixAt(i, this.dummy.matrix);
      }
      this.s5UpperMist.instanceMatrix.needsUpdate = true;
    }

    // Conceptual Particle Vision (SC.5.P.8.4) for Solid / Liquid water parts
    this.s5VisionLattice.visible = this.particleVisionEnabled;
    if (this.particleVisionEnabled) {
      for (let i = 0; i < 64; i++) {
        const gx = i % 4;
        const gy = Math.floor(i / 4) % 4;
        const gz = Math.floor(i / 16);
        if (state.currentState === 'solid') {
          this.dummy.position.set((gx - 1.5) * 0.038, 0.13 + gy * 0.038, (gz - 1.5) * 0.038);
        } else {
          const ang = i * 1.4 + t * 0.7;
          const r = 0.025 + ((i * 13) % 100) * 0.0014;
          this.dummy.position.set(Math.cos(ang) * r, 0.11 + (gy / 4) * 0.09, Math.sin(ang) * r);
        }
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s5VisionLattice.setMatrixAt(i, this.dummy.matrix);
      }
      this.s5VisionLattice.instanceMatrix.needsUpdate = true;
    }

    const sig = `${state.temperatureCelsius}_${state.currentState}`;
    if (sig !== this.lastS5Sig) {
      this.lastS5Sig = sig;
      const ctx = this.s5ThermalCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#071525';
        ctx.fillRect(0, 0, 256, 96);
        ctx.strokeStyle = state.temperatureCelsius >= 100 ? '#f97316' : '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, 250, 90);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText(`STATE: ${state.currentState.toUpperCase()}`, 14, 28);
        ctx.fillStyle = state.temperatureCelsius >= 100 ? '#fb923c' : '#7dd3fc';
        ctx.font = 'bold 26px monospace';
        ctx.fillText(formatGrade5Temperature(state.temperatureCelsius), 14, 72);
        this.s5ThermalTex.needsUpdate = true;
      }
    }
  }

  // ============================================================================
  // STATION 6: HAND & TWEEZERS SORTING TRAY
  // ============================================================================

  private buildStation6(): void {
    const meta = this.stations.station_6_tweezers_sorting;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const dishMat = this.materials.getStandardMaterial('ceramicDish', 1, 1);
    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);

    // Central mixing tray + 4 sorting dishes
    const centerTray = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.035, 28), dishMat);
    centerTray.position.set(-0.05, 0.018, -0.45);
    g.add(centerTray);

    const binZ = [0.05, 0.35, 0.65, 0.95];
    binZ.forEach((bz) => {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.03, 20), dishMat);
      bin.position.set(-0.05, 0.015, bz);
      g.add(bin);
    });

    // 16 distinct 3D beads/cubes
    const rand = seededRandom(606);
    const cats: Array<{ cat: Station6CategoryId; hex: number; isCube: boolean; binIdx: number }> = [
      { cat: 'red_bead', hex: 0xef4444, isCube: false, binIdx: 0 },
      { cat: 'blue_bead', hex: 0x3b82f6, isCube: false, binIdx: 1 },
      { cat: 'yellow_bead', hex: 0xeab308, isCube: false, binIdx: 2 },
      { cat: 'white_cube', hex: 0xf8fafc, isCube: true, binIdx: 3 },
    ];
    for (const c of cats) {
      for (let i = 1; i <= 4; i++) {
        const pieceId = `${c.cat}_${i}`;
        const geo = c.isCube ? new THREE.BoxGeometry(0.042, 0.042, 0.042) : new THREE.SphereGeometry(0.025, 16, 12);
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshStandardMaterial({ color: c.hex, roughness: 0.22, metalness: 0.05 }),
        );
        const ang = rand() * Math.PI * 2;
        const r = 0.03 + rand() * 0.13;
        const home = new THREE.Vector3(-0.05 + Math.cos(ang) * r, 0.05, -0.45 + Math.sin(ang) * r);
        const binPos = new THREE.Vector3(
          -0.05 + ((i % 2) - 0.5) * 0.06,
          0.045,
          (binZ[c.binIdx] ?? 0.5) + (i > 2 ? 0.03 : -0.03),
        );
        mesh.position.copy(home);
        mesh.userData['homePos'] = home;
        mesh.userData['binPos'] = binPos;
        g.add(mesh);
        this.s6PieceMeshes.set(pieceId, mesh);
      }
    }

    // Articulated stainless-steel V-tweezers
    const prong1 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.24, 0.018), steelMat);
    prong1.position.x = -0.015;
    prong1.rotation.z = -0.09;
    const prong2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.24, 0.018), steelMat);
    prong2.position.x = 0.015;
    prong2.rotation.z = 0.09;
    this.s6TweezersGroup.add(prong1, prong2);
    this.s6TweezersGroup.position.set(-0.22, 0.24, -0.45);
    g.add(this.s6TweezersGroup);

    this.root.add(g);
  }

  private syncStation6(state: Station6State, tweezersPulse: number, t: number): void {
    for (const p of state.pieces) {
      const mesh = this.s6PieceMeshes.get(p.pieceId);
      if (!mesh) continue;
      const target = (p.sortedIntoBin ? mesh.userData['binPos'] : mesh.userData['homePos']) as THREE.Vector3;
      mesh.position.lerp(target, 0.22);
    }
    this.s6TweezersGroup.position.y = tweezersPulse > 0 ? 0.15 + Math.abs(Math.sin(t * 10)) * 0.08 : 0.26;
  }

  // ============================================================================
  // STATION 7: IRON FILINGS & SAND MAGNET STATION
  // ============================================================================

  private buildStation7(): void {
    const meta = this.stations.station_7_iron_sand_magnet;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const dishMat = this.materials.getStandardMaterial('ceramicDish', 1, 1);
    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);

    // Wide shallow tray + steel recovery dish
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.03, 28), dishMat);
    tray.position.set(-0.05, 0.015, -0.35);
    const recDish = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.03, 28), steelMat);
    recDish.position.set(-0.05, 0.015, 0.45);
    g.add(tray, recDish);

    // Instanced sand & iron filings
    const sandGeo = new THREE.DodecahedronGeometry(0.005, 0);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xd9b382, roughness: 0.9 });
    this.s7SandInstances = new THREE.InstancedMesh(sandGeo, sandMat, 420);
    const rand = seededRandom(707);
    for (let i = 0; i < 420; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.2;
      this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.032 + rand() * 0.006, -0.35 + Math.sin(a) * r);
      this.dummy.scale.setScalar(0.8 + rand() * 0.5);
      this.dummy.updateMatrix();
      this.s7SandInstances.setMatrixAt(i, this.dummy.matrix);
    }
    this.s7SandInstances.instanceMatrix.needsUpdate = true;
    g.add(this.s7SandInstances);

    const ironGeo = new THREE.BoxGeometry(0.003, 0.003, 0.014);
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.35 });
    this.s7IronTrayInstances = new THREE.InstancedMesh(ironGeo, ironMat, 260);
    this.s7IronMagnetInstances = new THREE.InstancedMesh(ironGeo, ironMat, 260);
    this.s7IronDishInstances = new THREE.InstancedMesh(ironGeo, ironMat, 260);

    for (let i = 0; i < 260; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.19;
      this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.035 + rand() * 0.007, -0.35 + Math.sin(a) * r);
      this.dummy.rotation.set(rand(), rand(), rand());
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.s7IronTrayInstances.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(-0.05 + Math.cos(a) * (r * 0.65), 0.034 + rand() * 0.008, 0.45 + Math.sin(a) * (r * 0.65));
      this.dummy.updateMatrix();
      this.s7IronDishInstances.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set((rand() - 0.5) * 0.08, -0.04 - rand() * 0.02, (rand() - 0.5) * 0.04);
      this.dummy.updateMatrix();
      this.s7IronMagnetInstances.setMatrixAt(i, this.dummy.matrix);
    }
    this.s7IronTrayInstances.instanceMatrix.needsUpdate = true;
    this.s7IronDishInstances.instanceMatrix.needsUpdate = true;
    this.s7IronMagnetInstances.instanceMatrix.needsUpdate = true;

    // Sleeved bar magnet
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.04, 0.055),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.32 }),
    );
    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.044, 0.058),
      this.materials.createGlassMaterial(0xf8fafc),
    );
    this.s7MagnetGroup.add(bar, sleeve, this.s7IronMagnetInstances);
    this.s7MagnetGroup.position.set(-0.05, 0.3, 0.05);
    g.add(this.s7SandInstances, this.s7IronTrayInstances, this.s7IronDishInstances, this.s7MagnetGroup);

    this.root.add(g);
  }

  private syncStation7(state: Station7State, sweepPulse: number, _t: number): void {
    this.s7IronTrayInstances.visible = state.ironInTrayGrams > 0.1;
    this.s7IronMagnetInstances.visible = state.ironOnMagnetGrams > 0.1;
    this.s7IronDishInstances.visible = state.ironInRecoveryDishGrams > 0.1;

    let target = new THREE.Vector3(-0.05, 0.3, 0.05);
    if (state.magnetPositionedOver === 'tray') {
      target = new THREE.Vector3(-0.05 + Math.sin(sweepPulse * Math.PI * 2) * 0.08, 0.16, -0.35);
    } else if (state.magnetPositionedOver === 'dish') {
      target = new THREE.Vector3(-0.05, 0.22, 0.45);
    }
    this.s7MagnetGroup.position.lerp(target, 0.2);
  }

  // ============================================================================
  // STATION 8: SAND & GRAVEL SIEVE STATION
  // ============================================================================

  private buildStation8(): void {
    const meta = this.stations.station_8_sand_gravel_sieve;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);
    const brassMat = this.materials.getStandardMaterial('brassCollar', 1, 1);
    const meshMat = this.materials.getStandardMaterial('sieveWireMesh', 3, 3);

    // Catch pan below sieve
    const catchPan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.07, 28), steelMat);
    catchPan.position.set(-0.05, 0.035, 0);
    g.add(catchPan);

    // Spun brass wire-mesh sieve basket
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.1, 28, 1, true),
      brassMat,
    );
    const screen = new THREE.Mesh(new THREE.CircleGeometry(0.225, 28), meshMat);
    screen.rotation.x = -Math.PI / 2;
    screen.position.y = -0.03;
    this.s8SieveBasket.add(rim, screen);
    this.s8SieveBasket.position.set(-0.05, 0.21, 0);
    g.add(this.s8SieveBasket);

    // Source mixture cup beside sieve
    const cup = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.16, 22, 1, true), this.materials.createGlassMaterial()),
    );
    cup.position.set(-0.05, 0.08, -0.58);
    g.add(cup);

    const rand = seededRandom(808);
    this.s8CupGrains = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.011, 0),
      new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.8 }),
      140,
    );
    this.s8GravelInstances = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.018, 0),
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.72 }),
      75,
    );
    this.s8CatchSandInstances = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.006, 0),
      new THREE.MeshStandardMaterial({ color: 0xd9b382, roughness: 0.9 }),
      340,
    );

    for (let i = 0; i < 140; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.07;
      this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.02 + rand() * 0.07, -0.58 + Math.sin(a) * r);
      this.dummy.scale.setScalar(0.7 + rand() * 0.6);
      this.dummy.updateMatrix();
      this.s8CupGrains.setMatrixAt(i, this.dummy.matrix);
    }
    for (let i = 0; i < 75; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.17;
      this.dummy.position.set(Math.cos(a) * r, -0.01 + rand() * 0.015, Math.sin(a) * r);
      this.dummy.scale.set(1 + rand() * 0.4, 0.7, 1);
      this.dummy.updateMatrix();
      this.s8GravelInstances.setMatrixAt(i, this.dummy.matrix);
    }
    for (let i = 0; i < 340; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.19;
      this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.02 + rand() * 0.015, Math.sin(a) * r);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.s8CatchSandInstances.setMatrixAt(i, this.dummy.matrix);
    }
    this.s8CupGrains.instanceMatrix.needsUpdate = true;
    this.s8GravelInstances.instanceMatrix.needsUpdate = true;
    this.s8CatchSandInstances.instanceMatrix.needsUpdate = true;

    this.s8SieveBasket.add(this.s8GravelInstances);
    g.add(this.s8CupGrains, this.s8CatchSandInstances);

    this.root.add(g);
  }

  private syncStation8(state: Station8State, shakePulse: number, t: number): void {
    this.s8CupGrains.visible = state.mixtureInCupGrams > 0.5;
    this.s8GravelInstances.visible = state.gravelOnSieveGrams > 0.5;
    this.s8CatchSandInstances.visible = state.fineSandInCatchPanGrams > 0.5;

    if (shakePulse > 0) {
      this.s8SieveBasket.position.z = Math.sin(t * 28) * 0.035;
      this.s8SieveBasket.position.x = -0.05 + Math.cos(t * 22) * 0.025;
    } else {
      this.s8SieveBasket.position.set(-0.05, 0.21, 0);
    }
  }

  // ============================================================================
  // STATION 9: SAND & WATER + FULL SALT/SAND/WATER FILTRATION & EVAPORATION
  // ============================================================================

  private buildStation9(): void {
    const meta = this.stations.station_9_filtration_evaporation;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);
    const darkMat = this.materials.getStandardMaterial('anodizedDark', 1, 1);
    const filterMat = this.materials.getStandardMaterial('filterPaper', 1, 1);
    const ceramicMat = this.materials.getStandardMaterial('ceramicDish', 1, 1);
    this.s9HotPlateGlowMat = this.materials.getStandardMaterial('heatingElement', 1, 1).clone();

    // Left: Source Beaker
    const beaker = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.11, 0.24, 24, 1, true), this.materials.createGlassMaterial()),
    );
    beaker.position.set(-0.05, 0.12, -0.68);
    g.add(beaker);

    this.s9BeakerLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.102, 0.14, 20),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, roughness: 0.08 }),
    );
    this.s9BeakerLiquid.position.set(-0.05, 0.075, -0.68);
    g.add(this.s9BeakerLiquid);

    const rand = seededRandom(909);
    this.s9BeakerSand = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.006, 0),
      new THREE.MeshStandardMaterial({ color: 0xd9b382, roughness: 0.9 }),
      220,
    );
    this.s9BeakerSaltVision = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.007, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xffffff, emissiveIntensity: 0.6 }),
      90,
    );
    for (let i = 0; i < 220; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.09;
      this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.015 + rand() * 0.02, -0.68 + Math.sin(a) * r);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.s9BeakerSand.setMatrixAt(i, this.dummy.matrix);
    }
    this.s9BeakerSand.instanceMatrix.needsUpdate = true;
    g.add(this.s9BeakerSand, this.s9BeakerSaltVision);

    // Center: Ring Stand + Glass Funnel + Pleated Filter Paper Cone
    const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.64, 10), steelMat);
    standPole.position.set(0.14, 0.32, -0.15);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.009, 8, 24), steelMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.02, 0.38, -0.15);
    const funnel = this.registerGlass(
      new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 24, 1, true), this.materials.createGlassMaterial()),
    );
    funnel.rotation.x = Math.PI;
    funnel.position.set(-0.02, 0.39, -0.15);
    const paperCone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 20, 1, true), filterMat);
    paperCone.rotation.x = Math.PI;
    paperCone.position.set(-0.02, 0.4, -0.15);
    g.add(standPole, ring, funnel, paperCone);

    this.s9FilterSand = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.006, 0),
      new THREE.MeshStandardMaterial({ color: 0xc29b6a, roughness: 0.92 }),
      160,
    );
    for (let i = 0; i < 160; i++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.065;
      this.dummy.position.set(-0.02 + Math.cos(a) * r, 0.36 + r * 0.8, -0.15 + Math.sin(a) * r);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.s9FilterSand.setMatrixAt(i, this.dummy.matrix);
    }
    this.s9FilterSand.instanceMatrix.needsUpdate = true;
    g.add(this.s9FilterSand);

    // Hot Plate + Porcelain Evaporating Dish + Condenser Hood (z = +0.55)
    const hotBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.38), darkMat);
    hotBase.position.set(-0.05, 0.045, 0.52);
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.016, 24), this.s9HotPlateGlowMat);
    burner.position.set(-0.05, 0.095, 0.52);
    const dishPts = [
      new THREE.Vector2(0, 0.005),
      new THREE.Vector2(0.09, 0.008),
      new THREE.Vector2(0.145, 0.065),
      new THREE.Vector2(0.135, 0.07),
      new THREE.Vector2(0.085, 0.018),
      new THREE.Vector2(0, 0.016),
    ];
    const dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 28), ceramicMat);
    dish.position.set(-0.05, 0.102, 0.52);
    g.add(hotBase, burner, dish);

    this.s9DishLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.085, 0.04, 24),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5, roughness: 0.06 }),
    );
    this.s9DishLiquid.position.set(-0.05, 0.135, 0.52);
    g.add(this.s9DishLiquid);

    this.s9DishSaltCrystals = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.008, 0.008, 0.008),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }),
      180,
    );
    this.s9DishSaltVision = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.007, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8fafc, emissiveIntensity: 0.65 }),
      80,
    );
    for (let i = 0; i < 180; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.095;
      this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.122 + rand() * 0.008, 0.52 + Math.sin(a) * r);
      this.dummy.rotation.set(rand(), rand(), rand());
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.s9DishSaltCrystals.setMatrixAt(i, this.dummy.matrix);
    }
    this.s9DishSaltCrystals.instanceMatrix.needsUpdate = true;
    g.add(this.s9DishSaltCrystals, this.s9DishSaltVision);

    // Overhead Condenser Hood + Boiling/Mist particles
    const hood = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 0.22, 24, 1, true), this.materials.createGlassMaterial()),
    );
    hood.position.set(-0.05, 0.48, 0.52);
    this.s9CondenserWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.04, 20),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 }),
    );
    this.s9CondenserWater.position.set(-0.05, 0.55, 0.52);
    g.add(hood, this.s9CondenserWater);

    this.s9BoilingBubbles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.008, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.8 }),
      28,
    );
    this.s9VaporVision = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.01, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0284c7, emissiveIntensity: 0.8 }),
      36,
    );
    this.s9UpperMist = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.022, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.35, depthWrite: false }),
      22,
    );
    g.add(this.s9BoilingBubbles, this.s9VaporVision, this.s9UpperMist);

    // Hot Plate Digital LCD
    this.s9HotPlateCanvas = document.createElement('canvas');
    this.s9HotPlateCanvas.width = 256;
    this.s9HotPlateCanvas.height = 96;
    this.s9HotPlateTex = new THREE.CanvasTexture(this.s9HotPlateCanvas);
    this.s9HotPlateTex.colorSpace = THREE.SRGBColorSpace;
    this.disposableTextures.push(this.s9HotPlateTex);
    const lcd = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.085),
      new THREE.MeshBasicMaterial({ map: this.s9HotPlateTex }),
    );
    lcd.position.set(-0.235, 0.048, 0.52);
    lcd.rotation.y = -Math.PI / 2;
    g.add(lcd);

    this.root.add(g);
  }

  private syncStation9(state: Station9State, _pourPulse: number, evapPulse: number, t: number): void {
    this.s9BeakerLiquid.visible = state.beakerWaterGrams > 0.5;
    this.s9BeakerSand.visible = state.beakerSandGrams > 0.5;
    this.s9BeakerSaltVision.visible = this.particleVisionEnabled && state.beakerSaltGrams > 0.5;
    if (this.s9BeakerSaltVision.visible) {
      for (let i = 0; i < 90; i++) {
        const ang = i * 1.9 + t * 0.8;
        const r = 0.015 + ((i * 11) % 100) * 0.0008;
        const y = 0.02 + ((i * 7) % 100) * 0.001;
        this.dummy.position.set(-0.05 + Math.cos(ang) * r, y, -0.68 + Math.sin(ang) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s9BeakerSaltVision.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9BeakerSaltVision.instanceMatrix.needsUpdate = true;
    }

    this.s9FilterSand.visible = state.filterTrappedSandGrams > 0.5;
    this.s9DishLiquid.visible = state.dishWaterGrams > 0.5;
    this.s9DishSaltCrystals.visible = state.dishCrystallizedSaltGrams > 0.5;
    this.s9CondenserWater.visible = state.condenserCapturedWaterGrams > 0.5;

    this.s9DishSaltVision.visible = this.particleVisionEnabled && state.dishDissolvedSaltGrams > 0.5;
    if (this.s9DishSaltVision.visible) {
      for (let i = 0; i < 80; i++) {
        const ang = i * 2.3 + t * 0.9;
        const r = 0.01 + ((i * 13) % 100) * 0.00085;
        this.dummy.position.set(-0.05 + Math.cos(ang) * r, 0.125 + (i % 4) * 0.006, 0.52 + Math.sin(ang) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s9DishSaltVision.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9DishSaltVision.instanceMatrix.needsUpdate = true;
    }

    const isHot = state.hotPlateTempCelsius >= 90;
    this.s9HotPlateGlowMat.emissiveIntensity = isHot ? 1.8 : 0.05;

    const showSteam = isHot && evapPulse > 0;
    this.s9BoilingBubbles.visible = showSteam;
    this.s9VaporVision.visible = showSteam && this.particleVisionEnabled;
    this.s9UpperMist.visible = showSteam;
    if (showSteam) {
      for (let i = 0; i < 28; i++) {
        const a = i * 2.1;
        const r = ((i * 17) % 100) * 0.00085;
        this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.12 + ((t * 0.3 + i * 0.08) % 0.04), 0.52 + Math.sin(a) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s9BoilingBubbles.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9BoilingBubbles.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 36; i++) {
        const a = i * 1.9 + t;
        const r = ((i * 13) % 100) * 0.001;
        this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.18 + ((t * 0.28 + i * 0.07) % 0.28), 0.52 + Math.sin(a) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s9VaporVision.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9VaporVision.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 22; i++) {
        const a = i * 2.5 + t * 0.5;
        const r = ((i * 15) % 100) * 0.001;
        this.dummy.position.set(-0.05 + Math.cos(a) * r, 0.34 + ((t * 0.14 + i * 0.06) % 0.14), 0.52 + Math.sin(a) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s9UpperMist.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9UpperMist.instanceMatrix.needsUpdate = true;
    }

    const sig = `${state.hotPlateTempCelsius}_${state.stage}`;
    if (sig !== this.lastS9Sig) {
      this.lastS9Sig = sig;
      const ctx = this.s9HotPlateCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#071525';
        ctx.fillRect(0, 0, 256, 96);
        ctx.strokeStyle = isHot ? '#f97316' : '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, 250, 90);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText('HOT PLATE', 14, 28);
        ctx.fillStyle = isHot ? '#fb923c' : '#38bdf8';
        ctx.font = 'bold 26px monospace';
        ctx.fillText(formatGrade5Temperature(state.hotPlateTempCelsius), 14, 72);
        this.s9HotPlateTex.needsUpdate = true;
      }
    }
  }

  // ============================================================================
  // STATION 10: SOLUTIONS & DISSOLVING RATE LAB (PART A + PART B)
  // ============================================================================

  private buildStation10(): void {
    const meta = this.stations.station_10_solutions_dissolving;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const glassMat = this.materials.createGlassMaterial(0xe0f2fe);
    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);

    // Part A (z = -0.92 .. -0.20): 4 Solubility Test Beakers (Salt, Sugar, Sand, Pepper)
    const partAZ = [-0.95, -0.71, -0.47, -0.23];
    const partAColors = [0xf8fafc, 0xfef9c3, 0xd9b382, 0x334155];
    const rand = seededRandom(1010);

    partAZ.forEach((bz, idx) => {
      const bkr = this.registerGlass(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.16, 20, 1, true), glassMat));
      bkr.position.set(-0.08, 0.08, bz);
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(0.074, 0.071, 0.105, 18),
        new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42, roughness: 0.08 }),
      );
      water.position.set(-0.08, 0.056, bz);
      g.add(bkr, water);

      const inst = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.005, 0),
        new THREE.MeshStandardMaterial({ color: partAColors[idx] ?? 0xffffff, roughness: 0.6 }),
        95,
      );
      for (let i = 0; i < 95; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 0.06;
        this.dummy.position.set(-0.08 + Math.cos(a) * r, 0.012 + rand() * 0.015, bz + Math.sin(a) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        inst.setMatrixAt(i, this.dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      g.add(inst);

      if (idx === 0) {
        this.s10PartASaltCrystals = inst;
        this.s10PartASaltVision = new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.006, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7 }),
          60,
        );
        for (let i = 0; i < 60; i++) {
          const a = rand() * Math.PI * 2;
          const r = rand() * 0.06;
          this.dummy.position.set(-0.08 + Math.cos(a) * r, 0.018 + rand() * 0.08, bz + Math.sin(a) * r);
          this.dummy.scale.setScalar(1);
          this.dummy.updateMatrix();
          this.s10PartASaltVision.setMatrixAt(i, this.dummy.matrix);
        }
        this.s10PartASaltVision.instanceMatrix.needsUpdate = true;
        g.add(this.s10PartASaltVision);
      } else if (idx === 1) {
        this.s10PartASugarCrystals = inst;
        this.s10PartASugarVision = new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.006, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.65 }),
          60,
        );
        for (let i = 0; i < 60; i++) {
          const a = rand() * Math.PI * 2;
          const r = rand() * 0.06;
          this.dummy.position.set(-0.08 + Math.cos(a) * r, 0.018 + rand() * 0.08, bz + Math.sin(a) * r);
          this.dummy.scale.setScalar(1);
          this.dummy.updateMatrix();
          this.s10PartASugarVision.setMatrixAt(i, this.dummy.matrix);
        }
        this.s10PartASugarVision.instanceMatrix.needsUpdate = true;
        g.add(this.s10PartASugarVision);
      } else if (idx === 2) {
        this.s10PartASandGrains = inst;
      } else {
        this.s10PartAPepperSpecks = inst;
      }
    });

    // Part B (z = +0.18 & +0.72): Side-by-Side Comparison Race Beaker A & Beaker B + Stopwatch Stand
    this.s10BeakerARingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8 });
    this.s10BeakerBRingMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.8 });

    const makeRaceBeaker = (z: number, ringMat: THREE.MeshStandardMaterial) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.155, 0.03, 28), steelMat);
      base.position.set(-0.02, 0.015, z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.012, 10, 28), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-0.02, 0.032, z);
      const bkr = this.registerGlass(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.115, 0.24, 24, 1, true), glassMat));
      bkr.position.set(-0.02, 0.15, z);
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(0.112, 0.108, 0.16, 22),
        new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.44, roughness: 0.07 }),
      );
      water.position.set(-0.02, 0.11, z);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.28, 10), glassMat);
      rod.position.set(-0.02, 0.18, z);
      rod.rotation.z = 0.12;
      g.add(base, ring, bkr, water, rod);
      return rod;
    };

    this.s10StirRodA = makeRaceBeaker(0.22, this.s10BeakerARingMat);
    this.s10StirRodB = makeRaceBeaker(0.76, this.s10BeakerBRingMat);

    const fineGeo = new THREE.BoxGeometry(0.008, 0.008, 0.008);
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const visionMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8fafc, emissiveIntensity: 0.7 });
    this.s10CrystalARemain = new THREE.InstancedMesh(fineGeo, whiteMat, 120);
    this.s10CrystalBRemain = new THREE.InstancedMesh(fineGeo, whiteMat, 120);
    this.s10VisionSaltA = new THREE.InstancedMesh(new THREE.SphereGeometry(0.007, 6, 6), visionMat, 80);
    this.s10VisionSaltB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.007, 6, 6), visionMat, 80);

    for (const [inst, bz] of [
      [this.s10CrystalARemain, 0.22],
      [this.s10CrystalBRemain, 0.76],
    ] as const) {
      for (let i = 0; i < 120; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 0.085;
        this.dummy.position.set(-0.02 + Math.cos(a) * r, 0.036 + rand() * 0.012, bz + Math.sin(a) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        inst.setMatrixAt(i, this.dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      g.add(inst);
    }
    g.add(this.s10VisionSaltA, this.s10VisionSaltB);

    this.s10CoarseCubeA = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.055), whiteMat);
    this.s10CoarseCubeA.position.set(-0.02, 0.06, 0.22);
    this.s10CoarseCubeB = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.055), whiteMat);
    this.s10CoarseCubeB.position.set(-0.02, 0.06, 0.76);
    g.add(this.s10CoarseCubeA, this.s10CoarseCubeB);

    // Digital Stopwatch Stand between Beaker A and Beaker B
    const swStand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.24), this.materials.getStandardMaterial('anodizedDark', 1, 1));
    swStand.position.set(0.22, 0.09, 0.49);
    g.add(swStand);

    this.s10StopwatchCanvas = document.createElement('canvas');
    this.s10StopwatchCanvas.width = 256;
    this.s10StopwatchCanvas.height = 128;
    this.s10StopwatchTex = new THREE.CanvasTexture(this.s10StopwatchCanvas);
    this.s10StopwatchTex.colorSpace = THREE.SRGBColorSpace;
    this.disposableTextures.push(this.s10StopwatchTex);
    const swScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.12),
      new THREE.MeshBasicMaterial({ map: this.s10StopwatchTex }),
    );
    swScreen.position.set(0.155, 0.1, 0.49);
    swScreen.rotation.y = -Math.PI / 2;
    g.add(swScreen);

    this.root.add(g);
  }

  private syncStation10(state: Station10State, t: number): void {
    // Part A: Salt & Sugar disappear cleanly into transparent solutions once tested
    const sA = state.solubilityBeakers;
    this.s10PartASaltCrystals.visible = sA.table_salt.visualOutcome !== 'clear_solution';
    this.s10PartASaltVision.visible =
      this.particleVisionEnabled && sA.table_salt.visualOutcome === 'clear_solution';
    this.s10PartASugarCrystals.visible = sA.granulated_sugar.visualOutcome !== 'clear_solution';
    this.s10PartASugarVision.visible =
      this.particleVisionEnabled && sA.granulated_sugar.visualOutcome === 'clear_solution';
    this.s10PartASandGrains.visible = true;
    this.s10PartAPepperSpecks.visible = true;

    // Part B: Side-by-Side Race Beaker A & Beaker B
    const setRingColor = (mat: THREE.MeshStandardMaterial, preset: 'cool' | 'room' | 'warm') => {
      if (preset === 'cool') {
        mat.color.setHex(0x38bdf8);
        mat.emissive.setHex(0x0284c7);
      } else if (preset === 'warm') {
        mat.color.setHex(0xf97316);
        mat.emissive.setHex(0xea580c);
      } else {
        mat.color.setHex(0x94a3b8);
        mat.emissive.setHex(0x334155);
      }
    };
    setRingColor(this.s10BeakerARingMat, state.beakerA.config.waterTempPreset);
    setRingColor(this.s10BeakerBRingMat, state.beakerB.config.waterTempPreset);

    // Spin stir rods when stirring & race active
    if (state.beakerA.config.stirred && state.beakerA.status === 'dissolving') {
      this.s10StirRodA.rotation.y = t * 10;
    }
    if (state.beakerB.config.stirred && state.beakerB.status === 'dissolving') {
      this.s10StirRodB.rotation.y = t * 10;
    }

    const syncRaceCrystals = (
      beaker: Station10State['beakerA'],
      fineInst: THREE.InstancedMesh,
      coarseCube: THREE.Mesh,
      visionInst: THREE.InstancedMesh,
      bz: number,
    ) => {
      const rem = Math.max(0, 1 - beaker.dissolvedFraction);
      const isCoarse = beaker.config.grainSize === 'coarse';
      fineInst.visible = !isCoarse && rem > 0.02;
      coarseCube.visible = isCoarse && rem > 0.02;

      if (fineInst.visible) {
        fineInst.scale.setScalar(Math.max(0.05, rem));
        fineInst.position.set(-0.02 * (1 - fineInst.scale.x), 0.032 * (1 - fineInst.scale.y), bz * (1 - fineInst.scale.z));
      }
      if (coarseCube.visible) {
        coarseCube.scale.setScalar(Math.max(0.08, rem));
      }

      visionInst.visible = this.particleVisionEnabled && beaker.dissolvedFraction > 0.04;
      if (visionInst.visible) {
        const activeCount = Math.max(4, Math.round(80 * beaker.dissolvedFraction));
        for (let i = 0; i < 80; i++) {
          if (i >= activeCount) {
            this.dummy.scale.setScalar(0.0001);
          } else {
            const ang = i * 1.8 + t * (beaker.config.stirred ? 3.0 : 0.8);
            const r = 0.015 + ((i * 17) % 100) * 0.00085;
            const y = 0.045 + ((i * 11) % 100) * 0.0012;
            this.dummy.position.set(-0.02 + Math.cos(ang) * r, y, bz + Math.sin(ang) * r);
            this.dummy.scale.setScalar(1);
          }
          this.dummy.updateMatrix();
          visionInst.setMatrixAt(i, this.dummy.matrix);
        }
        visionInst.instanceMatrix.needsUpdate = true;
      }
    };

    syncRaceCrystals(state.beakerA, this.s10CrystalARemain, this.s10CoarseCubeA, this.s10VisionSaltA, 0.22);
    syncRaceCrystals(state.beakerB, this.s10CrystalBRemain, this.s10CoarseCubeB, this.s10VisionSaltB, 0.76);

    const sig = `${state.stopwatchSeconds.toFixed(1)}_${state.beakerA.status}_${state.beakerB.status}`;
    if (sig !== this.lastS10Sig) {
      this.lastS10Sig = sig;
      const ctx = this.s10StopwatchCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#04121b';
        ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, 250, 122);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText('RACE STOPWATCH', 14, 24);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 42px monospace';
        ctx.fillText(`${state.stopwatchSeconds.toFixed(1)} s`, 14, 72);
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 15px system-ui, sans-serif';
        const aTxt = state.beakerA.status === 'completed' ? `A:${state.beakerA.elapsedSeconds.toFixed(1)}s` : `A:${state.beakerA.status}`;
        const bTxt = state.beakerB.status === 'completed' ? `B:${state.beakerB.elapsedSeconds.toFixed(1)}s` : `B:${state.beakerB.status}`;
        ctx.fillText(`${aTxt}   ${bTxt}`, 14, 108);
        this.s10StopwatchTex.needsUpdate = true;
      }
    }
  }

  private registerGlass(mesh: THREE.Mesh): THREE.Mesh {
    this.glassMeshes.push(mesh);
    return mesh;
  }
}
