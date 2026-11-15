/**
 * Pure TypeScript Science State Machine for MATTERVERSE: 10-STATION GRADE 5 MATTER & SOLUTIONS LAB.
 * 100% decoupled from Three.js and DOM APIs so Florida Grade 5 curriculum rules (SC.5.P.8.1–8.4,
 * SC.5.P.9.1), real physics & material reactions across all 10 interactive stations, voluntary
 * ATOM-5 Socratic coaching, and the 3-tab Student Investigation Data Sheet are deterministic,
 * strictly typed, and JSON/CSV/Print-serializable.
 */

import {
  ATOM5_FEEDBACK_TEMPLATES,
  type BenchmarkCode,
  formatGrade5Temperature,
  MISCONCEPTION_GUARDRAILS,
  type MisconceptionId,
} from './SCIENCE_RULES';

// ============================================================================
// 10-STATION TWO-WING LAB ARCHITECTURE TYPES
// ============================================================================

export type LabWingId = 'wing_a_properties' | 'wing_b_mixtures';

export type LabNavigationMode = 'roam' | 'station_focus';

export type LabStationNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type LabStationId =
  | 'station_1_luster_texture'
  | 'station_2_hardness_scratch'
  | 'station_3_magnetism_wafting'
  | 'station_4_mass_volume'
  | 'station_5_thermal_states'
  | 'station_6_tweezers_sorting'
  | 'station_7_iron_sand_magnet'
  | 'station_8_sand_gravel_sieve'
  | 'station_9_filtration_evaporation'
  | 'station_10_solutions_dissolving';

export const LAB_STATION_IDS: readonly LabStationId[] = [
  'station_1_luster_texture',
  'station_2_hardness_scratch',
  'station_3_magnetism_wafting',
  'station_4_mass_volume',
  'station_5_thermal_states',
  'station_6_tweezers_sorting',
  'station_7_iron_sand_magnet',
  'station_8_sand_gravel_sieve',
  'station_9_filtration_evaporation',
  'station_10_solutions_dissolving',
];

export interface LabStationDescriptor {
  readonly id: LabStationId;
  readonly stationNumber: LabStationNumber;
  readonly wing: LabWingId;
  readonly wingTitle: string;
  readonly title: string;
  readonly shortLabel: string;
  readonly benchmarks: readonly BenchmarkCode[];
  /** Concise 2-3 line Grade 5 objective displayed in the collapsible Station Focus corner card */
  readonly compactGuideLines: readonly [string, string];
  readonly voluntaryAtom5Tip: string;
}

export interface StationActionFeedback {
  readonly stationId: LabStationId;
  readonly headline: string;
  readonly observation: string;
  readonly scientificExplanation: string;
  readonly benchmarksAddressed: readonly BenchmarkCode[];
  readonly triggeredMisconceptions: readonly MisconceptionId[];
}

export interface VoluntaryAtom5Prompt {
  readonly stationId: LabStationId;
  readonly tipTitle: string;
  readonly tipBody: string;
  readonly optionalMisconceptionId: MisconceptionId | null;
}

// ============================================================================
// WING A (STATIONS 1–5) CONTRACTS: PROPERTIES & STATES OF MATTER
// ============================================================================

export type LusterCategory = 'metallic' | 'glassy' | 'dull';
export type SurfaceTextureCategory = 'smooth' | 'rough';

// Station 1: Color, Luster & Texture Inspection Table
export type Station1SpecimenId =
  | 'brushed_aluminum_bar'
  | 'pyrite_copper_nugget'
  | 'quartz_crystal_s1'
  | 'dull_basalt_rock'
  | 'smooth_river_glass'
  | 'rough_pumice_stone'
  | 'colored_acrylic_beads';

export interface Station1SpecimenSpec {
  readonly id: Station1SpecimenId;
  readonly displayName: string;
  readonly colorLabel: string;
  readonly colorHex: number;
  readonly luster: LusterCategory;
  readonly texture: SurfaceTextureCategory;
  readonly closeUpDetail: string;
}

export interface Station1State {
  readonly activeSpecimenId: Station1SpecimenId;
  readonly magnifierActive: boolean;
  readonly inspectedSpecimens: Record<Station1SpecimenId, boolean>;
}

// Station 2: Hardness Scratch Bench
export type Station2SpecimenId =
  | 'talc_chalk'
  | 'copper_penny_sample'
  | 'river_glass_plate'
  | 'steel_nail_sample'
  | 'quartz_crystal_s2';

export type ScratchToolId = 'copper_penny' | 'steel_nail';

export interface Station2SpecimenSpec {
  readonly id: Station2SpecimenId;
  readonly displayName: string;
  readonly colorLabel: string;
  readonly colorHex: number;
  readonly luster: LusterCategory;
  readonly texture: SurfaceTextureCategory;
  /** Conceptual relative scratch resistance (higher scratches lower) */
  readonly relativeHardnessRank: number;
}

export interface Station2SpecimenScratchRecord {
  testedWithPenny: boolean;
  scratchedByPenny: boolean;
  testedWithNail: boolean;
  scratchedByNail: boolean;
}

export interface Station2State {
  readonly activeTool: ScratchToolId;
  readonly activeSpecimenId: Station2SpecimenId;
  readonly scratchRecords: Record<Station2SpecimenId, Station2SpecimenScratchRecord>;
}

// Station 3: Magnetism & Safe Wafting Station
export type Station3MagnetItemId =
  | 'iron_nail'
  | 'steel_paperclip'
  | 'aluminum_foil'
  | 'copper_wire'
  | 'plastic_cube';

export type Station3ScentJarId = 'vanilla_jar' | 'lemon_jar' | 'vinegar_jar';

export interface Station3MagnetItemSpec {
  readonly id: Station3MagnetItemId;
  readonly displayName: string;
  readonly colorLabel: string;
  readonly colorHex: number;
  readonly luster: LusterCategory;
  readonly isShinyMetal: boolean;
  readonly isMagnetic: boolean;
}

export interface Station3ScentJarSpec {
  readonly id: Station3ScentJarId;
  readonly label: string;
  readonly liquidColorHex: number;
  readonly detectedAroma: string;
  readonly safetyNote: string;
}

export interface Station3State {
  readonly activeMagnetItemId: Station3MagnetItemId | null;
  readonly magnetTested: Record<Station3MagnetItemId, boolean>;
  readonly magnetAttracted: Record<Station3MagnetItemId, boolean>;
  readonly activeWaftingJarId: Station3ScentJarId | null;
  readonly waftedJars: Record<Station3ScentJarId, boolean>;
}

// Station 4: Mass & Volume Displacement Bench
export type Station4ObjectId = 'brass_cylinder' | 'quartz_pebble' | 'acrylic_cube';

export interface Station4ObjectSpec {
  readonly id: Station4ObjectId;
  readonly displayName: string;
  readonly colorLabel: string;
  readonly colorHex: number;
  readonly luster: LusterCategory;
  readonly texture: SurfaceTextureCategory;
  readonly massGrams: number;
  readonly displacedVolumeMl: number;
}

export interface Station4State {
  readonly initialWaterVolumeMl: number;
  readonly currentWaterVolumeMl: number;
  readonly displacedVolumeMl: number;
  readonly objectOnBalance: Station4ObjectId | null;
  readonly balanceReadoutGrams: number;
  readonly submergedObject: Station4ObjectId | null;
  readonly weighedObjects: Record<Station4ObjectId, boolean>;
  readonly submergedObjects: Record<Station4ObjectId, boolean>;
}

// Station 5: States of Matter Thermal Chamber
export type MatterState = 'solid' | 'liquid' | 'gas';

export interface Station5State {
  readonly chamberMassGrams: number;
  readonly temperatureCelsius: number;
  readonly currentState: MatterState;
  /** Smooth [0..1] visual weights for 3D ice block, liquid pool, invisible vapor gap & upper mist */
  readonly iceFraction: number;
  readonly liquidFraction: number;
  readonly boilingIntensity: number;
  readonly upperMistIntensity: number;
  readonly observedSolid: boolean;
  readonly observedLiquid: boolean;
  readonly observedGasBoiling: boolean;
}

// ============================================================================
// WING B (STATIONS 6–10) CONTRACTS: MIXTURES, SEPARATION & SOLUTIONS
// ============================================================================

// Station 6: Hand & Tweezers Sorting Tray
export type Station6CategoryId = 'red_bead' | 'blue_bead' | 'yellow_bead' | 'white_cube';

export interface Station6Piece {
  readonly pieceId: string;
  readonly category: Station6CategoryId;
  readonly shape: 'sphere' | 'cube';
  readonly colorLabel: 'Red' | 'Blue' | 'Yellow' | 'White';
  readonly colorHex: number;
  sortedIntoBin: boolean;
}

export interface Station6State {
  readonly pieces: readonly Station6Piece[];
  readonly unsortedCount: number;
  readonly sortedCounts: Record<Station6CategoryId, number>;
  readonly allSorted: boolean;
}

// Station 7: Iron Filings & Sand Station
export interface Station7State {
  readonly sandInTrayGrams: number;
  readonly ironInTrayGrams: number;
  readonly ironOnMagnetGrams: number;
  readonly ironInRecoveryDishGrams: number;
  readonly magnetPositionedOver: 'tray' | 'dish' | 'standby';
  readonly isSeparatedPure: boolean;
}

// Station 8: Sand & Gravel Sieve Station
export interface Station8State {
  readonly mixtureInCupGrams: number;
  readonly gravelOnSieveGrams: number;
  readonly fineSandOnSieveGrams: number;
  readonly fineSandInCatchPanGrams: number;
  readonly sieveShaken: boolean;
  readonly isSeparatedPure: boolean;
}

// Station 9: Sand & Water + Full Salt/Sand/Water Separation Station
export type Station9Mode = 'mode_a_sand_water' | 'mode_b_salt_sand_water';
export type Station9Stage = 'beaker_ready' | 'stirred' | 'filtered' | 'evaporated';

export interface Station9State {
  readonly mode: Station9Mode;
  readonly stage: Station9Stage;
  readonly totalSystemMassGrams: number;
  readonly beakerWaterGrams: number;
  readonly beakerSandGrams: number;
  readonly beakerSaltGrams: number;
  readonly saltDissolved: boolean;
  readonly filterTrappedSandGrams: number;
  readonly dishWaterGrams: number;
  readonly dishDissolvedSaltGrams: number;
  readonly dishCrystallizedSaltGrams: number;
  readonly condenserCapturedWaterGrams: number;
  readonly hotPlateTempCelsius: number;
}

// Station 10: Solutions & Dissolving Rate Lab (Part A + Part B)
export type Station10BeakerMaterialId =
  | 'table_salt'
  | 'granulated_sugar'
  | 'quartz_sand'
  | 'pepper_specks';

export interface Station10SolubilityBeaker {
  readonly id: Station10BeakerMaterialId;
  readonly displayName: string;
  readonly solidMassGrams: number;
  readonly waterMassGrams: number;
  readonly isSoluble: boolean;
  readonly colorHex: number;
  tested: boolean;
  visualOutcome: 'untested' | 'clear_solution' | 'settled_bottom' | 'suspended_specks';
}

export type RaceBeakerId = 'beaker_a' | 'beaker_b';
export type WaterTempPreset = 'cool' | 'room' | 'warm';
export type SaltGrainSize = 'fine' | 'coarse';
export type RaceTrialStatus = 'ready' | 'dissolving' | 'completed';
export type FairTestVariable = 'temperature' | 'stirring' | 'particle_size';

export interface RaceBeakerConfig {
  waterTempPreset: WaterTempPreset;
  waterTempCelsius: number;
  stirred: boolean;
  grainSize: SaltGrainSize;
}

export interface RaceBeakerState {
  readonly id: RaceBeakerId;
  readonly label: 'Beaker A' | 'Beaker B';
  config: RaceBeakerConfig;
  readonly waterMassGrams: number;
  readonly saltMassGrams: number;
  readonly totalMassGrams: number;
  status: RaceTrialStatus;
  elapsedSeconds: number;
  targetDissolveSeconds: number;
  /** Continuous [0..1] progress shrinking macroscopic crystals & dispersing Particle Vision parts */
  dissolvedFraction: number;
}

export interface FairTestAnalysis {
  readonly changedVariables: readonly FairTestVariable[];
  readonly isControlledFairTest: boolean;
  readonly summaryText: string;
}

export interface Station10State {
  readonly solubilityBeakers: Record<Station10BeakerMaterialId, Station10SolubilityBeaker>;
  readonly beakerA: RaceBeakerState;
  readonly beakerB: RaceBeakerState;
  readonly stopwatchRunning: boolean;
  readonly stopwatchSeconds: number;
  readonly fairTest: FairTestAnalysis;
  readonly latestRaceSummary: string | null;
}

// ============================================================================
// 3-TAB INTERACTIVE LAB DATA SHEET CONTRACTS (`src/ui/LabDataSheet.ts`)
// ============================================================================

export type YesNoBlank = 'yes' | 'no' | '';

/** Tab 1: Properties & Measurement Log */
export interface PropertyMeasurementRow {
  readonly materialId: string;
  readonly materialName: string;
  readonly stationBadge: string;
  color: string;
  luster: LusterCategory | '';
  texture: SurfaceTextureCategory | '';
  hardnessScratchResult: string;
  magnetic: YesNoBlank;
  massGrams: string;
  displacedVolumeMl: string;
  studentNotes: string;
  autoMeasured: {
    surface: boolean;
    scratch: boolean;
    magnetic: boolean;
    mass: boolean;
    volume: boolean;
  };
}

/** Tab 2: Mixture Separation Log */
export interface MixtureSeparationRow {
  readonly entryId: number;
  readonly stationBadge: string;
  readonly mixtureName: string;
  propertyUsed: string;
  toolSelected: string;
  observation: string;
  separatedComponents: string;
  studentNotes: string;
}

/** Tab 3: Solutions & States Log */
export interface SolutionsAndStatesRow {
  readonly entryId: number;
  readonly stationBadge: string;
  readonly investigationItem: string;
  solubleInWater: 'yes' | 'no' | 'n/a' | '';
  dissolvingRaceVariableAndTime: string;
  stateOfMatterAndTemp: string;
  studentNotes: string;
}

export interface LabDataSheetSnapshot {
  readonly tab1PropertiesRows: readonly PropertyMeasurementRow[];
  readonly tab2SeparationRows: readonly MixtureSeparationRow[];
  readonly tab3SolutionsStatesRows: readonly SolutionsAndStatesRow[];
}

// ============================================================================
// BACKWARD-COMPATIBLE WORLD 2 SEPARATION EXPORTS (KEEPS EXISTING BUILD GREEN)
// ============================================================================

export type MixtureSolidId = 'iron_filings' | 'sand' | 'salt' | 'glass_shards';

export type MaterialId =
  | 'iron_filings'
  | 'sand'
  | 'salt'
  | 'glass_shards'
  | 'water';

export type SeparationOperation = 'magnet' | 'sieve' | 'add_water' | 'filter' | 'evaporate';

export type ContainerId =
  | 'mixture_beaker'
  | 'water_beaker'
  | 'magnet_tray'
  | 'sieve_tray'
  | 'filter_funnel'
  | 'evaporating_dish'
  | 'vapor_hood';

export interface MaterialSample {
  readonly id: MaterialId;
  readonly displayName: string;
  readonly isMagnetic: boolean;
  readonly isSolubleInWater: boolean;
  readonly particleSizeMm: number;
  state: MatterState;
  massGrams: number;
  isDissolved: boolean;
  readonly colorHex: number;
  readonly textureSummary: string;
}

export interface LabContainerState {
  readonly id: ContainerId;
  readonly displayName: string;
  readonly description: string;
  temperatureCelsius: number;
  isStirred: boolean;
  contents: MaterialSample[];
}

export interface OperationOptions {
  sourceContainerId?: ContainerId;
  studentPrediction?: string;
  waterTempCelsius?: number;
  stirred?: boolean;
}

export type DissolvingRateCategory = 'not_applicable' | 'slow' | 'moderate' | 'fast' | 'rapid';

export interface InvestigationLogEntry {
  readonly stepNumber: number;
  readonly timestampIso: string;
  readonly operation: SeparationOperation | 'condense_vapor';
  readonly sourceContainerId: ContainerId;
  readonly destinationContainerId: ContainerId;
  readonly prediction: string | null;
  readonly observation: string;
  readonly scientificExplanation: string;
  readonly changed: boolean;
  readonly dissolvingRate: DissolvingRateCategory;
  readonly dissolvingDurationSeconds: number;
  readonly systemMassBeforeGrams: number;
  readonly systemMassAfterGrams: number;
  readonly massConserved: boolean;
  readonly benchmarksAddressed: readonly BenchmarkCode[];
  readonly triggeredMisconceptions: readonly MisconceptionId[];
}

export interface PendingPrediction {
  readonly operation: SeparationOperation;
  readonly targetContainerId?: ContainerId | undefined;
  readonly predictionText: string;
  readonly recordedAtIso: string;
}

export interface PureSampleRecoveryStatus {
  readonly materialId: MixtureSolidId;
  readonly displayName: string;
  readonly targetMassGrams: number;
  readonly recoveredMassGrams: number;
  readonly containerId: ContainerId | null;
  readonly isPureAndDry: boolean;
}

export interface SeparationProgressSummary {
  readonly allFourSolidsRecoveredPure: boolean;
  readonly recoveredCount: number;
  readonly totalTargetCount: 4;
  readonly initialSystemMassGrams: number;
  readonly currentSystemMassGrams: number;
  readonly massConserved: boolean;
  readonly samples: readonly PureSampleRecoveryStatus[];
}

export interface OperationResult {
  readonly operation: SeparationOperation;
  readonly changed: boolean;
  readonly sourceContainerId: ContainerId;
  readonly destinationContainerId: ContainerId;
  readonly headline: string;
  readonly observation: string;
  readonly scientificExplanation: string;
  readonly dissolvingRate: DissolvingRateCategory;
  readonly dissolvingDurationSeconds: number;
  readonly triggeredMisconceptions: readonly MisconceptionId[];
  readonly benchmarksAddressed: readonly BenchmarkCode[];
  readonly logEntry: InvestigationLogEntry;
  readonly progress: SeparationProgressSummary;
}

