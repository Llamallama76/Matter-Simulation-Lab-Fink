/**
 * Sunlit Two-Wing 10-Station Research Hall, Parametric Laboratory Equipment, and Dynamic
 * Granular/State Particle Builder for MATTERVERSE.
 * Zero external .glb/.3ds models: built 100% procedurally with LatheGeometry, TubeGeometry,
 * ExtrudeGeometry, InstancedMesh, and live CanvasTextures.
 */

import * as THREE from 'three';
import {
  GRAPHICS_TIER_PRESETS,
  type GraphicsQualityTier,
} from '../config/graphicsTiers';
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
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.94)';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.98)';
    ctx.font = 'bold 20px system-ui, sans-serif';

    const majorSteps = 10; // Every 10 mL (10, 20, ..., 100 mL) with 5 mL half-ticks
    const bottomY = 474;
    const spanY = 410;
    for (let i = 1; i <= majorSteps; i++) {
      const y = bottomY - (i / majorSteps) * spanY;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(176, y);
      ctx.lineTo(256, y);
      ctx.stroke();

      // 5 mL half-step minor tick below each 10 mL major mark
      const halfY = y + spanY / (majorSteps * 2);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(198, halfY);
      ctx.lineTo(244, halfY);
      ctx.stroke();

      const val = Math.round((maxMl / majorSteps) * i);
      ctx.fillText(`${val} mL`, 264, y + 7);
    }

    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.98)';
    ctx.fillText(labelText, 148, 34);
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
    ctx.fillStyle = '#0b1220';
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

