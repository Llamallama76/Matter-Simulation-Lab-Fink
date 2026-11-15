/**
 * Verified Florida Grade 5 Science Standards (CPALMS & FLDOE Statewide Science Assessment
 * Test Item Specifications) for Unit 4: Properties and Changes in Matter.
 *
 * STRICT ARCHITECTURAL CONTRACT:
 * Every HUD prompt, ATOM-5 dialogue line, Science Journal entry, and feedback banner MUST
 * adhere to these verified benchmark wordings, Grade 5 assessment limits, and misconception
 * guardrails.
 */

export type BenchmarkCode =
  | 'SC.5.P.8.1'
  | 'SC.5.P.8.2'
  | 'SC.5.P.8.3'
  | 'SC.5.P.8.4'
  | 'SC.5.P.9.1';

export interface FloridaScienceBenchmark {
  readonly code: BenchmarkCode;
  readonly bigIdea: 'Big Idea 8: Properties of Matter' | 'Big Idea 9: Changes in Matter';
  /** Verified official Florida CPALMS benchmark wording */
  readonly officialText: string;
  readonly cognitiveComplexity: 'Level 1 (Recall)' | 'Level 2 (Basic Application)' | 'Level 3 (Strategic Thinking)';
  /** Official FLDOE Statewide Science Assessment Grade 5 Test Item Specifications limits */
  readonly assessmentLimits: readonly string[];
  /** Kid-friendly Grade 5 "I Can" target for student/teacher HUD display */
  readonly studentLearningTarget: string;
}

export const FLORIDA_G5_UNIT4_BENCHMARKS: Readonly<
  Record<BenchmarkCode, FloridaScienceBenchmark>
> = {
  'SC.5.P.8.1': {
    code: 'SC.5.P.8.1',
    bigIdea: 'Big Idea 8: Properties of Matter',
    officialText:
      'Compare and contrast the basic properties of solids, liquids, and gases, such as mass, volume, color, texture, and temperature.',
    cognitiveComplexity: 'Level 2 (Basic Application)',
    assessmentLimits: [
      'Items will focus on observable and measurable physical properties (mass, volume, shape, color, texture, hardness, and temperature).',
      'Items will NOT address or assess kinetic molecular particle motion/behavior in each state of matter or between states of matter (reserved for middle school).',
      'Items will NOT assess mathematical density calculations (D = m/V) or weight-versus-mass unit conversion math.',
      'Mass is conceptualized as the amount of matter in an object, measured in grams (g) or kilograms (kg) using a balance.',
    ],
    studentLearningTarget:
      'I can compare solids, liquids, and gases using observable and measurable properties like mass, volume, shape, color, texture, and temperature.',
  },
  'SC.5.P.8.2': {
    code: 'SC.5.P.8.2',
    bigIdea: 'Big Idea 8: Properties of Matter',
    officialText:
      'Investigate and identify materials that will dissolve in water and those that will not and identify the conditions that will speed up or slow down the dissolving process.',
    cognitiveComplexity: 'Level 3 (Strategic Thinking)',
    assessmentLimits: [
      'Conditions affecting the speed of dissolving are strictly limited to temperature (heating/cooling), stirring (agitation), and/or surface area (particle/grain size, crushing).',
      'Items will NOT assess the formal distinction between a heterogeneous mixture and a homogeneous solution.',
      'Items will NOT require technical terms such as solute, solvent, solution, saturation, molarity, or catalyst.',
      'Frequently assessed alongside SC.5.P.8.3 in multistep mixture investigations.',
    ],
    studentLearningTarget:
      'I can test which materials dissolve in water and investigate how water temperature, stirring, and grain size speed up or slow down dissolving.',
  },
  'SC.5.P.8.3': {
    code: 'SC.5.P.8.3',
    bigIdea: 'Big Idea 8: Properties of Matter',
    officialText:
      'Demonstrate and explain that mixtures of solids can be separated based on observable properties of their parts such as particle size, shape, color, and magnetic attraction.',
    cognitiveComplexity: 'Level 2 (Basic Application)',
    assessmentLimits: [
      'Separation tools and methods remain conceptual and grounded in observable physical properties: magnets (magnetic attraction), sieves/screens (particle size), tweezers/sorting (shape/color), water + filter paper (dissolving vs. not dissolving), and evaporation (recovering dissolved solids).',
      'Items will NOT require complex mathematical calculations or stoichiometry.',
      'Multiple valid tool sequences are scientifically acceptable whenever physical properties permit clean separation.',
    ],
    studentLearningTarget:
      'I can separate a mixture of solids by using observable properties like magnetic attraction, particle size, and whether a material dissolves in water.',
  },
  'SC.5.P.8.4': {
    code: 'SC.5.P.8.4',
    bigIdea: 'Big Idea 8: Properties of Matter',
    officialText:
      'Explore the scientific theory of atoms (also called atomic theory) by recognizing that all matter is composed of parts that are too small to be seen without magnification.',
    cognitiveComplexity: 'Level 1 (Recall)',
    assessmentLimits: [
      'Strictly conceptual recognition that all solids, liquids, and gases are built from tiny parts (atoms/particles) too small to see with unaided eyes.',
      'Items will NOT include the periodic table of elements, element symbols, atomic number, or atomic mass.',
      'Items will NOT include subatomic particles (protons, neutrons, electrons), electron shells, or chemical bonding models.',
    ],
    studentLearningTarget:
      'I can explain that all matter is made of tiny unseen parts (atoms) that are too small to see without special magnification.',
  },
  'SC.5.P.9.1': {
    code: 'SC.5.P.9.1',
    bigIdea: 'Big Idea 9: Changes in Matter',
    officialText:
      'Investigate and describe that many physical and chemical changes are affected by temperature.',
    cognitiveComplexity: 'Level 3 (Strategic Thinking)',
    assessmentLimits: [
      'Focuses on how heating or cooling affects physical changes (melting, freezing, evaporating, condensing, speed of dissolving) and familiar chemical changes (cooking, burning, rusting, decaying).',
      'Temperatures should include metric degrees Celsius (°C) paired with approximate Fahrenheit (°F) equivalents.',
      'Items will NOT include chemical equations, equation balancing, molecular formulas, or endothermic/exothermic enthalpy calculations.',
    ],
    studentLearningTarget:
      'I can investigate and describe how heating and cooling affect physical changes (like evaporating or melting) and chemical changes (like cooking or rusting).',
  },
};

