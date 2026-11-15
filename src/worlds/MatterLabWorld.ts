/**
 * MATTERVERSE: 10-Station Two-Wing Grade 5 Matter & Solutions Laboratory
 * Orchestrates the high-contrast Three.js research hall, direct ACESFilmic PBR/IBL pipeline,
 * GraphicsQualityTier scaling, LabPropBuilder (Stations 1–10), Two-State PlayerController
 * + voluntary ATOM-5 companion, SoundEngine, GameHUD, LabDataSheet, TeacherHUD, & MatterEngine.
 */

import * as THREE from 'three';
import { SoundEngine } from '../audio/SoundEngine';
import {
  DEFAULT_GRAPHICS_TIER,
  GRAPHICS_TIER_PRESETS,
  type GraphicsQualityTier,
} from '../config/graphicsTiers';
import {
  LabPropBuilder,
  type StationFocusId,
  type StationTransientAnims,
} from '../engine/LabPropBuilder';
import { MaterialFactory } from '../engine/MaterialFactory';
import { PlayerController } from '../player/PlayerController';
import {
  type LabStationId,
  MatterEngine,
  type ScratchToolId,
  type Station1SpecimenId,
  type Station2SpecimenId,
  type Station3MagnetItemId,
  type Station3ScentJarId,
  type Station4ObjectId,
  type Station6CategoryId,
  type Station10BeakerMaterialId,
  type StationActionFeedback,
} from '../science/MatterEngine';
import { GameHUD } from '../ui/GameHUD';
import { LabDataSheet } from '../ui/LabDataSheet';
import { TeacherHUD } from '../ui/TeacherHUD';

export class MatterLabWorld {
  private readonly engine = new MatterEngine();
  private readonly sound = new SoundEngine();
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly materials: MaterialFactory;
  private readonly props: LabPropBuilder;
  private readonly player: PlayerController;
  private readonly gameHud: GameHUD;
  private readonly dataSheet: LabDataSheet;
  private readonly teacherHud: TeacherHUD;

  private readonly keyLight: THREE.DirectionalLight;

  private qualityTier: GraphicsQualityTier = DEFAULT_GRAPHICS_TIER;
  private simulationFrozen = false;
  private particleVision = false;
  private cleanView = false;
  private selectedStation2Tool: ScratchToolId = 'copper_penny';
  private simTimeSeconds = 0;
  private lastFrameMs = 0;
  private rafId: number | null = null;

  private readonly anims: StationTransientAnims = {
    scratchPulse: 0,
    waftPulse: 0,
    tweezersPulse: 0,
    magnetSweepPulse: 0,
    sieveShakePulse: 0,
    filterPourPulse: 0,
    evaporatePulse: 0,
  };

  private readonly handleResizeBound: () => void;
  private readonly handleKeyDownBound: (e: KeyboardEvent) => void;
  private readonly handleAudioUnlockBound: () => void;

