/**
 * Zero-Blender Procedural PBR Material, Canvas Texture, and IBL Lighting Factory.
 * Synthesizes multi-channel offscreen canvas textures (albedo, tangent-space normalMap,
 * roughnessMap, metalnessMap, emissiveMap) and tier-aware borosilicate glassware.
 */

import * as THREE from 'three';
import {
  GRAPHICS_TIER_PRESETS,
  type GraphicsQualityTier,
} from '../config/graphicsTiers';

export type MaterialPresetName =
  | 'brushedSteel'
  | 'anodizedDark'
  | 'copperCoil'
  | 'labBenchEpoxy'
  | 'sieveWireMesh'
  | 'ceramicDish'
  | 'filterPaper'
  | 'mineRockWall'
  | 'crashedCapsuleHull'
  | 'heatingElement'
  | 'brassCollar'
  | 'terrazzoFloor'
  | 'labWallPanel'
  | 'skylightGlass'
  | 'oakWoodTrim'
  | 'mineralDull'
  | 'mineralRough';

interface GeneratedTextureSet {
  albedo: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap?: THREE.CanvasTexture;
  emissiveMap?: THREE.CanvasTexture;
  alphaMap?: THREE.CanvasTexture;
}

interface NoiseOptions {
  seed: number;
  octaves: number;
  baseFreq: number;
  streakX?: number;
  streakY?: number;
}