/**
 * Strict Grade 5 Curriculum Boundaries.
 * Any middle-school or high-school chemistry concepts below are strictly prohibited in UI copy.
 */
export const STRICT_GRADE5_BOUNDARIES = {
  allowPeriodicTable: false,
  allowSubatomicParticles: false, // No protons, neutrons, electrons, quarks, valence shells
  allowAtomicMassOrNumber: false,
  allowChemicalEquations: false, // No NaCl, H2O formulas as required tests, no balancing equations
  allowDensityCalculations: false, // No D = m / V math problems
  allowFormalSolutionTerminology: false, // Per FLDOE SC.5.P.8.3 spec: avoid testing solute/solvent/saturation/catalyst
  temperatureDisplayFormat: 'celsius_with_fahrenheit', // e.g., "100°C (212°F)"
} as const;

/**
 * Forbidden terms in student-facing Grade 5 UI prompts and ATOM-5 dialogue.
 * Use `validateGrade5Copy()` during development/tests to verify compliance.
 */
export const FORBIDDEN_GRADE5_TERMS: readonly string[] = [
  'periodic table',
  'atomic mass',
  'atomic weight',
  'atomic number',
  'proton',
  'protons',
  'neutron',
  'neutrons',
  'electron',
  'electrons',
  'valence',
  'covalent',
  'ionic bond',
  'stoichiometry',
  'molarity',
  'solute',
  'solvent',
  'supersaturated',
  'saturation point',
  'catalyst',
  'endothermic',
  'exothermic',
  'enthalpy',
  'density =',
  'mass divided by volume',
];

/**
 * Approved Grade 5 Florida Science Vocabulary Bank with kid-clear definitions.
 */
export interface Grade5VocabularyEntry {
  readonly term: string;
  readonly definition: string;
  readonly benchmark: BenchmarkCode;
}