export interface SerializedMatterEngineState {
  readonly schemaVersion: 1 | 2 | 3;
  readonly exportedAtIso: string;
  readonly initialSystemMassGrams: number;
  readonly stepCounter: number;
  readonly containers: Record<ContainerId, LabContainerState>;
  readonly logs: InvestigationLogEntry[];
  readonly resolvedMisconceptions: MisconceptionId[];
  // v3 10-station + 3-tab Data Sheet state
  readonly activeStationId?: LabStationId;
  readonly navigationMode?: LabNavigationMode;
  readonly station1?: Station1State;
  readonly station2?: Station2State;
  readonly station3?: Station3State;
  readonly station4?: Station4State;
  readonly station5?: Station5State;
  readonly station6SortedIds?: string[];
  readonly station7?: Station7State;
  readonly station8?: Station8State;
  readonly station9?: Station9State;
  readonly station10Solubility?: Record<Station10BeakerMaterialId, Station10SolubilityBeaker>;
  readonly station10BeakerAConfig?: RaceBeakerConfig;
  readonly station10BeakerBConfig?: RaceBeakerConfig;
  readonly tab1Rows?: PropertyMeasurementRow[];
  readonly tab2Rows?: MixtureSeparationRow[];
  readonly tab3Rows?: SolutionsAndStatesRow[];
}

// ============================================================================
// CANONICAL STATION & SPECIMEN CATALOGS
// ============================================================================

export const SIEVE_MESH_OPENING_MM = 2.0;
export const FILTER_PAPER_PORE_MM = 0.02;

export const WATER_TEMP_PRESET_CELSIUS: Readonly<Record<WaterTempPreset, number>> = {
  cool: 10,
  room: 22,
  warm: 60,
};

export const LAB_STATION_CATALOG: Readonly<Record<LabStationId, LabStationDescriptor>> = {
  station_1_luster_texture: {
    id: 'station_1_luster_texture',
    stationNumber: 1,
    wing: 'wing_a_properties',
    wingTitle: 'Wing A — Properties & States of Matter',
    title: 'Station 1: Color, Luster & Texture Table',
    shortLabel: '1. Color & Luster',
    benchmarks: ['SC.5.P.8.1'],
    compactGuideLines: [
      'Place each specimen on the illuminated tray and slide the magnifying lens over it.',
      'Compare surface shine (metallic, glassy, or dull), color, and texture (smooth vs. rough).',
    ],
    voluntaryAtom5Tip:
      'Shine the inspection lamp across each surface! Metals reflect bright metallic shine, quartz and river glass look glassy, and basalt or pumice look dull.',
  },
  station_2_hardness_scratch: {
    id: 'station_2_hardness_scratch',
    stationNumber: 2,
    wing: 'wing_a_properties',
    wingTitle: 'Wing A — Properties & States of Matter',
    title: 'Station 2: Hardness Scratch Bench',
    shortLabel: '2. Hardness Scratch',
    benchmarks: ['SC.5.P.8.1'],
    compactGuideLines: [
      'Pick up the Copper Penny or Steel Nail and drag it across each mineral specimen.',
      'A visible scratch groove forms ONLY when the testing tool is harder than the sample!',
    ],
    voluntaryAtom5Tip:
      'Notice how the copper penny scratches soft talc/chalk, the steel nail scratches glass and copper, yet tough quartz resists even the steel nail!',
  },
  station_3_magnetism_wafting: {
    id: 'station_3_magnetism_wafting',
    stationNumber: 3,
    wing: 'wing_a_properties',
    wingTitle: 'Wing A — Properties & States of Matter',
    title: 'Station 3: Magnetism & Safe Wafting',
    shortLabel: '3. Magnet & Wafting',
    benchmarks: ['SC.5.P.8.1', 'SC.5.P.8.3'],
    compactGuideLines: [
      'Test which metals snap to the bar magnet—are ALL shiny metals magnetic?',
      'Click Waft Air above sealed scent jars to sweep a gentle breeze safely toward you.',
    ],
    voluntaryAtom5Tip:
      'Aluminum foil and copper wire are shiny metals, yet the magnet ignores them! Iron and steel are magnetic. Always waft air gently—never sniff a lab jar directly!',
  },
  station_4_mass_volume: {
    id: 'station_4_mass_volume',
    stationNumber: 4,
    wing: 'wing_a_properties',
    wingTitle: 'Wing A — Properties & States of Matter',
    title: 'Station 4: Mass & Volume Displacement',
    shortLabel: '4. Mass & Volume',
    benchmarks: ['SC.5.P.8.1'],
    compactGuideLines: [
      'Weigh each solid object on the digital balance (0.1 g), then lower it into the 100 mL cylinder.',
      'Read the curved water meniscus before (50 mL) and after to find displaced volume in mL!',
    ],
    voluntaryAtom5Tip:
      'Eye-level check! Read the bottom of the curved water meniscus. Subtract the starting 50 mL from the new mL reading to find how much space (volume) the object takes up!',
  },
  station_5_thermal_states: {
    id: 'station_5_thermal_states',
    stationNumber: 5,
    wing: 'wing_a_properties',
    wingTitle: 'Wing A — Properties & States of Matter',
    title: 'Station 5: States of Matter Thermal Chamber',
    shortLabel: '5. Thermal States',
    benchmarks: ['SC.5.P.8.1', 'SC.5.P.8.4', 'SC.5.P.9.1'],
    compactGuideLines: [
      'Adjust temperature from -10°C (14°F) to 110°C (230°F) and toggle Particle Vision (P).',
      'Compare solid ice, liquid water, and invisible water vapor gas right above boiling water!',
    ],
    voluntaryAtom5Tip:
      'Look right above the 100°C (212°F) boiling water: true water vapor gas is completely invisible! The white mist higher up is tiny condensed liquid droplets!',
  },
  station_6_tweezers_sorting: {
    id: 'station_6_tweezers_sorting',
    stationNumber: 6,
    wing: 'wing_b_mixtures',
    wingTitle: 'Wing B — Mixtures, Separation & Solutions',
    title: 'Station 6: Hand & Tweezers Sorting Tray',
    shortLabel: '6. Tweezers Sort',
    benchmarks: ['SC.5.P.8.3'],
    compactGuideLines: [
      'Use the stainless-steel tweezers to pick and sort beads and cubes into matching dishes.',
      'Large solid parts can be separated directly using observable color and shape!',
    ],
    voluntaryAtom5Tip:
      'When pieces in a solid mixture are easy to see and grab, tweezers sort them cleanly by shape (cubes vs. spheres) and color!',
  },
  station_7_iron_sand_magnet: {
    id: 'station_7_iron_sand_magnet',
    stationNumber: 7,
    wing: 'wing_b_mixtures',
    wingTitle: 'Wing B — Mixtures, Separation & Solutions',
    title: 'Station 7: Iron Filings & Sand Magnet Tray',
    shortLabel: '7. Iron & Sand',
    benchmarks: ['SC.5.P.8.3'],
    compactGuideLines: [
      'Sweep the sleeved bar magnet across the mixed sand and dark iron filings.',
      'Watch magnetic attraction lift the iron filings cleanly off the non-magnetic sand!',
    ],
    voluntaryAtom5Tip:
      'Sand and iron filings have nearly the same tiny grain size, so a sieve struggles—but magnetism pulls out all 30.0 g of iron in seconds!',
  },
  station_8_sand_gravel_sieve: {
    id: 'station_8_sand_gravel_sieve',
    stationNumber: 8,
    wing: 'wing_b_mixtures',
    wingTitle: 'Wing B — Mixtures, Separation & Solutions',
    title: 'Station 8: Sand & Gravel Sieve Bench',
    shortLabel: '8. Gravel Sieve',
    benchmarks: ['SC.5.P.8.3'],
    compactGuideLines: [
      'Pour the sand-and-gravel mixture onto the 2.0 mm wire-mesh sieve and shake it.',
      'Fine sand falls into the catch pan while coarse river pebbles stay trapped on top!',
    ],
    voluntaryAtom5Tip:
      'Neither sand nor river gravel is magnetic, and neither dissolves in water—so particle size with a mesh screen is the ideal tool!',
  },
  station_9_filtration_evaporation: {
    id: 'station_9_filtration_evaporation',
    stationNumber: 9,
    wing: 'wing_b_mixtures',
    wingTitle: 'Wing B — Mixtures, Separation & Solutions',
    title: 'Station 9: Filtration & Hot Plate Evaporation',
    shortLabel: '9. Filter & Evaporate',
    benchmarks: ['SC.5.P.8.2', 'SC.5.P.8.3', 'SC.5.P.8.4', 'SC.5.P.9.1'],
    compactGuideLines: [
      'Pour Sand+Water (Mode A) or Salt+Sand+Water (Mode B) through pleated filter paper.',
      'Then heat the clear liquid on the Hot Plate + Condenser to crystallize pure white salt!',
    ],
    voluntaryAtom5Tip:
      'Dissolved salt breaks into tiny unseen parts (toggle Particle Vision P!) that slip right through filter paper with water, then reappear as solid crystals when water evaporates!',
  },
  station_10_solutions_dissolving: {
    id: 'station_10_solutions_dissolving',
    stationNumber: 10,
    wing: 'wing_b_mixtures',
    wingTitle: 'Wing B — Mixtures, Separation & Solutions',
    title: 'Station 10: Solutions & Dissolving Rate Lab',
    shortLabel: '10. Dissolving Race',
    benchmarks: ['SC.5.P.8.2', 'SC.5.P.8.4', 'SC.5.P.9.1'],
    compactGuideLines: [
      'Part A: Stir salt, sugar, sand, and pepper in 4 beakers to see which dissolve clear.',
      'Part B: Race Beaker A vs. Beaker B—change ONE variable (Temp, Stirring, or Grain Size)!',
    ],
    voluntaryAtom5Tip:
      'In a fair scientific test, change ONLY one condition between Beaker A and Beaker B so you know for sure what sped up dissolving!',
  },
};

export const STATION1_SPECIMENS: Readonly<Record<Station1SpecimenId, Station1SpecimenSpec>> = {
  brushed_aluminum_bar: {
    id: 'brushed_aluminum_bar',
    displayName: 'Brushed Aluminum Bar',
    colorLabel: 'Silvery gray',
    colorHex: 0xcbd5e1,
    luster: 'metallic',
    texture: 'smooth',
    closeUpDetail: 'Fine machined metal surface reflecting crisp silver highlights.',
  },
  pyrite_copper_nugget: {
    id: 'pyrite_copper_nugget',
    displayName: 'Pyrite & Copper Nugget',
    colorLabel: 'Golden-bronze',
    colorHex: 0xd97706,
    luster: 'metallic',
    texture: 'rough',
    closeUpDetail: 'Jagged natural metallic faces flashing bright brassy gold.',
  },
  quartz_crystal_s1: {
    id: 'quartz_crystal_s1',
    displayName: 'Clear Quartz Crystal',
    colorLabel: 'Clear / colorless',
    colorHex: 0xe0f2fe,
    luster: 'glassy',
    texture: 'smooth',
    closeUpDetail: 'Flat six-sided crystal faces with bright glassy reflections.',
  },
  dull_basalt_rock: {
    id: 'dull_basalt_rock',
    displayName: 'Basalt Rock',
    colorLabel: 'Charcoal black',
    colorHex: 0x334155,
    luster: 'dull',
    texture: 'rough',
    closeUpDetail: 'Matte fine-grained volcanic rock that scatters light without shine.',
  },
  smooth_river_glass: {
    id: 'smooth_river_glass',
    displayName: 'Smooth River Glass',
    colorLabel: 'Seafoam green',
    colorHex: 0x5eead4,
    luster: 'glassy',
    texture: 'smooth',
    closeUpDetail: 'Water-tumbled translucent glass with rounded, silky-smooth edges.',
  },
  rough_pumice_stone: {
    id: 'rough_pumice_stone',
    displayName: 'Rough Pumice Stone',
    colorLabel: 'Pale ash gray',
    colorHex: 0xa8a29e,
    luster: 'dull',
    texture: 'rough',
    closeUpDetail: 'Porous volcanic stone covered in tiny rough air pockets.',
  },
  colored_acrylic_beads: {
    id: 'colored_acrylic_beads',
    displayName: 'Acrylic Beads',
    colorLabel: 'Ruby red & cobalt blue',
    colorHex: 0xef4444,
    luster: 'glassy',
    texture: 'smooth',
    closeUpDetail: 'Polished spherical polymer beads with glossy surface sheen.',
  },
};

export const STATION2_SPECIMENS: Readonly<Record<Station2SpecimenId, Station2SpecimenSpec>> = {
  talc_chalk: {
    id: 'talc_chalk',
    displayName: 'Soft Talc / Chalk',
    colorLabel: 'Chalky white',
    colorHex: 0xf1f5f9,
    luster: 'dull',
    texture: 'smooth',
    relativeHardnessRank: 1.5,
  },
  copper_penny_sample: {
    id: 'copper_penny_sample',
    displayName: 'Copper Penny Plate',
    colorLabel: 'Copper orange',
    colorHex: 0xc2410c,
    luster: 'metallic',
    texture: 'smooth',
    relativeHardnessRank: 3.5,
  },
  river_glass_plate: {
    id: 'river_glass_plate',
    displayName: 'River Glass Plate',
    colorLabel: 'Pale aqua clear',
    colorHex: 0x67e8f9,
    luster: 'glassy',
    texture: 'smooth',
    relativeHardnessRank: 5.5,
  },
  steel_nail_sample: {
    id: 'steel_nail_sample',
    displayName: 'Tempered Steel Bar',
    colorLabel: 'Dark steel gray',
    colorHex: 0x64748b,
    luster: 'metallic',
    texture: 'smooth',
    relativeHardnessRank: 6.2,
  },
  quartz_crystal_s2: {
    id: 'quartz_crystal_s2',
    displayName: 'Hard Quartz Crystal',
    colorLabel: 'Translucent white',
    colorHex: 0xf8fafc,
    luster: 'glassy',
    texture: 'smooth',
    relativeHardnessRank: 7.0,
  },
};

export const SCRATCH_TOOL_SPECS: Readonly<
  Record<ScratchToolId, { label: string; hardnessRank: number }>
> = {
  copper_penny: { label: 'Copper Penny', hardnessRank: 3.5 },
  steel_nail: { label: 'Steel Nail', hardnessRank: 6.2 },
};

export const STATION3_MAGNET_ITEMS: Readonly<
  Record<Station3MagnetItemId, Station3MagnetItemSpec>
> = {
  iron_nail: {
    id: 'iron_nail',
    displayName: 'Iron Nail',
    colorLabel: 'Dark iron gray',
    colorHex: 0x475569,
    luster: 'metallic',
    isShinyMetal: true,
    isMagnetic: true,
  },
  steel_paperclip: {
    id: 'steel_paperclip',
    displayName: 'Steel Paperclip',
    colorLabel: 'Bright silver',
    colorHex: 0xe2e8f0,
    luster: 'metallic',
    isShinyMetal: true,
    isMagnetic: true,
  },
  aluminum_foil: {
    id: 'aluminum_foil',
    displayName: 'Aluminum Foil Sheet',
    colorLabel: 'Mirror silver',
    colorHex: 0xf1f5f9,
    luster: 'metallic',
    isShinyMetal: true,
    isMagnetic: false,
  },
  copper_wire: {
    id: 'copper_wire',
    displayName: 'Copper Wire Coil',
    colorLabel: 'Reddish copper',
    colorHex: 0xea580c,
    luster: 'metallic',
    isShinyMetal: true,
    isMagnetic: false,
  },
  plastic_cube: {
    id: 'plastic_cube',
    displayName: 'Blue Plastic Cube',
    colorLabel: 'Royal blue',
    colorHex: 0x2563eb,
    luster: 'dull',
    isShinyMetal: false,
    isMagnetic: false,
  },
};

export const STATION3_SCENT_JARS: Readonly<Record<Station3ScentJarId, Station3ScentJarSpec>> = {
  vanilla_jar: {
    id: 'vanilla_jar',
    label: 'Scent Jar A',
    liquidColorHex: 0xb45309,
    detectedAroma: 'Warm sweet vanilla extract',
    safetyNote: 'Safe wafting swept a gentle breeze from Jar A—warm vanilla detected safely!',
  },
  lemon_jar: {
    id: 'lemon_jar',
    label: 'Scent Jar B',
    liquidColorHex: 0xfacc15,
    detectedAroma: 'Fresh citrus lemon juice',
    safetyNote: 'Safe wafting swept a gentle breeze from Jar B—bright citrus lemon detected!',
  },
  vinegar_jar: {
    id: 'vinegar_jar',
    label: 'Scent Jar C',
    liquidColorHex: 0xfef3c7,
    detectedAroma: 'Sharp tangy vinegar',
    safetyNote:
      'Safe wafting protected your nose from strong vinegar vapors while letting you identify the tangy scent!',
  },
};

export const STATION4_OBJECTS: Readonly<Record<Station4ObjectId, Station4ObjectSpec>> = {
  brass_cylinder: {
    id: 'brass_cylinder',
    displayName: 'Brass Cylinder',
    colorLabel: 'Golden brass',
    colorHex: 0xeab308,
    luster: 'metallic',
    texture: 'smooth',
    massGrams: 68.4,
    displacedVolumeMl: 8.0,
  },
  quartz_pebble: {
    id: 'quartz_pebble',
    displayName: 'Quartz Pebble',
    colorLabel: 'Milky white',
    colorHex: 0xe2e8f0,
    luster: 'glassy',
    texture: 'smooth',
    massGrams: 39.0,
    displacedVolumeMl: 15.0,
  },
  acrylic_cube: {
    id: 'acrylic_cube',
    displayName: 'Acrylic Cube',
    colorLabel: 'Translucent red',
    colorHex: 0xf43f5e,
    luster: 'glassy',
    texture: 'smooth',
    massGrams: 23.6,
    displacedVolumeMl: 20.0,
  },
};

export const MATERIAL_CATALOG: Readonly<
  Record<MaterialId, Omit<MaterialSample, 'massGrams' | 'isDissolved'>>