  constructor(canvas: HTMLCanvasElement, hudRoot: HTMLElement) {
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 720;

    // 1. Direct WebGLRenderer setup (ZERO EffectComposer/Bloom haze, crisp hardware MSAA)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.08, 75);
    this.scene.fog = null;
    this.scene.background = new THREE.Color(0x0d131a);

    // 2. Procedural PBR Materials & Controlled Studio IBL (environmentIntensity = 0.35 for rich shadows)
    this.materials = new MaterialFactory(this.qualityTier);
    this.scene.environment = this.materials.buildLabEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.35;

    // 3. Low-Fill Studio Global Lighting (deep shadows; crisp SpotLights illuminate each workbench)
    const ambient = new THREE.AmbientLight(0xffffff, 0.12);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0d131a, 0.3);
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 0.45);
    this.keyLight.position.set(5.5, 11.5, 6.5);
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.camera.near = 1.0;
    this.keyLight.shadow.camera.far = 32;
    this.keyLight.shadow.camera.left = -17;
    this.keyLight.shadow.camera.right = 17;
    this.keyLight.shadow.camera.top = 13;
    this.keyLight.shadow.camera.bottom = -13;
    this.scene.add(this.keyLight);

    // 4. Parametric 10-Station Research Hall Scene
    this.props = new LabPropBuilder(this.materials);
    this.scene.add(this.props.root);

    // 6. Two-State Explorer & ATOM-5 Companion Controller
    this.player = new PlayerController({
      camera: this.camera,
      domElement: canvas,
      scene: this.scene,
      materials: this.materials,
      stations: this.props.stations,
      interactiveMeshes: this.props.interactiveMeshes,
      obstacleBoxes: this.props.obstacleBoxes,
      onStationSelected: (stationId) => this.onArrivedAtStation(stationId),
      onAtom5Clicked: () => this.openVoluntaryAtom5Tip(),
      onHoverTargetChange: (info) => {
        this.props.setHoveredObject(info?.mesh ?? null);
        this.gameHud.setHoverHint(info);
      },
      onApparatusClick: (stationId, action) => this.handleApparatusClick(stationId, action),
      onNavigationModeChange: (mode, stationId) => {
        if (mode === 'roam') {
          this.engine.exitToRoamMode();
          this.props.highlightStation('overview');
          this.props.setHoveredObject(null);
          this.gameHud.setHoverHint(null);
          this.gameHud.closeAtom5Popover();
        } else if (stationId) {
          this.engine.enterStationFocus(stationId);
          this.props.highlightStation(stationId);
        }
        this.syncAllUi();
      },
      onCameraModeChange: () => this.syncAllUi(),
    });

    // 7. 3-Tab Slide-Out Lab Data Sheet
    this.dataSheet = new LabDataSheet(hudRoot, {
      onUpdatePropertyRow: (materialId, patch) => {
        this.engine.updatePropertyMeasurementRow(materialId, patch);
      },
      onUpdateSeparationRow: (entryId, patch) => {
        this.engine.updateMixtureSeparationRow(entryId, patch);
      },
      onUpdateSolutionsRow: (entryId, patch) => {
        this.engine.updateSolutionsAndStatesRow(entryId, patch);
      },
      onExportCsv: () => this.engine.exportDataSheetCsv(),
      onExportPrintableHtml: () => this.engine.exportDataSheetPrintableHtml(),
      onExportJson: () => this.engine.exportStateJson(),
      onUiClick: () => this.sound.playUiClick(),
    });

    // 8. Decluttered Student HUD (Zero Blocking Quizzes)
    this.gameHud = new GameHUD(hudRoot, {
      onSelectStation: (stationId) => {
        this.player.walkToAndFocusStation(stationId);
      },
      onJumpOverview: () => {
        this.player.jumpToOverview();
        this.engine.exitToRoamMode();
        this.props.highlightStation('overview');
        this.syncAllUi();
      },
      onExitStationFocus: () => {
        this.player.exitStationFocus();
      },
      onTurnHold: (dir) => this.player.setContinuousTurn(dir),
      onTurnStep: (dir) => this.player.stepTurn(dir),
      onZoomStep: (delta) => this.player.zoomBy(delta),
      onToggleParticleVision: () => this.toggleParticleVision(),
      onToggleCameraMode: () => {
        this.player.toggleCameraMode();
        this.syncAllUi();
      },
      onToggleMute: () => {
        this.sound.toggleMute();
        this.syncAllUi();
      },
      onToggleDataSheet: () => {
        this.dataSheet.toggle();
        this.syncAllUi();
      },
      onToggleTeacherMode: () => {
        this.teacherHud.toggle();
      },
      onToggleCleanView: () => this.toggleCleanView(),
      onRequestAtom5Tip: () => this.openVoluntaryAtom5Tip(),
      onResolveMisconception: (id) => {
        this.engine.markMisconceptionResolved(id);
        this.player.setAtom5Mood('happy');
        this.sound.playSuccessFanfare();
      },

      // Station 1–5 (Wing A)
      onStation1Inspect: (specimenId, magnifierActive) => {
        this.sound.playTweezersClick();
        const fb = this.engine.inspectStation1Specimen(specimenId, magnifierActive);
        this.handleActionFeedback(fb);
      },
      onStation2SelectTool: (tool) => {
        this.selectedStation2Tool = tool;
        this.sound.playTweezersClick();
      },
      onStation2Scratch: (specimenId, tool) => {
        this.selectedStation2Tool = tool;
        const fb = this.engine.runStation2ScratchTest(specimenId, tool);
        const didScratch = fb.headline.includes('Scratched');
        this.sound.playScratchSound(didScratch);
        this.anims.scratchPulse = 1.0;
        this.handleActionFeedback(fb);
      },
      onStation3MagnetTest: (itemId) => {
        const fb = this.engine.testStation3Magnet(itemId);
        if (fb.headline.includes('YES')) this.sound.playMagnetHum();
        else this.sound.playGlassClink();
        this.handleActionFeedback(fb);
      },
      onStation3WaftJar: (jarId) => {
        this.sound.playWaftBreeze();
        this.anims.waftPulse = 1.0;
        const fb = this.engine.waftStation3Jar(jarId);
        this.handleActionFeedback(fb);
      },
      onStation4SelectObject: () => {
        this.sound.playTweezersClick();
      },
      onStation4Weigh: (objectId) => {
        this.sound.playGlassClink();
        const fb = this.engine.weighStation4Object(objectId);
        this.handleActionFeedback(fb);
      },
      onStation4Submerge: (objectId) => {
        this.sound.playWaterPlop();
        const fb = this.engine.submergeStation4Object(objectId);
        this.handleActionFeedback(fb);
      },
      onStation4Clear: () => {
        this.sound.playUiClick();
        this.engine.clearStation4Instruments();
        this.syncAllUi();
      },
      onStation5SetTemp: (tempC) => {
        const fb = this.engine.setStation5Temperature(tempC);
        if (tempC >= 100) this.sound.playBoilingAndSizzle();
        this.handleActionFeedback(fb);
      },

      // Station 6–10 (Wing B)
      onStation6PickNext: () => {
        const st6 = this.engine.getStation6State();
        const nextUnsorted = st6.pieces.find((p) => !p.sortedIntoBin);
        if (!nextUnsorted) return;
        this.sound.playTweezersClick();
        this.anims.tweezersPulse = 1.0;
        const fb = this.engine.sortStation6Piece(nextUnsorted.pieceId);
        if (this.engine.getStation6State().allSorted) this.sound.playSuccessFanfare();
        this.handleActionFeedback(fb);
      },
      onStation6SortCategory: (cat) => {
        this.sound.playTweezersClick();
        this.anims.tweezersPulse = 1.0;
        const fb = this.engine.sortStation6ByCategory(cat);
        if (this.engine.getStation6State().allSorted) this.sound.playSuccessFanfare();
        this.handleActionFeedback(fb);
      },
      onStation6Reset: () => {
        this.engine.resetStation6();
        this.syncAllUi();
      },
      onStation7Sweep: () => {
        this.sound.playMagnetHum();
        this.anims.magnetSweepPulse = 1.0;
        const fb = this.engine.sweepStation7Magnet();
        this.handleActionFeedback(fb);
      },
      onStation7Release: () => {
        this.sound.playGlassClink();
        const fb = this.engine.releaseStation7MagnetToDish();
        if (this.engine.getStation7State().isSeparatedPure) this.sound.playSuccessFanfare();
        this.handleActionFeedback(fb);
      },
      onStation7Reset: () => {
        this.engine.resetStation7();
        this.syncAllUi();
      },
      onStation8PourShake: () => {
        this.sound.playSieveRattle();
        this.anims.sieveShakePulse = 1.0;
        const fb = this.engine.pourAndShakeStation8Sieve();
        this.sound.playSuccessFanfare();
        this.handleActionFeedback(fb);
      },
      onStation8Reset: () => {
        this.engine.resetStation8();
        this.syncAllUi();
      },
      onStation9SetMode: (mode) => {
        this.sound.playWaterPour();
        const fb = this.engine.setStation9Mode(mode);
        this.handleActionFeedback(fb);
      },
      onStation9Filter: () => {
        this.sound.playFilterDrip();
        this.anims.filterPourPulse = 1.0;
        const fb = this.engine.pourStation9ThroughFilter();
        this.handleActionFeedback(fb);
      },
      onStation9Evaporate: () => {
        this.sound.playBoilingAndSizzle();
        this.anims.evaporatePulse = 1.0;
        const fb = this.engine.evaporateStation9Filtrate();
        if (this.engine.getStation9State().stage === 'evaporated') {
          this.sound.playSuccessFanfare();
        }
        this.handleActionFeedback(fb);
      },
      onStation9Reset: () => {
        this.engine.resetStation9();
        this.anims.evaporatePulse = 0;
        this.syncAllUi();
      },
      onStation10TestSolubility: (matId) => {
        this.sound.playWaterPour();
        const fb = this.engine.testStation10SolubilityBeaker(matId);
        this.handleActionFeedback(fb);
      },
      onStation10ConfigureRace: (beakerId, patch) => {
        this.engine.configureStation10RaceBeaker(beakerId, patch);
        this.syncAllUi();
      },
      onStation10StartRace: () => {
        this.sound.playWaterPour();
        this.engine.startStation10DissolvingRace();
        this.syncAllUi();
      },
      onStation10ResetRace: () => {
        this.engine.resetStation10RaceBeakers();
        this.syncAllUi();
      },
      onDemoStep: (stationId) => this.runDemoStep(stationId),
      onUiClick: () => this.sound.playUiClick(),
    });

    // 9. Smartboard Teacher HUD
    this.teacherHud = new TeacherHUD(hudRoot, this.qualityTier, {
      onJumpStation: (stationId: StationFocusId) => {
        if (stationId === 'overview') {
          this.player.jumpToOverview();
          this.engine.exitToRoamMode();
          this.props.highlightStation('overview');
          this.syncAllUi();
        } else {
          this.player.jumpToStationFocus(stationId);
        }
      },
      onToggleFreeze: (frozen) => {
        this.simulationFrozen = frozen;
        this.syncAllUi();
      },
      onToggleLargeText: () => {
        this.syncAllUi();
      },
      onChangeQualityTier: (tier) => this.applyQualityTier(tier),
      onResetAllStations: () => this.resetAllStations(),
      onExportJson: () => this.engine.exportStateJson(),
      onImportJson: (jsonText) => {
        this.engine.importStateJson(jsonText);
        const nav = this.engine.getNavigationMode();
        const sid = this.engine.getActiveStationId();
        if (nav === 'station_focus') {
          this.player.jumpToStationFocus(sid);
        } else {
          this.player.jumpToOverview();
        }
        this.syncAllUi();
      },
      onUiClick: () => this.sound.playUiClick(),
    });

    // Initialize tier, start in high-contrast Studio Lab Roam Overview
    this.applyQualityTier(this.qualityTier);
    this.player.jumpToOverview();
    this.syncAllUi();

    this.handleResizeBound = () => this.onResize();
    this.handleKeyDownBound = (e) => this.onGlobalKeyDown(e);
    this.handleAudioUnlockBound = () => this.sound.unlock();

    window.addEventListener('resize', this.handleResizeBound);
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('pointerdown', this.handleAudioUnlockBound, { once: true });

    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame((ts) => this.animate(ts));
  }

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('resize', this.handleResizeBound);
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('pointerdown', this.handleAudioUnlockBound);
    this.player.dispose();
    this.props.dispose();
    this.materials.dispose();
    this.gameHud.dispose();
    this.dataSheet.dispose();
    this.teacherHud.dispose();
    this.sound.dispose();
    this.renderer.dispose();
  }

  // ============================================================================
  // PRIVATE ORCHESTRATION
  // ============================================================================

  private onArrivedAtStation(stationId: LabStationId): void {
    this.sound.playUiClick();
    this.engine.enterStationFocus(stationId);
    this.props.highlightStation(stationId);
    this.player.setAtom5Mood('happy');
    this.syncAllUi();
  }

  private handleApparatusClick(_stationId: LabStationId, action: string): void {
    const parts = action.split(':');
    const prefix = parts[0];
    const cmd = parts[1];
    const arg = parts[2];

    if (prefix === 's1') {
      const st1 = this.engine.getStation1State();
      if (cmd === 'toggleMag') {
        this.sound.playTweezersClick();
        this.handleActionFeedback(
          this.engine.inspectStation1Specimen(st1.activeSpecimenId, !st1.magnifierActive),
        );
      } else if (cmd === 'inspect' && arg) {
        this.sound.playTweezersClick();
        this.handleActionFeedback(
          this.engine.inspectStation1Specimen(arg as Station1SpecimenId, true),
        );
      }
      return;
    }

    if (prefix === 's2') {
      if (cmd === 'tool' && arg) {
        this.selectedStation2Tool = arg as ScratchToolId;
        this.sound.playTweezersClick();
        this.gameHud.showActionFeedback({
          stationId: 'station_2_hardness_scratch',
          headline:
            this.selectedStation2Tool === 'copper_penny'
              ? 'Equipped Copper Penny Tool'
              : 'Equipped Steel Nail Tool',
          observation: 'Click any clamped sample on the bench to perform a scratch test.',
          scientificExplanation:
            'Hardness compares which solid is harder by seeing whether one solid scratches another.',
          benchmarksAddressed: ['SC.5.P.8.1'],
          triggeredMisconceptions: [],
        });
      } else if (cmd === 'scratch' && arg) {
        this.anims.scratchPulse = 1.0;
        const fb = this.engine.runStation2ScratchTest(
          arg as Station2SpecimenId,
          this.selectedStation2Tool,
        );
        this.sound.playScratchSound(fb.headline.includes('Scratched'));
        this.handleActionFeedback(fb);
      }
      return;
    }

    if (prefix === 's3') {
      if (cmd === 'magnet' && arg) {
        const fb = this.engine.testStation3Magnet(arg as Station3MagnetItemId);
        if (fb.headline.includes('YES')) this.sound.playMagnetHum();
        else this.sound.playGlassClink();
        this.handleActionFeedback(fb);
      } else if (cmd === 'waft' && arg) {
        this.sound.playWaftBreeze();
        this.anims.waftPulse = 1.0;
        this.handleActionFeedback(this.engine.waftStation3Jar(arg as Station3ScentJarId));
      }
      return;
    }

    if (prefix === 's4' && cmd === 'weigh' && arg) {
      const objId = arg as Station4ObjectId;
      const st4 = this.engine.getStation4State();
      if (st4.objectOnBalance === objId) {
        this.sound.playWaterPlop();
        this.handleActionFeedback(this.engine.submergeStation4Object(objId));
      } else {
        this.sound.playGlassClink();
        this.handleActionFeedback(this.engine.weighStation4Object(objId));
      }
      return;
    }

    if (prefix === 's6') {
      if (cmd === 'next') {
        const nextUnsorted = this.engine.getStation6State().pieces.find((p) => !p.sortedIntoBin);
        if (!nextUnsorted) return;
        this.sound.playTweezersClick();
        this.anims.tweezersPulse = 1.0;
        const fb = this.engine.sortStation6Piece(nextUnsorted.pieceId);
        if (this.engine.getStation6State().allSorted) this.sound.playSuccessFanfare();
        this.handleActionFeedback(fb);
      } else if (cmd === 'sort' && arg) {
        this.sound.playTweezersClick();
        this.anims.tweezersPulse = 1.0;
        const fb = this.engine.sortStation6ByCategory(arg as Station6CategoryId | 'all');
        if (this.engine.getStation6State().allSorted) this.sound.playSuccessFanfare();
        this.handleActionFeedback(fb);
      }
      return;
    }

    if (prefix === 's7') {
      if (cmd === 'sweep') {
        this.sound.playMagnetHum();
        this.anims.magnetSweepPulse = 1.0;
        this.handleActionFeedback(this.engine.sweepStation7Magnet());
      } else if (cmd === 'release') {
        this.sound.playGlassClink();
        const fb = this.engine.releaseStation7MagnetToDish();
        if (this.engine.getStation7State().isSeparatedPure) this.sound.playSuccessFanfare();
        this.handleActionFeedback(fb);
      }
      return;
    }

    if (prefix === 's8' && cmd === 'shake') {
      this.sound.playSieveRattle();
      this.anims.sieveShakePulse = 1.0;
      const fb = this.engine.pourAndShakeStation8Sieve();
      this.sound.playSuccessFanfare();
      this.handleActionFeedback(fb);
      return;
    }

    if (prefix === 's9') {
      if (cmd === 'filter') {
        this.sound.playFilterDrip();
        this.anims.filterPourPulse = 1.0;
        this.handleActionFeedback(this.engine.pourStation9ThroughFilter());
      } else if (cmd === 'evaporate') {
        this.sound.playBoilingAndSizzle();
        this.anims.evaporatePulse = 1.0;
        const fb = this.engine.evaporateStation9Filtrate();
        if (this.engine.getStation9State().stage === 'evaporated') this.sound.playSuccessFanfare();
        this.handleActionFeedback(fb);
      }
      return;
    }

    if (prefix === 's10') {
      if (cmd === 'parta' && arg) {
        this.sound.playWaterPour();
        this.handleActionFeedback(
          this.engine.testStation10SolubilityBeaker(arg as Station10BeakerMaterialId),
        );
      } else if (cmd === 'race' && arg === 'start') {
        this.sound.playWaterPour();
        this.engine.startStation10DissolvingRace();
        this.syncAllUi();
      }
    }
  }

  private runDemoStep(stationId: LabStationId): void {
    switch (stationId) {
      case 'station_1_luster_texture': {
        const st1 = this.engine.getStation1State();
        const ids = Object.keys(st1.inspectedSpecimens) as Station1SpecimenId[];
        const nextId = ids.find((id) => !st1.inspectedSpecimens[id]) ?? 'pyrite_copper_nugget';
        this.sound.playTweezersClick();
        this.handleActionFeedback(this.engine.inspectStation1Specimen(nextId, true));
        break;
      }
      case 'station_2_hardness_scratch': {
        const st2 = this.engine.getStation2State();
        const ids = Object.keys(st2.scratchRecords) as Station2SpecimenId[];
        let targetSpec = ids.find((id) => !st2.scratchRecords[id].testedWithPenny);
        let tool: ScratchToolId = 'copper_penny';
        if (!targetSpec) {
          targetSpec = ids.find((id) => !st2.scratchRecords[id].testedWithNail) ?? 'quartz_crystal_s2';
          tool = 'steel_nail';
        }
        this.selectedStation2Tool = tool;
        this.anims.scratchPulse = 1.0;
        const fb = this.engine.runStation2ScratchTest(targetSpec, tool);
        this.sound.playScratchSound(fb.headline.includes('Scratched'));
        this.handleActionFeedback(fb);
        break;
      }
      case 'station_3_magnetism_wafting': {
        const st3 = this.engine.getStation3State();
        const magIds = Object.keys(st3.magnetTested) as Station3MagnetItemId[];
        const nextMag = magIds.find((id) => !st3.magnetTested[id]);
        if (nextMag) {
          const fb = this.engine.testStation3Magnet(nextMag);
          if (fb.headline.includes('YES')) this.sound.playMagnetHum();
          else this.sound.playGlassClink();
          this.handleActionFeedback(fb);
        } else {
          const jarIds = Object.keys(st3.waftedJars) as Station3ScentJarId[];
          const nextJar = jarIds.find((id) => !st3.waftedJars[id]) ?? 'vanilla_jar';
          this.sound.playWaftBreeze();
          this.anims.waftPulse = 1.0;
          this.handleActionFeedback(this.engine.waftStation3Jar(nextJar));
        }
        break;
      }
      case 'station_4_mass_volume': {
        const st4 = this.engine.getStation4State();
        const objIds = Object.keys(st4.weighedObjects) as Station4ObjectId[];
        const nextWeigh = objIds.find((id) => !st4.weighedObjects[id]);
        if (nextWeigh) {
          this.sound.playGlassClink();
          this.handleActionFeedback(this.engine.weighStation4Object(nextWeigh));
        } else {
          const nextSub = objIds.find((id) => !st4.submergedObjects[id]) ?? 'brass_cylinder';
          this.sound.playWaterPlop();
          this.handleActionFeedback(this.engine.submergeStation4Object(nextSub));
        }
        break;
      }
      case 'station_5_thermal_states': {
        const st5 = this.engine.getStation5State();
        const nextTemp = !st5.observedSolid ? -8 : !st5.observedLiquid ? 22 : !st5.observedGasBoiling ? 100 : -8;
        if (nextTemp >= 100) this.sound.playBoilingAndSizzle();
        else this.sound.playUiClick();
        this.handleActionFeedback(this.engine.setStation5Temperature(nextTemp));
        break;
      }
      case 'station_6_tweezers_sorting': {
        const st6 = this.engine.getStation6State();
        if (st6.allSorted) {
          this.engine.resetStation6();
          this.syncAllUi();
        } else {
          const nextPiece = st6.pieces.find((p) => !p.sortedIntoBin);
          if (nextPiece) {
            this.sound.playTweezersClick();
            this.anims.tweezersPulse = 1.0;
            const fb = this.engine.sortStation6Piece(nextPiece.pieceId);
            if (this.engine.getStation6State().allSorted) this.sound.playSuccessFanfare();
            this.handleActionFeedback(fb);
          }
        }
        break;
      }
      case 'station_7_iron_sand_magnet': {
        const st7 = this.engine.getStation7State();
        if (st7.ironInTrayGrams > 0.1) {
          this.sound.playMagnetHum();
          this.anims.magnetSweepPulse = 1.0;
          this.handleActionFeedback(this.engine.sweepStation7Magnet());
        } else if (st7.ironOnMagnetGrams > 0.1) {
          this.sound.playGlassClink();
          const fb = this.engine.releaseStation7MagnetToDish();
          if (this.engine.getStation7State().isSeparatedPure) this.sound.playSuccessFanfare();
          this.handleActionFeedback(fb);
        } else {
          this.engine.resetStation7();
          this.syncAllUi();
        }
        break;
      }
      case 'station_8_sand_gravel_sieve': {
        const st8 = this.engine.getStation8State();
        if (!st8.sieveShaken) {
          this.sound.playSieveRattle();
          this.anims.sieveShakePulse = 1.0;
          const fb = this.engine.pourAndShakeStation8Sieve();
          this.sound.playSuccessFanfare();
          this.handleActionFeedback(fb);
        } else {
          this.engine.resetStation8();
          this.syncAllUi();
        }
        break;
      }
      case 'station_9_filtration_evaporation': {
        const st9 = this.engine.getStation9State();
        if (st9.stage === 'beaker_ready') {
          this.sound.playFilterDrip();
          this.anims.filterPourPulse = 1.0;
          this.handleActionFeedback(this.engine.pourStation9ThroughFilter());
        } else if (st9.stage === 'filtered') {
          this.sound.playBoilingAndSizzle();
          this.anims.evaporatePulse = 1.0;
          const fb = this.engine.evaporateStation9Filtrate();
          if (this.engine.getStation9State().stage === 'evaporated') this.sound.playSuccessFanfare();
          this.handleActionFeedback(fb);
        } else {
          this.engine.resetStation9();
          this.anims.evaporatePulse = 0;
          this.syncAllUi();
        }
        break;
      }
      case 'station_10_solutions_dissolving': {
        const st10 = this.engine.getStation10State();
        const partAKeys = Object.keys(st10.solubilityBeakers) as Station10BeakerMaterialId[];
        const nextTest = partAKeys.find((k) => !st10.solubilityBeakers[k].tested);
        if (nextTest) {
          this.sound.playWaterPour();
          this.handleActionFeedback(this.engine.testStation10SolubilityBeaker(nextTest));
        } else if (!st10.fairTest.isControlledFairTest) {
          this.engine.configureStation10RaceBeaker('beaker_b', { waterTempPreset: 'warm' });
          this.syncAllUi();
        } else if (st10.latestRaceSummary === null && !st10.stopwatchRunning) {
          this.sound.playWaterPour();
          this.engine.startStation10DissolvingRace();
          this.syncAllUi();
        } else {
          this.engine.resetStation10RaceBeakers();
          this.syncAllUi();
        }
        break;
      }
    }
  }

  private handleActionFeedback(fb: StationActionFeedback): void {
    this.player.setAtom5Mood(fb.triggeredMisconceptions.length > 0 ? 'curious' : 'happy');
    this.gameHud.showActionFeedback(fb);
    this.syncAllUi();
  }

  private openVoluntaryAtom5Tip(): void {
    this.sound.playAtom5Chime();
    const activeId = this.player.getFocusedStation() ?? this.engine.getActiveStationId();
    const prompt = this.engine.getVoluntaryAtom5Prompt(activeId);
    this.player.setAtom5Mood(prompt.optionalMisconceptionId ? 'curious' : 'happy');
    this.gameHud.openAtom5Popover(prompt);
  }

  private toggleParticleVision(): void {
    this.particleVision = !this.particleVision;
    this.props.setParticleVision(this.particleVision);
    this.player.setAtom5Mood(this.particleVision ? 'curious' : 'happy');
    this.syncAllUi();
  }

  private toggleCleanView(): void {
    this.cleanView = !this.cleanView;
    this.dataSheet.setVisible(!this.cleanView);
    this.teacherHud.setVisible(!this.cleanView);
    this.syncAllUi();
  }

  private resetAllStations(): void {
    this.engine.resetAllStations();
    this.anims.scratchPulse = 0;
    this.anims.waftPulse = 0;
    this.anims.tweezersPulse = 0;
    this.anims.magnetSweepPulse = 0;
    this.anims.sieveShakePulse = 0;
    this.anims.filterPourPulse = 0;
    this.anims.evaporatePulse = 0;
    this.player.setAtom5Mood('happy');
    this.player.jumpToOverview();
    this.props.highlightStation('overview');
    this.gameHud.closeAtom5Popover();
    this.syncAllUi();
  }

  private applyQualityTier(tier: GraphicsQualityTier): void {
    this.qualityTier = tier;
    const cfg = GRAPHICS_TIER_PRESETS[tier];
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 720;
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = cfg.shadowsEnabled;

    this.keyLight.castShadow = cfg.shadowsEnabled;
    if (cfg.shadowsEnabled) {
      this.keyLight.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize);
      if (this.keyLight.shadow.map) {
        this.keyLight.shadow.map.dispose();
        this.keyLight.shadow.map = null;
      }
    }

    this.materials.applyQualityTier(tier, (oldMat, newMat) => {
      this.props.onGlassMaterialReplaced(oldMat, newMat);
    });
    this.props.setQualityTier(tier);
    this.teacherHud.setQualityTier(tier);
  }

  private onResize(): void {
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 720;
    const cfg = GRAPHICS_TIER_PRESETS[this.qualityTier];
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
  }

  private onGlobalKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    this.sound.unlock();

    switch (e.code) {
      case 'KeyV':
        if (this.player.getNavigationMode() === 'roam') {
          this.sound.playUiClick();
          this.player.toggleCameraMode();
          this.syncAllUi();
        }
        break;
      case 'KeyP':
        this.sound.playUiClick();
        this.toggleParticleVision();
        break;
      case 'KeyM':
        this.sound.toggleMute();
        this.syncAllUi();
        break;
      case 'KeyT':
        this.sound.playUiClick();
        this.teacherHud.toggle();
        break;
      case 'KeyH':
        this.sound.playUiClick();
        this.toggleCleanView();
        break;
      case 'KeyD':
        this.sound.playUiClick();
        this.dataSheet.toggle();
        this.syncAllUi();
        break;
      case 'Escape':
        if (this.dataSheet.isOpened()) {
          this.sound.playUiClick();
          this.dataSheet.setOpen(false);
          this.syncAllUi();
        } else if (this.teacherHud.isOpened()) {
          this.sound.playUiClick();
          this.teacherHud.setOpen(false);
        } else if (this.player.getNavigationMode() === 'station_focus') {
          this.sound.playUiClick();
          this.player.exitStationFocus();
        }
        break;
      case 'Equal':
      case 'NumpadAdd':
        this.player.zoomBy(-0.28);
        break;
      case 'Minus':
      case 'NumpadSubtract':
        this.player.zoomBy(0.28);
        break;
    }
  }

  private syncAllUi(): void {
    this.gameHud.syncState({
      navMode: this.player.getNavigationMode(),
      focusedStation: this.player.getFocusedStation(),
      particleVision: this.particleVision,
      cameraMode: this.player.getCameraMode(),
      muted: this.sound.isMuted(),
      frozen: this.simulationFrozen,
      dataSheetOpen: this.dataSheet.isOpened(),
      cleanView: this.cleanView,
      station1: this.engine.getStation1State(),
      station2: this.engine.getStation2State(),
      station3: this.engine.getStation3State(),
      station4: this.engine.getStation4State(),
      station5: this.engine.getStation5State(),
      station6: this.engine.getStation6State(),
      station7: this.engine.getStation7State(),
      station8: this.engine.getStation8State(),
      station9: this.engine.getStation9State(),
      station10: this.engine.getStation10State(),
    });
    this.dataSheet.sync(this.engine.getDataSheetSnapshot());
  }

  private animate(nowMs: number): void {
    this.rafId = requestAnimationFrame((ts) => this.animate(ts));
    const dt = Math.min((nowMs - this.lastFrameMs) / 1000, 0.05);
    this.lastFrameMs = nowMs;

    if (!this.simulationFrozen) {
      this.simTimeSeconds += dt;
      this.anims.scratchPulse = Math.max(0, this.anims.scratchPulse - dt * 1.1);
      this.anims.waftPulse = Math.max(0, this.anims.waftPulse - dt * 0.55);
      this.anims.tweezersPulse = Math.max(0, this.anims.tweezersPulse - dt * 1.35);
      this.anims.magnetSweepPulse = Math.max(0, this.anims.magnetSweepPulse - dt * 0.9);
      this.anims.sieveShakePulse = Math.max(0, this.anims.sieveShakePulse - dt * 0.85);
      this.anims.filterPourPulse = Math.max(0, this.anims.filterPourPulse - dt * 0.3);
      this.anims.evaporatePulse = Math.max(0, this.anims.evaporatePulse - dt * 0.19);

      const st10Before = this.engine.getStation10State();
      const raceTick = this.engine.tickStation10Stopwatch(dt);
      if (raceTick.raceFinishedJustNow) {
        this.sound.playStopwatchChime();
        this.player.setAtom5Mood('celebrate');
        const st10After = this.engine.getStation10State();
        this.gameHud.showActionFeedback({
          stationId: 'station_10_solutions_dissolving',
          headline: 'Dissolving Race Complete!',
          observation: st10After.latestRaceSummary ?? 'Both beakers finished dissolving!',
          scientificExplanation: st10After.fairTest.summaryText,
          benchmarksAddressed: ['SC.5.P.8.2', 'SC.5.P.8.4'],
          triggeredMisconceptions: ['DISSOLVING_DESTROYS_MATTER'],
        });
        this.syncAllUi();
      } else if (st10Before.stopwatchRunning || raceTick.completedRows.length > 0) {
        this.syncAllUi();
      }
    }

    this.player.update(dt, this.simTimeSeconds, this.simulationFrozen);
    this.props.syncFromEngine({
      station1: this.engine.getStation1State(),
      station2: this.engine.getStation2State(),
      station3: this.engine.getStation3State(),
      station4: this.engine.getStation4State(),
      station5: this.engine.getStation5State(),
      station6: this.engine.getStation6State(),
      station7: this.engine.getStation7State(),
      station8: this.engine.getStation8State(),
      station9: this.engine.getStation9State(),
      station10: this.engine.getStation10State(),
      anims: this.anims,
      simTimeSeconds: this.simTimeSeconds,
    });

    this.renderer.render(this.scene, this.camera);
  }
}