export const GRADE5_VOCABULARY_BANK: readonly Grade5VocabularyEntry[] = [
  {
    term: 'Matter',
    definition: 'Anything that has mass and takes up space (volume), including solids, liquids, and gases.',
    benchmark: 'SC.5.P.8.1',
  },
  {
    term: 'Mass',
    definition: 'The amount of matter in an object or material, measured in grams (g) on a balance.',
    benchmark: 'SC.5.P.8.1',
  },
  {
    term: 'Volume',
    definition: 'The amount of space that matter takes up.',
    benchmark: 'SC.5.P.8.1',
  },
  {
    term: 'Observable Property',
    definition:
      'A characteristic you can observe, measure, or test—such as particle size, color, texture, shape, magnetic attraction, or whether it dissolves in water.',
    benchmark: 'SC.5.P.8.3',
  },
  {
    term: 'Mixture',
    definition:
      'Two or more materials combined together where each material keeps its own identity and can be separated using physical properties.',
    benchmark: 'SC.5.P.8.3',
  },
  {
    term: 'Dissolve',
    definition:
      'A physical change where a solid material breaks into tiny unseen parts that spread evenly throughout water—without losing any mass.',
    benchmark: 'SC.5.P.8.2',
  },
  {
    term: 'Atom',
    definition:
      'According to atomic theory, one of the tiny building-block parts that make up all matter—far too small to see without special magnification.',
    benchmark: 'SC.5.P.8.4',
  },
  {
    term: 'Evaporation',
    definition:
      'A physical change caused by heating (or warm air) where liquid water turns into invisible water vapor gas, leaving dissolved solids behind.',
    benchmark: 'SC.5.P.9.1',
  },
  {
    term: 'Physical Change',
    definition:
      'A change in size, shape, state of matter, or dissolving where NO brand-new substance is created.',
    benchmark: 'SC.5.P.9.1',
  },
  {
    term: 'Chemical Change',
    definition:
      'A change—such as burning, cooking, rusting, or decaying—that forms one or more brand-new substances with different properties.',
    benchmark: 'SC.5.P.9.1',
  },
  {
    term: 'Luster',
    definition:
      'How a material reflects light from its surface—such as shiny metallic, clear glassy, or dull.',
    benchmark: 'SC.5.P.8.1',
  },
  {
    term: 'Hardness',
    definition:
      'A solid material’s resistance to being scratched; a harder material leaves a scratch groove on a softer material.',
    benchmark: 'SC.5.P.8.1',
  },
  {
    term: 'Water Displacement',
    definition:
      'Measuring a solid object’s volume in milliliters (mL) by reading how much the water level rises when the object is submerged in a graduated cylinder.',
    benchmark: 'SC.5.P.8.1',
  },
  {
    term: 'Safe Wafting',
    definition:
      'Gently waving your hand above a container to sweep a small breeze of air toward your nose instead of sniffing directly over a sample.',
    benchmark: 'SC.5.P.8.1',
  },
];

export type MisconceptionId =
  | 'DISSOLVING_DESTROYS_MATTER'
  | 'STEAM_IS_WATER_VAPOR_GAS'
  | 'BUBBLES_PROVE_CHEMICAL_CHANGE';

export interface MisconceptionChoiceOption {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly atom5Response: string;
}

export interface MisconceptionGuardrail {
  readonly id: MisconceptionId;
  readonly relatedBenchmarks: readonly BenchmarkCode[];
  readonly commonMisconception: string;
  readonly scientificTruth: string;
  /** Socratic challenge posed by companion robot ATOM-5 during gameplay */
  readonly atom5ChallengeQuestion: string;
  readonly choices: readonly MisconceptionChoiceOption[];
  /** Visual cue description for Particle Vision / Lab Scale verification */
  readonly labEvidenceHint: string;
}

