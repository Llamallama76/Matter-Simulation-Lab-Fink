/**
 * Runtime Graphics Quality Tier presets for MATTERVERSE: THE FRACTURED LABORATORY.
 * Pure configuration contract (decoupled from Three.js scene code) consumed by
 * MaterialFactory, TeacherHUD, and the main WebGL renderer pipeline.
 */

export type GraphicsQualityTier = 'Ultra' | 'Balanced' | 'Classroom Safe';

export interface GraphicsTierConfig {
  readonly id: GraphicsQualityTier;
  readonly label: string;
  readonly description: string;
  /** Maximum devicePixelRatio cap passed to renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr)) */
  readonly maxDpr: number;
  /** Enable directional/spot real-time shadow maps */
  readonly shadowsEnabled: boolean;
  /** Shadow map texture resolution (square px) when shadowsEnabled is true */
  readonly shadowMapSize: 2048 | 1024 | 512;
  /** Shadow filter mode identifier ('PCFSoftShadowMap' on Ultra/Balanced) */
  readonly shadowFilterMode: 'PCFSoftShadowMap' | 'None';
  /** Use true physical transmission/IOR refraction on laboratory glassware */
  readonly physicalRefractiveGlass: boolean;
  /** Enable UnrealBloomPass post-processing */
  readonly bloomEnabled: boolean;
  /** UnrealBloomPass strength when bloomEnabled is true */
  readonly bloomStrength: number;
  /** UnrealBloomPass radius when bloomEnabled is true */
  readonly bloomRadius: number;
  /** UnrealBloomPass luminance threshold when bloomEnabled is true */
  readonly bloomThreshold: number;
  /** Procedural PBR canvas texture resolution (px) */
  readonly proceduralTextureSize: 512 | 256;
  /** Multiplier for decorative InstancedMesh particle counts (1.0 = full density) */
  readonly particleDensityScale: number;
}

export const DEFAULT_GRAPHICS_TIER: GraphicsQualityTier = 'Ultra';

export const GRAPHICS_TIER_PRESETS: Readonly<Record<GraphicsQualityTier, GraphicsTierConfig>> = {
  Ultra: {
    id: 'Ultra',
    label: 'Ultra (Studio PBR)',
    description:
      'Full DPR up to 2.0, 2048px PCFSoftShadowMap, physical refractive borosilicate glass, IBL reflections, and UnrealBloomPass.',
    maxDpr: 2.0,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowFilterMode: 'PCFSoftShadowMap',
    physicalRefractiveGlass: true,
    bloomEnabled: true,
    bloomStrength: 0.30,
    bloomRadius: 0.20,
    bloomThreshold: 0.94,
    proceduralTextureSize: 512,
    particleDensityScale: 1.0,
  },
  Balanced: {
    id: 'Balanced',
    label: 'Balanced',
    description:
      'DPR capped at 1.5, 1024px soft shadows, specular clearcoat glass, and light bloom for mainstream laptops.',
    maxDpr: 1.5,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowFilterMode: 'PCFSoftShadowMap',
    physicalRefractiveGlass: false,
    bloomEnabled: true,
    bloomStrength: 0.22,
    bloomRadius: 0.20,
    bloomThreshold: 0.94,
    proceduralTextureSize: 512,
    particleDensityScale: 0.75,
  },
  'Classroom Safe': {
    id: 'Classroom Safe',
    label: 'Classroom Safe (District Laptop / Smartboard)',
    description:
      '1.25 DPR cap, dynamic shadows off, bloom post-processing off, and Fresnel standard glass for locked 60 FPS on integrated graphics.',
    maxDpr: 1.25,
    shadowsEnabled: false,
    shadowMapSize: 512,
    shadowFilterMode: 'None',
    physicalRefractiveGlass: false,
    bloomEnabled: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1.0,
    proceduralTextureSize: 256,
    particleDensityScale: 0.5,
  },
};