> = {
  glass_shards: {
    id: 'glass_shards',
    displayName: 'Safety Glass Shards',
    isMagnetic: false,
    isSolubleInWater: false,
    particleSizeMm: 6.5,
    state: 'solid',
    colorHex: 0xa5f3fc,
    textureSummary: 'Coarse, jagged, translucent solid fragments (6.5 mm)',
  },
  iron_filings: {
    id: 'iron_filings',
    displayName: 'Iron Filings',
    isMagnetic: true,
    isSolubleInWater: false,
    particleSizeMm: 0.6,
    state: 'solid',
    colorHex: 0x334155,
    textureSummary: 'Fine, dark metallic gray shavings attracted to magnets (0.6 mm)',
  },
  sand: {
    id: 'sand',
    displayName: 'Quartz Beach Sand',
    isMagnetic: false,
    isSolubleInWater: false,
    particleSizeMm: 0.5,
    state: 'solid',
    colorHex: 0xd9b382,
    textureSummary: 'Gritty tan mineral grains that sink and do not dissolve in water (0.5 mm)',
  },
  salt: {
    id: 'salt',
    displayName: 'Table Salt Crystals',
    isMagnetic: false,
    isSolubleInWater: true,
    particleSizeMm: 0.4,
    state: 'solid',
    colorHex: 0xf8fafc,
    textureSummary: 'Fine white cubic crystals that dissolve completely in water (0.4 mm)',
  },
  water: {
    id: 'water',
    displayName: 'Pure Lab Water',
    isMagnetic: false,
    isSolubleInWater: false,
    particleSizeMm: 0,
    state: 'liquid',
    colorHex: 0x38bdf8,
    textureSummary: 'Clear liquid at room temperature; boils to invisible water vapor gas at 100°C (212°F)',
  },
};

const INITIAL_SOLID_TARGETS: Readonly<Record<MixtureSolidId, number>> = {
  glass_shards: 40,
  iron_filings: 30,
  sand: 50,
  salt: 25,
};

const INITIAL_WATER_MASS_GRAMS = 100;
const RACE_WATER_MASS_GRAMS = 100;
const RACE_SALT_MASS_GRAMS = 20;

function roundMass(grams: number): number {
  return Math.round(grams * 1000) / 1000;
}