export const MISCONCEPTION_GUARDRAILS: Readonly<Record<MisconceptionId, MisconceptionGuardrail>> = {
  DISSOLVING_DESTROYS_MATTER: {
    id: 'DISSOLVING_DESTROYS_MATTER',
    relatedBenchmarks: ['SC.5.P.8.2', 'SC.5.P.8.4', 'SC.5.P.9.1'],
    commonMisconception:
      'When salt dissolves in water and can no longer be seen, the salt disappears or is destroyed, or turns into a brand-new chemical.',
    scientificTruth:
      'Dissolving is a physical change where matter is conserved, never destroyed. The salt breaks into tiny unseen parts spread evenly through the water, the total mass equals the mass of the water plus the mass of the salt, and evaporating the water brings the solid white salt crystals back.',
    atom5ChallengeQuestion:
      'Wait a second, Explorer! The white salt crystals vanished into clear liquid! Did the 25 grams of salt get destroyed, or is every gram still inside the beaker?',
    choices: [
      {
        id: 'destroyed',
        text: 'The salt was destroyed by the water, so the beaker lost 25 grams.',
        isCorrect: false,
        atom5Response:
          'Check the digital lab balance and switch on Particle Vision! Matter is never destroyed when it dissolves. Look closely—100 g of water plus 25 g of salt weighs 125 g total!',
      },
      {
        id: 'chemical_new',
        text: 'It turned into a brand-new substance through a chemical change.',
        isCorrect: false,
        atom5Response:
          'Not quite! Dissolving is a physical change. If we heat the water so it evaporates, the exact same salty white crystals are left behind in the dish.',
      },
      {
        id: 'conserved_tiny_parts',
        text: 'It is a physical change! All 25 g of salt broke into tiny unseen parts spread through the water.',
        isCorrect: true,
        atom5Response:
          'Spot-on science! Dissolving is a physical change and mass is conserved: 100 g water + 25 g salt = 125 g! Activate Particle Vision to see those tiny salt parts hiding between the water parts!',
      },
    ],
    labEvidenceHint:
      'Compare the Digital Balance readout before and after adding water (mass increases by exact salt + water mass) and toggle Particle Vision (SC.5.P.8.4) to spot tiny salt particles dispersed through the liquid.',
  },
  STEAM_IS_WATER_VAPOR_GAS: {
    id: 'STEAM_IS_WATER_VAPOR_GAS',
    relatedBenchmarks: ['SC.5.P.8.1', 'SC.5.P.9.1'],
    commonMisconception:
      'The white cloud of steam or mist rising above boiling water is water vapor gas.',
    scientificTruth:
      'Visible white steam or mist is actually made of tiny liquid water droplets that cooled and condensed in the air. True water vapor is a completely invisible gas.',
    atom5ChallengeQuestion:
      'Look above the hot evaporating dish! You can see a wispy white mist rising. Is that white mist the gas form of water, or something else?',
    choices: [
      {
        id: 'mist_is_gas',
        text: 'Yes—that white cloud IS water vapor gas, because we can see gases.',
        isCorrect: false,
        atom5Response:
          'Careful! True water vapor is an invisible gas right above the hot liquid surface. As soon as it hits cooler lab air, tiny LIQUID water droplets form—that visible cloud is liquid mist!',
      },
      {
        id: 'mist_is_liquid_droplets',
        text: 'The visible mist is tiny liquid water droplets; true water vapor is an invisible gas!',
        isCorrect: true,
        atom5Response:
          'Brilliant observation! Right above the hot dish, liquid water evaporates into invisible water vapor gas. Higher up where the air is cooler, some vapor cools into tiny visible liquid droplets!',
      },
    ],
    labEvidenceHint:
      'Notice the clear, transparent gap directly above the 100°C (212°F) liquid surface (invisible water vapor gas) before the misty cloud of tiny condensed liquid droplets appears higher up.',
  },
  BUBBLES_PROVE_CHEMICAL_CHANGE: {
    id: 'BUBBLES_PROVE_CHEMICAL_CHANGE',
    relatedBenchmarks: ['SC.5.P.8.1', 'SC.5.P.9.1'],
    commonMisconception:
      'Any time you see bubbles or fizzing in a beaker, a chemical change is definitely happening.',
    scientificTruth:
      'Bubbles or fizzing are observable evidence that a gas is present or escaping, NOT automatic proof of a chemical change. Boiling water makes bubbles of invisible water vapor gas (a physical state change), and pouring water onto dry sand releases trapped air bubbles (also physical).',
    atom5ChallengeQuestion:
      'Whoa—bubbles are rising in the dish on the hot plate! Does seeing bubbles automatically prove a chemical change is happening?',
    choices: [
      {
        id: 'always_chemical',
        text: 'Yes! Bubbles always mean a chemical change is making a brand-new gas.',
        isCorrect: false,
        atom5Response:
          'Hold up! Bubbles only tell us a gas is moving. Here at 100°C (212°F), liquid water is boiling into water vapor gas—it is still water! No brand-new substance formed, so boiling is a physical change.',
      },
      {
        id: 'evidence_not_proof',
        text: 'No—bubbles are observable evidence of a gas, but boiling water is a physical state change!',
        isCorrect: true,
        atom5Response:
          'You nailed it! Bubbles are helpful evidence to observe, not automatic proof of a chemical change. Boiling liquid water into water vapor gas is a temperature-driven physical change!',
      },
    ],
    labEvidenceHint:
      'Check what remains after boiling: pure white salt crystals in the dish and condensed pure water droplets on the cool hood—no new substance was created.',
  },
};