/** Deterministic integer hash returning [0, 1) for seamless tileable procedural noise */
function hash2D(ix: number, iy: number, period: number, seed: number): number {
  const px = ((ix % period) + period) % period;
  const py = ((iy % period) + period) % period;
  let n = (px * 374761393 + py * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function tileableValueNoise(u: number, v: number, period: number, seed: number): number {
  const x = u * period;
  const y = v * period;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);

  const v00 = hash2D(x0, y0, period, seed);
  const v10 = hash2D(x0 + 1, y0, period, seed);
  const v01 = hash2D(x0, y0 + 1, period, seed);
  const v11 = hash2D(x0 + 1, y0 + 1, period, seed);

  const nx0 = v00 + (v10 - v00) * fx;
  const nx1 = v01 + (v11 - v01) * fx;
  return nx0 + (nx1 - nx0) * fy;
}

function fbmTileable(u: number, v: number, opts: NoiseOptions): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  const sx = opts.streakX ?? 1;
  const sy = opts.streakY ?? 1;
  let freqX = Math.max(1, Math.round(opts.baseFreq * sx));
  let freqY = Math.max(1, Math.round(opts.baseFreq * sy));

  for (let o = 0; o < opts.octaves; o++) {
    const period = Math.max(freqX, freqY);
    sum +=
      amp *
      tileableValueNoise(
        (u * freqX) / period,
        (v * freqY) / period,
        period,
        opts.seed + o * 97,
      );
    norm += amp;
    amp *= 0.5;
    freqX *= 2;
    freqY *= 2;
  }
  return norm > 0 ? sum / norm : 0.5;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function createCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function makeCanvasTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Computes a seamless tangent-space normal map from a tileable scalar heightfield using a 3x3 Sobel kernel.
 */
function buildNormalMapFromHeightfield(
  height: Float32Array,
  size: number,
  strength: number,
): THREE.CanvasTexture {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return makeCanvasTexture(canvas, THREE.NoColorSpace);
  }
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const sampleH = (x: number, y: number): number => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return height[wy * size + wx] ?? 0;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sampleH(x - 1, y - 1);
      const t = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const l = sampleH(x - 1, y);
      const r = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const b = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dX = tr + 2 * r + br - (tl + 2 * l + bl);
      const dY = bl + 2 * b + br - (tl + 2 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * size + x) * 4;
      data[idx] = clampByte((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = clampByte((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = clampByte((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return makeCanvasTexture(canvas, THREE.NoColorSpace);
}

export class MaterialFactory {
  private currentTier: GraphicsQualityTier;
  private textureCache = new Map<string, GeneratedTextureSet>();
  private standardMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private glassMaterials: THREE.Material[] = [];
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private envTexture: THREE.Texture | null = null;

  constructor(initialTier: GraphicsQualityTier) {
    this.currentTier = initialTier;
  }

  public getTier(): GraphicsQualityTier {
    return this.currentTier;
  }

  /**
   * Builds a procedural studio-lab Image-Based Lighting (IBL) environment map using PMREMGenerator.
   * Zero external HDRI files required.
   */
  public buildLabEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
    if (this.envTexture) {
      return this.envTexture;
    }

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xdbeafe);

    // Sunlit architectural hall enclosure gradient
    const domeGeo = new THREE.SphereGeometry(24, 24, 16);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0xcbd5e1,
      side: THREE.BackSide,
    });
    envScene.add(new THREE.Mesh(domeGeo, domeMat));

    // Overhead daylight skylight banks (crisp crisp key reflections on glassware & metals)
    const softboxGeo = new THREE.PlaneGeometry(11, 4.2);
    const softboxMatDaylight = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.9, 2.85, 2.7),
      side: THREE.DoubleSide,
    });
    const softboxMatSky = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.0, 2.45, 2.85),
      side: THREE.DoubleSide,
    });

    const topPanel1 = new THREE.Mesh(softboxGeo, softboxMatDaylight);
    topPanel1.position.set(-5, 11, 0);
    topPanel1.rotation.x = Math.PI / 2;
    envScene.add(topPanel1);

    const topPanel2 = new THREE.Mesh(softboxGeo, softboxMatSky);
    topPanel2.position.set(5, 11, 0);
    topPanel2.rotation.x = Math.PI / 2;
    envScene.add(topPanel2);

    // Warm sunlit window strips along Wing A & Wing B walls
    const stripGeo = new THREE.PlaneGeometry(2.2, 8);
    const skyWindowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.4, 2.2, 2.6),
      side: THREE.DoubleSide,
    });
    const warmWindowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.5, 2.2, 1.75),
      side: THREE.DoubleSide,
    });

    const leftRim = new THREE.Mesh(stripGeo, skyWindowMat);
    leftRim.position.set(-14, 3.5, -2);
    leftRim.lookAt(0, 2, 0);
    envScene.add(leftRim);

    const rightRim = new THREE.Mesh(stripGeo, warmWindowMat);
    rightRim.position.set(14, 3.5, 2);
    rightRim.lookAt(0, 2, 0);
    envScene.add(rightRim);

    // Bright terrazzo lab floor bounce
    const floorGeo = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -4;
    floorMesh.rotation.x = -Math.PI / 2;
    envScene.add(floorMesh);

    const renderTarget = pmrem.fromScene(envScene, 0.04);
    this.envTarget = renderTarget;
    this.envTexture = renderTarget.texture;

    // Dispose temporary environment geometry/materials
    domeGeo.dispose();
    domeMat.dispose();
    softboxGeo.dispose();
    softboxMatDaylight.dispose();
    softboxMatSky.dispose();
    stripGeo.dispose();
    skyWindowMat.dispose();
    warmWindowMat.dispose();
    floorGeo.dispose();
    floorMat.dispose();
    pmrem.dispose();

    return this.envTexture;
  }

  /**
   * Returns a cached MeshStandardMaterial backed by multi-channel procedural canvas PBR maps.
   */
  public getStandardMaterial(
    preset: MaterialPresetName,
    repeatX = 1,
    repeatY = 1,
  ): THREE.MeshStandardMaterial {
    const key = `${preset}_${repeatX}x${repeatY}`;
    const existing = this.standardMaterials.get(key);
    if (existing) {
      return existing;
    }

    const mat = new THREE.MeshStandardMaterial();
    mat.userData['presetName'] = preset;
    this.configureStandardMaterial(mat, preset, repeatX, repeatY);
    this.standardMaterials.set(key, mat);
    return mat;
  }

  /**
   * Creates a borosilicate glassware material tailored to the active GraphicsQualityTier.
   * Registered internally so runtime tier switching updates glassware seamlessly.
   */
  public createGlassMaterial(tintHex = 0xe8f9ff): THREE.Material {
    const mat = this.buildGlassMaterialInstance(tintHex);
    this.glassMaterials.push(mat);
    return mat;
  }

  /**
   * Switches runtime quality tier, regenerating procedural maps if texture resolution changed
   * and updating glassware shaders in-place on meshes via a callback.
   */
  public applyQualityTier(
    nextTier: GraphicsQualityTier,
    onGlassMaterialReplaced?: (oldMat: THREE.Material, newMat: THREE.Material) => void,
  ): void {
    const prevSize = GRAPHICS_TIER_PRESETS[this.currentTier].proceduralTextureSize;
    this.currentTier = nextTier;
    const nextSize = GRAPHICS_TIER_PRESETS[nextTier].proceduralTextureSize;

    if (prevSize !== nextSize) {
      this.disposeTextureCache();
      for (const mat of this.standardMaterials.values()) {
        const preset = mat.userData['presetName'] as MaterialPresetName | undefined;
        if (!preset) continue;
        const repX = (mat.userData['repeatX'] as number | undefined) ?? 1;
        const repY = (mat.userData['repeatY'] as number | undefined) ?? 1;
        this.configureStandardMaterial(mat, preset, repX, repY);
      }
    }

    if (onGlassMaterialReplaced) {
      const updatedList: THREE.Material[] = [];
      for (const oldMat of this.glassMaterials) {
        const tint = (oldMat.userData['glassTintHex'] as number | undefined) ?? 0xe8f9ff;
        const replacement = this.buildGlassMaterialInstance(tint);
        onGlassMaterialReplaced(oldMat, replacement);
        oldMat.dispose();
        updatedList.push(replacement);
      }
      this.glassMaterials = updatedList;
    }
  }

  public dispose(): void {
    this.disposeTextureCache();
    for (const mat of this.standardMaterials.values()) {
      mat.dispose();
    }
    this.standardMaterials.clear();
    for (const glass of this.glassMaterials) {
      glass.dispose();
    }
    this.glassMaterials = [];
    this.envTarget?.dispose();
    this.envTarget = null;
    this.envTexture = null;
  }

  private buildGlassMaterialInstance(tintHex: number): THREE.Material {
    const tierCfg = GRAPHICS_TIER_PRESETS[this.currentTier];

    let mat: THREE.Material;
    if (tierCfg.physicalRefractiveGlass) {
      mat = new THREE.MeshPhysicalMaterial({
        color: tintHex,
        transmission: 0.94,
        ior: 1.47, // Borosilicate lab glass IOR
        thickness: 0.09,
        roughness: 0.05,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.45,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    } else if (this.currentTier === 'Balanced') {
      mat = new THREE.MeshPhysicalMaterial({
        color: tintHex,
        transparent: true,
        opacity: 0.28,
        roughness: 0.06,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 0.95,
        envMapIntensity: 1.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    } else {
      // Classroom Safe: zero multi-pass transmission overhead, crisp Fresnel specular transparency
      mat = new THREE.MeshStandardMaterial({
        color: tintHex,
        transparent: true,
        opacity: 0.32,
        roughness: 0.12,
        metalness: 0.15,
        envMapIntensity: 1.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    mat.userData['glassTintHex'] = tintHex;
    return mat;
  }

  private configureStandardMaterial(
    mat: THREE.MeshStandardMaterial,
    preset: MaterialPresetName,
    repeatX: number,
    repeatY: number,
  ): void {
    const textures = this.getOrGenerateTextureSet(preset, repeatX, repeatY);
    mat.map = textures.albedo;
    mat.normalMap = textures.normalMap;
    mat.roughnessMap = textures.roughnessMap;
    mat.metalnessMap = textures.metalnessMap ?? null;
    mat.emissiveMap = textures.emissiveMap ?? null;
    mat.alphaMap = textures.alphaMap ?? null;
    mat.userData['repeatX'] = repeatX;
    mat.userData['repeatY'] = repeatY;

    switch (preset) {
      case 'brushedSteel':
        mat.metalness = 0.92;
        mat.roughness = 0.34;
        mat.normalScale.set(0.45, 0.45);
        mat.envMapIntensity = 1.25;
        break;
      case 'anodizedDark':
        mat.metalness = 0.78;
        mat.roughness = 0.48;
        mat.normalScale.set(0.35, 0.35);
        mat.envMapIntensity = 1.05;
        break;
      case 'copperCoil':
        mat.metalness = 0.94;
        mat.roughness = 0.28;
        mat.normalScale.set(0.9, 0.9);
        mat.envMapIntensity = 1.35;
        break;
      case 'brassCollar':
        mat.metalness = 0.88;
        mat.roughness = 0.32;
        mat.normalScale.set(0.4, 0.4);
        mat.envMapIntensity = 1.25;
        break;
      case 'labBenchEpoxy':
        mat.metalness = 0.08;
        mat.roughness = 0.42;
        mat.normalScale.set(0.28, 0.28);
        mat.envMapIntensity = 0.95;
        break;
      case 'sieveWireMesh':
        mat.metalness = 0.85;
        mat.roughness = 0.36;
        mat.normalScale.set(1.0, 1.0);
        mat.alphaTest = 0.42;
        mat.side = THREE.DoubleSide;
        break;
      case 'ceramicDish':
        mat.metalness = 0.02;
        mat.roughness = 0.16;
        mat.normalScale.set(0.18, 0.18);
        mat.envMapIntensity = 1.1;
        break;
      case 'filterPaper':
        mat.metalness = 0.0;
        mat.roughness = 0.92;
        mat.normalScale.set(0.55, 0.55);
        mat.side = THREE.DoubleSide;
        break;
      case 'mineRockWall':
        mat.metalness = 0.18;
        mat.roughness = 0.58; // Damp subterranean mineral sheen
        mat.normalScale.set(1.25, 1.25);
        mat.emissive = new THREE.Color(0x0ea5e9);
        mat.emissiveIntensity = 0.95;
        mat.side = THREE.DoubleSide;
        break;
      case 'crashedCapsuleHull':
        mat.metalness = 0.82;
        mat.roughness = 0.44;
        mat.normalScale.set(0.6, 0.6);
        mat.envMapIntensity = 1.15;
        break;
      case 'heatingElement':
        mat.metalness = 0.25;
        mat.roughness = 0.52;
        mat.normalScale.set(0.5, 0.5);
        mat.emissive = new THREE.Color(0xff4d00);
        mat.emissiveIntensity = 0.05;
        break;
      case 'terrazzoFloor':
        mat.metalness = 0.06;
        mat.roughness = 0.34;
        mat.normalScale.set(0.22, 0.22);
        mat.envMapIntensity = 0.85;
        break;
      case 'labWallPanel':
        mat.metalness = 0.04;
        mat.roughness = 0.62;
        mat.normalScale.set(0.32, 0.32);
        mat.envMapIntensity = 0.7;
        break;
      case 'skylightGlass':
        mat.metalness = 0.0;
        mat.roughness = 0.15;
        mat.emissive = new THREE.Color(0xf8fafc);
        mat.emissiveIntensity = 0.82;
        break;
      case 'oakWoodTrim':
        mat.metalness = 0.02;
        mat.roughness = 0.55;
        mat.normalScale.set(0.45, 0.45);
        break;
      case 'mineralDull':
        mat.metalness = 0.02;
        mat.roughness = 0.94;
        mat.normalScale.set(0.95, 0.95);
        mat.envMapIntensity = 0.35;
        break;
      case 'mineralRough':
        mat.metalness = 0.05;
        mat.roughness = 0.96;
        mat.normalScale.set(1.35, 1.35);
        mat.envMapIntensity = 0.3;
        break;
    }

    mat.needsUpdate = true;
  }

  private getOrGenerateTextureSet(
    preset: MaterialPresetName,
    repeatX: number,
    repeatY: number,
  ): GeneratedTextureSet {
    const size = GRAPHICS_TIER_PRESETS[this.currentTier].proceduralTextureSize;
    const cacheKey = `${preset}_${size}_${repeatX}x${repeatY}`;
    const cached = this.textureCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const generated = this.synthesizeTextures(preset, size, repeatX, repeatY);
    this.textureCache.set(cacheKey, generated);
    return generated;
  }

  private synthesizeTextures(
    preset: MaterialPresetName,
    size: number,
    repeatX: number,
    repeatY: number,
  ): GeneratedTextureSet {
    const albedoCanvas = createCanvas(size);
    const roughCanvas = createCanvas(size);
    const metalCanvas = createCanvas(size);
    const emissiveCanvas = createCanvas(size);
    const alphaCanvas = createCanvas(size);

    const aCtx = albedoCanvas.getContext('2d');
    const rCtx = roughCanvas.getContext('2d');
    const mCtx = metalCanvas.getContext('2d');
    const eCtx = emissiveCanvas.getContext('2d');
    const alCtx = alphaCanvas.getContext('2d');

    const height = new Float32Array(size * size);

    if (!aCtx || !rCtx || !mCtx) {
      const fallback = makeCanvasTexture(albedoCanvas, THREE.SRGBColorSpace, repeatX, repeatY);
      return {
        albedo: fallback,
        normalMap: buildNormalMapFromHeightfield(height, size, 1.0),
        roughnessMap: makeCanvasTexture(roughCanvas, THREE.NoColorSpace, repeatX, repeatY),
      };
    }

    const aImg = aCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);
    const mImg = mCtx.createImageData(size, size);
    const eImg = eCtx ? eCtx.createImageData(size, size) : null;
    const alImg = alCtx ? alCtx.createImageData(size, size) : null;

    let needsMetalMap = false;
    let needsEmissiveMap = false;
    let needsAlphaMap = false;
    let normalStrength = 2.0;

    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const pIdx = y * size + x;
        const idx = pIdx * 4;

        let r = 180;
        let g = 180;
        let b = 180;
        let rough = 128;
        let metal = 0;
        let h = 0.5;
        let er = 0;
        let eg = 0;
        let eb = 0;
        let alpha = 255;

        if (preset === 'brushedSteel') {
          needsMetalMap = true;
          normalStrength = 1.6;
          const streak = fbmTileable(u, v, {
            seed: 11,
            octaves: 3,
            baseFreq: 6,
            streakX: 1,
            streakY: 22,
          });
          const grain = fbmTileable(u, v, { seed: 29, octaves: 2, baseFreq: 16 });
          h = streak * 0.78 + grain * 0.22;
          const lum = 165 + h * 55;
          r = lum * 0.96;
          g = lum * 0.99;
          b = lum * 1.03;
          rough = 55 + (1 - streak) * 85;
          metal = 235;
        } else if (preset === 'anodizedDark') {
          needsMetalMap = true;
          normalStrength = 1.3;
          const micro = fbmTileable(u, v, { seed: 43, octaves: 3, baseFreq: 18 });
          h = micro;
          const base = 36 + micro * 24;
          r = base * 0.9;
          g = base * 1.0;
          b = base * 1.18;
          rough = 95 + micro * 55;
          metal = 205;
        } else if (preset === 'copperCoil') {
          needsMetalMap = true;
          normalStrength = 3.2;
          const wirePhase = (v * 26) % 1;
          const strandHeight = Math.sin(wirePhase * Math.PI);
          const sheen = fbmTileable(u, v, { seed: 57, octaves: 2, baseFreq: 12, streakX: 1, streakY: 8 });
          h = strandHeight * 0.8 + sheen * 0.2;
          r = 185 + h * 65;
          g = 96 + h * 48;
          b = 58 + h * 26;
          rough = 48 + (1 - strandHeight) * 80;
          metal = 242;
        } else if (preset === 'brassCollar') {
          needsMetalMap = true;
          normalStrength = 1.5;
          const brush = fbmTileable(u, v, { seed: 63, octaves: 3, baseFreq: 8, streakX: 14, streakY: 1 });
          h = brush;
          r = 195 + brush * 45;
          g = 158 + brush * 38;
          b = 76 + brush * 22;
          rough = 62 + (1 - brush) * 60;
          metal = 230;
        } else if (preset === 'labBenchEpoxy') {
          needsMetalMap = true;
          normalStrength = 1.1;
          const speckle = fbmTileable(u, v, { seed: 71, octaves: 4, baseFreq: 20 });
          const glint = hash2D(x, y, size, 88) > 0.992 ? 0.35 : 0;
          h = speckle * 0.7 + glint;
          const base = 22 + speckle * 18 + glint * 75;
          r = base * 0.85;
          g = base * 1.0;
          b = base * 1.18;
          rough = 88 + speckle * 62 - glint * 60;
          metal = glint > 0 ? 110 : 18;
        } else if (preset === 'sieveWireMesh') {
          needsMetalMap = true;
          needsAlphaMap = true;
          normalStrength = 3.5;
          const cells = 18;
          const gx = Math.abs(((u * cells) % 1) - 0.5) * 2;
          const gy = Math.abs(((v * cells) % 1) - 0.5) * 2;
          const wireThickness = 0.22;
          const onWireX = gx > 1 - wireThickness;
          const onWireY = gy > 1 - wireThickness;
          const isWire = onWireX || onWireY;
          const weave = onWireX ? Math.cos(v * cells * Math.PI) * 0.25 + 0.75 : Math.sin(u * cells * Math.PI) * 0.25 + 0.75;
          h = isWire ? weave : 0.05;
          alpha = isWire ? 255 : 0;
          r = isWire ? 185 * weave : 30;
          g = isWire ? 192 * weave : 30;
          b = isWire ? 202 * weave : 30;
          rough = isWire ? 78 : 220;
          metal = isWire ? 235 : 0;
        } else if (preset === 'ceramicDish') {
          normalStrength = 0.75;
          const glaze = fbmTileable(u, v, { seed: 93, octaves: 2, baseFreq: 8 });
          h = 0.5 + glaze * 0.15;
          r = 236 + glaze * 16;
          g = 240 + glaze * 13;
          b = 245 + glaze * 10;
          rough = 32 + glaze * 28;
        } else if (preset === 'filterPaper') {
          normalStrength = 1.9;
          const fiber1 = fbmTileable(u, v, { seed: 105, octaves: 4, baseFreq: 24, streakX: 4, streakY: 1 });
          const fiber2 = fbmTileable(u, v, { seed: 117, octaves: 4, baseFreq: 24, streakX: 1, streakY: 4 });
          h = (fiber1 + fiber2) * 0.5;
          const c = 224 + h * 26;
          r = c;
          g = c - 4;
          b = c - 12;
          rough = 215 + h * 35;
        } else if (preset === 'mineRockWall') {
          needsMetalMap = true;
          needsEmissiveMap = true;
          normalStrength = 4.2;
          const strata = fbmTileable(u, v, { seed: 131, octaves: 5, baseFreq: 5, streakX: 1, streakY: 3 });
          const crag = fbmTileable(u, v, { seed: 149, octaves: 4, baseFreq: 14 });
          const veinSignal = Math.abs(fbmTileable(u, v, { seed: 167, octaves: 3, baseFreq: 4 }) - 0.5);
          const isVein = veinSignal < 0.022 && strata > 0.42;
          const wetness = strata > 0.56 ? 0.55 : 1.0;
          h = strata * 0.65 + crag * 0.35;
          r = isVein ? 35 : 32 + h * 46;
          g = isVein ? 215 : 38 + h * 50;
          b = isVein ? 235 : 52 + h * 62;
          rough = isVein ? 45 : (115 + crag * 95) * wetness;
          metal = isVein ? 140 : crag > 0.62 ? 85 : 22;
          if (isVein) {
            er = 20;
            eg = 195;
            eb = 235;
          }
        } else if (preset === 'crashedCapsuleHull') {
          needsMetalMap = true;
          normalStrength = 2.2;
          const plate = fbmTileable(u, v, { seed: 181, octaves: 3, baseFreq: 6 });
          const scorch = fbmTileable(u, v, { seed: 193, octaves: 4, baseFreq: 9 });
          const seam = ((u * 4) % 1) < 0.025 || ((v * 4) % 1) < 0.025 ? 0.25 : 0;
          h = plate * 0.8 - seam;
          const burnMask = scorch > 0.58 ? (scorch - 0.58) * 1.9 : 0;
          const baseLum = (145 + plate * 55) * (1 - Math.min(0.75, burnMask));
          r = baseLum * 1.03;
          g = baseLum * 0.99;
          b = baseLum * 0.94;
          rough = 72 + burnMask * 150 + seam * 120;
          metal = Math.max(40, 225 - burnMask * 165);
        } else if (preset === 'heatingElement') {
          needsEmissiveMap = true;
          normalStrength = 2.4;
          const dx = u - 0.5;
          const dy = v - 0.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const coilRing = Math.sin(dist * 54) * 0.5 + 0.5;
          const grain = fbmTileable(u, v, { seed: 211, octaves: 3, baseFreq: 16 });
          h = coilRing * 0.6 + grain * 0.4;
          r = 45 + h * 30;
          g = 42 + h * 26;
          b = 44 + h * 26;
          rough = 140 + grain * 60;
          const glow = dist < 0.44 ? coilRing * (1 - dist * 1.5) : 0;
          er = clampByte(glow * 255);
          eg = clampByte(glow * 105);
          eb = clampByte(glow * 18);
        } else if (preset === 'terrazzoFloor') {
          normalStrength = 0.8;
          const tileSeam = ((u * 2) % 1) < 0.018 || ((v * 2) % 1) < 0.018;
          const baseNoise = fbmTileable(u, v, { seed: 223, octaves: 3, baseFreq: 10 });
          const fleck = hash2D(x >> 1, y >> 1, size >> 1, 241);
          const isDarkChip = fleck > 0.94;
          const isTealChip = fleck > 0.905 && fleck <= 0.94;
          h = tileSeam ? 0.25 : 0.65 + baseNoise * 0.15;
          if (tileSeam) {
            r = 165;
            g = 175;
            b = 188;
            rough = 145;
          } else if (isDarkChip) {
            r = 128;
            g = 140;
            b = 156;
            rough = 95;
          } else if (isTealChip) {
            r = 162;
            g = 205;
            b = 212;
            rough = 78;
          } else {
            const lum = 216 + baseNoise * 22;
            r = lum * 0.97;
            g = lum * 0.99;
            b = lum * 1.02;
            rough = 72 + baseNoise * 32;
          }
        } else if (preset === 'labWallPanel') {
          normalStrength = 1.0;
          const seam = ((u * 3) % 1) < 0.02 || ((v * 2) % 1) < 0.02;
          const weave = fbmTileable(u, v, { seed: 257, octaves: 3, baseFreq: 14 });
          h = seam ? 0.3 : 0.7 + weave * 0.15;
          const base = seam ? 192 : 228 + weave * 18;
          r = base * 0.97;
          g = base * 0.99;
          b = base * 1.02;
          rough = seam ? 190 : 150 + weave * 35;
        } else if (preset === 'skylightGlass') {
          needsEmissiveMap = true;
          normalStrength = 0.4;
          const mullion = ((u * 2) % 1) < 0.04 || ((v * 2) % 1) < 0.04;
          const sky = fbmTileable(u, v, { seed: 271, octaves: 2, baseFreq: 4 });
          h = mullion ? 0.2 : 0.8;
          r = mullion ? 175 : 238 + sky * 16;
          g = mullion ? 185 : 246 + sky * 8;
          b = mullion ? 198 : 255;
          rough = mullion ? 120 : 28;
          er = mullion ? 0 : 225;
          eg = mullion ? 0 : 240;
          eb = mullion ? 0 : 255;
        } else if (preset === 'oakWoodTrim') {
          normalStrength = 1.4;
          const grain = fbmTileable(u, v, { seed: 283, octaves: 4, baseFreq: 6, streakX: 1, streakY: 16 });
          h = grain;
          r = 168 + grain * 42;
          g = 124 + grain * 34;
          b = 78 + grain * 24;
          rough = 125 + grain * 55;
        } else if (preset === 'mineralDull') {
          normalStrength = 2.6;
          const grit = fbmTileable(u, v, { seed: 307, octaves: 4, baseFreq: 16 });
          h = grit;
          const vBase = 165 + grit * 60;
          r = vBase;
          g = vBase;
          b = vBase;
          rough = 225 + grit * 28;
        } else if (preset === 'mineralRough') {
          normalStrength = 3.8;
          const pores = fbmTileable(u, v, { seed: 331, octaves: 5, baseFreq: 22 });
          const pit = pores < 0.34 ? 0.15 : pores;
          h = pit;
          const vBase = 155 + pit * 75;
          r = vBase;
          g = vBase;
          b = vBase;
          rough = 235;
        }

        height[pIdx] = h;
        aImg.data[idx] = clampByte(r);
        aImg.data[idx + 1] = clampByte(g);
        aImg.data[idx + 2] = clampByte(b);
        aImg.data[idx + 3] = 255;

        rImg.data[idx] = clampByte(rough);
        rImg.data[idx + 1] = clampByte(rough);
        rImg.data[idx + 2] = clampByte(rough);
        rImg.data[idx + 3] = 255;

        mImg.data[idx] = clampByte(metal);
        mImg.data[idx + 1] = clampByte(metal);
        mImg.data[idx + 2] = clampByte(metal);
        mImg.data[idx + 3] = 255;

        if (eImg) {
          eImg.data[idx] = clampByte(er);
          eImg.data[idx + 1] = clampByte(eg);
          eImg.data[idx + 2] = clampByte(eb);
          eImg.data[idx + 3] = 255;
        }
        if (alImg) {
          alImg.data[idx] = clampByte(alpha);
          alImg.data[idx + 1] = clampByte(alpha);
          alImg.data[idx + 2] = clampByte(alpha);
          alImg.data[idx + 3] = 255;
        }
      }
    }

    aCtx.putImageData(aImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
    mCtx.putImageData(mImg, 0, 0);

    const albedo = makeCanvasTexture(albedoCanvas, THREE.SRGBColorSpace, repeatX, repeatY);
    const normalMap = buildNormalMapFromHeightfield(height, size, normalStrength);
    normalMap.repeat.set(repeatX, repeatY);
    const roughnessMap = makeCanvasTexture(roughCanvas, THREE.NoColorSpace, repeatX, repeatY);

    const set: GeneratedTextureSet = {
      albedo,
      normalMap,
      roughnessMap,
    };

    if (needsMetalMap) {
      set.metalnessMap = makeCanvasTexture(metalCanvas, THREE.NoColorSpace, repeatX, repeatY);
    }
    if (needsEmissiveMap && eCtx && eImg) {
      eCtx.putImageData(eImg, 0, 0);
      set.emissiveMap = makeCanvasTexture(emissiveCanvas, THREE.SRGBColorSpace, repeatX, repeatY);
    }
    if (needsAlphaMap && alCtx && alImg) {
      alCtx.putImageData(alImg, 0, 0);
      set.alphaMap = makeCanvasTexture(alphaCanvas, THREE.NoColorSpace, repeatX, repeatY);
    }

    return set;
  }

  private disposeTextureCache(): void {
    for (const set of this.textureCache.values()) {
      set.albedo.dispose();
      set.normalMap.dispose();
      set.roughnessMap.dispose();
      set.metalnessMap?.dispose();
      set.emissiveMap?.dispose();
      set.alphaMap?.dispose();
    }
    this.textureCache.clear();
  }
}