function roundTenth(val: number): number {
  return Math.round(val * 10) / 10;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createSample(
  id: MaterialId,
  massGrams: number,
  overrides?: Partial<Pick<MaterialSample, 'state' | 'isDissolved'>>,
): MaterialSample {
  const base = MATERIAL_CATALOG[id];
  return {
    ...base,
    massGrams: roundMass(massGrams),
    state: overrides?.state ?? base.state,
    isDissolved: overrides?.isDissolved ?? false,
  };
}

function cloneSample(sample: MaterialSample): MaterialSample {
  return { ...sample, massGrams: roundMass(sample.massGrams) };
}

/**
 * Deterministic model for Station 10 Part B dissolving race time (seconds) across
 * the 3 Florida Grade 5 SC.5.P.8.2 variables: Water Temperature, Stirring, and Particle Size.
 */
export function computeDissolvingRaceSeconds(config: RaceBeakerConfig): number {
  let baseSeconds = 11.6; // Room 22°C, Still, Fine Granulated Salt
  if (config.waterTempPreset === 'warm') {
    baseSeconds = 6.6;
  } else if (config.waterTempPreset === 'cool') {
    baseSeconds = 18.4;
  }
  const stirFactor = config.stirred ? 0.52 : 1.0;
  const grainFactor = config.grainSize === 'coarse' ? 1.85 : 1.0;
  return Math.max(2.4, roundTenth(baseSeconds * stirFactor * grainFactor));
}

export class MatterEngine {
  // Navigation & Station Focus State
  private navigationMode: LabNavigationMode = 'roam';
  private activeStationId: LabStationId = 'station_1_luster_texture';

  // Wing A (Stations 1–5) State
  private station1!: Station1State;
  private station2!: Station2State;
  private station3!: Station3State;
  private station4!: Station4State;
  private station5!: Station5State;

  // Wing B (Stations 6–10) State
  private station6Pieces: Station6Piece[] = [];
  private station7!: Station7State;
  private station8!: Station8State;
  private station9!: Station9State;
  private station10Solubility!: Record<Station10BeakerMaterialId, Station10SolubilityBeaker>;
  private station10BeakerA!: RaceBeakerState;
  private station10BeakerB!: RaceBeakerState;
  private station10StopwatchRunning = false;
  private station10StopwatchSeconds = 0;
  private station10LatestRaceSummary: string | null = null;

  // 3-Tab Lab Data Sheet State
  private tab1Rows: PropertyMeasurementRow[] = [];
  private tab2Rows: MixtureSeparationRow[] = [];
  private tab3Rows: SolutionsAndStatesRow[] = [];
  private nextTab2EntryId = 1;
  private nextTab3EntryId = 1;

  // Voluntary Misconception Tracking
  private resolvedMisconceptions = new Set<MisconceptionId>();
  private recentObservedMisconceptions: MisconceptionId[] = [];

  // Backward-compatible World 2 Mixture Bench State
  private containers!: Record<ContainerId, LabContainerState>;
  private initialSystemMassGrams = 0;
  private stepCounter = 0;
  private logs: InvestigationLogEntry[] = [];
  private pendingPrediction: PendingPrediction | null = null;

  constructor() {
    this.resetAllStations();
  }

  // ============================================================================
  // GLOBAL LAB & NAVIGATION STATE API
  // ============================================================================

  public resetAllStations(): void {
    this.navigationMode = 'roam';
    this.activeStationId = 'station_1_luster_texture';
    this.resolvedMisconceptions.clear();
    this.recentObservedMisconceptions = [];

    this.initDataSheetRows();
    this.resetStation1();
    this.resetStation2();
    this.resetStation3();
    this.resetStation4();
    this.resetStation5();
    this.resetStation6();
    this.resetStation7();
    this.resetStation8();
    this.resetStation9('mode_b_salt_sand_water');
    this.resetStation10();
    this.resetWorld2MixtureRescue();
  }

  public getStationCatalog(): readonly LabStationDescriptor[] {
    return LAB_STATION_IDS.map((id) => LAB_STATION_CATALOG[id]);
  }

  public getStationDescriptor(stationId: LabStationId): LabStationDescriptor {
    return LAB_STATION_CATALOG[stationId];
  }

  public getNavigationMode(): LabNavigationMode {
    return this.navigationMode;
  }

  public getActiveStationId(): LabStationId {
    return this.activeStationId;
  }

  public enterStationFocus(stationId: LabStationId): LabStationDescriptor {
    this.activeStationId = stationId;
    this.navigationMode = 'station_focus';
    return LAB_STATION_CATALOG[stationId];
  }

  public exitToRoamMode(): void {
    this.navigationMode = 'roam';
  }

  public getVoluntaryAtom5Prompt(stationId: LabStationId = this.activeStationId): VoluntaryAtom5Prompt {
    const desc = LAB_STATION_CATALOG[stationId];
    const unresolved =
      this.recentObservedMisconceptions.find((id) => !this.resolvedMisconceptions.has(id)) ?? null;

    let relevantCue: MisconceptionId | null = null;
    if (
      stationId === 'station_5_thermal_states' &&
      (unresolved === 'STEAM_IS_WATER_VAPOR_GAS' || unresolved === 'BUBBLES_PROVE_CHEMICAL_CHANGE')
    ) {
      relevantCue = unresolved;
    } else if (stationId === 'station_9_filtration_evaporation') {
      relevantCue = unresolved;
    } else if (
      stationId === 'station_10_solutions_dissolving' &&
      unresolved === 'DISSOLVING_DESTROYS_MATTER'
    ) {
      relevantCue = unresolved;
    }

    return {
      stationId,
      tipTitle: `ATOM-5 • ${desc.shortLabel}`,
      tipBody: desc.voluntaryAtom5Tip,
      optionalMisconceptionId: relevantCue,
    };
  }

  public getMisconceptionGuardrail(id: MisconceptionId) {
    return MISCONCEPTION_GUARDRAILS[id];
  }

  // ============================================================================
  // STATION 1: COLOR, LUSTER & TEXTURE INSPECTION TABLE (SC.5.P.8.1)
  // ============================================================================

  public resetStation1(): void {
    this.station1 = {
      activeSpecimenId: 'brushed_aluminum_bar',
      magnifierActive: false,
      inspectedSpecimens: {
        brushed_aluminum_bar: false,
        pyrite_copper_nugget: false,
        quartz_crystal_s1: false,
        dull_basalt_rock: false,
        smooth_river_glass: false,
        rough_pumice_stone: false,
        colored_acrylic_beads: false,
      },
    };
  }

  public getStation1State(): Station1State {
    return {
      ...this.station1,
      inspectedSpecimens: { ...this.station1.inspectedSpecimens },
    };
  }

  public inspectStation1Specimen(
    specimenId: Station1SpecimenId,
    magnifierActive = true,
  ): StationActionFeedback {
    const spec = STATION1_SPECIMENS[specimenId];
    const inspectedSpecimens = {
      ...this.station1.inspectedSpecimens,
      [specimenId]: true,
    };
    this.station1 = {
      activeSpecimenId: specimenId,
      magnifierActive,
      inspectedSpecimens,
    };

    // Auto-record observable surface properties in Data Sheet Tab 1
    this.upsertTab1AutoMeasurement(specimenId, {
      color: spec.colorLabel,
      luster: spec.luster,
      texture: spec.texture,
      surfaceFlag: true,
    });

    return {
      stationId: 'station_1_luster_texture',
      headline: `${spec.displayName} — ${spec.luster.toUpperCase()} Luster, ${spec.texture.toUpperCase()} Texture`,
      observation: `${spec.closeUpDetail} Color: ${spec.colorLabel} | Luster: ${spec.luster} | Texture: ${spec.texture}.`,
      scientificExplanation:
        'Scientists classify solid materials using observable properties such as color, surface luster (metallic, glassy, or dull), and texture (SC.5.P.8.1).',
      benchmarksAddressed: ['SC.5.P.8.1'],
      triggeredMisconceptions: [],
    };
  }

  // ============================================================================
  // STATION 2: HARDNESS SCRATCH BENCH (SC.5.P.8.1)
  // ============================================================================

  public resetStation2(): void {
    const emptyRec = (): Station2SpecimenScratchRecord => ({
      testedWithPenny: false,
      scratchedByPenny: false,
      testedWithNail: false,
      scratchedByNail: false,
    });
    this.station2 = {
      activeTool: 'copper_penny',
      activeSpecimenId: 'talc_chalk',
      scratchRecords: {
        talc_chalk: emptyRec(),
        copper_penny_sample: emptyRec(),
        river_glass_plate: emptyRec(),
        steel_nail_sample: emptyRec(),
        quartz_crystal_s2: emptyRec(),
      },
    };
  }

  public getStation2State(): Station2State {
    const cloned = {} as Record<Station2SpecimenId, Station2SpecimenScratchRecord>;
    for (const id of Object.keys(this.station2.scratchRecords) as Station2SpecimenId[]) {
      cloned[id] = { ...this.station2.scratchRecords[id] };
    }
    return {
      activeTool: this.station2.activeTool,
      activeSpecimenId: this.station2.activeSpecimenId,
      scratchRecords: cloned,
    };
  }

  public runStation2ScratchTest(
    specimenId: Station2SpecimenId,
    tool: ScratchToolId,
  ): StationActionFeedback {
    const spec = STATION2_SPECIMENS[specimenId];
    const toolSpec = SCRATCH_TOOL_SPECS[tool];
    const didScratch = toolSpec.hardnessRank > spec.relativeHardnessRank;

    const rec = this.station2.scratchRecords[specimenId];
    if (tool === 'copper_penny') {
      rec.testedWithPenny = true;
      rec.scratchedByPenny = didScratch;
    } else {
      rec.testedWithNail = true;
      rec.scratchedByNail = didScratch;
    }

    this.station2 = {
      ...this.station2,
      activeTool: tool,
      activeSpecimenId: specimenId,
    };

    const summaryParts: string[] = [];
    if (rec.testedWithPenny) {
      summaryParts.push(rec.scratchedByPenny ? 'Penny: Scratched' : 'Penny: No scratch');
    }
    if (rec.testedWithNail) {
      summaryParts.push(rec.scratchedByNail ? 'Steel Nail: Scratched' : 'Steel Nail: No scratch');
    }

    this.upsertTab1AutoMeasurement(specimenId, {
      color: spec.colorLabel,
      luster: spec.luster,
      texture: spec.texture,
      hardnessScratchResult: summaryParts.join(' | '),
      scratchFlag: true,
    });

    return {
      stationId: 'station_2_hardness_scratch',
      headline: didScratch
        ? `${toolSpec.label} Scratched ${spec.displayName}!`
        : `${spec.displayName} Resisted ${toolSpec.label} (No Scratch Groove)`,
      observation: didScratch
        ? `Dragging the ${toolSpec.label} left a crisp visible scratch groove across ${spec.displayName}, proving the ${toolSpec.label} is harder.`
        : `Dragging the ${toolSpec.label} across ${spec.displayName} left NO groove—${spec.displayName} is as hard as or harder than the ${toolSpec.label}!`,
      scientificExplanation:
        'Hardness is a physical property measured by scratch resistance: a harder solid scratches a softer solid (SC.5.P.8.1).',
      benchmarksAddressed: ['SC.5.P.8.1'],
      triggeredMisconceptions: [],
    };
  }

  // ============================================================================
  // STATION 3: MAGNETISM & SAFE WAFTING STATION (SC.5.P.8.1, SC.5.P.8.3)
  // ============================================================================

  public resetStation3(): void {
    this.station3 = {
      activeMagnetItemId: null,
      magnetTested: {
        iron_nail: false,
        steel_paperclip: false,
        aluminum_foil: false,
        copper_wire: false,
        plastic_cube: false,
      },
      magnetAttracted: {
        iron_nail: false,
        steel_paperclip: false,
        aluminum_foil: false,
        copper_wire: false,
        plastic_cube: false,
      },
      activeWaftingJarId: null,
      waftedJars: {
        vanilla_jar: false,
        lemon_jar: false,
        vinegar_jar: false,
      },
    };
  }

  public getStation3State(): Station3State {
    return {
      activeMagnetItemId: this.station3.activeMagnetItemId,
      magnetTested: { ...this.station3.magnetTested },
      magnetAttracted: { ...this.station3.magnetAttracted },
      activeWaftingJarId: this.station3.activeWaftingJarId,
      waftedJars: { ...this.station3.waftedJars },
    };
  }

  public testStation3Magnet(itemId: Station3MagnetItemId): StationActionFeedback {
    const spec = STATION3_MAGNET_ITEMS[itemId];
    this.station3 = {
      ...this.station3,
      activeMagnetItemId: itemId,
      magnetTested: { ...this.station3.magnetTested, [itemId]: true },
      magnetAttracted: { ...this.station3.magnetAttracted, [itemId]: spec.isMagnetic },
    };

    this.upsertTab1AutoMeasurement(itemId, {
      color: spec.colorLabel,
      luster: spec.luster,
      magnetic: spec.isMagnetic ? 'yes' : 'no',
      magneticFlag: true,
    });

    const nonMagShinyNote =
      !spec.isMagnetic && spec.isShinyMetal
        ? ' Even though it is a shiny metal, aluminum and copper are NOT magnetic!'
        : '';

    return {
      stationId: 'station_3_magnetism_wafting',
      headline: spec.isMagnetic
        ? `${spec.displayName}: Magnetic Attraction (YES)`
        : `${spec.displayName}: Not Magnetic (NO)`,
      observation: spec.isMagnetic
        ? `${spec.displayName} snapped firmly onto the bar magnet pole!`
        : `${spec.displayName} did not move toward the bar magnet.${nonMagShinyNote}`,
      scientificExplanation:
        'Magnetism attracts iron and steel, while other metals (like aluminum and copper) and plastics are non-magnetic (SC.5.P.8.1, SC.5.P.8.3).',
      benchmarksAddressed: ['SC.5.P.8.1', 'SC.5.P.8.3'],
      triggeredMisconceptions: [],
    };
  }

  public waftStation3Jar(jarId: Station3ScentJarId): StationActionFeedback {
    const jar = STATION3_SCENT_JARS[jarId];
    this.station3 = {
      ...this.station3,
      activeWaftingJarId: jarId,
      waftedJars: { ...this.station3.waftedJars, [jarId]: true },
    };

    return {
      stationId: 'station_3_magnetism_wafting',
      headline: `${jar.label} Wafted Safely — ${jar.detectedAroma}`,
      observation: jar.safetyNote,
      scientificExplanation:
        'Odor is an observable property, and scientists always use the hand-wafting technique rather than sniffing directly over containers (SC.5.P.8.1).',
      benchmarksAddressed: ['SC.5.P.8.1'],
      triggeredMisconceptions: [],
    };
  }

  // ============================================================================
  // STATION 4: MASS & VOLUME DISPLACEMENT BENCH (SC.5.P.8.1 — NO DENSITY MATH!)
  // ============================================================================

  public resetStation4(): void {
    this.station4 = {
      initialWaterVolumeMl: 50.0,
      currentWaterVolumeMl: 50.0,
      displacedVolumeMl: 0.0,
      objectOnBalance: null,
      balanceReadoutGrams: 0.0,
      submergedObject: null,
      weighedObjects: {
        brass_cylinder: false,
        quartz_pebble: false,
        acrylic_cube: false,
      },
      submergedObjects: {
        brass_cylinder: false,
        quartz_pebble: false,
        acrylic_cube: false,
      },
    };
  }

  public getStation4State(): Station4State {
    return {
      ...this.station4,
      weighedObjects: { ...this.station4.weighedObjects },
      submergedObjects: { ...this.station4.submergedObjects },
    };
  }

  public weighStation4Object(objectId: Station4ObjectId): StationActionFeedback {
    const spec = STATION4_OBJECTS[objectId];
    const wasSubmerged = this.station4.submergedObject === objectId;
    const nextSubmerged = wasSubmerged ? null : this.station4.submergedObject;
    const nextWaterMl = nextSubmerged
      ? roundTenth(50.0 + STATION4_OBJECTS[nextSubmerged].displacedVolumeMl)
      : 50.0;

    this.station4 = {
      ...this.station4,
      objectOnBalance: objectId,
      balanceReadoutGrams: spec.massGrams,
      submergedObject: nextSubmerged,
      currentWaterVolumeMl: nextWaterMl,
      displacedVolumeMl: roundTenth(nextWaterMl - 50.0),
      weighedObjects: { ...this.station4.weighedObjects, [objectId]: true },
    };

    this.upsertTab1AutoMeasurement(objectId, {
      color: spec.colorLabel,
      luster: spec.luster,
      texture: spec.texture,
      massGrams: spec.massGrams.toFixed(1),
      massFlag: true,
    });

    return {
      stationId: 'station_4_mass_volume',
      headline: `${spec.displayName} Mass: ${spec.massGrams.toFixed(1)} g`,
      observation: `Digital balance reads ${spec.massGrams.toFixed(1)} g for the ${spec.displayName} (auto-recorded in Tab 1 of your Data Sheet).`,
      scientificExplanation:
        'Mass measures the amount of matter in an object in grams (g) using a balance (SC.5.P.8.1).',
      benchmarksAddressed: ['SC.5.P.8.1'],
      triggeredMisconceptions: [],
    };
  }

  public submergeStation4Object(objectId: Station4ObjectId): StationActionFeedback {
    const spec = STATION4_OBJECTS[objectId];
    const startMl = 50.0;
    const finalMl = roundTenth(startMl + spec.displacedVolumeMl);
    const wasOnBalance = this.station4.objectOnBalance === objectId;

    this.station4 = {
      ...this.station4,
      objectOnBalance: wasOnBalance ? null : this.station4.objectOnBalance,
      balanceReadoutGrams: wasOnBalance ? 0.0 : this.station4.balanceReadoutGrams,
      submergedObject: objectId,
      currentWaterVolumeMl: finalMl,
      displacedVolumeMl: spec.displacedVolumeMl,
      submergedObjects: { ...this.station4.submergedObjects, [objectId]: true },
    };

    this.upsertTab1AutoMeasurement(objectId, {
      color: spec.colorLabel,
      luster: spec.luster,
      texture: spec.texture,
      displacedVolumeMl: spec.displacedVolumeMl.toFixed(1),
      volumeFlag: true,
    });

    return {
      stationId: 'station_4_mass_volume',
      headline: `${spec.displayName} Displaced Volume: ${spec.displacedVolumeMl.toFixed(1)} mL`,
      observation: `Lowering the ${spec.displayName} raised the curved water meniscus from ${startMl.toFixed(1)} mL to ${finalMl.toFixed(1)} mL (${finalMl.toFixed(1)} − ${startMl.toFixed(1)} = ${spec.displacedVolumeMl.toFixed(1)} mL).`,
      scientificExplanation:
        'Water displacement measures the volume (space taken up) of an irregular or regular solid in milliliters (mL) (SC.5.P.8.1).',
      benchmarksAddressed: ['SC.5.P.8.1'],
      triggeredMisconceptions: [],
    };
  }

  public clearStation4Instruments(): void {
    this.station4 = {
      ...this.station4,
      objectOnBalance: null,
      balanceReadoutGrams: 0.0,
      submergedObject: null,
      currentWaterVolumeMl: 50.0,
      displacedVolumeMl: 0.0,
    };
  }

  // ============================================================================
  // STATION 5: STATES OF MATTER THERMAL CHAMBER (SC.5.P.8.1, SC.5.P.8.4, SC.5.P.9.1)
  // ============================================================================

  public resetStation5(): void {
    this.station5 = {
      chamberMassGrams: 100.0,
      temperatureCelsius: -6,
      currentState: 'solid',
      iceFraction: 1,
      liquidFraction: 0,
      boilingIntensity: 0,
      upperMistIntensity: 0,
      observedSolid: true,
      observedLiquid: false,
      observedGasBoiling: false,
    };
  }

  public getStation5State(): Station5State {
    return { ...this.station5 };
  }

  public setStation5Temperature(rawCelsius: number): StationActionFeedback {
    const tempC = Math.round(clamp(rawCelsius, -10, 110));
    let currentState: MatterState = 'liquid';
    let iceFraction = 0;
    let liquidFraction = 1;
    let boilingIntensity = 0;
    let upperMistIntensity = 0;
    const misconceptions: MisconceptionId[] = [];

    if (tempC <= 0) {
      currentState = 'solid';
      iceFraction = 1;
      liquidFraction = 0;
    } else if (tempC < 100) {
      currentState = 'liquid';
      iceFraction = 0;
      liquidFraction = 1;
      upperMistIntensity = tempC >= 75 ? roundTenth((tempC - 75) / 40) : 0;
    } else {
      currentState = 'gas';
      iceFraction = 0;
      liquidFraction = 0.45;
      boilingIntensity = 1;
      upperMistIntensity = 0.85;
      misconceptions.push('STEAM_IS_WATER_VAPOR_GAS', 'BUBBLES_PROVE_CHEMICAL_CHANGE');
      for (const m of misconceptions) {
        this.noteMisconceptionCue(m);
      }
    }

    this.station5 = {
      chamberMassGrams: 100.0,
      temperatureCelsius: tempC,
      currentState,
      iceFraction,
      liquidFraction,
      boilingIntensity,
      upperMistIntensity,
      observedSolid: this.station5.observedSolid || currentState === 'solid',
      observedLiquid: this.station5.observedLiquid || currentState === 'liquid',
      observedGasBoiling: this.station5.observedGasBoiling || currentState === 'gas',
    };

    const stateLabel =
      currentState === 'solid'
        ? `Solid Ice at ${formatGrade5Temperature(tempC)} (Definite shape & volume)`
        : currentState === 'liquid'
          ? `Liquid Water at ${formatGrade5Temperature(tempC)} (Takes container shape, definite volume)`
          : `Boiling -> Invisible Water Vapor Gas at ${formatGrade5Temperature(tempC)}`;

    this.upsertTab3ThermalStateRow(stateLabel);

    const observation =
      currentState === 'solid'
        ? `At ${formatGrade5Temperature(tempC)}, the 100.0 g of water is solid ice with its own definite cube shape and volume.`
        : currentState === 'liquid'
          ? `Warmed to ${formatGrade5Temperature(tempC)}, the ice melted into 100.0 g of liquid water that flows to match the chamber walls while keeping definite volume.`
          : `At ${formatGrade5Temperature(tempC)}, liquid water boils rapidly! Notice the clear invisible water vapor gas zone right above the surface before tiny condensed liquid mist droplets appear higher up (100.0 g mass conserved).`;

    return {
      stationId: 'station_5_thermal_states',
      headline: `Thermal Chamber: ${stateLabel}`,
      observation,
      scientificExplanation:
        'Heating and cooling drive physical state changes—melting, freezing, boiling/evaporating, and condensing—without creating a new substance or changing total mass (SC.5.P.8.1, SC.5.P.9.1).',
      benchmarksAddressed: ['SC.5.P.8.1', 'SC.5.P.8.4', 'SC.5.P.9.1'],
      triggeredMisconceptions: misconceptions,
    };
  }

  // ============================================================================
  // STATION 6: HAND & TWEEZERS SORTING TRAY (SC.5.P.8.3)
  // ============================================================================

  public resetStation6(): void {
    const specs: Array<{
      cat: Station6CategoryId;
      shape: 'sphere' | 'cube';
      colorLabel: 'Red' | 'Blue' | 'Yellow' | 'White';
      hex: number;
    }> = [
      { cat: 'red_bead', shape: 'sphere', colorLabel: 'Red', hex: 0xef4444 },
      { cat: 'blue_bead', shape: 'sphere', colorLabel: 'Blue', hex: 0x3b82f6 },
      { cat: 'yellow_bead', shape: 'sphere', colorLabel: 'Yellow', hex: 0xeab308 },
      { cat: 'white_cube', shape: 'cube', colorLabel: 'White', hex: 0xf8fafc },
    ];
    const pieces: Station6Piece[] = [];
    for (const s of specs) {
      for (let i = 1; i <= 4; i++) {
        pieces.push({
          pieceId: `${s.cat}_${i}`,
          category: s.cat,
          shape: s.shape,
          colorLabel: s.colorLabel,
          colorHex: s.hex,
          sortedIntoBin: false,
        });
      }
    }
    this.station6Pieces = pieces;
  }

  public getStation6State(): Station6State {
    const sortedCounts: Record<Station6CategoryId, number> = {
      red_bead: 0,
      blue_bead: 0,
      yellow_bead: 0,
      white_cube: 0,
    };
    let unsortedCount = 0;
    for (const p of this.station6Pieces) {
      if (p.sortedIntoBin) {
        sortedCounts[p.category] += 1;
      } else {
        unsortedCount += 1;
      }
    }
    return {
      pieces: this.station6Pieces.map((p) => ({ ...p })),
      unsortedCount,
      sortedCounts,
      allSorted: unsortedCount === 0,
    };
  }

  public sortStation6Piece(pieceId: string): StationActionFeedback {
    const piece = this.station6Pieces.find((p) => p.pieceId === pieceId);
    if (piece && !piece.sortedIntoBin) {
      piece.sortedIntoBin = true;
    }
    return this.buildStation6Feedback();
  }

  public sortStation6ByCategory(category: Station6CategoryId | 'all'): StationActionFeedback {
    for (const p of this.station6Pieces) {
      if (category === 'all' || p.category === category) {
        p.sortedIntoBin = true;
      }
    }
    return this.buildStation6Feedback();
  }

  private buildStation6Feedback(): StationActionFeedback {
    const st = this.getStation6State();
    const totalSorted = 16 - st.unsortedCount;

    this.upsertTab2SeparationRow({
      stationBadge: 'Station 6',
      mixtureName: 'Acrylic Beads & White Cubes',
      propertyUsed: 'Color & Shape',
      toolSelected: 'Stainless-Steel Tweezers',
      observation: `Picked and sorted ${totalSorted} of 16 pieces into matching compartment dishes.`,
      separatedComponents: `Red spheres (${st.sortedCounts.red_bead}), Blue spheres (${st.sortedCounts.blue_bead}), Yellow spheres (${st.sortedCounts.yellow_bead}), White cubes (${st.sortedCounts.white_cube})`,
    });

    return {
      stationId: 'station_6_tweezers_sorting',
      headline: st.allSorted
        ? 'All 16 Beads & Cubes Sorted Cleanly!'
        : `Tweezers Sorted ${totalSorted} / 16 Pieces by Color & Shape`,
      observation: st.allSorted
        ? 'Every red, blue, and yellow sphere bead and white plastic cube is isolated in its own compartment dish.'
        : `${st.unsortedCount} pieces remain in the central mixing tray.`,
      scientificExplanation:
        'Visible solid mixtures with distinct shapes and colors can be separated directly by hand or tweezers (SC.5.P.8.3).',
      benchmarksAddressed: ['SC.5.P.8.3'],
      triggeredMisconceptions: [],
    };
  }

  // ============================================================================
  // STATION 7: IRON FILINGS & SAND MAGNET STATION (SC.5.P.8.3)
  // ============================================================================

  public resetStation7(): void {
    this.station7 = {
      sandInTrayGrams: 50.0,
      ironInTrayGrams: 30.0,
      ironOnMagnetGrams: 0.0,
      ironInRecoveryDishGrams: 0.0,
      magnetPositionedOver: 'standby',
      isSeparatedPure: false,
    };
  }

  public getStation7State(): Station7State {
    return { ...this.station7 };
  }

  public sweepStation7Magnet(): StationActionFeedback {
    if (this.station7.ironInTrayGrams > 0) {
      const lifted = this.station7.ironInTrayGrams;
      this.station7 = {
        ...this.station7,
        ironInTrayGrams: 0.0,
        ironOnMagnetGrams: roundMass(this.station7.ironOnMagnetGrams + lifted),
        magnetPositionedOver: 'tray',
      };
      return {
        stationId: 'station_7_iron_sand_magnet',
        headline: `Lifted ${lifted.toFixed(1)} g of Iron Filings onto the Magnet Poles!`,
        observation:
          'Dark metallic iron filings leaped out of the tan sand and bristled in clusters along the sleeved bar magnet! Now release them into the recovery dish.',
        scientificExplanation:
          'Iron filings are magnetic whereas quartz sand grains are non-magnetic (SC.5.P.8.3).',
        benchmarksAddressed: ['SC.5.P.8.3'],
        triggeredMisconceptions: [],
      };
    }

    return {
      stationId: 'station_7_iron_sand_magnet',
      headline: 'Tray Already Free of Iron Filings',
      observation:
        this.station7.ironOnMagnetGrams > 0
          ? 'The iron filings are clinging to the magnet sleeve—click Release into Dish to finish!'
          : 'Only pure non-magnetic quartz sand (50.0 g) remains in the tray.',
      scientificExplanation: 'All magnetic iron has already been lifted from the sand (SC.5.P.8.3).',
      benchmarksAddressed: ['SC.5.P.8.3'],
      triggeredMisconceptions: [],
    };
  }

  public releaseStation7MagnetToDish(): StationActionFeedback {
    const dropped = this.station7.ironOnMagnetGrams;
    const totalDish = roundMass(this.station7.ironInRecoveryDishGrams + dropped);
    const pure = this.station7.ironInTrayGrams === 0 && totalDish >= 29.9;

    this.station7 = {
      ...this.station7,
      ironOnMagnetGrams: 0.0,
      ironInRecoveryDishGrams: totalDish,
      magnetPositionedOver: 'dish',
      isSeparatedPure: pure,
    };

    if (pure) {
      this.upsertTab2SeparationRow({
        stationBadge: 'Station 7',
        mixtureName: 'Iron Filings (30.0 g) + Quartz Sand (50.0 g)',
        propertyUsed: 'Magnetic Attraction',
        toolSelected: 'Sleeved Bar Magnet',
        observation:
          'Iron filings leaped onto the magnet sleeve leaving sand behind, then dropped cleanly into the dish.',
        separatedComponents: '30.0 g Iron Filings (dish) & 50.0 g Quartz Sand (tray)',
      });
    }

    return {
      stationId: 'station_7_iron_sand_magnet',
      headline:
        dropped > 0
          ? `Released ${totalDish.toFixed(1)} g Pure Iron Filings into Recovery Dish!`
          : 'Sweep Magnet Over Tray First',
      observation:
        dropped > 0
          ? `Pulling back the magnet sleeve dropped ${dropped.toFixed(1)} g of dark iron filings into the recovery dish, leaving 50.0 g of pure tan sand in the tray (80.0 g conserved).`
          : 'No iron filings were clinging to the magnet sleeve yet.',
      scientificExplanation:
        'A sleeved bar magnet separates magnetic solids from non-magnetic solids cleanly without losing mass (SC.5.P.8.3).',
      benchmarksAddressed: ['SC.5.P.8.3'],
      triggeredMisconceptions: [],
    };
  }

  // ============================================================================
  // STATION 8: SAND & GRAVEL SIEVE STATION (SC.5.P.8.3)
  // ============================================================================

  public resetStation8(): void {
    this.station8 = {
      mixtureInCupGrams: 105.0,
      gravelOnSieveGrams: 0.0,
      fineSandOnSieveGrams: 0.0,
      fineSandInCatchPanGrams: 0.0,
      sieveShaken: false,
      isSeparatedPure: false,
    };
  }

  public getStation8State(): Station8State {
    return { ...this.station8 };
  }

  public pourAndShakeStation8Sieve(): StationActionFeedback {
    this.station8 = {
      mixtureInCupGrams: 0.0,
      gravelOnSieveGrams: 45.0,
      fineSandOnSieveGrams: 0.0,
      fineSandInCatchPanGrams: 60.0,
      sieveShaken: true,
      isSeparatedPure: true,
    };

    this.upsertTab2SeparationRow({
      stationBadge: 'Station 8',
      mixtureName: 'Fine Sand (60.0 g) + River Gravel Pebbles (45.0 g)',
      propertyUsed: 'Particle Size (0.5 mm vs. 8.0 mm)',
      toolSelected: '2.0 mm Wire-Mesh Sieve',
      observation:
        'Shaking the sieve let 60.0 g of fine sand rain into the catch pan while 45.0 g of coarse gravel stayed on the mesh.',
      separatedComponents: '45.0 g River Gravel (sieve mesh) & 60.0 g Fine Sand (catch pan)',
    });

    return {
      stationId: 'station_8_sand_gravel_sieve',
      headline: 'Separated 45.0 g Gravel & 60.0 g Sand by Particle Size!',
      observation:
        'Shaking the 2.0 mm wire-mesh sieve caused all 60.0 g of fine 0.5 mm sand grains to fall into the catch pan while 45.0 g of 8.0 mm gravel pebbles stayed trapped on top (105.0 g conserved).',
      scientificExplanation:
        'A mesh sieve separates solid mixtures based on particle size: grains smaller than the mesh holes pass through while larger pieces stay on top (SC.5.P.8.3).',
      benchmarksAddressed: ['SC.5.P.8.3'],
      triggeredMisconceptions: [],
    };
  }

  // ============================================================================
  // STATION 9: FILTRATION & HOT PLATE EVAPORATION STATION (SC.5.P.8.2, 8.3, 8.4, 9.1)
  // ============================================================================

  public resetStation9(mode: Station9Mode = this.station9?.mode ?? 'mode_b_salt_sand_water'): void {
    const saltGrams = mode === 'mode_b_salt_sand_water' ? 25.0 : 0.0;
    const total = roundMass(100.0 + 50.0 + saltGrams);
    this.station9 = {
      mode,
      stage: 'beaker_ready',
      totalSystemMassGrams: total,
      beakerWaterGrams: 100.0,
      beakerSandGrams: 50.0,
      beakerSaltGrams: saltGrams,
      saltDissolved: saltGrams > 0,
      filterTrappedSandGrams: 0.0,
      dishWaterGrams: 0.0,
      dishDissolvedSaltGrams: 0.0,
      dishCrystallizedSaltGrams: 0.0,
      condenserCapturedWaterGrams: 0.0,
      hotPlateTempCelsius: 22,
    };
  }

  public getStation9State(): Station9State {
    return { ...this.station9 };
  }

  public setStation9Mode(mode: Station9Mode): StationActionFeedback {
    this.resetStation9(mode);
    return {
      stationId: 'station_9_filtration_evaporation',
      headline:
        mode === 'mode_a_sand_water'
          ? 'Mode A Loaded: Sand (50.0 g) + Water (100.0 g)'
          : 'Mode B Loaded: Salt (25.0 g) + Sand (50.0 g) + Water (100.0 g)',
      observation:
        mode === 'mode_a_sand_water'
          ? 'Source beaker holds 50.0 g of undissolved sand in 100.0 g of water (150.0 g total).'
          : 'Source beaker holds 25.0 g of dissolved salt + 50.0 g of undissolved sand in 100.0 g of water (175.0 g total). Toggle Particle Vision (P) to see the tiny dissolved salt parts!',
      scientificExplanation:
        'Sand does not dissolve in water, whereas table salt dissolves completely into tiny unseen parts (SC.5.P.8.2, SC.5.P.8.4).',
      benchmarksAddressed: ['SC.5.P.8.2', 'SC.5.P.8.3'],
      triggeredMisconceptions: mode === 'mode_b_salt_sand_water' ? ['DISSOLVING_DESTROYS_MATTER'] : [],
    };
  }

  public pourStation9ThroughFilter(): StationActionFeedback {
    if (this.station9.beakerWaterGrams <= 0) {
      return {
        stationId: 'station_9_filtration_evaporation',
        headline: 'Mixture Already Poured Through Filter Funnel',
        observation:
          '50.0 g of wet sand is already trapped on the pleated filter paper cone and the clear filtrate is in the evaporating dish below.',
        scientificExplanation:
          'Next, run the Hot Plate Evaporator to test what remains when the liquid water evaporates!',
        benchmarksAddressed: ['SC.5.P.8.3'],
        triggeredMisconceptions: [],
      };
    }

    const sand = this.station9.beakerSandGrams;
    const water = this.station9.beakerWaterGrams;
    const salt = this.station9.beakerSaltGrams;

    if (salt > 0) {
      this.noteMisconceptionCue('DISSOLVING_DESTROYS_MATTER');
    }

    this.station9 = {
      ...this.station9,
      stage: 'filtered',
      beakerWaterGrams: 0.0,
      beakerSandGrams: 0.0,
      beakerSaltGrams: 0.0,
      filterTrappedSandGrams: sand,
      dishWaterGrams: water,
      dishDissolvedSaltGrams: salt,
    };

    const modeName =
      this.station9.mode === 'mode_a_sand_water'
        ? 'Mode A: Sand + Water'
        : 'Mode B: Salt + Sand + Water';

    this.upsertTab2SeparationRow({
      stationBadge: 'Station 9 (Filter)',
      mixtureName: modeName,
      propertyUsed: 'Particle Size & Dissolving in Water',
      toolSelected: 'Funnel + Pleated Filter Paper (0.02 mm)',
      observation:
        salt > 0
          ? 'Trapped 50.0 g sand on filter cone; 125.0 g clear salt-water dripped into evaporating dish.'
          : 'Trapped 50.0 g sand on filter cone; 100.0 g clear water dripped into evaporating dish.',
      separatedComponents:
        salt > 0
          ? '50.0 g Quartz Sand (filter cone) + 125.0 g Salt Solution (dish)'
          : '50.0 g Quartz Sand (filter cone) + 100.0 g Pure Water (dish)',
    });

    return {
      stationId: 'station_9_filtration_evaporation',
      headline: `Filter Paper Trapped ${sand.toFixed(1)} g of Quartz Sand!`,
      observation:
        salt > 0
          ? `Pleated filter paper trapped all ${sand.toFixed(1)} g of sand grains while ${roundMass(water + salt).toFixed(1)} g of clear liquid (${water.toFixed(1)} g water + ${salt.toFixed(1)} g dissolved salt) dripped into the dish!`
          : `Pleated filter paper trapped all ${sand.toFixed(1)} g of sand grains while ${water.toFixed(1)} g of clear pure water dripped into the dish!`,
      scientificExplanation:
        'Undissolved sand grains (0.5 mm) cannot fit through tiny 0.02 mm filter paper pores, while liquid water and tiny unseen dissolved salt parts pass right through (SC.5.P.8.2, SC.5.P.8.3, SC.5.P.8.4).',
      benchmarksAddressed: ['SC.5.P.8.2', 'SC.5.P.8.3', 'SC.5.P.8.4'],
      triggeredMisconceptions: salt > 0 ? ['DISSOLVING_DESTROYS_MATTER'] : [],
    };
  }

  public evaporateStation9Filtrate(): StationActionFeedback {
    if (this.station9.dishWaterGrams <= 0) {
      return {
        stationId: 'station_9_filtration_evaporation',
        headline:
          this.station9.stage === 'evaporated'
            ? 'Water Already Evaporated!'
            : 'Pour Mixture Through Filter Funnel First',
        observation:
          this.station9.stage === 'evaporated'
            ? 'All 100.0 g of water has already boiled into the condenser hood.'
            : 'Filter the mixture into the ceramic evaporating dish first so undissolved sand is separated before heating!',
        scientificExplanation:
          'Filtration removes undissolved sand first; evaporation then separates dissolved salt from water (SC.5.P.8.3, SC.5.P.9.1).',
        benchmarksAddressed: ['SC.5.P.8.3', 'SC.5.P.9.1'],
        triggeredMisconceptions: [],
      };
    }

    const water = this.station9.dishWaterGrams;
    const salt = this.station9.dishDissolvedSaltGrams;
    const cues: MisconceptionId[] = ['STEAM_IS_WATER_VAPOR_GAS', 'BUBBLES_PROVE_CHEMICAL_CHANGE'];
    for (const c of cues) {
      this.noteMisconceptionCue(c);
    }

    this.station9 = {
      ...this.station9,
      stage: 'evaporated',
      dishWaterGrams: 0.0,
      dishDissolvedSaltGrams: 0.0,
      dishCrystallizedSaltGrams: salt,
      condenserCapturedWaterGrams: water,
      hotPlateTempCelsius: 100,
    };

    if (salt > 0) {
      this.upsertTab2SeparationRow({
        stationBadge: 'Station 9 (Evaporate)',
        mixtureName: 'Filtered Salt Water (125.0 g)',
        propertyUsed: `Evaporation by Heating to ${formatGrade5Temperature(100)}`,
        toolSelected: 'Digital Hot Plate + Condenser Hood',
        observation:
          'Water boiled into invisible vapor gas (condensed in hood), leaving 25.0 g pure white salt crystals in the dish.',
        separatedComponents: '25.0 g Pure White Salt Crystals & 100.0 g Condensed Water (175.0 g total)',
      });
    }

    return {
      stationId: 'station_9_filtration_evaporation',
      headline:
        salt > 0
          ? `Crystallized ${salt.toFixed(1)} g of Pure White Table Salt!`
          : `Evaporated ${water.toFixed(1)} g of Pure Water (Zero Solid Residue)`,
      observation:
        salt > 0
          ? `Heating to ${formatGrade5Temperature(100)} boiled ${water.toFixed(1)} g of water into invisible water vapor gas (captured in the condenser), leaving ${salt.toFixed(1)} g of sparkling white salt crystals in the dish (${this.station9.totalSystemMassGrams.toFixed(1)} g conserved)!`
          : `Heating Mode A filtrate to ${formatGrade5Temperature(100)} evaporated all ${water.toFixed(1)} g of water into the condenser hood, leaving an empty dish because no soluble solid was dissolved.`,
      scientificExplanation:
        'Heating liquid water causes evaporation into invisible water vapor gas while dissolved salt stays behind and recrystallizes as a solid (SC.5.P.8.2, SC.5.P.8.3, SC.5.P.9.1).',
      benchmarksAddressed: ['SC.5.P.8.2', 'SC.5.P.8.3', 'SC.5.P.9.1'],
      triggeredMisconceptions: cues,
    };
  }

  // ============================================================================
  // STATION 10: SOLUTIONS & DISSOLVING RATE LAB (PART A + PART B, SC.5.P.8.2)
  // ============================================================================

  public resetStation10(): void {
    this.station10Solubility = {
      table_salt: {
        id: 'table_salt',
        displayName: 'Table Salt',
        solidMassGrams: 15.0,
        waterMassGrams: 100.0,
        isSoluble: true,
        colorHex: 0xf8fafc,
        tested: false,
        visualOutcome: 'untested',
      },
      granulated_sugar: {
        id: 'granulated_sugar',
        displayName: 'Granulated Sugar',
        solidMassGrams: 15.0,
        waterMassGrams: 100.0,
        isSoluble: true,
        colorHex: 0xfef9c3,
        tested: false,
        visualOutcome: 'untested',
      },
      quartz_sand: {
        id: 'quartz_sand',
        displayName: 'Quartz Sand',
        solidMassGrams: 15.0,
        waterMassGrams: 100.0,
        isSoluble: false,
        colorHex: 0xd9b382,
        tested: false,
        visualOutcome: 'untested',
      },
      pepper_specks: {
        id: 'pepper_specks',
        displayName: 'Black Pepper / Iron Specks',
        solidMassGrams: 15.0,
        waterMassGrams: 100.0,
        isSoluble: false,
        colorHex: 0x334155,
        tested: false,
        visualOutcome: 'untested',
      },
    };

    const defaultA: RaceBeakerConfig = {
      waterTempPreset: 'cool',
      waterTempCelsius: WATER_TEMP_PRESET_CELSIUS.cool,
      stirred: false,
      grainSize: 'fine',
    };
    const defaultB: RaceBeakerConfig = {
      waterTempPreset: 'warm',
      waterTempCelsius: WATER_TEMP_PRESET_CELSIUS.warm,
      stirred: false,
      grainSize: 'fine',
    };

    this.station10BeakerA = this.createRaceBeaker('beaker_a', 'Beaker A', defaultA);
    this.station10BeakerB = this.createRaceBeaker('beaker_b', 'Beaker B', defaultB);
    this.station10StopwatchRunning = false;
    this.station10StopwatchSeconds = 0;
    this.station10LatestRaceSummary = null;
  }

  public getStation10State(): Station10State {
    const clonedBeakers = {} as Record<Station10BeakerMaterialId, Station10SolubilityBeaker>;
    for (const id of Object.keys(this.station10Solubility) as Station10BeakerMaterialId[]) {
      clonedBeakers[id] = { ...this.station10Solubility[id] };
    }
    return {
      solubilityBeakers: clonedBeakers,
      beakerA: { ...this.station10BeakerA, config: { ...this.station10BeakerA.config } },
      beakerB: { ...this.station10BeakerB, config: { ...this.station10BeakerB.config } },
      stopwatchRunning: this.station10StopwatchRunning,
      stopwatchSeconds: roundTenth(this.station10StopwatchSeconds),
      fairTest: this.analyzeStation10FairTest(),
      latestRaceSummary: this.station10LatestRaceSummary,
    };
  }

  /** Station 10 Part A: Stir & test whether one of the 4 solids dissolves in water */
  public testStation10SolubilityBeaker(materialId: Station10BeakerMaterialId): StationActionFeedback {
    const beaker = this.station10Solubility[materialId];
    beaker.tested = true;
    if (beaker.isSoluble) {
      beaker.visualOutcome = 'clear_solution';
      this.noteMisconceptionCue('DISSOLVING_DESTROYS_MATTER');
    } else if (materialId === 'quartz_sand') {
      beaker.visualOutcome = 'settled_bottom';
    } else {
      beaker.visualOutcome = 'suspended_specks';
    }

    this.upsertTab3SolubilityRow(
      `${beaker.displayName} in Water`,
      beaker.isSoluble ? 'yes' : 'no',
      beaker.isSoluble
        ? `Clear transparent mixture (115.0 g mass conserved)`
        : `Does not dissolve—solid grains stay visible`,
    );

    return {
      stationId: 'station_10_solutions_dissolving',
      headline: beaker.isSoluble
        ? `${beaker.displayName}: Dissolves in Water (YES — Clear Solution)`
        : `${beaker.displayName}: Does NOT Dissolve in Water (NO)`,
      observation: beaker.isSoluble
        ? `Stirring 15.0 g of ${beaker.displayName} into 100.0 g of water formed a crystal-clear transparent mixture weighing 115.0 g! Toggle Particle Vision (P) to see the tiny unseen parts.`
        : `Stirring 15.0 g of ${beaker.displayName} into 100.0 g of water left visible solid specks that swirl and settle without dissolving.`,
      scientificExplanation:
        'Salt and sugar dissolve in water into tiny unseen parts, whereas sand and pepper/iron specks do not dissolve in water (SC.5.P.8.2, SC.5.P.8.4).',
      benchmarksAddressed: ['SC.5.P.8.2', 'SC.5.P.8.4'],
      triggeredMisconceptions: beaker.isSoluble ? ['DISSOLVING_DESTROYS_MATTER'] : [],
    };
  }

  /** Station 10 Part B: Configure Beaker A or Beaker B before running the dissolving race */
  public configureStation10RaceBeaker(
    beakerId: RaceBeakerId,
    patch: Partial<Pick<RaceBeakerConfig, 'waterTempPreset' | 'stirred' | 'grainSize'>>,
  ): Station10State {
    const current = beakerId === 'beaker_a' ? this.station10BeakerA : this.station10BeakerB;
    const preset = patch.waterTempPreset ?? current.config.waterTempPreset;
    const nextConfig: RaceBeakerConfig = {
      waterTempPreset: preset,
      waterTempCelsius: WATER_TEMP_PRESET_CELSIUS[preset],
      stirred: patch.stirred ?? current.config.stirred,
      grainSize: patch.grainSize ?? current.config.grainSize,
    };

    if (beakerId === 'beaker_a') {
      this.station10BeakerA = this.createRaceBeaker('beaker_a', 'Beaker A', nextConfig);
      this.station10BeakerB = this.createRaceBeaker(
        'beaker_b',
        'Beaker B',
        this.station10BeakerB.config,
      );
    } else {
      this.station10BeakerA = this.createRaceBeaker(
        'beaker_a',
        'Beaker A',
        this.station10BeakerA.config,
      );
      this.station10BeakerB = this.createRaceBeaker('beaker_b', 'Beaker B', nextConfig);
    }

    this.station10StopwatchRunning = false;
    this.station10StopwatchSeconds = 0;
    this.station10LatestRaceSummary = null;
    return this.getStation10State();
  }

  public startStation10DissolvingRace(): Station10State {
    this.station10BeakerA = this.createRaceBeaker(
      'beaker_a',
      'Beaker A',
      this.station10BeakerA.config,
    );
    this.station10BeakerB = this.createRaceBeaker(
      'beaker_b',
      'Beaker B',
      this.station10BeakerB.config,
    );
    this.station10BeakerA.status = 'dissolving';
    this.station10BeakerB.status = 'dissolving';
    this.station10StopwatchRunning = true;
    this.station10StopwatchSeconds = 0;
    this.station10LatestRaceSummary = null;
    this.noteMisconceptionCue('DISSOLVING_DESTROYS_MATTER');
    return this.getStation10State();
  }

  public resetStation10RaceBeakers(): Station10State {
    this.station10BeakerA = this.createRaceBeaker(
      'beaker_a',
      'Beaker A',
      this.station10BeakerA.config,
    );
    this.station10BeakerB = this.createRaceBeaker(
      'beaker_b',
      'Beaker B',
      this.station10BeakerB.config,
    );
    this.station10StopwatchRunning = false;
    this.station10StopwatchSeconds = 0;
    this.station10LatestRaceSummary = null;
    return this.getStation10State();
  }

  /**
   * Advances the Station 10 Part B side-by-side dissolving stopwatch in real time.
   * Automatically records completed race results into Data Sheet Tab 3.
   */
  public tickStation10Stopwatch(dtSeconds: number): {
    completedRows: SolutionsAndStatesRow[];
    raceFinishedJustNow: boolean;
  } {
    if (!this.station10StopwatchRunning || dtSeconds <= 0) {
      return { completedRows: [], raceFinishedJustNow: false };
    }

    this.station10StopwatchSeconds = roundMass(this.station10StopwatchSeconds + dtSeconds);
    const completedRows: SolutionsAndStatesRow[] = [];

    for (const beaker of [this.station10BeakerA, this.station10BeakerB]) {
      if (beaker.status === 'dissolving') {
        beaker.elapsedSeconds = Math.min(
          beaker.targetDissolveSeconds,
          this.station10StopwatchSeconds,
        );
        beaker.dissolvedFraction = Math.min(
          1,
          beaker.elapsedSeconds / beaker.targetDissolveSeconds,
        );
        if (this.station10StopwatchSeconds >= beaker.targetDissolveSeconds) {
          beaker.status = 'completed';
          beaker.elapsedSeconds = beaker.targetDissolveSeconds;
          beaker.dissolvedFraction = 1;
          completedRows.push(this.recordStation10CompletedRaceBeaker(beaker));
        }
      }
    }

    if (
      this.station10BeakerA.status === 'completed' &&
      this.station10BeakerB.status === 'completed'
    ) {
      this.station10StopwatchRunning = false;
      this.station10StopwatchSeconds = Math.max(
        this.station10BeakerA.targetDissolveSeconds,
        this.station10BeakerB.targetDissolveSeconds,
      );
      const tA = this.station10BeakerA.targetDissolveSeconds;
      const tB = this.station10BeakerB.targetDissolveSeconds;
      if (Math.abs(tA - tB) < 0.05) {
        this.station10LatestRaceSummary = `Tie Race! Both Beaker A and Beaker B dissolved in ${tA.toFixed(1)} s.`;
      } else {
        const winner = tA < tB ? this.station10BeakerA : this.station10BeakerB;
        const slower = tA < tB ? this.station10BeakerB : this.station10BeakerA;
        this.station10LatestRaceSummary = `${winner.label} dissolved in ${winner.targetDissolveSeconds.toFixed(1)} s vs. ${slower.label} in ${slower.targetDissolveSeconds.toFixed(1)} s!`;
      }
      return { completedRows, raceFinishedJustNow: true };
    }

    return { completedRows, raceFinishedJustNow: false };
  }

  public completeStation10RaceInstant(): SolutionsAndStatesRow[] {
    if (!this.station10StopwatchRunning) {
      this.startStation10DissolvingRace();
    }
    const maxSec = Math.max(
      this.station10BeakerA.targetDissolveSeconds,
      this.station10BeakerB.targetDissolveSeconds,
    );
    return this.tickStation10Stopwatch(maxSec + 0.1).completedRows;
  }

  public analyzeStation10FairTest(
    a: RaceBeakerConfig = this.station10BeakerA.config,
    b: RaceBeakerConfig = this.station10BeakerB.config,
  ): FairTestAnalysis {
    const changed: FairTestVariable[] = [];
    if (a.waterTempPreset !== b.waterTempPreset) changed.push('temperature');
    if (a.stirred !== b.stirred) changed.push('stirring');
    if (a.grainSize !== b.grainSize) changed.push('particle_size');

    if (changed.length === 1) {
      const names: Record<FairTestVariable, string> = {
        temperature: 'Water Temperature',
        stirring: 'Stirring',
        particle_size: 'Particle Size (Fine vs. Coarse Cube)',
      };
      const v = changed[0] ? names[changed[0]] : 'One Variable';
      return {
        changedVariables: changed,
        isControlledFairTest: true,
        summaryText: `Fair Test Ready: Only ${v} differs between Beaker A and Beaker B!`,
      };
    }
    if (changed.length === 0) {
      return {
        changedVariables: changed,
        isControlledFairTest: false,
        summaryText: 'Both beakers have identical settings—change ONE variable to compare!',
      };
    }
    return {
      changedVariables: changed,
      isControlledFairTest: false,
      summaryText: `${changed.length} variables differ—tip: change just ONE variable at a time for a controlled fair test!`,
    };
  }

  // ============================================================================
  // 3-TAB INTERACTIVE LAB DATA SHEET API (`src/ui/LabDataSheet.ts`)
  // ============================================================================

  public getDataSheetSnapshot(): LabDataSheetSnapshot {
    return {
      tab1PropertiesRows: this.tab1Rows.map((r) => ({
        ...r,
        autoMeasured: { ...r.autoMeasured },
      })),
      tab2SeparationRows: this.tab2Rows.map((r) => ({ ...r })),
      tab3SolutionsStatesRows: this.tab3Rows.map((r) => ({ ...r })),
    };
  }

  public updatePropertyMeasurementRow(
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
  ): PropertyMeasurementRow | null {
    const row = this.tab1Rows.find((r) => r.materialId === materialId);
    if (!row) return null;
    if (patch.color !== undefined) row.color = patch.color;
    if (patch.luster !== undefined) row.luster = patch.luster;
    if (patch.texture !== undefined) row.texture = patch.texture;
    if (patch.hardnessScratchResult !== undefined) {
      row.hardnessScratchResult = patch.hardnessScratchResult;
    }
    if (patch.magnetic !== undefined) row.magnetic = patch.magnetic;
    if (patch.massGrams !== undefined) row.massGrams = patch.massGrams;
    if (patch.displacedVolumeMl !== undefined) row.displacedVolumeMl = patch.displacedVolumeMl;
    if (patch.studentNotes !== undefined) row.studentNotes = patch.studentNotes;
    return { ...row, autoMeasured: { ...row.autoMeasured } };
  }

  public updateMixtureSeparationRow(
    entryId: number,
    patch: Partial<
      Pick<
        MixtureSeparationRow,
        'propertyUsed' | 'toolSelected' | 'observation' | 'separatedComponents' | 'studentNotes'
      >
    >,
  ): MixtureSeparationRow | null {
    const row = this.tab2Rows.find((r) => r.entryId === entryId);
    if (!row) return null;
    if (patch.propertyUsed !== undefined) row.propertyUsed = patch.propertyUsed;
    if (patch.toolSelected !== undefined) row.toolSelected = patch.toolSelected;
    if (patch.observation !== undefined) row.observation = patch.observation;
    if (patch.separatedComponents !== undefined) {
      row.separatedComponents = patch.separatedComponents;
    }
    if (patch.studentNotes !== undefined) row.studentNotes = patch.studentNotes;
    return { ...row };
  }

  public updateSolutionsAndStatesRow(
    entryId: number,
    patch: Partial<
      Pick<
        SolutionsAndStatesRow,
        | 'solubleInWater'
        | 'dissolvingRaceVariableAndTime'
        | 'stateOfMatterAndTemp'
        | 'studentNotes'
      >
    >,
  ): SolutionsAndStatesRow | null {
    const row = this.tab3Rows.find((r) => r.entryId === entryId);
    if (!row) return null;
    if (patch.solubleInWater !== undefined) row.solubleInWater = patch.solubleInWater;
    if (patch.dissolvingRaceVariableAndTime !== undefined) {
      row.dissolvingRaceVariableAndTime = patch.dissolvingRaceVariableAndTime;
    }
    if (patch.stateOfMatterAndTemp !== undefined) {
      row.stateOfMatterAndTemp = patch.stateOfMatterAndTemp;
    }
    if (patch.studentNotes !== undefined) row.studentNotes = patch.studentNotes;
    return { ...row };
  }

  /**
   * Exports all 3 tabs of the Student Investigation Data Sheet as an RFC-4180 CSV string.
   */
  public exportDataSheetCsv(): string {
    const snap = this.getDataSheetSnapshot();
    const lines: string[] = [];

    lines.push('MATTERVERSE — 10-STATION GRADE 5 MATTER & SOLUTIONS LAB DATA SHEET');
    lines.push('');

    // Tab 1
    lines.push('TAB 1: PROPERTIES & MEASUREMENT LOG (SC.5.P.8.1)');
    lines.push(
      [
        'Material',
        'Station',
        'Color',
        'Luster',
        'Texture',
        'Hardness Scratch Result',
        'Magnetic (Y/N)',
        'Mass (g)',
        'Displaced Volume (mL)',
        'Student Notes',
      ]
        .map(escapeCsvCell)
        .join(','),
    );
    for (const r of snap.tab1PropertiesRows) {
      lines.push(
        [
          r.materialName,
          r.stationBadge,
          r.color || '—',
          r.luster || '—',
          r.texture || '—',
          r.hardnessScratchResult || '—',
          r.magnetic || '—',
          r.massGrams || '—',
          r.displacedVolumeMl || '—',
          r.studentNotes,
        ]
          .map(escapeCsvCell)
          .join(','),
      );
    }

    lines.push('');
    // Tab 2
    lines.push('TAB 2: MIXTURE SEPARATION LOG (SC.5.P.8.3)');
    lines.push(
      [
        'Station',
        'Mixture',
        'Property Used',
        'Tool Selected',
        'Observation',
        'Separated Components',
        'Student Notes',
      ]
        .map(escapeCsvCell)
        .join(','),
    );
    for (const r of snap.tab2SeparationRows) {
      lines.push(
        [
          r.stationBadge,
          r.mixtureName,
          r.propertyUsed,
          r.toolSelected,
          r.observation,
          r.separatedComponents,
          r.studentNotes,
        ]
          .map(escapeCsvCell)
          .join(','),
      );
    }

    lines.push('');
    // Tab 3
    lines.push('TAB 3: SOLUTIONS & STATES LOG (SC.5.P.8.2 & SC.5.P.9.1)');
    lines.push(
      [
        'Station',
        'Investigation Item',
        'Soluble in Water (Y/N)',
        'Dissolving Race Variable & Time',
        'State of Matter & Temp',
        'Student Notes',
      ]
        .map(escapeCsvCell)
          .join(','),
    );
    for (const r of snap.tab3SolutionsStatesRows) {
      lines.push(
        [
          r.stationBadge,
          r.investigationItem,
          r.solubleInWater || '—',
          r.dissolvingRaceVariableAndTime || '—',
          r.stateOfMatterAndTemp || '—',
          r.studentNotes,
        ]
          .map(escapeCsvCell)
          .join(','),
      );
    }

    return lines.join('\n');
  }

  /**
   * Generates a clean, self-contained printable Grade 5 HTML report for all 3 Data Sheet tabs.
   */
  public exportDataSheetPrintableHtml(): string {
    const snap = this.getDataSheetSnapshot();

    const tab1Html = snap.tab1PropertiesRows
      .map(
        (r) => `<tr>
          <td><strong>${escapeHtml(r.materialName)}</strong> <small>(${escapeHtml(r.stationBadge)})</small></td>
          <td>${escapeHtml(r.color || '—')}</td>
          <td>${escapeHtml(r.luster || '—')}</td>
          <td>${escapeHtml(r.texture || '—')}</td>
          <td>${escapeHtml(r.hardnessScratchResult || '—')}</td>
          <td>${escapeHtml(r.magnetic || '—')}</td>
          <td>${escapeHtml(r.massGrams ? `${r.massGrams} g` : '—')}</td>
          <td>${escapeHtml(r.displacedVolumeMl ? `${r.displacedVolumeMl} mL` : '—')}</td>
          <td>${escapeHtml(r.studentNotes)}</td>
        </tr>`,
      )
      .join('');

    const tab2Html =
      snap.tab2SeparationRows.length === 0
        ? '<tr><td colspan="7"><em>Complete a separation at Stations 6–9 to populate or record observations.</em></td></tr>'
        : snap.tab2SeparationRows
            .map(
              (r) => `<tr>
              <td>${escapeHtml(r.stationBadge)}</td>
              <td><strong>${escapeHtml(r.mixtureName)}</strong></td>
              <td>${escapeHtml(r.propertyUsed)}</td>
              <td>${escapeHtml(r.toolSelected)}</td>
              <td>${escapeHtml(r.observation)}</td>
              <td>${escapeHtml(r.separatedComponents)}</td>
              <td>${escapeHtml(r.studentNotes)}</td>
            </tr>`,
            )
            .join('');

    const tab3Html =
      snap.tab3SolutionsStatesRows.length === 0
        ? '<tr><td colspan="6"><em>Test thermal states (Station 5) or solutions/races (Station 10) to log data.</em></td></tr>'
        : snap.tab3SolutionsStatesRows
            .map(
              (r) => `<tr>
              <td>${escapeHtml(r.stationBadge)}</td>
              <td><strong>${escapeHtml(r.investigationItem)}</strong></td>
              <td>${escapeHtml(r.solubleInWater || '—')}</td>
              <td>${escapeHtml(r.dissolvingRaceVariableAndTime || '—')}</td>
              <td>${escapeHtml(r.stateOfMatterAndTemp || '—')}</td>
              <td>${escapeHtml(r.studentNotes)}</td>
            </tr>`,
            )
            .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Matterverse — 10-Station Grade 5 Lab Data Sheet</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 22px; line-height: 1.4; }
    h1 { font-size: 1.3rem; margin-bottom: 4px; }
    h2 { font-size: 1.02rem; margin-top: 20px; margin-bottom: 6px; border-bottom: 2px solid #0284c7; padding-bottom: 3px; }
    .sub { color: #475569; font-size: 0.86rem; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 0.82rem; }
    th, td { border: 1px solid #94a3b8; padding: 5px 7px; text-align: left; vertical-align: top; }
    th { background: #e0f2fe; font-weight: 700; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>MATTERVERSE: 10-Station Grade 5 Matter &amp; Solutions Laboratory</h1>
  <div class="sub">Florida Science Benchmarks: SC.5.P.8.1 • SC.5.P.8.2 • SC.5.P.8.3 • SC.5.P.8.4 • SC.5.P.9.1</div>

  <h2>Tab 1: Properties &amp; Measurement Log</h2>
  <table>
    <thead>
      <tr>
        <th>Material</th><th>Color</th><th>Luster</th><th>Texture</th>
        <th>Hardness Scratch Result</th><th>Magnetic (Y/N)</th><th>Mass (g)</th><th>Displaced Vol (mL)</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>${tab1Html}</tbody>
  </table>

  <h2>Tab 2: Mixture Separation Log</h2>
  <table>
    <thead>
      <tr>
        <th>Station</th><th>Mixture</th><th>Property Used</th><th>Tool Selected</th>
        <th>Observation</th><th>Separated Components</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>${tab2Html}</tbody>
  </table>

  <h2>Tab 3: Solutions &amp; States Log</h2>
  <table>
    <thead>
      <tr>
        <th>Station</th><th>Item / Trial</th><th>Soluble (Y/N)</th>
        <th>Dissolving Race Variable &amp; Time</th><th>State of Matter &amp; Temp</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>${tab3Html}</tbody>
  </table>
</body>
</html>`;
  }

  // ============================================================================
  // BACKWARD-COMPATIBLE WORLD 2 MIXTURE SEPARATION & JSON SERIALIZATION
  // ============================================================================

  public resetWorld2MixtureRescue(): void {
    this.containers = {
      mixture_beaker: {
        id: 'mixture_beaker',
        displayName: 'Crashed Capsule Mixture Beaker',
        description: 'Main borosilicate beaker holding the mixed cargo sample.',
        temperatureCelsius: 22,
        isStirred: false,
        contents: [
          createSample('glass_shards', INITIAL_SOLID_TARGETS.glass_shards),
          createSample('iron_filings', INITIAL_SOLID_TARGETS.iron_filings),
          createSample('sand', INITIAL_SOLID_TARGETS.sand),
          createSample('salt', INITIAL_SOLID_TARGETS.salt),
        ],
      },
      water_beaker: {
        id: 'water_beaker',
        displayName: 'Graduated Water Supply Beaker',
        description: 'Contains 100.0 g of pure liquid water ready for dissolving tests.',
        temperatureCelsius: 22,
        isStirred: false,
        contents: [createSample('water', INITIAL_WATER_MASS_GRAMS, { state: 'liquid' })],
      },
      magnet_tray: {
        id: 'magnet_tray',
        displayName: 'Magnetic Recovery Dish',
        description: 'Collects materials attracted by the electromagnet wand.',
        temperatureCelsius: 22,
        isStirred: false,
        contents: [],
      },
      sieve_tray: {
        id: 'sieve_tray',
        displayName: '2.0 mm Mesh Sieve Tray',
        description: 'Retains coarse solid pieces larger than 2.0 mm while smaller grains pass through.',
        temperatureCelsius: 22,
        isStirred: false,
        contents: [],
      },
      filter_funnel: {
        id: 'filter_funnel',
        displayName: 'Filter Paper Funnel (0.02 mm Pores)',
        description: 'Traps undissolved solid grains while liquid water and dissolved matter pass through.',
        temperatureCelsius: 22,
        isStirred: false,
        contents: [],
      },
      evaporating_dish: {
        id: 'evaporating_dish',
        displayName: 'Hot Plate Evaporating Dish',
        description: 'Ceramic dish on the digital hot plate for filtered liquid collection and evaporation.',
        temperatureCelsius: 22,
        isStirred: false,
        contents: [],
      },
      vapor_hood: {
        id: 'vapor_hood',
        displayName: 'Vapor Capture & Condenser Hood',
        description: 'Tracks invisible water vapor gas evaporated during heating so mass is 100% accounted for.',
        temperatureCelsius: 25,
        isStirred: false,
        contents: [],
      },
    };

    this.stepCounter = 0;
    this.logs = [];
    this.pendingPrediction = null;
    this.initialSystemMassGrams = this.getTotalSystemMassGrams();
  }

  public recordPrediction(
    operation: SeparationOperation,
    predictionText: string,
    targetContainerId?: ContainerId,
  ): void {
    this.pendingPrediction = {
      operation,
      targetContainerId,
      predictionText: predictionText.trim(),
      recordedAtIso: new Date().toISOString(),
    };
  }

  public getPendingPrediction(): PendingPrediction | null {
    return this.pendingPrediction ? { ...this.pendingPrediction } : null;
  }

  public markMisconceptionResolved(id: MisconceptionId): void {
    this.resolvedMisconceptions.add(id);
  }

  public isMisconceptionResolved(id: MisconceptionId): boolean {
    return this.resolvedMisconceptions.has(id);
  }

  public getContainers(): Record<ContainerId, LabContainerState> {
    const result = {} as Record<ContainerId, LabContainerState>;
    for (const key of Object.keys(this.containers) as ContainerId[]) {
      const c = this.containers[key];
      result[key] = {
        ...c,
        contents: c.contents.map(cloneSample),
      };
    }
    return result;
  }

  public getContainer(id: ContainerId): LabContainerState {
    const c = this.containers[id];
    return {
      ...c,
      contents: c.contents.map(cloneSample),
    };
  }

  public getContainerMassGrams(id: ContainerId): number {
    return roundMass(
      this.containers[id].contents.reduce((sum, item) => sum + item.massGrams, 0),
    );
  }

  public getTotalSystemMassGrams(): number {
    let sum = 0;
    for (const key of Object.keys(this.containers) as ContainerId[]) {
      sum += this.getContainerMassGrams(key);
    }
    return roundMass(sum);
  }

  public verifyMassConservation(): boolean {
    return Math.abs(this.getTotalSystemMassGrams() - this.initialSystemMassGrams) < 0.005;
  }

  public getInvestigationLogs(): readonly InvestigationLogEntry[] {
    return this.logs.map((entry) => ({ ...entry }));
  }

  public applyOperation(
    operation: SeparationOperation,
    options: OperationOptions = {},
  ): OperationResult {
    switch (operation) {
      case 'magnet':
        return this.runMagnet(options);
      case 'sieve':
        return this.runSieve(options);
      case 'add_water':
        return this.runAddWater(options);
      case 'filter':
        return this.runFilter(options);
      case 'evaporate':
        return this.runEvaporate(options);
    }
  }

  public condenseCapturedVaporToWaterBeaker(): InvestigationLogEntry | null {
    const hood = this.containers.vapor_hood;
    const vaporIndex = hood.contents.findIndex((s) => s.id === 'water' && s.massGrams > 0);
    if (vaporIndex === -1) {
      return null;
    }

    const massBefore = this.getTotalSystemMassGrams();
    const vaporSample = hood.contents[vaporIndex];
    if (!vaporSample) {
      return null;
    }

    const recoveredGrams = vaporSample.massGrams;
    hood.contents.splice(vaporIndex, 1);
    this.mergeSampleIntoContainer(
      'water_beaker',
      createSample('water', recoveredGrams, { state: 'liquid', isDissolved: false }),
    );
    this.containers.water_beaker.temperatureCelsius = 22;

    const massAfter = this.getTotalSystemMassGrams();
    this.stepCounter += 1;

    const entry: InvestigationLogEntry = {
      stepNumber: this.stepCounter,
      timestampIso: new Date().toISOString(),
      operation: 'condense_vapor',
      sourceContainerId: 'vapor_hood',
      destinationContainerId: 'water_beaker',
      prediction: null,
      observation: `Cooling the condenser hood turned ${recoveredGrams.toFixed(1)} g of invisible water vapor gas back into clear liquid water in the supply beaker.`,
      scientificExplanation:
        'Cooling causes condensation—a temperature-driven physical state change from gas back to liquid (SC.5.P.9.1) with zero mass lost.',
      changed: true,
      dissolvingRate: 'not_applicable',
      dissolvingDurationSeconds: 0,
      systemMassBeforeGrams: massBefore,
      systemMassAfterGrams: massAfter,
      massConserved: Math.abs(massAfter - this.initialSystemMassGrams) < 0.005,
      benchmarksAddressed: ['SC.5.P.8.1', 'SC.5.P.9.1'],
      triggeredMisconceptions: [],
    };
    this.logs.push(entry);
    return entry;
  }

  public getSeparationProgress(): SeparationProgressSummary {
    const targetIds: MixtureSolidId[] = [
      'iron_filings',
      'glass_shards',
      'sand',
      'salt',
    ];

    const samples: PureSampleRecoveryStatus[] = targetIds.map((matId) => {
      const targetMass = INITIAL_SOLID_TARGETS[matId];
      let recoveredMass = 0;
      let pureContainerId: ContainerId | null = null;
      let isPureAndDry = false;

      for (const containerId of Object.keys(this.containers) as ContainerId[]) {
        const container = this.containers[containerId];
        const nonZeroItems = container.contents.filter((s) => s.massGrams > 0.001);
        const match = nonZeroItems.find((s) => s.id === matId);
        if (
          match &&
          nonZeroItems.length === 1 &&
          match.state === 'solid' &&
          !match.isDissolved &&
          Math.abs(match.massGrams - targetMass) < 0.05
        ) {
          recoveredMass = match.massGrams;
          pureContainerId = containerId;
          isPureAndDry = true;
          break;
        }
      }

      return {
        materialId: matId,
        displayName: MATERIAL_CATALOG[matId].displayName,
        targetMassGrams: targetMass,
        recoveredMassGrams: recoveredMass,
        containerId: pureContainerId,
        isPureAndDry,
      };
    });

    const recoveredCount = samples.filter((s) => s.isPureAndDry).length;
    const currentMass = this.getTotalSystemMassGrams();

    return {
      allFourSolidsRecoveredPure: recoveredCount === 4,
      recoveredCount,
      totalTargetCount: 4,
      initialSystemMassGrams: this.initialSystemMassGrams,
      currentSystemMassGrams: currentMass,
      massConserved: Math.abs(currentMass - this.initialSystemMassGrams) < 0.005,
      samples,
    };
  }

  public exportStateJson(): string {
    const st10 = this.getStation10State();
    const payload: SerializedMatterEngineState = {
      schemaVersion: 3,
      exportedAtIso: new Date().toISOString(),
      initialSystemMassGrams: this.initialSystemMassGrams,
      stepCounter: this.stepCounter,
      containers: this.getContainers(),
      logs: [...this.logs],
      resolvedMisconceptions: Array.from(this.resolvedMisconceptions),
      activeStationId: this.activeStationId,
      navigationMode: this.navigationMode,
      station1: this.getStation1State(),
      station2: this.getStation2State(),
      station3: this.getStation3State(),
      station4: this.getStation4State(),
      station5: this.getStation5State(),
      station6SortedIds: this.station6Pieces.filter((p) => p.sortedIntoBin).map((p) => p.pieceId),
      station7: this.getStation7State(),
      station8: this.getStation8State(),
      station9: this.getStation9State(),
      station10Solubility: st10.solubilityBeakers,
      station10BeakerAConfig: { ...this.station10BeakerA.config },
      station10BeakerBConfig: { ...this.station10BeakerB.config },
      tab1Rows: this.tab1Rows.map((r) => ({ ...r, autoMeasured: { ...r.autoMeasured } })),
      tab2Rows: this.tab2Rows.map((r) => ({ ...r })),
      tab3Rows: this.tab3Rows.map((r) => ({ ...r })),
    };
    return JSON.stringify(payload, null, 2);
  }

  public importStateJson(jsonString: string): void {
    const parsed = JSON.parse(jsonString) as Partial<SerializedMatterEngineState>;
    if (
      (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2 && parsed.schemaVersion !== 3) ||
      typeof parsed.initialSystemMassGrams !== 'number' ||
      typeof parsed.stepCounter !== 'number' ||
      !parsed.containers ||
      !Array.isArray(parsed.logs)
    ) {
      throw new Error('Invalid Matterverse save file format.');
    }

    const requiredIds: ContainerId[] = [
      'mixture_beaker',
      'water_beaker',
      'magnet_tray',
      'sieve_tray',
      'filter_funnel',
      'evaporating_dish',
      'vapor_hood',
    ];
    for (const id of requiredIds) {
      if (!parsed.containers[id]) {
        throw new Error(`Save file missing required container: ${id}`);
      }
    }

    this.resetAllStations();
    this.initialSystemMassGrams = roundMass(parsed.initialSystemMassGrams);
    this.stepCounter = parsed.stepCounter;
    this.containers = parsed.containers;
    this.logs = parsed.logs;
    this.resolvedMisconceptions = new Set(parsed.resolvedMisconceptions ?? []);

    if (parsed.activeStationId && LAB_STATION_CATALOG[parsed.activeStationId]) {
      this.activeStationId = parsed.activeStationId;
    }
    if (parsed.navigationMode === 'roam' || parsed.navigationMode === 'station_focus') {
      this.navigationMode = parsed.navigationMode;
    }
    if (parsed.station1) this.station1 = parsed.station1;
    if (parsed.station2) this.station2 = parsed.station2;
    if (parsed.station3) this.station3 = parsed.station3;
    if (parsed.station4) this.station4 = parsed.station4;
    if (parsed.station5) this.station5 = parsed.station5;
    if (Array.isArray(parsed.station6SortedIds)) {
      const sortedSet = new Set(parsed.station6SortedIds);
      for (const p of this.station6Pieces) {
        p.sortedIntoBin = sortedSet.has(p.pieceId);
      }
    }
    if (parsed.station7) this.station7 = parsed.station7;
    if (parsed.station8) this.station8 = parsed.station8;
    if (parsed.station9) this.station9 = parsed.station9;
    if (parsed.station10Solubility) this.station10Solubility = parsed.station10Solubility;
    if (parsed.station10BeakerAConfig) {
      this.station10BeakerA = this.createRaceBeaker(
        'beaker_a',
        'Beaker A',
        parsed.station10BeakerAConfig,
      );
    }
    if (parsed.station10BeakerBConfig) {
      this.station10BeakerB = this.createRaceBeaker(
        'beaker_b',
        'Beaker B',
        parsed.station10BeakerBConfig,
      );
    }
    if (Array.isArray(parsed.tab1Rows)) {
      this.tab1Rows = parsed.tab1Rows.map((r) => ({ ...r, autoMeasured: { ...r.autoMeasured } }));
    }
    if (Array.isArray(parsed.tab2Rows)) {
      this.tab2Rows = parsed.tab2Rows.map((r) => ({ ...r }));
      this.nextTab2EntryId =
        this.tab2Rows.reduce((m, r) => (r.entryId > m ? r.entryId : m), 0) + 1;
    }
    if (Array.isArray(parsed.tab3Rows)) {
      this.tab3Rows = parsed.tab3Rows.map((r) => ({ ...r }));
      this.nextTab3EntryId =
        this.tab3Rows.reduce((m, r) => (r.entryId > m ? r.entryId : m), 0) + 1;
    }
  }

  // ============================================================================
  // PRIVATE DATA SHEET & ENGINE HELPERS
  // ============================================================================

  private initDataSheetRows(): void {
    const seedRow = (
      materialId: string,
      materialName: string,
      stationBadge: string,
    ): PropertyMeasurementRow => ({
      materialId,
      materialName,
      stationBadge,
      color: '',
      luster: '',
      texture: '',
      hardnessScratchResult: '',
      magnetic: '',
      massGrams: '',
      displacedVolumeMl: '',
      studentNotes: '',
      autoMeasured: {
        surface: false,
        scratch: false,
        magnetic: false,
        mass: false,
        volume: false,
      },
    });

    this.tab1Rows = [
      // Station 1 specimens
      seedRow('brushed_aluminum_bar', 'Brushed Aluminum Bar', 'Station 1'),
      seedRow('pyrite_copper_nugget', 'Pyrite & Copper Nugget', 'Station 1'),
      seedRow('quartz_crystal_s1', 'Clear Quartz Crystal', 'Station 1'),
      seedRow('dull_basalt_rock', 'Basalt Rock', 'Station 1'),
      seedRow('smooth_river_glass', 'Smooth River Glass', 'Station 1'),
      seedRow('rough_pumice_stone', 'Rough Pumice Stone', 'Station 1'),
      seedRow('colored_acrylic_beads', 'Acrylic Beads', 'Station 1'),
      // Station 2 specimens
      seedRow('talc_chalk', 'Soft Talc / Chalk', 'Station 2'),
      seedRow('copper_penny_sample', 'Copper Penny Plate', 'Station 2'),
      seedRow('river_glass_plate', 'River Glass Plate', 'Station 2'),
      seedRow('steel_nail_sample', 'Tempered Steel Bar', 'Station 2'),
      seedRow('quartz_crystal_s2', 'Hard Quartz Crystal', 'Station 2'),
      // Station 3 items
      seedRow('iron_nail', 'Iron Nail', 'Station 3'),
      seedRow('steel_paperclip', 'Steel Paperclip', 'Station 3'),
      seedRow('aluminum_foil', 'Aluminum Foil Sheet', 'Station 3'),
      seedRow('copper_wire', 'Copper Wire Coil', 'Station 3'),
      seedRow('plastic_cube', 'Blue Plastic Cube', 'Station 3'),
      // Station 4 objects
      seedRow('brass_cylinder', 'Brass Cylinder', 'Station 4'),
      seedRow('quartz_pebble', 'Quartz Pebble', 'Station 4'),
      seedRow('acrylic_cube', 'Acrylic Cube', 'Station 4'),
    ];

    this.tab2Rows = [];
    this.tab3Rows = [];
    this.nextTab2EntryId = 1;
    this.nextTab3EntryId = 1;
  }

  private upsertTab1AutoMeasurement(
    materialId: string,
    update: {
      color?: string;
      luster?: LusterCategory;
      texture?: SurfaceTextureCategory;
      hardnessScratchResult?: string;
      magnetic?: 'yes' | 'no';
      massGrams?: string;
      displacedVolumeMl?: string;
      surfaceFlag?: boolean;
      scratchFlag?: boolean;
      magneticFlag?: boolean;
      massFlag?: boolean;
      volumeFlag?: boolean;
    },
  ): void {
    const row = this.tab1Rows.find((r) => r.materialId === materialId);
    if (!row) return;
    if (update.color !== undefined) row.color = update.color;
    if (update.luster !== undefined) row.luster = update.luster;
    if (update.texture !== undefined) row.texture = update.texture;
    if (update.hardnessScratchResult !== undefined) {
      row.hardnessScratchResult = update.hardnessScratchResult;
    }
    if (update.magnetic !== undefined) row.magnetic = update.magnetic;
    if (update.massGrams !== undefined) row.massGrams = update.massGrams;
    if (update.displacedVolumeMl !== undefined) row.displacedVolumeMl = update.displacedVolumeMl;
    if (update.surfaceFlag) row.autoMeasured.surface = true;
    if (update.scratchFlag) row.autoMeasured.scratch = true;
    if (update.magneticFlag) row.autoMeasured.magnetic = true;
    if (update.massFlag) row.autoMeasured.mass = true;
    if (update.volumeFlag) row.autoMeasured.volume = true;
  }

  private upsertTab2SeparationRow(params: {
    stationBadge: string;
    mixtureName: string;
    propertyUsed: string;
    toolSelected: string;
    observation: string;
    separatedComponents: string;
  }): void {
    const existing = this.tab2Rows.find(
      (r) => r.stationBadge === params.stationBadge && r.mixtureName === params.mixtureName,
    );
    if (existing) {
      existing.propertyUsed = params.propertyUsed;
      existing.toolSelected = params.toolSelected;
      existing.observation = params.observation;
      existing.separatedComponents = params.separatedComponents;
      return;
    }
    this.tab2Rows.push({
      entryId: this.nextTab2EntryId++,
      stationBadge: params.stationBadge,
      mixtureName: params.mixtureName,
      propertyUsed: params.propertyUsed,
      toolSelected: params.toolSelected,
      observation: params.observation,
      separatedComponents: params.separatedComponents,
      studentNotes: '',
    });
  }

  private upsertTab3ThermalStateRow(stateOfMatterAndTemp: string): void {
    const existing = this.tab3Rows.find((r) => r.stationBadge === 'Station 5');
    if (existing) {
      existing.stateOfMatterAndTemp = stateOfMatterAndTemp;
      return;
    }
    this.tab3Rows.push({
      entryId: this.nextTab3EntryId++,
      stationBadge: 'Station 5',
      investigationItem: 'Water Thermal Chamber (100.0 g)',
      solubleInWater: 'n/a',
      dissolvingRaceVariableAndTime: '—',
      stateOfMatterAndTemp,
      studentNotes: '',
    });
  }

  private upsertTab3SolubilityRow(
    itemLabel: string,
    soluble: 'yes' | 'no',
    noteSummary: string,
  ): void {
    const existing = this.tab3Rows.find(
      (r) => r.stationBadge === 'Station 10A' && r.investigationItem === itemLabel,
    );
    if (existing) {
      existing.solubleInWater = soluble;
      existing.stateOfMatterAndTemp = `Room Water ${formatGrade5Temperature(22)} (${noteSummary})`;
      return;
    }
    this.tab3Rows.push({
      entryId: this.nextTab3EntryId++,
      stationBadge: 'Station 10A',
      investigationItem: itemLabel,
      solubleInWater: soluble,
      dissolvingRaceVariableAndTime: '—',
      stateOfMatterAndTemp: `Room Water ${formatGrade5Temperature(22)} (${noteSummary})`,
      studentNotes: '',
    });
  }

  private recordStation10CompletedRaceBeaker(beaker: RaceBeakerState): SolutionsAndStatesRow {
    const tempStr = formatGrade5Temperature(beaker.config.waterTempCelsius);
    const stirStr = beaker.config.stirred ? 'Stirred' : 'Still';
    const grainStr = beaker.config.grainSize === 'fine' ? 'Fine Grains' : 'Coarse Cube';
    const row: SolutionsAndStatesRow = {
      entryId: this.nextTab3EntryId++,
      stationBadge: 'Station 10B',
      investigationItem: `Dissolving Race — ${beaker.label}`,
      solubleInWater: 'yes',
      dissolvingRaceVariableAndTime: `${tempStr}, ${stirStr}, ${grainStr} -> ${beaker.targetDissolveSeconds.toFixed(1)} s`,
      stateOfMatterAndTemp: `Liquid Solution at ${tempStr} (120.0 g conserved)`,
      studentNotes: '',
    };
    this.tab3Rows.push(row);
    return { ...row };
  }

  private createRaceBeaker(
    id: RaceBeakerId,
    label: 'Beaker A' | 'Beaker B',
    config: RaceBeakerConfig,
  ): RaceBeakerState {
    const normalized: RaceBeakerConfig = {
      waterTempPreset: config.waterTempPreset,
      waterTempCelsius: WATER_TEMP_PRESET_CELSIUS[config.waterTempPreset],
      stirred: config.stirred,
      grainSize: config.grainSize,
    };
    return {
      id,
      label,
      config: normalized,
      waterMassGrams: RACE_WATER_MASS_GRAMS,
      saltMassGrams: RACE_SALT_MASS_GRAMS,
      totalMassGrams: roundMass(RACE_WATER_MASS_GRAMS + RACE_SALT_MASS_GRAMS),
      status: 'ready',
      elapsedSeconds: 0,
      targetDissolveSeconds: computeDissolvingRaceSeconds(normalized),
      dissolvedFraction: 0,
    };
  }

  private noteMisconceptionCue(id: MisconceptionId): void {
    if (!this.recentObservedMisconceptions.includes(id)) {
      this.recentObservedMisconceptions.unshift(id);
    }
  }

  // Legacy World 2 private helpers
  private runMagnet(options: OperationOptions): OperationResult {
    const sourceId =
      options.sourceContainerId ??
      this.findContainerWithCondition(
        (c) => c.id !== 'magnet_tray' && c.contents.some((s) => s.isMagnetic && s.massGrams > 0),
        'mixture_beaker',
      );

    const massBefore = this.getTotalSystemMassGrams();
    const source = this.containers[sourceId];
    const magneticItems = source.contents.filter((s) => s.isMagnetic && s.massGrams > 0);

    if (magneticItems.length === 0) {
      return this.buildResult({
        operation: 'magnet',
        changed: false,
        sourceContainerId: sourceId,
        destinationContainerId: 'magnet_tray',
        options,
        massBefore,
        headline: 'No Magnetic Materials Detected',
        observation: `Sweeping the magnet over ${source.displayName} caused zero movement—none of the materials inside are magnetic.`,
        scientificExplanation:
          'Only iron filings have magnetic attraction (SC.5.P.8.3). Glass shards, quartz sand, table salt, and water are non-magnetic.',
        dissolvingRate: 'not_applicable',
        dissolvingDurationSeconds: 0,
        benchmarksAddressed: ['SC.5.P.8.3'],
        triggeredMisconceptions: [],
      });
    }

    let extractedGrams = 0;
    const hadWater = source.contents.some((s) => s.id === 'water' && s.massGrams > 0);
    source.contents = source.contents.filter((s) => {
      if (s.isMagnetic && s.massGrams > 0) {
        extractedGrams = roundMass(extractedGrams + s.massGrams);
        this.mergeSampleIntoContainer(
          'magnet_tray',
          createSample(s.id, s.massGrams, { state: 'solid', isDissolved: false }),
        );
        return false;
      }
      return true;
    });

    const wetNote = hadWater ? ' Magnetic attraction works right through liquid water!' : '';

    return this.buildResult({
      operation: 'magnet',
      changed: true,
      sourceContainerId: sourceId,
      destinationContainerId: 'magnet_tray',
      options,
      massBefore,
      headline: `Recovered ${extractedGrams.toFixed(1)} g of Iron Filings!`,
      observation: `Dark metallic iron filings (${extractedGrams.toFixed(1)} g) leaped up onto the magnet wand and were transferred cleanly to the Magnetic Recovery Dish.${wetNote}`,
      scientificExplanation:
        'Iron is attracted to a magnet while glass, sand, and salt are not, allowing clean separation by magnetic attraction (SC.5.P.8.3).',
      dissolvingRate: 'not_applicable',
      dissolvingDurationSeconds: 0,
      benchmarksAddressed: ['SC.5.P.8.3'],
      triggeredMisconceptions: [],
    });
  }

  private runSieve(options: OperationOptions): OperationResult {
    const sourceId =
      options.sourceContainerId ??
      this.findContainerWithCondition(
        (c) =>
          c.id !== 'sieve_tray' &&
          c.contents.some(
            (s) =>
              s.state === 'solid' &&
              !s.isDissolved &&
              s.particleSizeMm >= SIEVE_MESH_OPENING_MM,
          ),
        'mixture_beaker',
      );

    const massBefore = this.getTotalSystemMassGrams();
    const source = this.containers[sourceId];
    const coarseSolids = source.contents.filter(
      (s) =>
        s.state === 'solid' &&
        !s.isDissolved &&
        s.particleSizeMm >= SIEVE_MESH_OPENING_MM &&
        s.massGrams > 0,
    );

    if (coarseSolids.length === 0) {
      return this.buildResult({
        operation: 'sieve',
        changed: false,
        sourceContainerId: sourceId,
        destinationContainerId: 'sieve_tray',
        options,
        massBefore,
        headline: 'Everything Passed Through the 2.0 mm Mesh',
        observation: `All materials in ${source.displayName} are smaller than ${SIEVE_MESH_OPENING_MM.toFixed(1)} mm (or liquid), so nothing stayed on top of the sieve screen.`,
        scientificExplanation:
          'A 2.0 mm sieve only catches particles wider than 2.0 mm. Sand (0.5 mm), iron filings (0.6 mm), and dry salt crystals (0.4 mm) slip right through the holes (SC.5.P.8.3).',
        dissolvingRate: 'not_applicable',
        dissolvingDurationSeconds: 0,
        benchmarksAddressed: ['SC.5.P.8.3'],
        triggeredMisconceptions: [],
      });
    }

    let retainedGrams = 0;
    source.contents = source.contents.filter((s) => {
      if (
        s.state === 'solid' &&
        !s.isDissolved &&
        s.particleSizeMm >= SIEVE_MESH_OPENING_MM &&
        s.massGrams > 0
      ) {
        retainedGrams = roundMass(retainedGrams + s.massGrams);
        this.mergeSampleIntoContainer(
          'sieve_tray',
          createSample(s.id, s.massGrams, { state: 'solid', isDissolved: false }),
        );
        return false;
      }
      return true;
    });

    return this.buildResult({
      operation: 'sieve',
      changed: true,
      sourceContainerId: sourceId,
      destinationContainerId: 'sieve_tray',
      options,
      massBefore,
      headline: `Separated ${retainedGrams.toFixed(1)} g of Safety Glass Shards!`,
      observation: `Vibrating the 2.0 mm mesh sieve trapped ${retainedGrams.toFixed(1)} g of coarse 6.5 mm glass shards on top while finer grains (< 2.0 mm) dropped back into ${source.displayName}.`,
      scientificExplanation:
        'Mixtures of solids with different particle sizes can be separated with a screen or sieve: 6.5 mm shards cannot fit through 2.0 mm holes (SC.5.P.8.3).',
      dissolvingRate: 'not_applicable',
      dissolvingDurationSeconds: 0,
      benchmarksAddressed: ['SC.5.P.8.3'],
      triggeredMisconceptions: [],
    });
  }

  private runAddWater(options: OperationOptions): OperationResult {
    const targetId =
      options.sourceContainerId ??
      this.findContainerWithCondition(
        (c) =>
          c.id !== 'water_beaker' &&
          c.id !== 'vapor_hood' &&
          c.contents.some((s) => s.isSolubleInWater && !s.isDissolved && s.massGrams > 0),
        'mixture_beaker',
      );

    const massBefore = this.getTotalSystemMassGrams();
    const waterSupply = this.containers.water_beaker;
    const waterItem = waterSupply.contents.find((s) => s.id === 'water' && s.massGrams > 0);

    if (!waterItem) {
      return this.buildResult({
        operation: 'add_water',
        changed: false,
        sourceContainerId: 'water_beaker',
        destinationContainerId: targetId,
        options,
        massBefore,
        headline: 'Water Supply Beaker Is Empty',
        observation:
          'All 100.0 g of lab water has already been poured. (If water was evaporated into the hood early, condense it back or reset the station.)',
        scientificExplanation:
          'In our closed laboratory mass ledger, we track the exact 100.0 g water supply so every gram of matter stays accounted for.',
        dissolvingRate: 'not_applicable',
        dissolvingDurationSeconds: 0,
        benchmarksAddressed: ['SC.5.P.8.1', 'SC.5.P.8.2'],
        triggeredMisconceptions: [],
      });
    }

    const tempC = options.waterTempCelsius ?? 22;
    const stirred = options.stirred ?? true;
    const pouredWaterGrams = waterItem.massGrams;
    waterSupply.contents = [];

    const target = this.containers[targetId];
    target.temperatureCelsius = tempC;
    target.isStirred = stirred;

    this.mergeSampleIntoContainer(
      targetId,
      createSample('water', pouredWaterGrams, { state: 'liquid', isDissolved: false }),
    );

    let dissolvedSaltGrams = 0;
    for (const item of target.contents) {
      if (item.isSolubleInWater && !item.isDissolved && item.massGrams > 0) {
        item.isDissolved = true;
        dissolvedSaltGrams = roundMass(dissolvedSaltGrams + item.massGrams);
      }
    }

    const { category, durationSeconds } = this.computeDissolvingRate(
      dissolvedSaltGrams > 0,
      tempC,
      stirred,
    );

    const totalTargetMass = this.getContainerMassGrams(targetId);
    const misconceptions: MisconceptionId[] =
      dissolvedSaltGrams > 0 ? ['DISSOLVING_DESTROYS_MATTER'] : [];
    for (const m of misconceptions) {
      this.noteMisconceptionCue(m);
    }

    const rateNote =
      dissolvedSaltGrams > 0 ? ` ${ATOM5_FEEDBACK_TEMPLATES.dissolvingRateTip(tempC, stirred)}` : '';

    const observation =
      dissolvedSaltGrams > 0
        ? `Poured ${pouredWaterGrams.toFixed(1)} g of water at ${formatGrade5Temperature(tempC)} into ${target.displayName}. All ${dissolvedSaltGrams.toFixed(1)} g of white salt crystals dissolved into tiny unseen parts (~${durationSeconds.toFixed(1)} s), while insoluble solids stayed visible at the bottom! Digital balance reads ${totalTargetMass.toFixed(1)} g.`
        : `Poured ${pouredWaterGrams.toFixed(1)} g of water at ${formatGrade5Temperature(tempC)} into ${target.displayName}. None of the remaining solids dissolve in water.`;

    return this.buildResult({
      operation: 'add_water',
      changed: true,
      sourceContainerId: 'water_beaker',
      destinationContainerId: targetId,
      options,
      massBefore,
      headline:
        dissolvedSaltGrams > 0
          ? `Salt Dissolved in Water (${totalTargetMass.toFixed(1)} g Total Mass Conserved!)`
          : `Added ${pouredWaterGrams.toFixed(1)} g Water`,
      observation,
      scientificExplanation: `Salt dissolves in water while sand, iron filings, and glass do not (SC.5.P.8.2). Dissolving is a physical change: all ${dissolvedSaltGrams.toFixed(1)} g of salt is still present as tiny unseen parts (SC.5.P.8.4).${rateNote}`,
      dissolvingRate: category,
      dissolvingDurationSeconds: durationSeconds,
      benchmarksAddressed: ['SC.5.P.8.2', 'SC.5.P.8.4', 'SC.5.P.9.1'],
      triggeredMisconceptions: misconceptions,
    });
  }

  private runFilter(options: OperationOptions): OperationResult {
    const sourceId =
      options.sourceContainerId ??
      this.findContainerWithCondition(
        (c) =>
          c.id !== 'evaporating_dish' &&
          c.contents.some((s) => s.id === 'water' && s.state === 'liquid' && s.massGrams > 0),
        'mixture_beaker',
      );

    const massBefore = this.getTotalSystemMassGrams();
    const source = this.containers[sourceId];
    const hasLiquidWater = source.contents.some(
      (s) => s.id === 'water' && s.state === 'liquid' && s.massGrams > 0,
    );

    if (!hasLiquidWater) {
      return this.buildResult({
        operation: 'filter',
        changed: false,
        sourceContainerId: sourceId,
        destinationContainerId: 'filter_funnel',
        options,
        massBefore,
        headline: 'Cannot Filter a Dry Solid Mixture',
        observation: `Filter paper has tiny ${FILTER_PAPER_PORE_MM} mm pores—dry salt crystals (0.4 mm) and sand grains (0.5 mm) BOTH stay stuck on top without liquid water to dissolve the salt first!`,
        scientificExplanation:
          'To separate salt from sand with a filter, add water first so salt dissolves into tiny unseen parts small enough to pass through the filter paper with the water (SC.5.P.8.2, SC.5.P.8.3).',
        dissolvingRate: 'not_applicable',
        dissolvingDurationSeconds: 0,
        benchmarksAddressed: ['SC.5.P.8.2', 'SC.5.P.8.3'],
        triggeredMisconceptions: [],
      });
    }

    let trappedSolidGrams = 0;
    let passedLiquidAndDissolvedGrams = 0;
    const trappedNames: string[] = [];

    const itemsToMove = [...source.contents];
    source.contents = [];

    for (const item of itemsToMove) {
      if (item.state === 'liquid' || item.isDissolved) {
        passedLiquidAndDissolvedGrams = roundMass(passedLiquidAndDissolvedGrams + item.massGrams);
        this.mergeSampleIntoContainer('evaporating_dish', cloneSample(item));
      } else {
        trappedSolidGrams = roundMass(trappedSolidGrams + item.massGrams);
        trappedNames.push(item.displayName);
        this.mergeSampleIntoContainer('filter_funnel', cloneSample(item));
      }
    }

    this.containers.evaporating_dish.temperatureCelsius = source.temperatureCelsius;

    const trappedDesc =
      trappedNames.length > 0
        ? `Trapped ${trappedSolidGrams.toFixed(1)} g of undissolved solids (${trappedNames.join(', ')}) on the filter paper cone`
        : 'No undissolved solids remained to trap on the filter paper';

    return this.buildResult({
      operation: 'filter',
      changed: true,
      sourceContainerId: sourceId,
      destinationContainerId: 'evaporating_dish',
      options,
      massBefore,
      headline:
        trappedSolidGrams > 0
          ? `Filtered Out ${trappedSolidGrams.toFixed(1)} g Undissolved Solids!`
          : 'Liquid Passed Through Filter Paper',
      observation: `${trappedDesc}, while ${passedLiquidAndDissolvedGrams.toFixed(1)} g of clear liquid (water + any dissolved salt) flowed into the Hot Plate Evaporating Dish.`,
      scientificExplanation:
        'Undissolved grains like sand (0.5 mm) are too large to pass through 0.02 mm filter paper pores, whereas liquid water and dissolved salt particles pass right through (SC.5.P.8.2, SC.5.P.8.3, SC.5.P.8.4).',
      dissolvingRate: 'not_applicable',
      dissolvingDurationSeconds: 0,
      benchmarksAddressed: ['SC.5.P.8.2', 'SC.5.P.8.3', 'SC.5.P.8.4'],
      triggeredMisconceptions: [],
    });
  }

  private runEvaporate(options: OperationOptions): OperationResult {
    const sourceId =
      options.sourceContainerId ??
      this.findContainerWithCondition(
        (c) =>
          c.id === 'evaporating_dish' &&
          c.contents.some((s) => s.id === 'water' && s.state === 'liquid' && s.massGrams > 0),
        this.findContainerWithCondition(
          (c) =>
            c.id !== 'water_beaker' &&
            c.contents.some((s) => s.id === 'water' && s.state === 'liquid' && s.massGrams > 0),
          'evaporating_dish',
        ),
      );

    const massBefore = this.getTotalSystemMassGrams();
    const source = this.containers[sourceId];
    const waterIndex = source.contents.findIndex(
      (s) => s.id === 'water' && s.state === 'liquid' && s.massGrams > 0,
    );

    if (waterIndex === -1) {
      return this.buildResult({
        operation: 'evaporate',
        changed: false,
        sourceContainerId: sourceId,
        destinationContainerId: 'vapor_hood',
        options,
        massBefore,
        headline: 'No Liquid Water to Evaporate',
        observation: `Heating ${source.displayName} produced no evaporation because there is no liquid water inside.`,
        scientificExplanation:
          'Evaporation requires liquid water: heating raises temperature to 100°C (212°F) so liquid water turns into invisible water vapor gas, leaving dissolved solids behind (SC.5.P.9.1).',
        dissolvingRate: 'not_applicable',
        dissolvingDurationSeconds: 0,
        benchmarksAddressed: ['SC.5.P.9.1'],
        triggeredMisconceptions: [],
      });
    }

    const waterSample = source.contents[waterIndex];
    const evaporatedWaterGrams = waterSample ? waterSample.massGrams : 0;
    source.contents.splice(waterIndex, 1);
    source.temperatureCelsius = 100;

    this.mergeSampleIntoContainer(
      'vapor_hood',
      createSample('water', evaporatedWaterGrams, { state: 'gas', isDissolved: false }),
    );

    let recrystallizedSaltGrams = 0;
    for (const item of source.contents) {
      if (item.isDissolved) {
        item.isDissolved = false;
        item.state = 'solid';
        recrystallizedSaltGrams = roundMass(recrystallizedSaltGrams + item.massGrams);
      }
    }

    const otherSolidsPresent = source.contents.some((s) => s.id !== 'salt' && s.massGrams > 0);
    const earlyBoilNote = otherSolidsPresent
      ? ' Note: Because other solids were still in the container, the salt recrystallized mixed with them—filter before evaporating to isolate pure salt! (You can condense the captured water vapor in the hood to try again.)'
      : '';

    const cues: MisconceptionId[] = ['STEAM_IS_WATER_VAPOR_GAS', 'BUBBLES_PROVE_CHEMICAL_CHANGE'];
    for (const c of cues) {
      this.noteMisconceptionCue(c);
    }

    return this.buildResult({
      operation: 'evaporate',
      changed: true,
      sourceContainerId: sourceId,
      destinationContainerId: 'vapor_hood',
      options,
      massBefore,
      headline:
        recrystallizedSaltGrams > 0 && !otherSolidsPresent
          ? `Recovered ${recrystallizedSaltGrams.toFixed(1)} g of Pure White Salt Crystals!`
          : `Evaporated ${evaporatedWaterGrams.toFixed(1)} g of Water at ${formatGrade5Temperature(100)}`,
      observation: `Heated ${source.displayName} to ${formatGrade5Temperature(100)}. Vigorous boiling bubbles appeared as ${evaporatedWaterGrams.toFixed(1)} g of liquid water turned into invisible water vapor gas (with wispy condensed liquid mist higher up in cooler air), leaving ${recrystallizedSaltGrams.toFixed(1)} g of solid white salt crystals behind!${earlyBoilNote}`,
      scientificExplanation:
        'Heating speeds up evaporation and boiling—a physical state change from liquid water to invisible water vapor gas (SC.5.P.8.1, SC.5.P.9.1). Because salt does not evaporate with the water, all 25.0 g of solid salt crystals are recovered intact!',
      dissolvingRate: 'not_applicable',
      dissolvingDurationSeconds: 0,
      benchmarksAddressed: ['SC.5.P.8.1', 'SC.5.P.8.3', 'SC.5.P.9.1'],
      triggeredMisconceptions: cues,
    });
  }

  private computeDissolvingRate(
    hasSolubleSolid: boolean,
    tempC: number,
    stirred: boolean,
  ): { category: DissolvingRateCategory; durationSeconds: number } {
    if (!hasSolubleSolid) {
      return { category: 'not_applicable', durationSeconds: 0 };
    }
    if (tempC >= 50 && stirred) {
      return { category: 'rapid', durationSeconds: 1.8 };
    }
    if (tempC >= 50 || stirred) {
      return { category: 'fast', durationSeconds: 3.6 };
    }
    if (tempC <= 10) {
      return { category: 'slow', durationSeconds: 12.0 };
    }
    return { category: 'moderate', durationSeconds: 7.5 };
  }

  private findContainerWithCondition(
    predicate: (container: LabContainerState) => boolean,
    fallback: ContainerId,
  ): ContainerId {
    const priorityOrder: ContainerId[] = [
      'mixture_beaker',
      'evaporating_dish',
      'filter_funnel',
      'sieve_tray',
      'magnet_tray',
      'water_beaker',
      'vapor_hood',
    ];
    for (const id of priorityOrder) {
      if (predicate(this.containers[id])) {
        return id;
      }
    }
    return fallback;
  }

  private mergeSampleIntoContainer(containerId: ContainerId, incoming: MaterialSample): void {
    const container = this.containers[containerId];
    const existing = container.contents.find(
      (s) =>
        s.id === incoming.id &&
        s.state === incoming.state &&
        s.isDissolved === incoming.isDissolved,
    );
    if (existing) {
      existing.massGrams = roundMass(existing.massGrams + incoming.massGrams);
    } else {
      container.contents.push(cloneSample(incoming));
    }
  }

  private buildResult(params: {
    operation: SeparationOperation;
    changed: boolean;
    sourceContainerId: ContainerId;
    destinationContainerId: ContainerId;
    options: OperationOptions;
    massBefore: number;
    headline: string;
    observation: string;
    scientificExplanation: string;
    dissolvingRate: DissolvingRateCategory;
    dissolvingDurationSeconds: number;
    benchmarksAddressed: readonly BenchmarkCode[];
    triggeredMisconceptions: readonly MisconceptionId[];
  }): OperationResult {
    const massAfter = this.getTotalSystemMassGrams();
    const massConserved = Math.abs(massAfter - this.initialSystemMassGrams) < 0.005;

    let predictionText: string | null = params.options.studentPrediction?.trim() || null;
    if (!predictionText && this.pendingPrediction?.operation === params.operation) {
      predictionText = this.pendingPrediction.predictionText;
    }
    this.pendingPrediction = null;

    this.stepCounter += 1;
    const logEntry: InvestigationLogEntry = {
      stepNumber: this.stepCounter,
      timestampIso: new Date().toISOString(),
      operation: params.operation,
      sourceContainerId: params.sourceContainerId,
      destinationContainerId: params.destinationContainerId,
      prediction: predictionText,
      observation: params.observation,
      scientificExplanation: params.scientificExplanation,
      changed: params.changed,
      dissolvingRate: params.dissolvingRate,
      dissolvingDurationSeconds: params.dissolvingDurationSeconds,
      systemMassBeforeGrams: params.massBefore,
      systemMassAfterGrams: massAfter,
      massConserved,
      benchmarksAddressed: params.benchmarksAddressed,
      triggeredMisconceptions: params.triggeredMisconceptions,
    };

    this.logs.push(logEntry);

    return {
      operation: params.operation,
      changed: params.changed,
      sourceContainerId: params.sourceContainerId,
      destinationContainerId: params.destinationContainerId,
      headline: params.headline,
      observation: params.observation,
      scientificExplanation: params.scientificExplanation,
      dissolvingRate: params.dissolvingRate,
      dissolvingDurationSeconds: params.dissolvingDurationSeconds,
      triggeredMisconceptions: params.triggeredMisconceptions,
      benchmarksAddressed: params.benchmarksAddressed,
      logEntry,
      progress: this.getSeparationProgress(),
    };
  }
}