/**
 * Age-appropriate ATOM-5 feedback templates for predictions, tool operations, and recovery milestones.
 */
export const ATOM5_FEEDBACK_TEMPLATES = {
  welcomeWorld2:
    'Welcome to the Magnetic Mines Rescue Lab! Our supply capsule crashed and mixed four solids together: coarse glass shards, dark iron filings, beach sand, and white table salt. Use their observable physical properties to separate all four without losing a single gram!',
  welcomeOpenLab:
    'Welcome to the Grade 5 Matter & Solutions Lab! Explore Bay 1 (Material Properties), Bay 2 (Mixture Separation), and Bay 3 (Dissolving Rate) in any order. Click me anytime if you want a science tip!',
  bay1VoluntaryTip:
    'Bay 1 Tip (SC.5.P.8.1): Test known and mystery samples on the digital balance, magnet wand, thermal pad, and water cup—then record State, Mass, Magnetism, and Dissolving in your Lab Data Sheet!',
  bay2VoluntaryTip:
    'Bay 2 Tip (SC.5.P.8.3): Separate iron filings, safety glass, quartz sand, and table salt in any order that matches their physical properties. Watch the digital scale—all 245.0 g stays conserved!',
  bay3VoluntaryTip:
    'Bay 3 Tip (SC.5.P.8.2): Compare Beaker A and Beaker B side by side! Change just ONE condition at a time—water temperature, stirring, or salt grain size—and time the race with the stopwatch and Particle Vision (P)!',
  predictionPromptPrefix: 'Before we activate this tool, make a scientist prediction:',
  massConservedBadge: (totalGrams: number): string =>
    `Mass Ledger Verified: ${totalGrams.toFixed(1)} g conserved across all lab containers!`,
  dissolvingRateTip: (tempC: number, isStirred: boolean): string => {
    const tempF = Math.round((tempC * 9) / 5 + 32);
    if (tempC >= 50 && isStirred) {
      return `Warm water at ${tempC}°C (${tempF}°F) PLUS stirring made the salt dissolve super fast! (SC.5.P.8.2)`;
    }
    if (tempC >= 50) {
      return `Warming the water to ${tempC}°C (${tempF}°F) sped up how fast the salt dissolved! Stirring would make it even faster.`;
    }
    if (isStirred) {
      return `Stirring at ${tempC}°C (${tempF}°F) sped up dissolving! Heating the water would speed it up even more.`;
    }
    return `At room temperature ${tempC}°C (${tempF}°F) without stirring, the fine salt grains still dissolve—try warm water or stirring to speed it up!`;
  },
  pureRecoveryCelebration: (materialName: string, massGrams: number, propertyUsed: string): string =>
    `Pure Sample Recovered! You isolated ${massGrams.toFixed(1)} g of ${materialName} using ${propertyUsed}.`,
  missionCompleteSummary:
    'All four solids—iron filings, safety glass shards, quartz sand, and table salt—are isolated into pure dry containers, and all 245.0 g of matter in the Bay 2 system is conserved!',
} as const;

/**
 * Formats a Celsius temperature with its rounded Fahrenheit equivalent per FLDOE Grade 5 guidelines.
 */
export function formatGrade5Temperature(celsius: number): string {
  const fahrenheit = Math.round((celsius * 9) / 5 + 32);
  return `${Math.round(celsius)}°C (${fahrenheit}°F)`;
}

/**
 * Validates that a candidate student-facing text string contains zero forbidden middle/high-school terms.
 * Returns an array of any offending terms found (empty array = 100% Grade 5 compliant).
 */
export function validateGrade5Copy(text: string): string[] {
  const normalized = text.toLowerCase();
  return FORBIDDEN_GRADE5_TERMS.filter((term) => normalized.includes(term.toLowerCase()));
}