function createSmallLabelTexture(text: string, bgHex = '#0f172a', fgHex = '#f8fafc'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(2, 2, 252, 60, 10);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = fgHex;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
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
  private hoverRing!: THREE.Mesh;
  private hoveredTargetPos: THREE.Vector3 | null = null;
  private hoveredTargetScale = 1;

  // Station 1 refs
  private s1SpecimenMeshes = new Map<Station1SpecimenId, THREE.Object3D>();
  private s1MagnifierArm = new THREE.Group();
  private s1MagnifierGroup = new THREE.Group();

  // Station 2 refs
  private s2ScratchGrooves = new Map<Station2SpecimenId, THREE.Mesh[]>();
  private s2ToolGroup = new THREE.Group();
  private s2PennyGroup = new THREE.Group();
  private s2NailGroup = new THREE.Group();
  private s2DustParticles!: THREE.InstancedMesh;

  // Station 3 refs
  private s3MagnetItems = new Map<Station3MagnetItemId, THREE.Object3D>();
  private s3MagnetBar = new THREE.Group();
  private s3WaftPlumes: THREE.Mesh[] = [];
  private s3JarPositions = new Map<Station3ScentJarId, THREE.Vector3>();
  private s3Stoppers = new Map<Station3ScentJarId, THREE.Mesh>();
  private s3WaftHand = new THREE.Group();
  private s3NoseDetector = new THREE.Group();

  // Station 4 refs
  private s4ObjectMeshes = new Map<Station4ObjectId, THREE.Object3D>();
  private s4BalancePan!: THREE.Mesh;
  private s4WaterColumn!: THREE.Mesh;
  private s4MeniscusMesh!: THREE.Mesh;
  private s4LaserLine!: THREE.Mesh;
  private s4SplashRing!: THREE.Mesh;
  private s4RetrievalThreads = new Map<Station4ObjectId, THREE.Mesh>();
  private s4DisplayedGrams = 0;
  private s4SplashPulse = 0;
  private lastS4Submerged: Station4ObjectId | null = null;
  private s4BalanceCanvas!: HTMLCanvasElement;
  private s4BalanceTex!: THREE.CanvasTexture;
  private lastS4BalanceSig = '';

  // Station 5 refs
  private s5IceBlock!: THREE.Mesh;
  private s5LiquidPool!: THREE.Mesh;
  private s5MeniscusWaveRing!: THREE.Mesh;
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
  private s7MagnetCore!: THREE.Mesh;

  // Station 8 refs
  private s8SieveBasket = new THREE.Group();
  private s8CupGrains!: THREE.InstancedMesh;
  private s8GravelInstances!: THREE.InstancedMesh;
  private s8CatchSandInstances!: THREE.InstancedMesh;
  private s8FallingSand!: THREE.InstancedMesh;

  // Station 9 refs (Photorealistic Multi-Stage Separation Benchmark)
  private s9SourceBeakerGroup = new THREE.Group();
  private s9PourStream!: THREE.Mesh;
  private s9BeakerLiquid!: THREE.Mesh;
  private s9BeakerSand!: THREE.InstancedMesh;
  private s9BeakerSaltVision!: THREE.InstancedMesh;
  private s9FilterSlurryPool!: THREE.Mesh;
  private s9WetSandCake!: THREE.Mesh;
  private s9FilterSand!: THREE.InstancedMesh;
  private s9StemStream!: THREE.Mesh;
  private s9FilterDrops!: THREE.InstancedMesh;
  private s9ErlenmeyerGroup = new THREE.Group();
  private s9FlaskLiquid!: THREE.Mesh;
  private s9FlaskMeniscus!: THREE.Mesh;
  private s9DishSaltCrystals!: THREE.InstancedMesh;
  private s9DishSaltVision!: THREE.InstancedMesh;
  private s9CondenserWater!: THREE.Mesh;
  private s9CondenserDrops!: THREE.InstancedMesh;
  private s9HotPlateGlowMat!: THREE.MeshStandardMaterial;
  private s9DialKnobGroup = new THREE.Group();
  private s9StatusLedMat!: THREE.MeshStandardMaterial;
  private s9BoilingBubbles!: THREE.InstancedMesh;
  private s9VaporVision!: THREE.InstancedMesh;
  private s9UpperMist!: THREE.InstancedMesh;
  private s9HotPlateCanvas!: HTMLCanvasElement;
  private s9HotPlateTex!: THREE.CanvasTexture;
  private lastS9Sig = '';
  private lastS9SimTime = 0;
  private lastS9Stage: Station9State['stage'] = 'beaker_ready';
  private s9FilterAnimProgress = 0;
  private s9EvapAnimProgress = 0;
  private readonly s9CrystalOffsets: Array<{
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    baseScale: number;
    radialOrder: number;
  }> = [];
  private readonly s9FilterSandOffsets: Array<{
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    baseScale: number;
  }> = [];

  private readonly benchSpotLights = new Map<LabStationId, THREE.SpotLight>();
  private activeFocusId: StationFocusId = 'overview';

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
  private s10StirBarA!: THREE.Mesh;
  private s10StirBarB!: THREE.Mesh;
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
  private readonly tmpVec3 = new THREE.Vector3();

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

    this.enableEquipmentShadows();
    this.syncBenchShadowMaps();
  }

  public highlightStation(stationId: StationFocusId): void {
    this.activeFocusId = stationId;
    this.syncBenchShadowMaps();
    if (stationId === 'overview') {
      this.selectionRing.visible = false;
      return;
    }
    const meta = this.stations[stationId];
    this.selectionRing.visible = true;
    this.selectionRing.position.set(meta.anchorPosition.x, 0.02, meta.anchorPosition.z);
  }

  public setHoveredObject(obj: THREE.Object3D | null): void {
    if (!obj) {
      this.hoveredTargetPos = null;
      this.hoverRing.visible = false;
      return;
    }
    const worldPos = this.tmpVec3;
    obj.getWorldPosition(worldPos);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(0.08, Math.min(0.65, Math.max(size.x, size.z) * 0.65));
    this.hoveredTargetPos = new THREE.Vector3(worldPos.x, Math.max(0.03, box.min.y + 0.008), worldPos.z);
    this.hoveredTargetScale = radius / 0.14;
    this.hoverRing.position.copy(this.hoveredTargetPos);
    this.hoverRing.scale.setScalar(this.hoveredTargetScale);
    this.hoverRing.visible = true;
  }

  public setParticleVision(enabled: boolean): void {
    this.particleVisionEnabled = enabled;
  }

  public setQualityTier(tier: GraphicsQualityTier): void {
    this.qualityTier = tier;
    this.syncBenchShadowMaps();
  }

  private enableEquipmentShadows(): void {
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (mat && !mat.transparent && mat.visible !== false && obj.position.y < 2.2) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      }
    });
  }

  /**
   * Enables crisp overhead SpotLight shadows on the focused station workbench (plus priority benches)
   * while keeping active shadow maps <= 5 so WebGL2's 16-texture-unit limit is never exceeded.
   */
  private syncBenchShadowMaps(): void {
    const shadowsEnabled = GRAPHICS_TIER_PRESETS[this.qualityTier].shadowsEnabled;
    if (!shadowsEnabled) {
      for (const spot of this.benchSpotLights.values()) {
        spot.castShadow = false;
      }
      return;
    }

    const activeShadowSet = new Set<LabStationId>();
    if (this.activeFocusId !== 'overview') {
      activeShadowSet.add(this.activeFocusId);
    }
    const priorityBenches: LabStationId[] = [
      'station_9_filtration_evaporation',
      'station_4_mass_volume',
      'station_2_hardness_scratch',
      'station_10_solutions_dissolving',
    ];
    for (const pid of priorityBenches) {
      if (activeShadowSet.size >= 4) break;
      activeShadowSet.add(pid);
    }

    for (const [id, spot] of this.benchSpotLights.entries()) {
      spot.castShadow = activeShadowSet.has(id);
    }
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
    if (this.hoverRing.visible && this.hoveredTargetPos) {
      const mat = this.hoverRing.material as THREE.MeshBasicMaterial;
      const pulse = 1 + Math.sin(t * 6.0) * 0.1;
      this.hoverRing.scale.setScalar(this.hoveredTargetScale * pulse);
      mat.opacity = 0.65 + Math.sin(t * 6.0) * 0.25;
    }

    this.syncStation1(params.station1, t);
    this.syncStation2(params.station2, anims.scratchPulse, t);
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
  // STATION COORDINATES & MACRO CAMERA FRAMING (~0.85m above bench, ~28° angle)
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
        orbitTarget: new THREE.Vector3(x, 1.05, z),
        defaultOrbitAzimuth: Math.PI / 2,
        defaultOrbitPolar: 1.08, // ~28° downward elevation
        defaultOrbitRadius: 1.54, // ~0.85m above 0.915m benchtop
        cameraPosition: new THREE.Vector3(x + 1.36, 1.77, z),
        lookTarget: new THREE.Vector3(x, 1.05, z),
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
        orbitTarget: new THREE.Vector3(x, 1.05, z),
        defaultOrbitAzimuth: -Math.PI / 2,
        defaultOrbitPolar: 1.08,
        defaultOrbitRadius: 1.54,
        cameraPosition: new THREE.Vector3(x - 1.36, 1.77, z),
        lookTarget: new THREE.Vector3(x, 1.05, z),
      };
    });

    return map;
  }

  // ============================================================================
  // HIGH-CONTRAST STUDIO RESEARCH HALL & BENCH CHASSIS
  // ============================================================================

  private buildSunlitResearchHall(): void {
    const floorMat = this.materials.getStandardMaterial('terrazzoFloor', 14, 10);
    const wallMat = this.materials.getStandardMaterial('labWallPanel', 8, 2);
    const steelMat = this.materials.getStandardMaterial('brushedSteel', 2, 1);
    const darkTrimMat = this.materials.getStandardMaterial('anodizedDark', 2, 1);
    const skylightMat = this.materials.getStandardMaterial('skylightGlass', 2, 2);

    // 34m x 24m dark charcoal slate tiled floor with subtle specular sheen
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.root.add(floor);

    // Central promenade slate runner strip
    const promenadeMat = new THREE.MeshStandardMaterial({
      color: 0x161f2e,
      roughness: 0.34,
      metalness: 0.12,
    });
    const promenade = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 21.5), promenadeMat);
    promenade.rotation.x = -Math.PI / 2;
    promenade.position.y = 0.004;
    promenade.receiveShadow = true;
    this.root.add(promenade);

    // Crisp glowing Wing A (Cyan) and Wing B (Emerald) LED lane guides
    const wingALane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.11, 19.5),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.35,
      }),
    );
    wingALane.rotation.x = -Math.PI / 2;
    wingALane.position.set(-4.9, 0.007, 0);

    const wingBLane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.11, 19.5),
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 1.35,
      }),
    );
    wingBLane.rotation.x = -Math.PI / 2;
    wingBLane.position.set(4.9, 0.007, 0);
    this.root.add(wingALane, wingBLane);

    // Perimeter dark architectural studio walls (height 5.6m)
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

    // Dark anodized wainscoting + brushed stainless columns along East/West walls
    for (const sx of [-16.82, 16.82]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 23.6), darkTrimMat);
      band.position.set(sx, 0.55, 0);
      this.root.add(band);

      for (const pz of [-9, -4.5, 0, 4.5, 9]) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.5, 0.24), steelMat);
        pilaster.position.set(sx > 0 ? 16.76 : -16.76, 2.75, pz);
        this.root.add(pilaster);
      }
    }

    // Studio acoustic ceiling + 3 framed overhead linear light bays
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5.6;
    this.root.add(ceiling);

    for (const z of [-6.8, 0, 6.8]) {
      const skylight = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.8), skylightMat);
      skylight.rotation.x = Math.PI / 2;
      skylight.position.set(0, 5.56, z);
      this.root.add(skylight);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.14, 3.1), steelMat);
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
    const darkCabMat = this.materials.getStandardMaterial('anodizedDark', 1, 1);

    for (const id of Object.keys(this.stations) as StationFocusId[]) {
      if (id === 'overview') continue;
      const meta = this.stations[id];
      const desc = LAB_STATION_CATALOG[id];
      const bx = meta.anchorPosition.x;
      const bz = meta.anchorPosition.z;
      const isWingA = bx < 0;
      const accentHex = isWingA ? '#38bdf8' : '#34d399';
      const accentColor = isWingA ? 0x38bdf8 : 0x34d399;

      const benchGroup = new THREE.Group();
      benchGroup.position.set(bx, 0, bz);
      benchGroup.userData['stationId'] = id;

      // Chemical-resistant dark epoxy tabletop: 1.25m depth (X) × 2.5m width (Z)
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.07, 2.5), epoxyMat);
      topMesh.position.y = 0.88;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      topMesh.userData['stationId'] = id;
      topMesh.userData['hoverLabel'] = `${desc.shortLabel} — Click to zoom in`;
      benchGroup.add(topMesh);

      // Dark anodized steel cabinet base with stainless trim
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.82, 2.3), darkCabMat);
      cab.position.y = 0.42;
      cab.castShadow = true;
      cab.receiveShadow = true;
      cab.userData['stationId'] = id;
      benchGroup.add(cab);

      // Brushed stainless-steel legs & horizontal rails
      for (const lx of [-0.56, 0.56]) {
        for (const lz of [-1.18, 1.18]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.86, 12), steelMat);
          leg.position.set(lx, 0.43, lz);
          benchGroup.add(leg);
        }
      }

      // Crisp LED indicator strip along promenade bench edge
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.036, 0.032, 2.38),
        new THREE.MeshStandardMaterial({
          color: accentColor,
          emissive: accentColor,
          emissiveIntensity: 0.85,
        }),
      );
      strip.position.set(isWingA ? 0.62 : -0.62, 0.84, 0);
      benchGroup.add(strip);

      // Overhead brushed-steel light gantry & crisp station placard facing promenade
      const archX = isWingA ? -0.52 : 0.52;
      for (const pz of [-1.05, 1.05]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.38, 10), steelMat);
        post.position.set(archX, 1.58, pz);
        benchGroup.add(post);
      }
      const headerBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.18), steelMat);
      headerBar.position.set(archX, 2.24, 0);
      benchGroup.add(headerBar);

      // Cantilevered task-spotlight boom bar above tabletop
      const boomX = isWingA ? -0.22 : 0.22;
      const boomBar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 1.75), darkCabMat);
      boomBar.position.set(boomX, 2.52, 0);
      benchGroup.add(boomBar);

      const ledBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.015, 1.55),
        new THREE.MeshStandardMaterial({
          color: 0xfffbeb,
          emissive: 0xfef3c7,
          emissiveIntensity: 0.9,
        }),
      );
      ledBar.position.set(0, 2.49, 0);
      benchGroup.add(ledBar);

      // Crisp overhead workbench SpotLight (angle: 0.55, penumbra: 0.6, intensity: 3.5)
      const taskSpot = new THREE.SpotLight(0xfff6ea, 3.5, 6.2, 0.55, 0.6, 1.05);
      taskSpot.position.set(isWingA ? 0.18 : -0.18, 2.46, 0);
      taskSpot.shadow.mapSize.set(1024, 1024);
      taskSpot.shadow.camera.near = 0.4;
      taskSpot.shadow.camera.far = 3.6;
      taskSpot.shadow.bias = -0.00025;
      taskSpot.shadow.normalBias = 0.012;
      taskSpot.target.position.set(0, 0.915, 0);
      benchGroup.add(taskSpot, taskSpot.target);
      this.benchSpotLights.set(id, taskSpot);

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
      placard.position.set(archX + (isWingA ? 0.04 : -0.04), 2.18, 0);
      placard.rotation.y = isWingA ? Math.PI / 2 : -Math.PI / 2;
      placard.userData['stationId'] = id;
      placard.userData['hoverLabel'] = `${desc.shortLabel} — Click to zoom in`;
      benchGroup.add(placard);

      // Invisible bench tap pad for effortless Roam-Mode click-to-focus
      const hitPad = new THREE.Mesh(
        new THREE.BoxGeometry(1.38, 1.25, 2.55),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hitPad.position.y = 1.08;
      hitPad.userData['stationId'] = id;
      hitPad.userData['isBenchPad'] = true;
      hitPad.userData['hoverLabel'] = `${desc.shortLabel} — Click to inspect bench`;
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

    const hoverGeo = new THREE.RingGeometry(0.11, 0.145, 36);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.hoverRing = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.visible = false;
    this.root.add(this.hoverRing);
  }

  private tagInteractive(
    obj: THREE.Object3D,
    stationId: LabStationId,
    hoverLabel: string,
    stationAction?: string,
  ): void {
    obj.userData['stationId'] = stationId;
    obj.userData['hoverLabel'] = hoverLabel;
    if (stationAction) {
      obj.userData['stationAction'] = stationAction;
    }
    this.interactiveMeshes.push(obj);
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
    const velvetMat = this.materials.getStandardMaterial('velvetTray', 2, 2);

    // Midnight-velvet specimen tray with brushed-steel bezel on left
    const trayBezel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.024, 1.82), steelMat);
    trayBezel.position.set(-0.22, 0.012, 0);
    const velvetPad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.028, 1.76), velvetMat);
    velvetPad.position.set(-0.22, 0.014, 0);
    g.add(trayBezel, velvetPad);

    // Illuminated right inspection pedestal (velvet stage center)
    const stageRim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.036, 32), steelMat);
    stageRim.position.set(0.18, 0.018, 0);
    const stageTop = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 32), velvetMat);
    stageTop.position.set(0.18, 0.02, 0);
    g.add(stageRim, stageTop);

    // Gooseneck raking inspection lamp (TubeGeometry + LED emitter disc)
    const lampCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.34, 0.02, -0.4),
      new THREE.Vector3(-0.34, 0.44, -0.26),
      new THREE.Vector3(-0.08, 0.56, -0.09),
      new THREE.Vector3(0.11, 0.46, 0),
    ]);
    const lampNeck = new THREE.Mesh(new THREE.TubeGeometry(lampCurve, 20, 0.015, 10, false), steelMat);
    const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.1, 18), steelMat);
    lampHead.position.set(0.13, 0.43, 0);
    lampHead.rotation.z = 0.52;
    const lampGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.048, 16),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef3c7, emissiveIntensity: 1.4 }),
    );
    lampGlow.position.set(0.16, 0.39, 0);
    lampGlow.rotation.x = Math.PI / 2;
    lampGlow.rotation.y = 0.48;
    g.add(lampNeck, lampHead, lampGlow);

    // Articulated brass-rimmed optical magnifier arm
    const magPost = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.34, 12), steelMat);
    magPost.position.set(0.36, 0.17, -0.32);
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.36, 0.33, -0.32),
      new THREE.Vector3(0.32, 0.36, -0.15),
      new THREE.Vector3(0.18, 0.25, 0),
    ]);
    const armMesh = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 16, 0.009, 8, false), steelMat);
    this.s1MagnifierArm.add(armMesh);
    g.add(magPost, this.s1MagnifierArm);

    const lensRim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.013, 12, 32), brassMat);
    lensRim.rotation.x = Math.PI / 2;
    const lensGlass = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 24), this.materials.createGlassMaterial(0xe0f2fe)),
    );
    const magHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.12, 10), brassMat);
    magHandle.rotation.z = Math.PI / 2;
    magHandle.position.x = 0.16;
    this.s1MagnifierGroup.add(lensRim, lensGlass, magHandle);
    this.s1MagnifierGroup.position.set(0.18, 0.24, 0);
    this.tagInteractive(lensGlass, 'station_1_luster_texture', 'Optical Magnifier — Click to toggle lens', 's1:toggleMag');
    g.add(this.s1MagnifierGroup);

    // 7 Distinct Photorealistic Specimens on velvet tray
    const ids = Object.keys(STATION1_SPECIMENS) as Station1SpecimenId[];
    ids.forEach((id, idx) => {
      const spec = STATION1_SPECIMENS[id];
      const spGroup = new THREE.Group();

      if (id === 'brushed_aluminum_bar') {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.042, 0.062),
          new THREE.MeshStandardMaterial({ color: spec.colorHex, metalness: 0.94, roughness: 0.22 }),
        );
        spGroup.add(bar);
      } else if (id === 'pyrite_copper_nugget') {
        const pyriteMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.94, roughness: 0.18 });
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.068, 0.068), pyriteMat);
        c1.rotation.set(0.2, 0.4, 0.15);
        const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.052, 0.052), pyriteMat);
        c2.position.set(0.032, 0.016, 0.022);
        c2.rotation.set(-0.3, 0.9, 0.4);
        spGroup.add(c1, c2);
      } else if (id === 'quartz_crystal_s1') {
        const qMat = new THREE.MeshPhysicalMaterial({
          color: 0xf1f5f9,
          roughness: 0.06,
          metalness: 0.02,
          clearcoat: 1.0,
          transmission: this.qualityTier === 'Ultra' ? 0.65 : 0,
          transparent: true,
          opacity: 0.92,
        });
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.09, 6), qMat);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.042, 6), qMat);
        tip.position.y = 0.066;
        spGroup.add(shaft, tip);
      } else if (id === 'colored_acrylic_beads') {
        const beadOffsets: Array<[number, number, number, number]> = [
          [-0.025, 0, -0.02, 0x06b6d4],
          [0.026, 0, -0.018, 0xec4899],
          [0, 0.018, 0.025, 0xf59e0b],
        ];
        for (const [bx, by, bz, hex] of beadOffsets) {
          const bead = new THREE.Mesh(
            new THREE.SphereGeometry(0.026, 18, 14),
            new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.06, clearcoat: 1.0, metalness: 0.04 }),
          );
          bead.position.set(bx, by, bz);
          spGroup.add(bead);
        }
      } else if (id === 'smooth_river_glass') {
        const seaGlass = new THREE.Mesh(
          new THREE.SphereGeometry(0.044, 18, 14),
          new THREE.MeshPhysicalMaterial({
            color: 0x67e8f9,
            roughness: 0.26,
            metalness: 0.0,
            clearcoat: 0.45,
            transmission: this.qualityTier === 'Ultra' ? 0.52 : 0,
            transparent: true,
            opacity: 0.88,
          }),
        );
        seaGlass.scale.set(1.25, 0.52, 0.95);
        spGroup.add(seaGlass);
      } else {
        const mat = (spec.texture === 'rough' ? roughMat.clone() : dullMat.clone());
        mat.color.setHex(spec.colorHex);
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.048, 1), mat);
        rock.scale.set(1.1, 0.82, 0.95);
        spGroup.add(rock);
      }

      spGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          this.tagInteractive(
            child,
            'station_1_luster_texture',
            `${spec.displayName} — Click to inspect under magnifier`,
            `s1:inspect:${id}`,
          );
        }
      });

      spGroup.position.set(-0.22, 0.062, -0.78 + idx * 0.26);
      spGroup.userData['homePos'] = spGroup.position.clone();
      g.add(spGroup);
      this.s1SpecimenMeshes.set(id, spGroup);
    });

    this.root.add(g);
  }

  private syncStation1(state: Station1State, t: number): void {
    for (const [id, mesh] of this.s1SpecimenMeshes) {
      const home = mesh.userData['homePos'] as THREE.Vector3;
      const isActive = state.activeSpecimenId === id;
      const targetX = isActive ? 0.18 : home.x;
      const targetY = isActive ? 0.085 : home.y;
      const targetZ = isActive ? 0 : home.z;
      mesh.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.18);
      if (isActive) {
        mesh.rotation.y = t * 0.65;
      } else {
        mesh.rotation.y = 0;
      }
    }
    const targetMagX = state.magnifierActive ? 0.18 : 0.34;
    const targetMagY = state.magnifierActive ? 0.24 + Math.sin(t * 2.2) * 0.008 : 0.35;
    const targetMagZ = state.magnifierActive ? 0 : -0.22;
    this.s1MagnifierGroup.position.lerp(new THREE.Vector3(targetMagX, targetMagY, targetMagZ), 0.18);
    this.s1MagnifierArm.visible = state.magnifierActive;
  }

  // ============================================================================
  // STATION 2: HARDNESS SCRATCH BENCH
  // ============================================================================

  private buildStation2(): void {
    const meta = this.stations.station_2_hardness_scratch;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);
    const darkMat = this.materials.getStandardMaterial('anodizedDark', 1, 1);

    // Brushed steel clamped specimen anvil running along bench
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 2.05), darkMat);
    anvilBase.position.set(0.02, 0.012, 0);
    g.add(anvilBase);

    const ids = Object.keys(STATION2_SPECIMENS) as Station2SpecimenId[];
    ids.forEach((id, idx) => {
      const spec = STATION2_SPECIMENS[id];
      const zPos = -0.82 + idx * 0.41;

      // Specimen clamps on left/right edges
      for (const cx of [-0.11, 0.15]) {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.055, 0.048), steelMat);
        clamp.position.set(cx, 0.036, zPos);
        g.add(clamp);
      }

      const tile = new THREE.Mesh(
        id === 'quartz_crystal_s2'
          ? new THREE.CylinderGeometry(0.075, 0.085, 0.065, 6)
          : new THREE.BoxGeometry(0.22, 0.042, 0.22),
        new THREE.MeshStandardMaterial({
          color: spec.colorHex,
          roughness: spec.luster === 'dull' ? 0.88 : 0.22,
          metalness: spec.luster === 'metallic' ? 0.88 : 0.06,
        }),
      );
      tile.position.set(0.02, 0.042, zPos);
      tile.castShadow = true;
      this.tagInteractive(
        tile,
        'station_2_hardness_scratch',
        `${spec.displayName} — Click to test scratch`,
        `s2:scratch:${id}`,
      );
      g.add(tile);

      // Permanent carved scratch trenches revealed ONLY when tool hardness > specimen hardness
      const grooves: THREE.Mesh[] = [];
      const topY = 0.065 + (id === 'quartz_crystal_s2' ? 0.012 : 0);
      for (const offset of [-0.042, 0.042]) {
        const grooveMat = new THREE.MeshStandardMaterial({
          color: id === 'talc_chalk' ? 0xffffff : 0x334155,
          roughness: 0.95,
          metalness: 0.1,
        });
        const groove = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.006, 0.012), grooveMat);
        groove.position.set(0.02, topY, zPos + offset);
        groove.rotation.y = 0.18;
        groove.visible = false;
        g.add(groove);
        grooves.push(groove);
      }
      this.s2ScratchGrooves.set(id, grooves);
    });

    // Side tool pad with Copper Penny (#b87333 ridged) & Pointed Steel Nail
    const toolPad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.016, 0.46), darkMat);
    toolPad.position.set(0.28, 0.008, 0);
    g.add(toolPad);

    const pennyDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.01, 24),
      new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.28 }),
    );
    const pennyRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.046, 0.005, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xc27b3c, metalness: 0.92, roughness: 0.24 }),
    );
    pennyRim.rotation.x = Math.PI / 2;
    pennyRim.position.y = 0.005;
    this.s2PennyGroup.add(pennyDisc, pennyRim);
    this.tagInteractive(pennyDisc, 'station_2_hardness_scratch', 'Copper Penny Scratch Tool — Click to equip', 's2:tool:copper_penny');

    const nailShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 12), steelMat);
    nailShaft.position.y = 0.05;
    const nailPoint = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.045, 12), steelMat);
    nailPoint.rotation.x = Math.PI;
    nailPoint.position.y = -0.04;
    const nailHead = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 12), steelMat);
    nailHead.position.y = 0.12;
    this.s2NailGroup.add(nailShaft, nailPoint, nailHead);
    this.tagInteractive(nailShaft, 'station_2_hardness_scratch', 'Carbon-Steel Nail Tool — Click to equip', 's2:tool:steel_nail');

    this.s2ToolGroup.add(this.s2PennyGroup, this.s2NailGroup);
    this.s2ToolGroup.position.set(0.26, 0.14, 0);
    g.add(this.s2ToolGroup);

    // Mineral dust burst particles during scratch animation
    this.s2DustParticles = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.005, 0),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 }),
      36,
    );
    this.s2DustParticles.visible = false;
    g.add(this.s2DustParticles);

    this.root.add(g);
  }

  private syncStation2(state: Station2State, scratchPulse: number, t: number): void {
    const ids = Object.keys(STATION2_SPECIMENS) as Station2SpecimenId[];
    let activeZ = 0;
    ids.forEach((id, idx) => {
      const rec = state.scratchRecords[id];
      const grooves = this.s2ScratchGrooves.get(id);
      if (grooves && grooves[0] && grooves[1]) {
        grooves[0].visible = rec.scratchedByPenny;
        grooves[1].visible = rec.scratchedByNail;
      }
      if (id === state.activeSpecimenId) {
        activeZ = -0.82 + idx * 0.41;
        const sweep = scratchPulse > 0 ? Math.sin(scratchPulse * Math.PI * 3) * 0.07 : 0;
        this.s2ToolGroup.position.lerp(
          new THREE.Vector3(0.04 + sweep, scratchPulse > 0 ? 0.105 : 0.19, activeZ),
          0.25,
        );
      }
    });

    this.s2PennyGroup.visible = state.activeTool === 'copper_penny';
    this.s2NailGroup.visible = state.activeTool === 'steel_nail';

    this.s2DustParticles.visible = scratchPulse > 0.1;
    if (this.s2DustParticles.visible) {
      const progress = 1 - scratchPulse;
      for (let i = 0; i < 36; i++) {
        const ang = i * 2.1 + t * 4;
        const r = progress * (0.04 + (i % 5) * 0.022);
        const y = 0.07 + Math.sin(progress * Math.PI) * (0.03 + (i % 4) * 0.015);
        this.dummy.position.set(0.02 + Math.cos(ang) * r, y, activeZ + Math.sin(ang) * r);
        this.dummy.scale.setScalar(Math.max(0.1, scratchPulse));
        this.dummy.updateMatrix();
        this.s2DustParticles.setMatrixAt(i, this.dummy.matrix);
      }
      this.s2DustParticles.instanceMatrix.needsUpdate = true;
    }
  }

  // ============================================================================
  // STATION 3: MAGNETISM & SAFE WAFTING STATION
  // ============================================================================

  private buildStation3(): void {
    const meta = this.stations.station_3_magnetism_wafting;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);

    // Left brushed-steel specimen tray
    const trayMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 1.15), steelMat);
    trayMesh.position.set(0.05, 0.01, -0.5);
    g.add(trayMesh);

    const itemIds = Object.keys(STATION3_MAGNET_ITEMS) as Station3MagnetItemId[];
    itemIds.forEach((id, idx) => {
      const spec = STATION3_MAGNET_ITEMS[id];
      const mat = new THREE.MeshStandardMaterial({
        color: spec.colorHex,
        metalness: spec.isShinyMetal ? 0.92 : 0.08,
        roughness: spec.isShinyMetal ? 0.2 : 0.55,
      });

      let mesh: THREE.Object3D;
      if (id === 'iron_nail') {
        const nailGrp = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.008, 0.14, 10), mat);
        shaft.rotation.z = Math.PI / 2;
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 12), mat);
        head.rotation.z = Math.PI / 2;
        head.position.x = -0.072;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025, 10), mat);
        tip.rotation.z = -Math.PI / 2;
        tip.position.x = 0.082;
        nailGrp.add(shaft, head, tip);
        mesh = nailGrp;
      } else if (id === 'steel_paperclip') {
        const loop = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.045, 0, -0.018),
          new THREE.Vector3(0.045, 0, -0.018),
          new THREE.Vector3(0.045, 0, 0.018),
          new THREE.Vector3(-0.035, 0, 0.018),
          new THREE.Vector3(-0.035, 0, -0.008),
        ]);
        mesh = new THREE.Mesh(new THREE.TubeGeometry(loop, 24, 0.005, 8, false), mat);
      } else if (id === 'copper_wire') {
        const helixPts: THREE.Vector3[] = [];
        for (let k = 0; k <= 36; k++) {
          const a = (k / 36) * Math.PI * 6;
          helixPts.push(new THREE.Vector3(Math.cos(a) * 0.036, (k / 36) * 0.022, Math.sin(a) * 0.036));
        }
        mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 36, 0.006, 8, false), mat);
      } else if (id === 'aluminum_foil') {
        // Crinkled shiny aluminum foil ball with displaced vertices
        const foilGeo = new THREE.IcosahedronGeometry(0.044, 1);
        const pos = foilGeo.attributes['position'];
        if (pos) {
          for (let v = 0; v < pos.count; v++) {
            const vx = pos.getX(v);
            const vy = pos.getY(v);
            const vz = pos.getZ(v);
            const n = 0.85 + Math.abs(Math.sin(vx * 67 + vy * 43 + vz * 89)) * 0.35;
            pos.setXYZ(v, vx * n, vy * n, vz * n);
          }
          foilGeo.computeVertexNormals();
        }
        mesh = new THREE.Mesh(foilGeo, mat);
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.065), mat);
      }

      const zPos = -0.95 + idx * 0.23;
      mesh.position.set(0.05, 0.045, zPos);
      mesh.userData['homePos'] = mesh.position.clone();
      mesh.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.castShadow = true;
          this.tagInteractive(
            c,
            'station_3_magnetism_wafting',
            `${spec.displayName} — Click to test with magnet`,
            `s3:magnet:${id}`,
          );
        }
      });
      g.add(mesh);
      this.s3MagnetItems.set(id, mesh);
    });

    // U-Shaped Red/Silver Alnico Bar Magnet with N/S poles
    const uCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.048, -0.04, 0),
      new THREE.Vector3(-0.048, 0.055, 0),
      new THREE.Vector3(0, 0.095, 0),
      new THREE.Vector3(0.048, 0.055, 0),
      new THREE.Vector3(0.048, -0.04, 0),
    ]);
    const uBody = new THREE.Mesh(
      new THREE.TubeGeometry(uCurve, 24, 0.019, 12, false),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.32, metalness: 0.35 }),
    );
    const tipL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.032, 12), steelMat);
    tipL.position.set(-0.048, -0.052, 0);
    const tipR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.032, 12), steelMat);
    tipR.position.set(0.048, -0.052, 0);
    this.s3MagnetBar.add(uBody, tipL, tipR);
    this.s3MagnetBar.position.set(0.28, 0.24, -0.45);
    g.add(this.s3MagnetBar);

    // Right half (z > 0): 3 Amber-Tinted Apothecary Jars + Ground-Glass Stoppers
    const jarIds = Object.keys(STATION3_SCENT_JARS) as Station3ScentJarId[];
    const amberGlassMat = this.materials.createGlassMaterial(0xd97706);
    jarIds.forEach((id, idx) => {
      const jarSpec = STATION3_SCENT_JARS[id];
      const zPos = 0.35 + idx * 0.34;
      const jarPts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.075, 0),
        new THREE.Vector2(0.078, 0.17),
        new THREE.Vector2(0.048, 0.21),
        new THREE.Vector2(0.054, 0.24),
      ];
      const jarMesh = this.registerGlass(new THREE.Mesh(new THREE.LatheGeometry(jarPts, 24), amberGlassMat));
      jarMesh.position.set(0.05, 0, zPos);
      this.tagInteractive(
        jarMesh,
        'station_3_magnetism_wafting',
        `${jarSpec.label} — Click to Waft Air safely`,
        `s3:waft:${id}`,
      );
      g.add(jarMesh);

      const liq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.066, 0.066, 0.085, 18),
        new THREE.MeshPhysicalMaterial({ color: jarSpec.liquidColorHex, roughness: 0.1, opacity: 0.85, transparent: true }),
      );
      liq.position.set(0.05, 0.048, zPos);
      g.add(liq);

      // Front jar label placard
      const lblTex = createSmallLabelTexture(jarSpec.label.split(' ')[0] ?? jarSpec.label, '#1c1917', '#fde68a');
      this.disposableTextures.push(lblTex);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.032), new THREE.MeshBasicMaterial({ map: lblTex }));
      lbl.position.set(0.129, 0.11, zPos);
      lbl.rotation.y = Math.PI / 2;
      g.add(lbl);

      // Ground-glass stopper
      const stopper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.036, 0.045, 16),
        amberGlassMat,
      );
      stopper.position.set(0.05, 0.255, zPos);
      stopper.userData['homeY'] = 0.255;
      g.add(stopper);
      this.s3Stoppers.set(id, stopper);

      this.s3JarPositions.set(id, new THREE.Vector3(0.05, 0.27, zPos));
    });

    // Stylized 3D Curved Hand-Wafting Assembly + Nose Aroma Detector
    const palmMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55 });
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.016, 0.1), palmMat);
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.014, 0.055), palmMat);
    fingers.position.set(0, 0.012, -0.07);
    fingers.rotation.x = -0.35;
    this.s3WaftHand.add(palm, fingers);
    this.s3WaftHand.visible = false;
    g.add(this.s3WaftHand);

    const detectorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.008, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.9 }),
    );
    this.s3NoseDetector.add(detectorRing);
    this.s3NoseDetector.position.set(0.24, 0.44, 0.69);
    this.s3NoseDetector.rotation.y = Math.PI / 2;
    this.s3NoseDetector.visible = false;
    g.add(this.s3NoseDetector);

    for (let i = 0; i < 4; i++) {
      const ribbon = new THREE.Mesh(
        new THREE.TorusGeometry(0.07 + i * 0.025, 0.01, 8, 20, Math.PI * 0.85),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.62 }),
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
        this.s3MagnetBar.position.lerp(new THREE.Vector3(home.x, 0.21, home.z), 0.2);
      }
    } else {
      this.s3MagnetBar.position.lerp(new THREE.Vector3(0.28, 0.24, -0.45), 0.12);
    }

    for (const [id, mesh] of this.s3MagnetItems) {
      const home = mesh.userData['homePos'] as THREE.Vector3;
      const attracted = state.magnetTested[id] && state.magnetAttracted[id] && activeId === id;
      const target = attracted ? new THREE.Vector3(home.x, 0.138, home.z) : home;
      mesh.position.lerp(target, 0.22);
    }

    // Uncap active stopper & animate curved hand wafting toward nose detector
    for (const [jarId, stopper] of this.s3Stoppers) {
      const homeY = stopper.userData['homeY'] as number;
      const uncapped = state.activeWaftingJarId === jarId && waftPulse > 0;
      stopper.position.y = THREE.MathUtils.lerp(stopper.position.y, uncapped ? homeY + 0.11 : homeY, 0.22);
      stopper.position.x = THREE.MathUtils.lerp(stopper.position.x, uncapped ? -0.04 : 0.05, 0.22);
    }

    const jarPos = state.activeWaftingJarId ? this.s3JarPositions.get(state.activeWaftingJarId) : null;
    if (jarPos && waftPulse > 0) {
      this.s3WaftHand.visible = true;
      this.s3NoseDetector.visible = true;
      const arc = Math.sin(t * 7.5);
      this.s3WaftHand.position.set(jarPos.x + 0.04 + arc * 0.05, jarPos.y + 0.11, jarPos.z + arc * 0.09);
      this.s3WaftHand.rotation.y = arc * 0.45;
      this.s3NoseDetector.position.set(jarPos.x + 0.18, jarPos.y + 0.19, jarPos.z);
    } else {
      this.s3WaftHand.visible = false;
      this.s3NoseDetector.visible = false;
    }

    this.s3WaftPlumes.forEach((ribbon, i) => {
      if (jarPos && waftPulse > 0) {
        ribbon.visible = true;
        const phase = (t * 2.5 + i * 0.25) % 1;
        ribbon.position.set(jarPos.x + phase * 0.18, jarPos.y + 0.04 + phase * 0.18, jarPos.z);
        ribbon.rotation.z = t * 2.2 + i;
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

    // Digital Analytical Balance (0.1 g precision, depressing stainless pan)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.44), darkMat);
    chassis.position.set(0.05, 0.04, -0.58);
    this.s4BalancePan = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.016, 28), steelMat);
    this.s4BalancePan.position.set(0.05, 0.09, -0.64);
    this.tagInteractive(
      this.s4BalancePan,
      'station_4_mass_volume',
      'Digital Balance Pan — Click objects or Weigh button',
    );
    g.add(chassis, this.s4BalancePan);

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

    // Tall 100 mL Borosilicate Graduated Cylinder (ticks every 5 mL) + Laser-Sight Reader Line
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

    this.s4MeniscusMesh = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.008, 10, 28), waterMat);
    this.s4MeniscusMesh.rotation.x = Math.PI / 2;
    this.s4MeniscusMesh.position.set(0.05, 0.27, 0.12);
    g.add(this.s4MeniscusMesh);

    // Crisp horizontal red laser-sight meniscus reader line
    this.s4LaserLine = new THREE.Mesh(
      new THREE.TorusGeometry(0.088, 0.0025, 8, 32),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 1.5,
      }),
    );
    this.s4LaserLine.rotation.x = Math.PI / 2;
    this.s4LaserLine.position.set(0.05, 0.26, 0.12);
    g.add(this.s4LaserLine);

    // Gentle expanding water splash ring
    this.s4SplashRing = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.062, 24),
      new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
    );
    this.s4SplashRing.rotation.x = -Math.PI / 2;
    this.s4SplashRing.visible = false;
    g.add(this.s4SplashRing);

    // 3 Solid Test Objects + Fine Retrieval Threads
    const objIds = Object.keys(STATION4_OBJECTS) as Station4ObjectId[];
    const threadMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
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
      this.tagInteractive(
        mesh,
        'station_4_mass_volume',
        `${spec.displayName} — Click to weigh on balance`,
        `s4:weigh:${id}`,
      );
      g.add(mesh);
      this.s4ObjectMeshes.set(id, mesh);

      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.54, 6), threadMat);
      thread.visible = false;
      g.add(thread);
      this.s4RetrievalThreads.set(id, thread);
    });

    this.root.add(g);
  }

  private syncStation4(state: Station4State, _t: number): void {
    // 1. Scale water column, concave meniscus, and laser-sight line smoothly
    const targetHeight = (state.currentWaterVolumeMl / 100) * 0.46;
    this.s4WaterColumn.scale.y = THREE.MathUtils.lerp(this.s4WaterColumn.scale.y, targetHeight, 0.16);
    this.s4WaterColumn.position.y = 0.03 + this.s4WaterColumn.scale.y * 0.5;
    const meniscusY = 0.03 + this.s4WaterColumn.scale.y;
    this.s4MeniscusMesh.position.y = meniscusY;
    this.s4LaserLine.position.y = meniscusY - 0.003;

    // Gentle splash pulse when newly submerged
    if (state.submergedObject !== this.lastS4Submerged) {
      if (state.submergedObject !== null) {
        this.s4SplashPulse = 1.0;
      }
      this.lastS4Submerged = state.submergedObject;
    }
    if (this.s4SplashPulse > 0.02) {
      this.s4SplashPulse = Math.max(0, this.s4SplashPulse - 0.06);
      this.s4SplashRing.visible = true;
      this.s4SplashRing.position.set(0.05, meniscusY + 0.004, 0.12);
      this.s4SplashRing.scale.setScalar(0.5 + (1 - this.s4SplashPulse) * 0.7);
      (this.s4SplashRing.material as THREE.MeshBasicMaterial).opacity = this.s4SplashPulse * 0.75;
    } else {
      this.s4SplashRing.visible = false;
    }

    // 2. Balance pan gentle depression + object placement + retrieval thread
    const panLoaded = state.objectOnBalance !== null;
    this.s4BalancePan.position.y = THREE.MathUtils.lerp(this.s4BalancePan.position.y, panLoaded ? 0.082 : 0.09, 0.22);

    for (const [id, mesh] of this.s4ObjectMeshes) {
      const home = mesh.userData['homePos'] as THREE.Vector3;
      let target = home;
      if (state.objectOnBalance === id) {
        target = new THREE.Vector3(0.05, this.s4BalancePan.position.y + 0.042, -0.64);
      } else if (state.submergedObject === id) {
        target = new THREE.Vector3(0.05, 0.075, 0.12);
      }
      mesh.position.lerp(target, 0.18);

      const thread = this.s4RetrievalThreads.get(id);
      if (thread) {
        thread.visible = state.submergedObject === id;
        if (thread.visible) {
          thread.position.set(mesh.position.x, mesh.position.y + 0.27, mesh.position.z);
        }
      }
    }

    // 3. Smoothly counting green digital LCD readout
    this.s4DisplayedGrams = THREE.MathUtils.lerp(this.s4DisplayedGrams, state.balanceReadoutGrams, 0.26);
    if (Math.abs(this.s4DisplayedGrams - state.balanceReadoutGrams) < 0.15) {
      this.s4DisplayedGrams = state.balanceReadoutGrams;
    }
    const sig = `${this.s4DisplayedGrams.toFixed(1)}_${state.currentWaterVolumeMl.toFixed(1)}`;
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
        ctx.fillText('ANALYTICAL BALANCE', 14, 26);
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 38px monospace';
        ctx.fillText(`${this.s4DisplayedGrams.toFixed(1)} g`, 20, 74);
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

    // Digital Peltier heater/cooler pedestal
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.56), darkMat);
    base.position.set(0.05, 0.045, 0);
    g.add(base);

    // Sealed borosilicate glass cylinder chamber
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

    // Faceted Crystalline Ice Cube (definite shape <= 0°C)
    this.s5IceBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        roughness: 0.12,
        transparent: true,
        opacity: 0.86,
        clearcoat: 1,
        transmission: this.qualityTier === 'Ultra' ? 0.35 : 0,
      }),
    );
    this.s5IceBlock.position.set(0.05, 0.18, 0);
    g.add(this.s5IceBlock);

    // Conforming Rippling Liquid Water (1..99°C)
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

    this.s5MeniscusWaveRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.185, 0.006, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7 }),
    );
    this.s5MeniscusWaveRing.rotation.x = Math.PI / 2;
    this.s5MeniscusWaveRing.position.set(0.05, 0.23, 0);
    g.add(this.s5MeniscusWaveRing);

    // Boiling bubbles, clear-zone Particle Vision vapor, upper condensed mist, & Particle Vision lattice
    this.s5BoilingBubbles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.011, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.82 }),
      36,
    );
    this.s5VaporVision = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.013, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0284c7, emissiveIntensity: 0.95 }),
      48,
    );
    this.s5UpperMist = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.026, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.34, depthWrite: false }),
      28,
    );
    this.s5VisionLattice = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.75 }),
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
    const ripple = state.liquidFraction > 0.05 ? Math.sin(t * (state.boilingIntensity > 0.1 ? 9.5 : 3.0)) * 0.012 : 0;
    this.s5LiquidPool.scale.y = Math.max(0.01, state.liquidFraction + ripple);
    this.s5LiquidPool.position.y = 0.09 + 0.07 * this.s5LiquidPool.scale.y;

    this.s5MeniscusWaveRing.visible = this.s5LiquidPool.visible;
    this.s5MeniscusWaveRing.position.y = 0.09 + 0.14 * this.s5LiquidPool.scale.y;
    this.s5MeniscusWaveRing.scale.setScalar(1 + Math.sin(t * 4.5) * 0.015);

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

    // Clear invisible-vapor gap directly above surface -> visible ONLY in Particle Vision (P)
    this.s5VaporVision.visible = this.particleVisionEnabled && state.boilingIntensity > 0.1;
    if (this.s5VaporVision.visible) {
      for (let i = 0; i < 48; i++) {
        const ang = i * 1.7 + t * 2.2;
        const r = 0.02 + ((i * 23) % 100) * 0.0015;
        const y = 0.22 + ((t * 0.42 + i * 0.07) % 0.38);
        this.dummy.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s5VaporVision.setMatrixAt(i, this.dummy.matrix);
      }
      this.s5VaporVision.instanceMatrix.needsUpdate = true;
    }

    // Condensed liquid mist droplets form HIGHER UP near lid (y = 0.44..0.60m), leaving clear gap above liquid
    this.s5UpperMist.visible = state.upperMistIntensity > 0.05;
    if (this.s5UpperMist.visible) {
      for (let i = 0; i < 28; i++) {
        const ang = i * 2.4 + t * 0.4;
        const r = 0.03 + ((i * 17) % 100) * 0.0013;
        const y = 0.44 + ((t * 0.12 + i * 0.05) % 0.16);
        this.dummy.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
        this.dummy.scale.setScalar(state.upperMistIntensity * (0.9 + Math.sin(t + i) * 0.2));
        this.dummy.updateMatrix();
        this.s5UpperMist.setMatrixAt(i, this.dummy.matrix);
      }
      this.s5UpperMist.instanceMatrix.needsUpdate = true;
    }

    // Toggleable Particle Vision (SC.5.P.8.4): Vibrating Lattice / Sliding Liquid / Fast Gas
    this.s5VisionLattice.visible = this.particleVisionEnabled;
    if (this.particleVisionEnabled) {
      for (let i = 0; i < 64; i++) {
        const gx = i % 4;
        const gy = Math.floor(i / 4) % 4;
        const gz = Math.floor(i / 16);
        if (state.currentState === 'solid') {
          const vib = Math.sin(t * 24 + i * 1.3) * 0.003;
          this.dummy.position.set((gx - 1.5) * 0.038 + vib, 0.13 + gy * 0.038 + vib, (gz - 1.5) * 0.038);
        } else if (state.currentState === 'liquid') {
          const ang = i * 1.4 + t * 1.25;
          const r = 0.025 + ((i * 13) % 100) * 0.0014;
          this.dummy.position.set(Math.cos(ang) * r, 0.11 + (gy / 4) * 0.09, Math.sin(ang) * r);
        } else {
          const ang = i * 2.1 + t * 3.8;
          const r = 0.02 + ((i * 19) % 100) * 0.0016;
          const y = 0.11 + ((t * 0.65 + i * 0.08) % 0.48);
          this.dummy.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
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
    const velvetMat = this.materials.getStandardMaterial('velvetTray', 1, 1);

    // Non-slip dark station mat under sorting area
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.008, 1.88), velvetMat);
    mat.position.set(-0.04, 0.004, 0.22);
    g.add(mat);

    // Central shallow white porcelain mixing dish with brushed-steel rim
    const centerTray = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.205, 0.036, 32), dishMat);
    centerTray.position.set(-0.06, 0.02, -0.48);
    const trayRim = new THREE.Mesh(new THREE.TorusGeometry(0.242, 0.008, 10, 32), steelMat);
    trayRim.rotation.x = Math.PI / 2;
    trayRim.position.set(-0.06, 0.038, -0.48);
    this.tagInteractive(centerTray, 'station_6_tweezers_sorting', 'Pick next piece with tweezers', 's6:next');
    g.add(centerTray, trayRim);

    const binZ = [0.02, 0.32, 0.62, 0.92];
    const cats: Array<{
      cat: Station6CategoryId;
      label: string;
      hex: number;
      isCube: boolean;
      binIdx: number;
    }> = [
      { cat: 'red_bead', label: 'Red Beads', hex: 0xef4444, isCube: false, binIdx: 0 },
      { cat: 'blue_bead', label: 'Blue Beads', hex: 0x3b82f6, isCube: false, binIdx: 1 },
      { cat: 'yellow_bead', label: 'Yellow Beads', hex: 0xeab308, isCube: false, binIdx: 2 },
      { cat: 'white_cube', label: 'White Cubes', hex: 0xf8fafc, isCube: true, binIdx: 3 },
    ];

    cats.forEach((c) => {
      const bz = binZ[c.binIdx] ?? 0.45;
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.095, 0.034, 24), steelMat);
      bin.position.set(-0.06, 0.019, bz);
      this.tagInteractive(bin, 'station_6_tweezers_sorting', `Sort ${c.label} into cup`, `s6:sort:${c.cat}`);
      g.add(bin);

      const cupInterior = new THREE.Mesh(
        new THREE.CylinderGeometry(0.104, 0.088, 0.008, 24),
        dishMat,
      );
      cupInterior.position.set(-0.06, 0.033, bz);
      g.add(cupInterior);

      const lblTex = createSmallLabelTexture(c.label, '#0f172a', '#f8fafc');
      this.disposableTextures.push(lblTex);
      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.055),
        new THREE.MeshBasicMaterial({ map: lblTex }),
      );
      lbl.position.set(-0.22, 0.035, bz);
      lbl.rotation.y = -Math.PI / 2;
      lbl.rotation.x = -0.35;
      g.add(lbl);
    });

    // 16 distinct 3D beads/cubes
    const rand = seededRandom(606);
    for (const c of cats) {
      for (let i = 1; i <= 4; i++) {
        const pieceId = `${c.cat}_${i}`;
        const geo = c.isCube ? new THREE.BoxGeometry(0.042, 0.042, 0.042) : new THREE.SphereGeometry(0.025, 18, 14);
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshPhysicalMaterial({
            color: c.hex,
            roughness: 0.18,
            metalness: 0.04,
            clearcoat: 0.7,
          }),
        );
        mesh.castShadow = true;
        const ang = rand() * Math.PI * 2;
        const r = 0.035 + rand() * 0.13;
        const home = new THREE.Vector3(-0.06 + Math.cos(ang) * r, 0.056, -0.48 + Math.sin(ang) * r);
        const binPos = new THREE.Vector3(
          -0.06 + ((i % 2) - 0.5) * 0.062,
          0.052,
          (binZ[c.binIdx] ?? 0.5) + (i > 2 ? 0.032 : -0.032),
        );
        mesh.position.copy(home);
        mesh.userData['homePos'] = home;
        mesh.userData['binPos'] = binPos;
        this.tagInteractive(mesh, 'station_6_tweezers_sorting', `Pick up ${c.label.slice(0, -1)} with tweezers`, 's6:next');
        g.add(mesh);
        this.s6PieceMeshes.set(pieceId, mesh);
      }
    }

    // Precision curved stainless-steel tweezers
    const prong1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.25, 0.016), steelMat);
    prong1.position.set(-0.014, 0, 0);
    prong1.rotation.z = -0.08;
    const prong2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.25, 0.016), steelMat);
    prong2.position.set(0.014, 0, 0);
    prong2.rotation.z = 0.08;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.05, 12), steelMat);
    collar.position.y = 0.12;
    this.s6TweezersGroup.add(prong1, prong2, collar);
    this.s6TweezersGroup.position.set(-0.22, 0.24, -0.48);
    this.tagInteractive(this.s6TweezersGroup, 'station_6_tweezers_sorting', 'Use tweezers to pick & sort next piece', 's6:next');
    g.add(this.s6TweezersGroup);

    this.root.add(g);
  }

  private syncStation6(state: Station6State, tweezersPulse: number, _t: number): void {
    for (const p of state.pieces) {
      const mesh = this.s6PieceMeshes.get(p.pieceId);
      if (!mesh) continue;
      const target = (p.sortedIntoBin ? mesh.userData['binPos'] : mesh.userData['homePos']) as THREE.Vector3;
      mesh.position.lerp(target, 0.22);
    }

    if (tweezersPulse > 0) {
      const phase = 1 - tweezersPulse; // 0 -> 1
      const swoopY = 0.12 + Math.sin(phase * Math.PI) * 0.16;
      const carryZ = -0.48 + phase * 0.72;
      this.s6TweezersGroup.position.set(-0.06, swoopY, carryZ);
      this.s6TweezersGroup.rotation.z = Math.sin(phase * Math.PI) * 0.18;
    } else {
      this.s6TweezersGroup.position.lerp(new THREE.Vector3(-0.22, 0.24, -0.48), 0.18);
      this.s6TweezersGroup.rotation.z = THREE.MathUtils.lerp(this.s6TweezersGroup.rotation.z, 0, 0.18);
    }
  }

  // ============================================================================
  // STATION 7: IRON FILINGS & SAND MAGNET STATION
  // ============================================================================

  private buildStation7(): void {
    const meta = this.stations.station_7_iron_sand_magnet;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const glassMat = this.materials.createGlassMaterial(0xe0f2fe);
    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);

    // Glass Petri Tray (-0.06, z = -0.35) with contrast white liner underneath
    const trayPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.265, 0.265, 0.008, 32),
      this.materials.getStandardMaterial('ceramicDish', 1, 1),
    );
    trayPad.position.set(-0.06, 0.004, -0.35);
    const petriRim = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.25, 0.042, 32, 1, true), glassMat),
    );
    petriRim.position.set(-0.06, 0.025, -0.35);
    const petriHit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.045, 20),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    petriHit.position.set(-0.06, 0.024, -0.35);
    this.tagInteractive(petriHit, 'station_7_iron_sand_magnet', 'Sweep sleeved magnet over mixture tray', 's7:sweep');

    // Glass Recovery Dish (-0.06, z = +0.45)
    const recBase = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.008, 28), steelMat);
    recBase.position.set(-0.06, 0.004, 0.45);
    const recGlass = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.165, 0.045, 28, 1, true), glassMat),
    );
    recGlass.position.set(-0.06, 0.027, 0.45);
    const recHit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    recHit.position.set(-0.06, 0.025, 0.45);
    this.tagInteractive(recHit, 'station_7_iron_sand_magnet', 'Slide magnet core up to drop filings here', 's7:release');
    g.add(trayPad, petriRim, petriHit, recBase, recGlass, recHit);

    const mixLbl = createSmallLabelTexture('Sand + Iron Tray', '#0f172a', '#fde68a');
    const recLbl = createSmallLabelTexture('Pure Iron Dish', '#0f172a', '#6ee7b7');
    this.disposableTextures.push(mixLbl, recLbl);
    const l1 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.065), new THREE.MeshBasicMaterial({ map: mixLbl }));
    l1.position.set(-0.34, 0.032, -0.35);
    l1.rotation.y = -Math.PI / 2;
    l1.rotation.x = -0.35;
    const l2 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.065), new THREE.MeshBasicMaterial({ map: recLbl }));
    l2.position.set(-0.3, 0.032, 0.45);
    l2.rotation.y = -Math.PI / 2;
    l2.rotation.x = -0.35;
    g.add(l1, l2);

    // Instanced quartz sand & metallic iron filings
    const sandGeo = new THREE.DodecahedronGeometry(0.0055, 0);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xd9b382, roughness: 0.9 });
    this.s7SandInstances = new THREE.InstancedMesh(sandGeo, sandMat, 420);
    const rand = seededRandom(707);
    for (let i = 0; i < 420; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.21;
      this.dummy.position.set(-0.06 + Math.cos(a) * r, 0.015 + rand() * 0.008, -0.35 + Math.sin(a) * r);
      this.dummy.scale.setScalar(0.8 + rand() * 0.5);
      this.dummy.updateMatrix();
      this.s7SandInstances.setMatrixAt(i, this.dummy.matrix);
    }
    this.s7SandInstances.instanceMatrix.needsUpdate = true;

    const ironGeo = new THREE.BoxGeometry(0.003, 0.003, 0.016);
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88, roughness: 0.28 });
    this.s7IronTrayInstances = new THREE.InstancedMesh(ironGeo, ironMat, 260);
    this.s7IronMagnetInstances = new THREE.InstancedMesh(ironGeo, ironMat, 260);
    this.s7IronDishInstances = new THREE.InstancedMesh(ironGeo, ironMat, 260);

    for (let i = 0; i < 260; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.2;
      this.dummy.position.set(-0.06 + Math.cos(a) * r, 0.019 + rand() * 0.008, -0.35 + Math.sin(a) * r);
      this.dummy.rotation.set(rand(), rand(), rand());
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.s7IronTrayInstances.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(-0.06 + Math.cos(a) * (r * 0.65), 0.016 + rand() * 0.009, 0.45 + Math.sin(a) * (r * 0.65));
      this.dummy.updateMatrix();
      this.s7IronDishInstances.setMatrixAt(i, this.dummy.matrix);

      // Cling radially like spiked iron bristles around the bottom tip of the sleeve
      const phi = rand() * Math.PI * 2;
      const spikeR = 0.025 + rand() * 0.028;
      this.dummy.position.set(
        Math.cos(phi) * spikeR,
        -0.065 - rand() * 0.025,
        Math.sin(phi) * spikeR,
      );
      this.dummy.rotation.set((rand() - 0.5) * 1.4, phi, (rand() - 0.5) * 1.4);
      this.dummy.scale.setScalar(1.1);
      this.dummy.updateMatrix();
      this.s7IronMagnetInstances.setMatrixAt(i, this.dummy.matrix);
    }
    this.s7IronTrayInstances.instanceMatrix.needsUpdate = true;
    this.s7IronDishInstances.instanceMatrix.needsUpdate = true;
    this.s7IronMagnetInstances.instanceMatrix.needsUpdate = true;

    // Sleeved bar magnet with pull-up inner magnetic core
    const sleeve = this.registerGlass(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.17, 20),
        this.materials.createGlassMaterial(0xf8fafc),
      ),
    );
    this.s7MagnetCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.16, 18),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.35, roughness: 0.3 }),
    );
    const coreCap = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.005, 8, 18),
      steelMat,
    );
    coreCap.position.y = 0.092;
    this.s7MagnetCore.add(coreCap);

    this.s7MagnetGroup.add(sleeve, this.s7MagnetCore, this.s7IronMagnetInstances);
    this.s7MagnetGroup.position.set(-0.06, 0.29, 0.05);
    this.tagInteractive(this.s7MagnetGroup, 'station_7_iron_sand_magnet', 'Sweep sleeved magnet over sand & iron', 's7:sweep');
    g.add(this.s7SandInstances, this.s7IronTrayInstances, this.s7IronDishInstances, this.s7MagnetGroup);

    this.root.add(g);
  }

  private syncStation7(state: Station7State, sweepPulse: number, _t: number): void {
    this.s7IronTrayInstances.visible = state.ironInTrayGrams > 0.1;
    this.s7IronMagnetInstances.visible = state.ironOnMagnetGrams > 0.1;
    this.s7IronDishInstances.visible = state.ironInRecoveryDishGrams > 0.1;

    let target = new THREE.Vector3(-0.06, 0.29, 0.05);
    let targetCoreY = 0;
    if (state.magnetPositionedOver === 'tray') {
      target = new THREE.Vector3(-0.06 + Math.sin(sweepPulse * Math.PI * 2) * 0.09, 0.17, -0.35);
      targetCoreY = 0;
    } else if (state.magnetPositionedOver === 'dish') {
      target = new THREE.Vector3(-0.06, 0.21, 0.45);
      // Slide magnetic core upward out of the clear sleeve so filings drop cleanly
      targetCoreY = 0.115;
    }
    this.s7MagnetGroup.position.lerp(target, 0.2);
    this.s7MagnetCore.position.y = THREE.MathUtils.lerp(this.s7MagnetCore.position.y, targetCoreY, 0.22);
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
    const meshMat = this.materials.getStandardMaterial('sieveWireMesh', 4, 4);

    // Stainless catch pan below sieve
    const catchPan = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.225, 0.075, 28), steelMat);
    catchPan.position.set(-0.06, 0.038, 0.02);
    g.add(catchPan);

    // Spun brass 2.0 mm wire-mesh sieve basket + ergonomic side handles
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.235, 0.235, 0.105, 32, 1, true),
      brassMat,
    );
    const screen = new THREE.Mesh(new THREE.CircleGeometry(0.23, 32), meshMat);
    screen.rotation.x = -Math.PI / 2;
    screen.position.y = -0.032;
    const handleL = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 16, Math.PI), brassMat);
    handleL.rotation.y = Math.PI / 2;
    handleL.position.set(0, 0.01, -0.245);
    const handleR = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 16, Math.PI), brassMat);
    handleR.rotation.y = Math.PI / 2;
    handleR.position.set(0, 0.01, 0.245);
    this.s8SieveBasket.add(rim, screen, handleL, handleR);
    this.s8SieveBasket.position.set(-0.06, 0.215, 0.02);
    this.tagInteractive(this.s8SieveBasket, 'station_8_sand_gravel_sieve', 'Pour & shake 2.0 mm brass sieve', 's8:shake');
    g.add(this.s8SieveBasket);

    // Source mixture glass beaker beside sieve
    const cup = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.095, 0.17, 24, 1, true), this.materials.createGlassMaterial()),
    );
    cup.position.set(-0.06, 0.085, -0.58);
    this.tagInteractive(cup, 'station_8_sand_gravel_sieve', 'Pour mixture cup into 2.0 mm sieve', 's8:shake');
    g.add(cup);

    const cupLbl = createSmallLabelTexture('Gravel + Sand Mix', '#0f172a', '#fde68a');
    const sieveLbl = createSmallLabelTexture('2.0 mm Wire Sieve', '#0f172a', '#6ee7b7');
    this.disposableTextures.push(cupLbl, sieveLbl);
    const l1 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.06), new THREE.MeshBasicMaterial({ map: cupLbl }));
    l1.position.set(-0.24, 0.035, -0.58);
    l1.rotation.y = -Math.PI / 2;
    l1.rotation.x = -0.35;
    const l2 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.06), new THREE.MeshBasicMaterial({ map: sieveLbl }));
    l2.position.set(-0.34, 0.035, 0.02);
    l2.rotation.y = -Math.PI / 2;
    l2.rotation.x = -0.35;
    g.add(l1, l2);

    const rand = seededRandom(808);
    this.s8CupGrains = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.011, 0),
      new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.8 }),
      140,
    );
    this.s8GravelInstances = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.019, 0),
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.72 }),
      75,
    );
    this.s8CatchSandInstances = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.006, 0),
      new THREE.MeshStandardMaterial({ color: 0xd9b382, roughness: 0.9 }),
      340,
    );
    this.s8FallingSand = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.0055, 0),
      new THREE.MeshStandardMaterial({ color: 0xe2c08d, roughness: 0.88 }),
      160,
    );
    this.s8FallingSand.visible = false;

    for (let i = 0; i < 140; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.072;
      this.dummy.position.set(-0.06 + Math.cos(a) * r, 0.02 + rand() * 0.075, -0.58 + Math.sin(a) * r);
      this.dummy.scale.setScalar(0.7 + rand() * 0.6);
      this.dummy.updateMatrix();
      this.s8CupGrains.setMatrixAt(i, this.dummy.matrix);
    }
    for (let i = 0; i < 75; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.175;
      this.dummy.position.set(Math.cos(a) * r, -0.012 + rand() * 0.016, Math.sin(a) * r);
      this.dummy.scale.set(1 + rand() * 0.4, 0.72, 1);
      this.dummy.updateMatrix();
      this.s8GravelInstances.setMatrixAt(i, this.dummy.matrix);
    }
    for (let i = 0; i < 340; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.195;
      this.dummy.position.set(-0.06 + Math.cos(a) * r, 0.022 + rand() * 0.015, 0.02 + Math.sin(a) * r);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.s8CatchSandInstances.setMatrixAt(i, this.dummy.matrix);
    }
    this.s8CupGrains.instanceMatrix.needsUpdate = true;
    this.s8GravelInstances.instanceMatrix.needsUpdate = true;
    this.s8CatchSandInstances.instanceMatrix.needsUpdate = true;

    this.s8SieveBasket.add(this.s8GravelInstances);
    g.add(this.s8CupGrains, this.s8CatchSandInstances, this.s8FallingSand);

    this.root.add(g);
  }

  private syncStation8(state: Station8State, shakePulse: number, t: number): void {
    this.s8CupGrains.visible = state.mixtureInCupGrams > 0.5;
    this.s8GravelInstances.visible = state.gravelOnSieveGrams > 0.5;
    this.s8CatchSandInstances.visible = state.fineSandInCatchPanGrams > 0.5;
    this.s8FallingSand.visible = shakePulse > 0.05;

    if (shakePulse > 0) {
      this.s8SieveBasket.position.z = 0.02 + Math.sin(t * 28) * 0.04;
      this.s8SieveBasket.position.x = -0.06 + Math.cos(t * 22) * 0.028;

      for (let i = 0; i < 160; i++) {
        const ang = i * 2.4;
        const rad = 0.02 + ((i * 19) % 100) * 0.0017;
        const fall = ((t * 1.65 + i * 0.07) % 1) * 0.145;
        this.dummy.position.set(
          -0.06 + Math.cos(ang) * rad,
          0.18 - fall,
          0.02 + Math.sin(ang) * rad,
        );
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s8FallingSand.setMatrixAt(i, this.dummy.matrix);
      }
      this.s8FallingSand.instanceMatrix.needsUpdate = true;
    } else {
      this.s8SieveBasket.position.set(-0.06, 0.215, 0.02);
    }
  }

  // ============================================================================
  // STATION 9: PHOTOREALISTIC SALT, SAND & WATER SEPARATION BENCHMARK
  // ============================================================================

  private createBorosilicateScaleTexture(
    marksMl: readonly number[],
    capacityLabel: string,
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
      ctx.fillStyle = 'rgba(248, 250, 252, 0.95)';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Header capacity stamp
      ctx.fillText(capacityLabel, 58, 28);
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.82)';
      ctx.fillText('BORO 3.3', 58, 48);

      // Vertical spine + major/minor mL graduation ticks (top = highest mL, bottom = lowest mL)
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(118, 66);
      ctx.lineTo(118, 234);
      ctx.stroke();

      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      const count = marksMl.length;
      marksMl.forEach((ml, idx) => {
        const frac = count > 1 ? idx / (count - 1) : 0.5;
        const y = 72 + frac * 156;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(92, y);
        ctx.lineTo(118, y);
        ctx.stroke();
        ctx.fillText(`${ml}`, 126, y + 1);

        if (idx < count - 1) {
          const midY = y + (156 / (count - 1)) * 0.5;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(104, midY);
          ctx.lineTo(118, midY);
          ctx.stroke();
        }
      });
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.disposableTextures.push(tex);
    return tex;
  }

  private buildPleatedFilterConeGeometry(): THREE.BufferGeometry {
    const radialSegments = 64; // 16 crisp accordion pleats around 360°
    const heightSegments = 14;
    const coneHeight = 0.148;
    const baseRadius = 0.093;
    const pleatCount = 16;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let j = 0; j <= heightSegments; j++) {
      const v = j / heightSegments; // 0 at cone apex, 1 at top fluted rim
      for (let i = 0; i <= radialSegments; i++) {
        const u = i / radialSegments;
        const theta = u * Math.PI * 2;
        const wave = Math.cos(theta * pleatCount);
        const sharpFold = Math.sign(wave) * Math.pow(Math.abs(wave), 0.68);
        const r =
          v === 0
            ? 0.0015
            : v * (baseRadius + 0.0085 * sharpFold * Math.pow(v, 0.62));
        const rimScallop = v > 0.82 ? 0.0028 * sharpFold * ((v - 0.82) / 0.18) : 0;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = v * coneHeight + rimScallop;

        positions.push(x, y, z);
        uvs.push(u * 2, v);
      }
    }

    const stride = radialSegments + 1;
    for (let j = 0; j < heightSegments; j++) {
      for (let i = 0; i < radialSegments; i++) {
        const a = j * stride + i;
        const b = a + stride;
        const c = b + 1;
        const d = a + 1;
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  private buildStation9(): void {
    const meta = this.stations.station_9_filtration_evaporation;
    const g = new THREE.Group();
    g.position.set(meta.anchorPosition.x, 0.915, meta.anchorPosition.z);

    const glassMat = this.materials.createGlassMaterial(0xe6f4ff);
    const steelMat = this.materials.getStandardMaterial('brushedSteel', 1, 1);
    const darkMat = this.materials.getStandardMaterial('anodizedDark', 1, 1);
    const brassMat = this.materials.getStandardMaterial('brassCollar', 1, 1);
    const corkMat = this.materials.getStandardMaterial('oakWoodTrim', 1, 1);
    const filterMat = this.materials.getStandardMaterial('filterPaper', 1, 1);
    this.s9HotPlateGlowMat = this.materials.getStandardMaterial('heatingElement', 1, 1).clone();

    const rand = seededRandom(909);

    // ------------------------------------------------------------------------
    // ZONE 1 (z = -0.76): SOURCE MIXTURE BEAKER (Tilts & pours into funnel!)
    // ------------------------------------------------------------------------
    const beakerCoaster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.098, 0.102, 0.008, 28),
      darkMat,
    );
    beakerCoaster.position.set(-0.04, 0.004, -0.76);
    g.add(beakerCoaster);

    this.s9SourceBeakerGroup = new THREE.Group();
    this.s9SourceBeakerGroup.position.set(-0.04, 0.008, -0.76);
    g.add(this.s9SourceBeakerGroup);

    // Double-walled borosilicate 250 mL beaker (LatheGeometry with rolled rim)
    const beakerPts = [
      new THREE.Vector2(0, 0.0),
      new THREE.Vector2(0.084, 0.0),
      new THREE.Vector2(0.088, 0.008),
      new THREE.Vector2(0.088, 0.186),
      new THREE.Vector2(0.095, 0.194),
      new THREE.Vector2(0.091, 0.197),
      new THREE.Vector2(0.083, 0.188),
      new THREE.Vector2(0.082, 0.008),
      new THREE.Vector2(0, 0.007),
    ];
    const sourceBeakerMesh = this.registerGlass(
      new THREE.Mesh(new THREE.LatheGeometry(beakerPts, 36), glassMat),
    );
    this.tagInteractive(
      sourceBeakerMesh,
      'station_9_filtration_evaporation',
      'Pour salt-sand-water mixture into pleated filter cone',
      's9:filter',
    );
    this.s9SourceBeakerGroup.add(sourceBeakerMesh);

    // Shaped pouring spout lip on +Z rim (tips cleanly into funnel when rotated around +X)
    const spoutLip = this.registerGlass(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.009, 0.022, 12, 1, true, -Math.PI * 0.45, Math.PI * 0.9),
        glassMat,
      ),
    );
    spoutLip.position.set(0, 0.192, 0.089);
    spoutLip.rotation.x = 0.42;
    this.s9SourceBeakerGroup.add(spoutLip);

    // Crisp white borosilicate graduation scale facing student camera (-X)
    const beakerScaleTex = this.createBorosilicateScaleTexture([200, 150, 100, 50], '250 mL');
    const beakerScaleDecal = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.0892,
        0.0892,
        0.145,
        24,
        1,
        true,
        Math.PI * 1.18,
        Math.PI * 0.64,
      ),
      new THREE.MeshBasicMaterial({
        map: beakerScaleTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beakerScaleDecal.position.y = 0.098;
    this.s9SourceBeakerGroup.add(beakerScaleDecal);

    // Glass stirring rod resting inside source beaker
    const stirRod = this.registerGlass(
      new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.24, 10), glassMat),
    );
    stirRod.position.set(0.018, 0.118, -0.022);
    stirRod.rotation.z = -0.22;
    stirRod.rotation.x = -0.16;
    this.s9SourceBeakerGroup.add(stirRod);

    // Bottom-anchored murky tan salt-sand-water liquid column inside source beaker
    const beakerLiqGeo = new THREE.CylinderGeometry(0.0805, 0.08, 1.0, 28);
    beakerLiqGeo.translate(0, 0.5, 0);
    this.s9BeakerLiquid = new THREE.Mesh(
      beakerLiqGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xb59b76,
        transparent: true,
        opacity: 0.78,
        roughness: 0.16,
        clearcoat: 0.9,
      }),
    );
    this.s9BeakerLiquid.position.set(0, 0.009, 0);
    this.s9BeakerLiquid.scale.set(1, 0.122, 1);
    this.s9SourceBeakerGroup.add(this.s9BeakerLiquid);

    // Instanced quartz sand grains + Particle Vision dissolved salt ions inside source beaker
    this.s9BeakerSand = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.0054, 0),
      new THREE.MeshStandardMaterial({ color: 0xd4ae7a, roughness: 0.88 }),
      240,
    );
    for (let i = 0; i < 240; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.074;
      this.dummy.position.set(Math.cos(a) * r, 0.012 + rand() * 0.022, Math.sin(a) * r);
      this.dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      this.dummy.scale.setScalar(0.75 + rand() * 0.55);
      this.dummy.updateMatrix();
      this.s9BeakerSand.setMatrixAt(i, this.dummy.matrix);
    }
    this.s9BeakerSand.instanceMatrix.needsUpdate = true;
    this.s9SourceBeakerGroup.add(this.s9BeakerSand);

    this.s9BeakerSaltVision = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.006, 6, 6),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0xffffff,
        emissiveIntensity: 0.7,
      }),
      90,
    );
    this.s9SourceBeakerGroup.add(this.s9BeakerSaltVision);

    // Dynamic liquid pour stream connecting tilted beaker spout into pleated filter cone
    this.s9PourStream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.0085, 1.0, 14),
      new THREE.MeshPhysicalMaterial({
        color: 0xc2a882,
        transparent: true,
        opacity: 0.82,
        roughness: 0.08,
        clearcoat: 1.0,
      }),
    );
    this.s9PourStream.visible = false;
    g.add(this.s9PourStream);

    // ------------------------------------------------------------------------
    // ZONE 2 (z = -0.16): MULTI-PART RETORT STAND + BOROSILICATE FUNNEL +
    //                     CONE-FOLDED 16-PLEAT CELLULOSE FILTER PAPER
    // ------------------------------------------------------------------------
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.018, 0.3), darkMat);
    standBase.position.set(0.05, 0.013, -0.16);
    g.add(standBase);

    for (const [fx, fz] of [
      [-0.06, -0.29],
      [0.16, -0.29],
      [-0.06, -0.03],
      [0.16, -0.03],
    ] as Array<[number, number]>) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.006, 12), darkMat);
      foot.position.set(fx, 0.003, fz);
      g.add(foot);
    }

    // Cork support ring pad on retort base beneath funnel stem
    const corkPad = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.092, 0.008, 28), corkMat);
    corkPad.position.set(-0.04, 0.025, -0.16);
    g.add(corkPad);

    // Threaded stainless rod socket collar + vertical brushed stainless retort rod
    const rodCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.024, 0.026, 18),
      steelMat,
    );
    rodCollar.position.set(0.15, 0.034, -0.16);
    const standRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.7, 18),
      steelMat,
    );
    standRod.position.set(0.15, 0.375, -0.16);
    const rodCap = new THREE.Mesh(new THREE.SphereGeometry(0.01, 14, 10), steelMat);
    rodCap.position.set(0.15, 0.725, -0.16);
    g.add(rodCollar, standRod, rodCap);

    // Machined bosshead clamp + knurled brass thumbscrews + iron support ring at y = 0.465
    const bosshead = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.044, 0.038), darkMat);
    bosshead.position.set(0.15, 0.465, -0.16);
    const screwA = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.03, 12), brassMat);
    screwA.rotation.z = Math.PI / 2;
    screwA.position.set(0.176, 0.465, -0.16);
    const screwKnobA = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.009, 16),
      brassMat,
    );
    screwKnobA.rotation.z = Math.PI / 2;
    screwKnobA.position.set(0.192, 0.465, -0.16);
    const screwKnobB = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.009, 16),
      brassMat,
    );
    screwKnobB.rotation.x = Math.PI / 2;
    screwKnobB.position.set(0.15, 0.465, -0.19);

    const ringArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.0055, 0.115, 12),
      steelMat,
    );
    ringArm.rotation.z = Math.PI / 2;
    ringArm.position.set(0.094, 0.465, -0.16);
    const supportRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.0068, 12, 32), steelMat);
    supportRing.rotation.x = Math.PI / 2;
    supportRing.position.set(-0.04, 0.465, -0.16);
    g.add(bosshead, screwA, screwKnobA, screwKnobB, ringArm, supportRing);

    // Thick-walled refractive borosilicate glass funnel (60° bowl + narrow stem at y = 0.265..0.569)
    const funnelPts = [
      new THREE.Vector2(0.0065, 0.0),
      new THREE.Vector2(0.0108, 0.005),
      new THREE.Vector2(0.0112, 0.14),
      new THREE.Vector2(0.104, 0.3),
      new THREE.Vector2(0.109, 0.305),
      new THREE.Vector2(0.103, 0.307),
      new THREE.Vector2(0.098, 0.298),
      new THREE.Vector2(0.0068, 0.138),
      new THREE.Vector2(0.0065, 0.0),
    ];
    const glassFunnel = this.registerGlass(
      new THREE.Mesh(new THREE.LatheGeometry(funnelPts, 36), glassMat),
    );
    glassFunnel.position.set(-0.04, 0.265, -0.16);
    this.tagInteractive(
      glassFunnel,
      'station_9_filtration_evaporation',
      'Filter insoluble sand with pleated filter paper',
      's9:filter',
    );
    g.add(glassFunnel);

    // Cone-folded white 16-pleat cellulose filter paper seated inside the glass funnel
    const pleatedPaperGeo = this.buildPleatedFilterConeGeometry();
    const pleatedFilterPaper = new THREE.Mesh(pleatedPaperGeo, filterMat);
    pleatedFilterPaper.position.set(-0.04, 0.41, -0.16);
    pleatedFilterPaper.castShadow = true;
    pleatedFilterPaper.receiveShadow = true;
    this.tagInteractive(
      pleatedFilterPaper,
      'station_9_filtration_evaporation',
      'Pleated cellulose filter paper — traps sand grains while dissolved salt & water pass through',
      's9:filter',
    );
    g.add(pleatedFilterPaper);

    // Murky slurry pool inside pleated filter cone (rises during pour & drains through paper)
    const slurryGeo = new THREE.ConeGeometry(0.074, 0.112, 28);
    slurryGeo.rotateX(Math.PI); // Apex at bottom, flat meniscus on top
    slurryGeo.translate(0, 0.056, 0); // Anchor apex at local y = 0
    this.s9FilterSlurryPool = new THREE.Mesh(
      slurryGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xb89f78,
        transparent: true,
        opacity: 0.78,
        roughness: 0.14,
      }),
    );
    this.s9FilterSlurryPool.position.set(-0.04, 0.413, -0.16);
    this.s9FilterSlurryPool.visible = false;
    g.add(this.s9FilterSlurryPool);

    // Sculpted wet tan sand filter cake + 220 instanced sand grains lining pleats
    const sandCakeGeo = new THREE.ConeGeometry(0.052, 0.076, 28);
    sandCakeGeo.rotateX(Math.PI);
    sandCakeGeo.translate(0, 0.038, 0);
    this.s9WetSandCake = new THREE.Mesh(
      sandCakeGeo,
      new THREE.MeshStandardMaterial({
        color: 0xb68f5e,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    this.s9WetSandCake.position.set(-0.04, 0.412, -0.16);
    this.s9WetSandCake.visible = false;
    g.add(this.s9WetSandCake);

    this.s9FilterSand = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.0052, 0),
      new THREE.MeshStandardMaterial({ color: 0xc59e6d, roughness: 0.9 }),
      220,
    );
    this.s9FilterSandOffsets.length = 0;
    for (let i = 0; i < 220; i++) {
      const theta = rand() * Math.PI * 2;
      const v = Math.pow(rand(), 0.62) * 0.62;
      const pleatMod = Math.cos(theta * 16) * 0.005 * v;
      const r = v * (0.084 + pleatMod) * (0.35 + rand() * 0.62);
      const y = 0.414 + v * 0.135;
      this.s9FilterSandOffsets.push({
        x: -0.04 + Math.cos(theta) * r,
        y,
        z: -0.16 + Math.sin(theta) * r,
        rx: rand() * 3,
        ry: rand() * 3,
        rz: rand() * 3,
        baseScale: 0.7 + rand() * 0.65,
      });
    }
    this.s9FilterSand.visible = false;
    g.add(this.s9FilterSand);

    // Clear filtrate thread inside funnel stem + discrete falling filtrate drops
    this.s9StemStream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0042, 0.0038, 0.136, 10),
      new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.72,
        roughness: 0.05,
      }),
    );
    this.s9StemStream.position.set(-0.04, 0.334, -0.16);
    this.s9StemStream.visible = false;
    g.add(this.s9StemStream);

    this.s9FilterDrops = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.0052, 10, 10),
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.88,
        roughness: 0.03,
        clearcoat: 1.0,
      }),
      14,
    );
    this.s9FilterDrops.visible = false;
    g.add(this.s9FilterDrops);

    // ------------------------------------------------------------------------
    // MOVABLE GRADUATED ERLENMEYER RECEIVING FLASK (Transfers onto Hot Plate!)
    // ------------------------------------------------------------------------
    this.s9ErlenmeyerGroup = new THREE.Group();
    this.s9ErlenmeyerGroup.position.set(-0.04, 0.029, -0.16);
    g.add(this.s9ErlenmeyerGroup);

    const erlenmeyerPts = [
      new THREE.Vector2(0, 0.0),
      new THREE.Vector2(0.078, 0.0),
      new THREE.Vector2(0.084, 0.014),
      new THREE.Vector2(0.028, 0.154),
      new THREE.Vector2(0.028, 0.204),
      new THREE.Vector2(0.034, 0.212),
      new THREE.Vector2(0.03, 0.214),
      new THREE.Vector2(0.024, 0.203),
      new THREE.Vector2(0.024, 0.152),
      new THREE.Vector2(0.079, 0.016),
      new THREE.Vector2(0.074, 0.007),
      new THREE.Vector2(0, 0.007),
    ];
    const erlenmeyerMesh = this.registerGlass(
      new THREE.Mesh(new THREE.LatheGeometry(erlenmeyerPts, 36), glassMat),
    );
    this.tagInteractive(
      erlenmeyerMesh,
      'station_9_filtration_evaporation',
      'Transfer clear filtrate flask to hot plate & boil at 100°C (212°F)',
      's9:evaporate',
    );
    this.s9ErlenmeyerGroup.add(erlenmeyerMesh);

    // Conical white graduation scale decal wrapped on camera-facing (-X) wall of Erlenmeyer flask
    const flaskScaleTex = this.createBorosilicateScaleTexture([200, 150, 100, 50], '250 mL');
    const flaskDecalPts = [
      new THREE.Vector2(0.083, 0.022),
      new THREE.Vector2(0.033, 0.146),
    ];
    const flaskScaleDecal = new THREE.Mesh(
      new THREE.LatheGeometry(flaskDecalPts, 24, Math.PI * 1.18, Math.PI * 0.64),
      new THREE.MeshBasicMaterial({
        map: flaskScaleTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.s9ErlenmeyerGroup.add(flaskScaleDecal);

    // Bottom-anchored clear salt-water filtrate inside Erlenmeyer flask
    const flaskLiqGeo = new THREE.CylinderGeometry(0.68, 0.98, 1.0, 28);
    flaskLiqGeo.translate(0, 0.5, 0);
    this.s9FlaskLiquid = new THREE.Mesh(
      flaskLiqGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.46,
        roughness: 0.04,
        clearcoat: 1.0,
      }),
    );
    this.s9FlaskLiquid.position.set(0, 0.008, 0);
    this.s9FlaskLiquid.visible = false;
    this.s9ErlenmeyerGroup.add(this.s9FlaskLiquid);

    // Bright concave meniscus surface rim ring inside Erlenmeyer flask
    this.s9FlaskMeniscus = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.035, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.72,
      }),
    );
    this.s9FlaskMeniscus.rotation.x = Math.PI / 2;
    this.s9FlaskMeniscus.visible = false;
    this.s9ErlenmeyerGroup.add(this.s9FlaskMeniscus);

    // Nucleate boiling bubbles rising inside the Erlenmeyer flask on the hot plate
    this.s9BoilingBubbles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.0052, 8, 8),
      new THREE.MeshPhysicalMaterial({
        color: 0xf0f9ff,
        transparent: true,
        opacity: 0.82,
        roughness: 0.04,
        clearcoat: 1.0,
      }),
      36,
    );
    this.s9BoilingBubbles.visible = false;
    this.s9ErlenmeyerGroup.add(this.s9BoilingBubbles);

    // 200 sparkling white cubic NaCl salt crystals growing across flat floor of Erlenmeyer flask
    this.s9DishSaltCrystals = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.0072, 0.0072, 0.0072),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.14,
        metalness: 0.02,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        reflectivity: 0.95,
      }),
      200,
    );
    this.s9CrystalOffsets.length = 0;
    for (let i = 0; i < 200; i++) {
      const a = rand() * Math.PI * 2;
      // Slight ring concentration + uniform inner floor spread like real evaporated salt crust
      const uRad = i < 65 ? 0.75 + rand() * 0.23 : Math.sqrt(rand()) * 0.88;
      const r = uRad * 0.068;
      this.s9CrystalOffsets.push({
        x: Math.cos(a) * r,
        y: 0.009 + rand() * 0.007,
        z: Math.sin(a) * r,
        rx: (rand() - 0.5) * 0.35,
        ry: rand() * Math.PI * 2,
        rz: (rand() - 0.5) * 0.35,
        baseScale: 0.65 + rand() * 0.72,
        radialOrder: 1 - uRad * 0.65 + rand() * 0.25,
      });
    }
    this.s9DishSaltCrystals.visible = false;
    this.s9ErlenmeyerGroup.add(this.s9DishSaltCrystals);

    // Particle Vision dissolved salt ions inside Erlenmeyer filtrate
    this.s9DishSaltVision = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.0058, 6, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xf8fafc,
        emissiveIntensity: 0.7,
      }),
      80,
    );
    this.s9DishSaltVision.visible = false;
    this.s9ErlenmeyerGroup.add(this.s9DishSaltVision);

    // ------------------------------------------------------------------------
    // ZONE 3 (z = +0.46 .. +0.96): DIGITAL CERAMIC-TOP HOT PLATE + ROTARY DIAL
    //                              + INVISIBLE-VAPOR ZONE + GLASS CONDENSER
    // ------------------------------------------------------------------------
    const hotChassis = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.082, 0.34), steelMat);
    hotChassis.position.set(-0.03, 0.045, 0.46);
    this.tagInteractive(
      hotChassis,
      'station_9_filtration_evaporation',
      'Heat ceramic hot plate to 100°C / 212°F to evaporate water & crystallize salt',
      's9:evaporate',
    );
    g.add(hotChassis);

    for (const [hx, hz] of [
      [-0.16, 0.32],
      [0.1, 0.32],
      [-0.16, 0.6],
      [0.1, 0.6],
    ] as Array<[number, number]>) {
      const hpFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.008, 12), darkMat);
      hpFoot.position.set(hx, 0.004, hz);
      g.add(hpFoot);
    }

    // Dark vitroceramic glass-ceramic top plate + circular radiant red-orange heating coil
    const ceramicTopMat = new THREE.MeshPhysicalMaterial({
      color: 0x121821,
      roughness: 0.14,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const ceramicTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.26), ceramicTopMat);
    ceramicTop.position.set(-0.04, 0.092, 0.46);
    this.tagInteractive(
      ceramicTop,
      'station_9_filtration_evaporation',
      'Ceramic hot plate top — heats salt solution to 100°C (212°F)',
      's9:evaporate',
    );
    g.add(ceramicTop);

    const heatingCoilDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.004, 32),
      this.s9HotPlateGlowMat,
    );
    heatingCoilDisc.position.set(-0.04, 0.0975, 0.46);
    const safetyRing = new THREE.Mesh(
      new THREE.RingGeometry(0.094, 0.1, 36),
      new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
    );
    safetyRing.rotation.x = -Math.PI / 2;
    safetyRing.position.set(-0.04, 0.099, 0.46);
    g.add(heatingCoilDisc, safetyRing);

    // Sloped front control console facing student camera (-X) with LED + Rotary Dial Knob
    const frontConsole = new THREE.Group();
    frontConsole.position.set(-0.205, 0.04, 0.46);
    frontConsole.rotation.z = 0.34; // Angled upward toward student camera on -X side
    g.add(frontConsole);

    const consoleHousing = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.068, 0.32), darkMat);
    this.tagInteractive(
      consoleHousing,
      'station_9_filtration_evaporation',
      'Turn temperature dial to 100°C (212°F)',
      's9:evaporate',
    );
    frontConsole.add(consoleHousing);

    // Crisp digital LED screen on left side of front console
    this.s9HotPlateCanvas = document.createElement('canvas');
    this.s9HotPlateCanvas.width = 256;
    this.s9HotPlateCanvas.height = 96;
    this.s9HotPlateTex = new THREE.CanvasTexture(this.s9HotPlateCanvas);
    this.s9HotPlateTex.colorSpace = THREE.SRGBColorSpace;
    this.disposableTextures.push(this.s9HotPlateTex);

    const lcdScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.054),
      new THREE.MeshBasicMaterial({ map: this.s9HotPlateTex }),
    );
    lcdScreen.position.set(-0.029, 0.002, -0.052);
    lcdScreen.rotation.y = -Math.PI / 2;
    frontConsole.add(lcdScreen);

    // Status indicator LED + Rotary Temperature Dial Knob on right side of front console
    this.s9StatusLedMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
    });
    const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 10), this.s9StatusLedMat);
    statusLed.position.set(-0.029, 0.018, 0.062);
    frontConsole.add(statusLed);

    const dialBezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.023, 0.025, 0.005, 24),
      steelMat,
    );
    dialBezel.rotation.z = Math.PI / 2;
    dialBezel.position.set(-0.029, -0.002, 0.105);
    frontConsole.add(dialBezel);

    this.s9DialKnobGroup = new THREE.Group();
    this.s9DialKnobGroup.position.set(-0.036, -0.002, 0.105);
    const knobBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.019, 0.018, 20),
      darkMat,
    );
    knobBody.rotation.z = Math.PI / 2;
    const knobPointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.015, 0.0035),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc }),
    );
    knobPointer.position.set(-0.002, 0.007, 0);
    this.s9DialKnobGroup.add(knobBody, knobPointer);
    this.tagInteractive(
      knobBody,
      'station_9_filtration_evaporation',
      'Turn rotary dial to 100°C (212°F)',
      's9:evaporate',
    );
    frontConsole.add(this.s9DialKnobGroup);

    // Secondary condenser support post + glass vapor hood (positioned ABOVE clear invisible-vapor gap!)
    const condStandPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0075, 0.0075, 0.62, 14),
      steelMat,
    );
    condStandPost.position.set(0.14, 0.31, 0.72);
    const condClampArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.28, 10),
      steelMat,
    );
    condClampArm.rotation.x = Math.PI / 2;
    condClampArm.rotation.z = 0.55;
    condClampArm.position.set(0.05, 0.52, 0.59);
    g.add(condStandPost, condClampArm);

    const hoodPts = [
      new THREE.Vector2(0.095, 0.44),
      new THREE.Vector2(0.088, 0.47),
      new THREE.Vector2(0.024, 0.57),
      new THREE.Vector2(0.018, 0.59),
    ];
    const condenserHood = this.registerGlass(
      new THREE.Mesh(new THREE.LatheGeometry(hoodPts, 28), glassMat),
    );
    condenserHood.position.set(-0.04, 0, 0.46);

    const tubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, 0.585, 0.46),
      new THREE.Vector3(-0.04, 0.635, 0.62),
      new THREE.Vector3(-0.04, 0.43, 0.81),
      new THREE.Vector3(-0.04, 0.195, 0.94),
    ]);
    const condenserTube = this.registerGlass(
      new THREE.Mesh(new THREE.TubeGeometry(tubeCurve, 28, 0.014, 12, false), glassMat),
    );

    // Pure Distillate Recovery Beaker (z = +0.94)
    const distPts = [
      new THREE.Vector2(0, 0.0),
      new THREE.Vector2(0.072, 0.0),
      new THREE.Vector2(0.075, 0.158),
      new THREE.Vector2(0.08, 0.165),
      new THREE.Vector2(0.076, 0.167),
      new THREE.Vector2(0.07, 0.157),
      new THREE.Vector2(0.069, 0.006),
      new THREE.Vector2(0, 0.006),
    ];
    const distBeaker = this.registerGlass(
      new THREE.Mesh(new THREE.LatheGeometry(distPts, 28), glassMat),
    );
    distBeaker.position.set(-0.04, 0.006, 0.94);

    const distWaterGeo = new THREE.CylinderGeometry(0.067, 0.066, 1.0, 24);
    distWaterGeo.translate(0, 0.5, 0);
    this.s9CondenserWater = new THREE.Mesh(
      distWaterGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.48,
        roughness: 0.04,
        clearcoat: 1.0,
      }),
    );
    this.s9CondenserWater.position.set(-0.04, 0.012, 0.94);
    this.s9CondenserWater.visible = false;
    g.add(condenserHood, condenserTube, distBeaker, this.s9CondenserWater);

    this.s9CondenserDrops = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.005, 8, 8),
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.88,
        roughness: 0.04,
      }),
      10,
    );
    this.s9CondenserDrops.visible = false;
    g.add(this.s9CondenserDrops);

    // Particle Vision invisible water-vapor molecules (in the clear gap y = 0.32..0.44)
    // + Condensed white mist droplets ONLY higher up inside the cool condenser hood (y = 0.45..0.56)
    this.s9VaporVision = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.0085, 6, 6),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
      }),
      36,
    );
    this.s9VaporVision.visible = false;

    this.s9UpperMist = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
      24,
    );
    this.s9UpperMist.visible = false;
    g.add(this.s9VaporVision, this.s9UpperMist);

    this.root.add(g);
  }

  private syncStation9(
    state: Station9State,
    pourPulse: number,
    evapPulse: number,
    t: number,
  ): void {
    const dt = Math.max(0, Math.min(0.08, t - this.lastS9SimTime));
    this.lastS9SimTime = t;

    const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
    const smooth01 = (v: number): number => {
      const c = clamp01(v);
      return c * c * (3 - 2 * c);
    };

    // Detect stage transitions so live clicks play full multi-second choreography while JSON imports snap cleanly
    if (state.stage !== this.lastS9Stage) {
      if (state.stage === 'beaker_ready' || state.stage === 'stirred') {
        this.s9FilterAnimProgress = 0;
        this.s9EvapAnimProgress = 0;
      } else if (state.stage === 'filtered') {
        this.s9FilterAnimProgress = pourPulse > 0.05 ? 0 : 1;
        this.s9EvapAnimProgress = 0;
      } else if (state.stage === 'evaporated') {
        this.s9FilterAnimProgress = 1;
        this.s9EvapAnimProgress = evapPulse > 0.05 ? 0 : 1;
      }
      this.lastS9Stage = state.stage;
    }

    if (state.stage === 'filtered' && this.s9FilterAnimProgress < 1) {
      this.s9FilterAnimProgress = Math.min(1, this.s9FilterAnimProgress + dt / 3.2);
    } else if (state.stage === 'evaporated') {
      this.s9FilterAnimProgress = 1;
      if (this.s9EvapAnimProgress < 1) {
        this.s9EvapAnimProgress = Math.min(1, this.s9EvapAnimProgress + dt / 5.2);
      }
    } else if (state.stage === 'beaker_ready' || state.stage === 'stirred') {
      this.s9FilterAnimProgress = 0;
      this.s9EvapAnimProgress = 0;
    }

    const pFilter = this.s9FilterAnimProgress;
    const pEvap = this.s9EvapAnimProgress;

    // ------------------------------------------------------------------------
    // STAGE 1 & 2: TILTING BEAKER POUR + PLEATED FILTRATION DRIP + WET SAND CAKE
    // ------------------------------------------------------------------------
    let liftFrac = 0;
    let tiltRad = 0;
    let streamActive = false;
    if (state.stage === 'filtered' && pFilter < 0.76) {
      if (pFilter < 0.16) {
        liftFrac = smooth01(pFilter / 0.16);
        tiltRad = smooth01(Math.max(0, (pFilter - 0.06) / 0.1)) * 1.18;
      } else if (pFilter < 0.56) {
        liftFrac = 1;
        tiltRad = 1.18 + Math.sin((pFilter - 0.16) * 14) * 0.025;
        streamActive = true;
      } else {
        const ret = smooth01((pFilter - 0.56) / 0.2);
        liftFrac = 1 - ret;
        tiltRad = (1 - ret) * 1.18;
      }
    }

    const bx = -0.04;
    const by = 0.008 + liftFrac * 0.585 + Math.sin(liftFrac * Math.PI) * 0.05;
    const bz = -0.76 + (-0.37 - -0.76) * liftFrac;
    this.s9SourceBeakerGroup.position.set(bx, by, bz);
    this.s9SourceBeakerGroup.rotation.set(tiltRad, 0, 0);

    // Source beaker murky liquid & sand level drains smoothly during the pour window (0.14..0.56)
    const sourceRemainFrac =
      state.stage === 'beaker_ready' || state.stage === 'stirred'
        ? clamp01(state.beakerWaterGrams / 100)
        : clamp01(1 - smooth01((pFilter - 0.14) / 0.42));

    this.s9BeakerLiquid.visible = sourceRemainFrac > 0.015;
    if (this.s9BeakerLiquid.visible) {
      this.s9BeakerLiquid.scale.set(1, Math.max(0.004, 0.122 * sourceRemainFrac), 1);
      // Tilt compensation so liquid stays fuller toward pouring lip while tilting
      this.s9BeakerLiquid.rotation.x = -tiltRad * 0.38;
    }

    const sourceSandFrac =
      state.stage === 'beaker_ready' || state.stage === 'stirred'
        ? clamp01(state.beakerSandGrams / 25)
        : clamp01(1 - smooth01((pFilter - 0.16) / 0.4));
    this.s9BeakerSand.visible = sourceSandFrac > 0.02;
    if (this.s9BeakerSand.visible) {
      this.s9BeakerSand.count = Math.max(1, Math.round(240 * sourceSandFrac));
    }

    this.s9BeakerSaltVision.visible =
      this.particleVisionEnabled &&
      (state.mode === 'mode_b_salt_sand_water' || state.beakerSaltGrams > 0.5) &&
      sourceRemainFrac > 0.05;
    if (this.s9BeakerSaltVision.visible) {
      const maxH = 0.11 * sourceRemainFrac;
      for (let i = 0; i < 90; i++) {
        const ang = i * 1.9 + t * 0.85;
        const r = 0.012 + ((i * 11) % 100) * 0.0006;
        const y = 0.014 + (((i * 7) % 100) / 100) * maxH;
        this.dummy.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s9BeakerSaltVision.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9BeakerSaltVision.instanceMatrix.needsUpdate = true;
    }

    // Dynamic murky pour stream from tilted spout lip down into pleated filter cone
    this.s9PourStream.visible = streamActive;
    if (streamActive) {
      const cosT = Math.cos(tiltRad);
      const sinT = Math.sin(tiltRad);
      const spoutY = by + 0.192 * cosT - 0.092 * sinT;
      const spoutZ = bz + 0.192 * sinT + 0.092 * cosT;
      const targetY = 0.465;
      const targetZ = -0.16;
      const dy = spoutY - targetY;
      const dz = spoutZ - targetZ;
      const len = Math.max(0.04, Math.hypot(dy, dz));
      this.s9PourStream.position.set(-0.04, (spoutY + targetY) * 0.5, (spoutZ + targetZ) * 0.5);
      this.s9PourStream.rotation.set(-Math.atan2(dz, dy), 0, 0);
      const pulseW = 0.88 + Math.sin(t * 28) * 0.14;
      this.s9PourStream.scale.set(pulseW, len, pulseW);
    }

    // Slurry pool inside pleated filter cone rises during pour (0.14..0.52) and drains (0.52..0.95)
    let slurryFrac = 0;
    if (state.stage === 'filtered' && pFilter > 0.14 && pFilter < 0.96) {
      if (pFilter < 0.52) {
        slurryFrac = smooth01((pFilter - 0.14) / 0.38);
      } else {
        slurryFrac = 1 - smooth01((pFilter - 0.52) / 0.44);
      }
    }
    this.s9FilterSlurryPool.visible = slurryFrac > 0.02;
    if (this.s9FilterSlurryPool.visible) {
      const s = 0.22 + slurryFrac * 0.78;
      this.s9FilterSlurryPool.scale.set(s, s, s);
    }

    // Wet sand filter cake accumulates inside the 16-pleat filter paper cone and stays trapped
    const sandCakeFrac =
      state.filterTrappedSandGrams > 0.5
        ? state.stage === 'filtered'
          ? smooth01((pFilter - 0.18) / 0.48)
          : 1
        : 0;
    this.s9WetSandCake.visible = sandCakeFrac > 0.02;
    if (this.s9WetSandCake.visible) {
      const cs = 0.25 + sandCakeFrac * 0.75;
      this.s9WetSandCake.scale.set(cs, cs, cs);
    }

    this.s9FilterSand.visible = sandCakeFrac > 0.03;
    if (this.s9FilterSand.visible) {
      const activeGrains = Math.max(1, Math.round(this.s9FilterSandOffsets.length * sandCakeFrac));
      this.s9FilterSand.count = activeGrains;
      for (let i = 0; i < activeGrains; i++) {
        const o = this.s9FilterSandOffsets[i]!;
        this.dummy.position.set(o.x, o.y, o.z);
        this.dummy.rotation.set(o.rx, o.ry, o.rz);
        this.dummy.scale.setScalar(o.baseScale * (0.4 + 0.6 * sandCakeFrac));
        this.dummy.updateMatrix();
        this.s9FilterSand.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9FilterSand.instanceMatrix.needsUpdate = true;
    }

    // Clear filtrate dripping drop-by-drop from funnel stem (y = 0.265) into Erlenmeyer flask
    const drippingActive = state.stage === 'filtered' && pFilter > 0.2 && pFilter < 0.99;
    this.s9StemStream.visible = drippingActive;
    this.s9FilterDrops.visible = drippingActive;
    if (drippingActive) {
      for (let i = 0; i < 14; i++) {
        const phase = (t * 2.35 + i / 14) % 1;
        // Gravitational acceleration from stem tip (y = 0.265) down to flask liquid surface (y = 0.085)
        const dropY = 0.265 - phase * phase * 0.185;
        const stretch = 1 + phase * 0.45;
        this.dummy.position.set(
          -0.04 + Math.sin(i * 2.1) * 0.0018,
          dropY,
          -0.16 + Math.cos(i * 1.7) * 0.0018,
        );
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(0.88, stretch, 0.88);
        this.dummy.updateMatrix();
        this.s9FilterDrops.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9FilterDrops.instanceMatrix.needsUpdate = true;
    }

    // ------------------------------------------------------------------------
    // STAGE 3: FLASK TRANSFER TO HOT PLATE + ROTARY DIAL + BOILING + SALT CRYSTALS
    // ------------------------------------------------------------------------
    const transferFrac = state.stage === 'evaporated' ? smooth01(pEvap / 0.22) : 0;
    // Slide slightly forward (-X) along a graceful arc so the tall flask neck clears the funnel stem cleanly!
    const flaskX = -0.04 - Math.sin(transferFrac * Math.PI) * 0.145;
    const flaskY =
      0.029 + (0.099 - 0.029) * transferFrac + Math.sin(transferFrac * Math.PI) * 0.095;
    const flaskZ = -0.16 + (0.46 - -0.16) * transferFrac;
    this.s9ErlenmeyerGroup.position.set(flaskX, flaskY, flaskZ);
    this.s9ErlenmeyerGroup.rotation.set(Math.sin(transferFrac * Math.PI) * 0.06, 0, 0);

    // Clear filtrate fill level inside the graduated Erlenmeyer flask:
    // - Rises smoothly from 0 -> 1 during filtration (0.22..0.98)
    // - Holds at 1 during transfer onto the hot plate (0.00..0.30)
    // - Lowers smoothly from 1 -> 0 as water boils away at 100°C (0.30..0.93)
    let flaskFillFrac = 0;
    if (state.stage === 'filtered') {
      flaskFillFrac = smooth01((pFilter - 0.22) / 0.76);
    } else if (state.stage === 'evaporated') {
      flaskFillFrac = 1 - smooth01((pEvap - 0.3) / 0.63);
    }

    this.s9FlaskLiquid.visible = flaskFillFrac > 0.012;
    this.s9FlaskMeniscus.visible = flaskFillFrac > 0.02;
    const currentLiquidH = 0.068 * flaskFillFrac;
    if (this.s9FlaskLiquid.visible) {
      this.s9FlaskLiquid.scale.set(0.076, Math.max(0.002, currentLiquidH), 0.076);
    }
    if (this.s9FlaskMeniscus.visible) {
      const meniscusRadius = Math.max(0.032, 0.074 - currentLiquidH * 0.34);
      this.s9FlaskMeniscus.position.set(0, 0.008 + currentLiquidH, 0);
      this.s9FlaskMeniscus.scale.set(meniscusRadius, meniscusRadius, 1);
    }

    // Rotary temperature dial knob + red-orange ceramic heating coil + live °C (°F) LED ramp
    const dialFrac = state.stage === 'evaporated' ? smooth01((pEvap - 0.16) / 0.16) : 0;
    this.s9DialKnobGroup.rotation.x = -2.1 + dialFrac * 3.65;

    const heatFrac = state.stage === 'evaporated' ? smooth01((pEvap - 0.2) / 0.18) : 0;
    const liveTempC = Math.round(22 + (state.hotPlateTempCelsius - 22) * heatFrac);
    const isHeating = heatFrac > 0.25;
    this.s9HotPlateGlowMat.emissiveIntensity = 0.04 + heatFrac * (1.75 + Math.sin(t * 5) * 0.12);
    this.s9StatusLedMat.color.setHex(isHeating ? 0xf97316 : 0x38bdf8);
    this.s9StatusLedMat.emissive.setHex(isHeating ? 0xea580c : 0x0284c7);
    this.s9StatusLedMat.emissiveIntensity = isHeating ? 1.35 : 0.55;

    // Vigorous nucleate boiling bubbles inside flask while liquid boils on the 100°C hot plate
    const isActivelyBoiling =
      state.stage === 'evaporated' && pEvap > 0.28 && flaskFillFrac > 0.035;
    this.s9BoilingBubbles.visible = isActivelyBoiling;
    if (isActivelyBoiling) {
      const maxBubbleRise = Math.max(0.006, currentLiquidH - 0.004);
      for (let i = 0; i < 36; i++) {
        const a = i * 2.39996 + t * 0.6;
        const phase = (t * (1.9 + (i % 5) * 0.35) + i * 0.13) % 1;
        const maxR = Math.max(0.018, 0.066 - phase * maxBubbleRise * 0.35);
        const r = (((i * 19) % 100) / 100) * maxR;
        const s = 0.45 + phase * 0.85;
        this.dummy.position.set(
          Math.cos(a) * r,
          0.01 + phase * maxBubbleRise,
          Math.sin(a) * r,
        );
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(s);
        this.dummy.updateMatrix();
        this.s9BoilingBubbles.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9BoilingBubbles.instanceMatrix.needsUpdate = true;
    }

    // Invisible water-vapor zone directly above flask mouth (y = 0.32..0.44) + condensed mist higher up (y = 0.45..0.56)
    const vaporActive = state.stage === 'evaporated' && pEvap > 0.3 && pEvap < 0.96;
    this.s9VaporVision.visible = vaporActive && this.particleVisionEnabled;
    if (this.s9VaporVision.visible) {
      for (let i = 0; i < 36; i++) {
        const phase = (t * 0.95 + i / 36) % 1;
        const a = i * 1.9 + t * 1.2;
        const r = 0.008 + phase * 0.045;
        this.dummy.position.set(
          -0.04 + Math.cos(a) * r,
          0.318 + phase * 0.135,
          0.46 + Math.sin(a) * r,
        );
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(0.85 + phase * 0.35);
        this.dummy.updateMatrix();
        this.s9VaporVision.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9VaporVision.instanceMatrix.needsUpdate = true;
    }

    const mistIntensity =
      state.stage === 'evaporated' && pEvap > 0.32
        ? pEvap < 0.92
          ? smooth01((pEvap - 0.32) / 0.15)
          : Math.max(0.18, 1 - (pEvap - 0.92) * 8)
        : 0;
    this.s9UpperMist.visible = mistIntensity > 0.05;
    if (this.s9UpperMist.visible) {
      for (let i = 0; i < 24; i++) {
        const phase = (t * 0.55 + i / 24) % 1;
        const a = i * 2.4 + t * 0.45;
        const r = (((i * 17) % 100) / 100) * (0.068 - phase * 0.042);
        this.dummy.position.set(
          -0.04 + Math.cos(a) * r,
          0.448 + phase * 0.12,
          0.46 + Math.sin(a) * r,
        );
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar((0.6 + Math.sin(phase * Math.PI) * 0.65) * mistIntensity);
        this.dummy.updateMatrix();
        this.s9UpperMist.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9UpperMist.instanceMatrix.needsUpdate = true;
    }

    // Condenser delivery droplets + rising pure distillate water in recovery beaker (z = +0.94)
    const condenseFlowActive = state.stage === 'evaporated' && pEvap > 0.36 && pEvap < 0.96;
    this.s9CondenserDrops.visible = condenseFlowActive;
    if (condenseFlowActive) {
      for (let i = 0; i < 10; i++) {
        const u = (t * 0.85 + i / 10) % 1;
        // Follow condenser delivery curve into distillate beaker
        const z = 0.48 + u * 0.46;
        const y =
          u < 0.25
            ? 0.585 + (u / 0.25) * 0.045
            : 0.63 - ((u - 0.25) / 0.75) * 0.52;
        this.dummy.position.set(-0.04, y, z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(0.9);
        this.dummy.updateMatrix();
        this.s9CondenserDrops.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9CondenserDrops.instanceMatrix.needsUpdate = true;
    }

    const distFrac =
      state.condenserCapturedWaterGrams > 0.5
        ? smooth01((pEvap - 0.38) / 0.56)
        : 0;
    this.s9CondenserWater.visible = distFrac > 0.02;
    if (this.s9CondenserWater.visible) {
      this.s9CondenserWater.scale.set(1, Math.max(0.004, 0.092 * distFrac), 1);
    }

    // Particle Vision dissolved salt ions inside Erlenmeyer filtrate (before crystallization completes)
    const dissolvedSaltRemain =
      state.mode === 'mode_b_salt_sand_water' &&
      (state.stage === 'filtered' || (state.stage === 'evaporated' && flaskFillFrac > 0.08));
    this.s9DishSaltVision.visible = this.particleVisionEnabled && dissolvedSaltRemain;
    if (this.s9DishSaltVision.visible) {
      const hSpan = Math.max(0.01, currentLiquidH - 0.006);
      for (let i = 0; i < 80; i++) {
        const ang = i * 2.3 + t * 1.1;
        const r = 0.008 + (((i * 13) % 100) / 100) * 0.048;
        const y = 0.011 + ((i % 6) / 6) * hSpan;
        this.dummy.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.s9DishSaltVision.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9DishSaltVision.instanceMatrix.needsUpdate = true;
    }

    // Procedural nucleation & growth of 200 sparkling white cubic NaCl crystals across bottom of flask
    const crystalGlobalFrac =
      state.dishCrystallizedSaltGrams > 0.5
        ? smooth01((pEvap - 0.5) / 0.46)
        : 0;
    this.s9DishSaltCrystals.visible = crystalGlobalFrac > 0.01;
    if (this.s9DishSaltCrystals.visible) {
      for (let i = 0; i < this.s9CrystalOffsets.length; i++) {
        const c = this.s9CrystalOffsets[i]!;
        const localGrowth = smooth01((crystalGlobalFrac * 1.35 - (1 - c.radialOrder) * 0.35));
        this.dummy.position.set(c.x, c.y, c.z);
        this.dummy.rotation.set(c.rx, c.ry, c.rz);
        this.dummy.scale.setScalar(c.baseScale * localGrowth);
        this.dummy.updateMatrix();
        this.s9DishSaltCrystals.setMatrixAt(i, this.dummy.matrix);
      }
      this.s9DishSaltCrystals.instanceMatrix.needsUpdate = true;
    }

    // Update digital ceramic hot plate LED display (°C and °F per Grade 5 rule)
    const sig = `${liveTempC}_${state.stage}_${isHeating ? 1 : 0}`;
    if (sig !== this.lastS9Sig) {
      this.lastS9Sig = sig;
      const ctx = this.s9HotPlateCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#060d16';
        ctx.fillRect(0, 0, 256, 96);
        ctx.strokeStyle = isHeating ? '#f97316' : '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, 250, 90);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText(isHeating ? 'CERAMIC HOT PLATE • BOIL' : 'CERAMIC HOT PLATE • OFF', 12, 26);
        ctx.fillStyle = isHeating ? '#fb923c' : '#38bdf8';
        ctx.font = 'bold 26px monospace';
        ctx.fillText(formatGrade5Temperature(liveTempC), 12, 70);
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
    const ceramicMat = this.materials.getStandardMaterial('ceramicDish', 1, 1);
    const darkMat = this.materials.getStandardMaterial('anodizedDark', 1, 1);

    // Part A (z = -0.96 .. -0.24): Lighted White Porcelain Backdrop Tray + 4 Solubility Test Beakers
    const partATray = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.014, 0.98), ceramicMat);
    partATray.position.set(-0.08, 0.007, -0.6);
    const backdropWall = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.96), ceramicMat);
    backdropWall.position.set(0.08, 0.085, -0.6);
    const backdropGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.012, 0.94),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xe0f2fe, emissiveIntensity: 0.95 }),
    );
    backdropGlow.position.set(0.068, 0.155, -0.6);
    g.add(partATray, backdropWall, backdropGlow);

    const partAConfig: Array<{
      matId: 'table_salt' | 'granulated_sugar' | 'quartz_sand' | 'pepper_specks';
      label: string;
      z: number;
      color: number;
    }> = [
      { matId: 'table_salt', label: 'Salt', z: -0.96, color: 0xf8fafc },
      { matId: 'granulated_sugar', label: 'Sugar', z: -0.72, color: 0xfef9c3 },
      { matId: 'quartz_sand', label: 'Sand', z: -0.48, color: 0xd9b382 },
      { matId: 'pepper_specks', label: 'Pepper', z: -0.24, color: 0x334155 },
    ];
    const rand = seededRandom(1010);

    partAConfig.forEach((cfg, idx) => {
      const bz = cfg.z;
      const bkr = this.registerGlass(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.16, 22, 1, true), glassMat));
      bkr.position.set(-0.08, 0.092, bz);
      this.tagInteractive(bkr, 'station_10_solutions_dissolving', `Test ${cfg.label} in water`, `s10:parta:${cfg.matId}`);

      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(0.074, 0.071, 0.105, 18),
        new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, roughness: 0.08 }),
      );
      water.position.set(-0.08, 0.068, bz);

      // Leaning glass stir rod + stainless sample scoop beside beaker
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 8), glassMat);
      rod.position.set(-0.08, 0.11, bz);
      rod.rotation.z = 0.22;
      const scoopHandle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.004, 0.012), steelMat);
      scoopHandle.position.set(-0.22, 0.018, bz);
      g.add(bkr, water, rod, scoopHandle);

      const lblTex = createSmallLabelTexture(cfg.label, '#0f172a', '#e0f2fe');
      this.disposableTextures.push(lblTex);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.044), new THREE.MeshBasicMaterial({ map: lblTex }));
      lbl.position.set(-0.24, 0.025, bz);
      lbl.rotation.y = -Math.PI / 2;
      lbl.rotation.x = -0.45;
      g.add(lbl);

      const inst = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.005, 0),
        new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.55 }),
        95,
      );
      for (let i = 0; i < 95; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 0.06;
        // Pepper floats near water surface & middle; sand & untested crystals settle at floor
        const y = idx === 3 ? 0.075 + rand() * 0.04 : 0.022 + rand() * 0.014;
        this.dummy.position.set(-0.08 + Math.cos(a) * r, y, bz + Math.sin(a) * r);
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
          this.dummy.position.set(-0.08 + Math.cos(a) * r, 0.03 + rand() * 0.08, bz + Math.sin(a) * r);
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
          this.dummy.position.set(-0.08 + Math.cos(a) * r, 0.03 + rand() * 0.08, bz + Math.sin(a) * r);
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

    // Part B (z = +0.24 & +0.80): Motorized Magnetic Stir-Plate Beaker A & B + Stir Bars + Thermometers + Stopwatch
    this.s10BeakerARingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8 });
    this.s10BeakerBRingMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.8 });

    const makeRaceBeaker = (z: number, ringMat: THREE.MeshStandardMaterial, labelText: string) => {
      const stirBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.036, 0.28), darkMat);
      stirBase.position.set(-0.02, 0.018, z);
      const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.138, 0.01, 28), steelMat);
      topPlate.position.set(-0.02, 0.04, z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.136, 0.01, 10, 28), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-0.02, 0.042, z);
      const bkr = this.registerGlass(new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.114, 0.24, 24, 1, true), glassMat));
      bkr.position.set(-0.02, 0.165, z);
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.107, 0.16, 22),
        new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.44, roughness: 0.07 }),
      );
      water.position.set(-0.02, 0.125, z);

      // Leaning glass stir rod + magnetic PTFE pill stir bar at bottom
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 10), glassMat);
      rod.position.set(-0.02, 0.19, z);
      rod.rotation.z = 0.12;
      const stirBar = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.009, 0.042, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 }),
      );
      stirBar.rotation.z = Math.PI / 2;
      stirBar.position.set(-0.02, 0.056, z);

      // Immersion thermometer probe mounted on rim
      const thermoProbe = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8), steelMat);
      thermoProbe.position.set(0.06, 0.18, z);
      const thermoCap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.026, 0.03), ringMat);
      thermoCap.position.set(0.06, 0.295, z);

      const lblTex = createSmallLabelTexture(labelText, '#0f172a', '#f8fafc');
      this.disposableTextures.push(lblTex);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.048), new THREE.MeshBasicMaterial({ map: lblTex }));
      lbl.position.set(-0.18, 0.022, z);
      lbl.rotation.y = -Math.PI / 2;

      g.add(stirBase, topPlate, ring, bkr, water, rod, stirBar, thermoProbe, thermoCap, lbl);
      return { rod, stirBar };
    };

    const unitA = makeRaceBeaker(0.24, this.s10BeakerARingMat, 'Beaker A');
    const unitB = makeRaceBeaker(0.8, this.s10BeakerBRingMat, 'Beaker B');
    this.s10StirRodA = unitA.rod;
    this.s10StirBarA = unitA.stirBar;
    this.s10StirRodB = unitB.rod;
    this.s10StirBarB = unitB.stirBar;

    const fineGeo = new THREE.BoxGeometry(0.008, 0.008, 0.008);
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const visionMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8fafc, emissiveIntensity: 0.7 });
    this.s10CrystalARemain = new THREE.InstancedMesh(fineGeo, whiteMat, 120);
    this.s10CrystalBRemain = new THREE.InstancedMesh(fineGeo, whiteMat, 120);
    this.s10VisionSaltA = new THREE.InstancedMesh(new THREE.SphereGeometry(0.007, 6, 6), visionMat, 80);
    this.s10VisionSaltB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.007, 6, 6), visionMat, 80);

    for (const [inst, bz] of [
      [this.s10CrystalARemain, 0.24],
      [this.s10CrystalBRemain, 0.8],
    ] as const) {
      for (let i = 0; i < 120; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 0.085;
        this.dummy.position.set(-0.02 + Math.cos(a) * r, 0.056 + rand() * 0.012, bz + Math.sin(a) * r);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        inst.setMatrixAt(i, this.dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      g.add(inst);
    }
    g.add(this.s10VisionSaltA, this.s10VisionSaltB);

    this.s10CoarseCubeA = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.055), whiteMat);
    this.s10CoarseCubeA.position.set(-0.02, 0.08, 0.24);
    this.s10CoarseCubeB = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.055), whiteMat);
    this.s10CoarseCubeB.position.set(-0.02, 0.08, 0.8);
    g.add(this.s10CoarseCubeA, this.s10CoarseCubeB);

    // Digital Stopwatch Stand between Beaker A and Beaker B
    const swStand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.24), darkMat);
    swStand.position.set(0.22, 0.09, 0.52);
    const swStartCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.6 }),
    );
    swStartCap.position.set(0.22, 0.19, 0.47);
    this.tagInteractive(swStand, 'station_10_solutions_dissolving', 'Start Beaker A vs B Dissolving Race', 's10:race:start');
    this.tagInteractive(swStartCap, 'station_10_solutions_dissolving', 'Start Beaker A vs B Dissolving Race', 's10:race:start');
    g.add(swStand, swStartCap);

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
    swScreen.position.set(0.155, 0.1, 0.52);
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

    // Spin magnetic PTFE stir bars & stir rods when stirring & race active
    this.s10StirBarA.visible = state.beakerA.config.stirred;
    this.s10StirBarB.visible = state.beakerB.config.stirred;
    if (state.beakerA.config.stirred && state.beakerA.status === 'dissolving') {
      this.s10StirRodA.rotation.y = t * 9.5;
      this.s10StirBarA.rotation.y = -t * 22;
    }
    if (state.beakerB.config.stirred && state.beakerB.status === 'dissolving') {
      this.s10StirRodB.rotation.y = t * 9.5;
      this.s10StirBarB.rotation.y = -t * 22;
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
        fineInst.position.set(-0.02 * (1 - fineInst.scale.x), 0.05 * (1 - fineInst.scale.y), bz * (1 - fineInst.scale.z));
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
            const ang = i * 1.8 + t * (beaker.config.stirred ? 3.2 : 0.8);
            const r = 0.015 + ((i * 17) % 100) * 0.00085;
            const y = 0.065 + ((i * 11) % 100) * 0.0012;
            this.dummy.position.set(-0.02 + Math.cos(ang) * r, y, bz + Math.sin(ang) * r);
            this.dummy.scale.setScalar(1);
          }
          this.dummy.updateMatrix();
          visionInst.setMatrixAt(i, this.dummy.matrix);
        }
        visionInst.instanceMatrix.needsUpdate = true;
      }
    };

    syncRaceCrystals(state.beakerA, this.s10CrystalARemain, this.s10CoarseCubeA, this.s10VisionSaltA, 0.24);
    syncRaceCrystals(state.beakerB, this.s10CrystalBRemain, this.s10CoarseCubeB, this.s10VisionSaltB, 0.8);

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
