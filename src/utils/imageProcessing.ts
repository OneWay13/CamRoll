import { FilmPreset, FilmPresetId } from '../types';
import { FILM_PRESETS } from './filmPresets';

export interface ProcessPhotoOptions {
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
  presetId: FilmPresetId;
  aspectRatio: '4:3' | '1:1';
  dateStampEnabled: boolean;
  dateStr?: string;
  grainIntensity?: number; // 0 - 100
  lightLeakIntensity?: number; // 0 - 100
  lightLeakRotation?: number; // 0, 90, 180, 270
  halationIntensity?: number; // 0 - 100
  chromaticAberration?: number; // 0 - 10
}

/**
 * Explicitly clears and frees the backing GPU/raster graphics buffer of a canvas.
 * Setting width and height to 0 signals WebKit, Blink, and Gecko to instantly
 * deallocate native Skia/GPU texture memory, preventing memory leaks during rapid captures.
 */
export function releaseCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  if (!canvas) return;
  try {
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Truncating dimensions to 0 immediately releases GPU texture VRAM
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // Ignore any cleanup context errors
  }
}

/**
 * Creates an offscreen scratch canvas with willReadFrequently configured
 * for high-performance pixel manipulation and fast memory recycling.
 */
export function createBufferCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * 1. Advanced RGB Tone Curve & Faded Blacks (Emulsi Film)
 * Manipulates tone curves per-channel: lifts shadows (faded blacks / D-min base fog),
 * introduces warm/cool midtone shifts, and compresses highlights with soft roll-off.
 */
export function applyFilmToneCurves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: FilmPreset
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const tc = preset.toneCurve;

  // Build precomputed 256-level lookup tables for R, G, B
  const lutR = new Uint8Array(256);
  const lutG = new Uint8Array(256);
  const lutB = new Uint8Array(256);

  const blackLift = tc.blackLift; // Lifted shadow floor for faded blacks
  const highlightCeil = 255 - tc.highlightRollOff; // Soft shoulder compression

  for (let i = 0; i < 256; i++) {
    const norm = i / 255;
    // S-curve contrast adjustment
    const contrastFactor = tc.contrast;
    let curved = norm < 0.5
      ? 0.5 * Math.pow(norm * 2, contrastFactor)
      : 1 - 0.5 * Math.pow((1 - norm) * 2, contrastFactor);

    // Map into [blackLift, highlightCeil] to lift shadows and roll off highlights
    let out = blackLift + curved * (highlightCeil - blackLift);

    // Midtone bell curve weight for warmth/tint adjustments
    const midWeight = Math.sin(norm * Math.PI);
    const shadowWeight = Math.pow(1 - norm, 1.8);

    // Red Channel
    let rOut = out + tc.shadowTint.r * shadowWeight + tc.midtoneWarmth * midWeight * 0.7;
    // Green Channel
    let gOut = out + tc.shadowTint.g * shadowWeight + tc.midtoneWarmth * midWeight * 0.3;
    // Blue Channel
    let bOut = out + tc.shadowTint.b * shadowWeight - tc.midtoneWarmth * midWeight * 0.5;

    // Apply sepia tint if specified
    if (tc.sepia > 0) {
      const sepiaFactor = tc.sepia / 100;
      rOut += sepiaFactor * 18 * midWeight;
      gOut += sepiaFactor * 9 * midWeight;
      bOut -= sepiaFactor * 22 * midWeight;
    }

    lutR[i] = Math.max(0, Math.min(255, Math.round(rOut)));
    lutG[i] = Math.max(0, Math.min(255, Math.round(gOut)));
    lutB[i] = Math.max(0, Math.min(255, Math.round(bOut)));
  }

  // Fast single-pass LUT mapping
  const isMonochrome = preset.id === 'bw_noir' || tc.saturation === 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (isMonochrome) {
      // Convert to luminance before curve
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const mapped = lutR[lum];
      data[i] = mapped;
      data[i + 1] = mapped;
      data[i + 2] = mapped;
    } else {
      // Apply color saturation scaling if needed
      if (tc.saturation !== 1.0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = Math.max(0, Math.min(255, Math.round(lum + (r - lum) * tc.saturation)));
        g = Math.max(0, Math.min(255, Math.round(lum + (g - lum) * tc.saturation)));
        b = Math.max(0, Math.min(255, Math.round(lum + (b - lum) * tc.saturation)));
      }

      data[i] = lutR[r];
      data[i + 1] = lutG[g];
      data[i + 2] = lutB[b];
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * 2. Halation Effect (Highlight Glow)
 * Isolates pixels with luminance > 80% (204/255), applies Gaussian blur,
 * tints with warm red-orange (rgba(255, 60, 20)), and overlays using 'screen' blend mode.
 * Buffer memory is explicitly freed via releaseCanvas in a finally block.
 */
export function applyHalation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number = 65
) {
  if (intensity <= 0) return;

  // Process halation on 0.25x downscaled canvas for speed and natural optical diffusion
  const scale = 0.25;
  const hWidth = Math.floor(width * scale);
  const hHeight = Math.floor(height * scale);

  const halCanvas = createBufferCanvas(hWidth, hHeight);
  const blurCanvas = createBufferCanvas(width, height);

  try {
    const hCtx = halCanvas.getContext('2d');
    if (!hCtx) return;

    // Draw current canvas onto halation canvas
    hCtx.drawImage(ctx.canvas, 0, 0, hWidth, hHeight);
    const imgData = hCtx.getImageData(0, 0, hWidth, hHeight);
    const data = imgData.data;

    const threshold = 204; // 80% of 255
    const strength = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum > threshold) {
        // Ramp factor between 0.0 and 1.0
        const factor = (lum - threshold) / (255 - threshold);
        // Signature red-orange photochemical halation bloom
        data[i] = 255;
        data[i + 1] = Math.floor(60 + 50 * factor);
        data[i + 2] = Math.floor(20 * (1 - factor));
        data[i + 3] = Math.floor(255 * Math.pow(factor, 1.4) * strength * 0.85);
      } else {
        data[i + 3] = 0; // Transparent
      }
    }

    hCtx.putImageData(imgData, 0, 0);

    // Apply optical Gaussian blur diffusion
    const blurPx = Math.max(8, Math.floor(width * 0.016));
    const bCtx = blurCanvas.getContext('2d');
    if (!bCtx) return;

    bCtx.filter = `blur(${blurPx}px)`;
    bCtx.drawImage(halCanvas, 0, 0, width, height);
    bCtx.filter = 'none';

    // Screen composite onto main canvas
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(blurCanvas, 0, 0, width, height);
    ctx.restore();
  } finally {
    // Explicitly release scratch GPU textures immediately
    releaseCanvas(halCanvas);
    releaseCanvas(blurCanvas);
  }
}

/**
 * 3. Chromatic Aberration (Pembiasan Lensa Plastik / Dispersi Optik)
 * Menggeser channel Merah (+3px) dan Biru (-3px) di 20% outer edge foto
 * (khusus preset toy_camera, classic_90, y2k_ccd, vhs_1998).
 */
export function applyChromaticAberration(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shiftAmount: number = 3.5
) {
  if (shiftAmount <= 0) return;

  const originalImg = ctx.getImageData(0, 0, width, height);
  const src = originalImg.data;

  const outputImg = ctx.createImageData(width, height);
  const dst = outputImg.data;
  dst.set(src);

  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.hypot(cx, cy);
  const innerThreshold = 0.70; // Outer ~20-30% edge radius

  const shiftScale = (shiftAmount * (width / 1200));

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dist = Math.sqrt(dx * dx + dy2);
      const normDist = dist / maxRadius;

      if (normDist > innerThreshold) {
        const edgeFactor = (normDist - innerThreshold) / (1.0 - innerThreshold);
        const weight = Math.pow(edgeFactor, 1.4);

        const ux = dx / (dist || 1);
        const uy = dy / (dist || 1);

        // Red outward offset (+shift ~3px)
        const rx = Math.max(0, Math.min(width - 1, Math.round(x - ux * shiftScale * weight)));
        const ry = Math.max(0, Math.min(height - 1, Math.round(y - uy * shiftScale * weight)));
        const rIndex = (ry * width + rx) * 4;

        // Blue inward offset (-shift ~3px)
        const bx = Math.max(0, Math.min(width - 1, Math.round(x + ux * shiftScale * weight)));
        const by = Math.max(0, Math.min(height - 1, Math.round(y + uy * shiftScale * weight)));
        const bIndex = (by * width + bx) * 4;

        const targetIndex = (y * width + x) * 4;
        dst[targetIndex] = src[rIndex]; // Red from outward
        // dst[targetIndex + 1] (Green) remains unaltered at center
        dst[targetIndex + 2] = src[bIndex + 2]; // Blue from inward
      }
    }
  }

  ctx.putImageData(outputImg, 0, 0);
}

/**
 * 4. Realistic Procedural Film Grain
 * Natural micro-clustering silver-halide grain blended with 'overlay' mode.
 * Buffer is immediately cleared to release memory.
 */
export function applyRealisticFilmGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number = 65
) {
  if (intensity <= 0) return;

  const grainScale = 0.5;
  const gWidth = Math.floor(width * grainScale);
  const gHeight = Math.floor(height * grainScale);

  const grainCanvas = createBufferCanvas(gWidth, gHeight);

  try {
    const gCtx = grainCanvas.getContext('2d');
    if (!gCtx) return;

    const imgData = gCtx.createImageData(gWidth, gHeight);
    const data = imgData.data;

    // Grain strength factor mapped to neutral 128 overlay
    const strength = (intensity / 100) * 85;

    for (let i = 0; i < data.length; i += 4) {
      // Normal distribution approximation for natural organic film grain
      const rand = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
      const val = Math.max(0, Math.min(255, Math.floor(128 + rand * strength * 2.5)));

      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = Math.floor(180 + Math.random() * 75);
    }

    gCtx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(grainCanvas, 0, 0, width, height);
    ctx.restore();
  } finally {
    releaseCanvas(grainCanvas);
  }
}

/**
 * 5. Realistic Burned Film Light Leak & Dust
 * Multi-layer simulation of film cassette burn: warm amber flare, crimson edge bleeds,
 * and sprocket gate leak streaks with randomized angles.
 */
export function applyRealisticLightLeak(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number = 50,
  rotation: number = 0
) {
  if (intensity <= 0) return;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  const alpha = (intensity / 100) * 0.65;

  // Layer 1: Crimson & burning amber edge bleed
  const edgeGrad = ctx.createLinearGradient(0, 0, width * 0.55, height * 0.75);
  edgeGrad.addColorStop(0, `rgba(225, 25, 5, ${alpha * 0.9})`);
  edgeGrad.addColorStop(0.18, `rgba(255, 95, 10, ${alpha * 0.8})`);
  edgeGrad.addColorStop(0.42, `rgba(255, 185, 45, ${alpha * 0.4})`);
  edgeGrad.addColorStop(0.7, `rgba(255, 235, 170, ${alpha * 0.15})`);
  edgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, width, height);

  // Layer 2: Organic spherical flare hotspot
  const spotGrad = ctx.createRadialGradient(
    width * 0.18,
    height * 0.22,
    15,
    width * 0.18,
    height * 0.22,
    width * 0.48
  );
  spotGrad.addColorStop(0, `rgba(255, 130, 20, ${alpha * 0.85})`);
  spotGrad.addColorStop(0.45, `rgba(240, 45, 10, ${alpha * 0.45})`);
  spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, width, height);

  // Layer 3: Vertical cassette burn streak
  const streakGrad = ctx.createLinearGradient(0, 0, width * 0.15, 0);
  streakGrad.addColorStop(0, `rgba(255, 160, 30, ${alpha * 0.7})`);
  streakGrad.addColorStop(0.5, `rgba(220, 30, 10, ${alpha * 0.35})`);
  streakGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = streakGrad;
  ctx.fillRect(0, 0, width * 0.25, height);

  ctx.restore();
}

/**
 * 6. Optical Vignette (with optional heavy Holga tunnel curve)
 */
export function applyOpticalVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isToyCamera: boolean = false
) {
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    isToyCamera ? width * 0.22 : width * 0.35,
    width / 2,
    height / 2,
    isToyCamera ? width * 0.72 : width * 0.78
  );

  if (isToyCamera) {
    // Heavy curved Holga 120 plastic lens barrel vignette
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.45, 'rgba(0,0,0,0.18)');
    vignette.addColorStop(0.75, 'rgba(0,0,0,0.58)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.85)');
  } else {
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.65, 'rgba(0,0,0,0.12)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.48)');
  }

  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * 7. VHS Scanlines & OSD (On-Screen Display)
 * Menggambar garis horizontal tipis transparan (scanlines) dan menyematkan teks LED
 * timestamp "REC 🟢 PLAY -0:12:44 OCT.13 1998" (khusus vhs_1998).
 */
export function applyVhsEffects(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();

  // 1. Horizontal CRT Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1.6);
  }

  // 2. Subtle VHS tape tracking noise band
  const noiseBandY = Math.floor(height * 0.82);
  const noiseBandH = Math.floor(height * 0.04);
  const noiseGrad = ctx.createLinearGradient(0, noiseBandY, 0, noiseBandY + noiseBandH);
  noiseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  noiseGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.14)');
  noiseGrad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = noiseGrad;
  ctx.fillRect(0, noiseBandY, width, noiseBandH);

  // 3. Phosphor Green & White OSD (On Screen Display) HUD
  const fontSize = Math.floor(height * 0.038);
  ctx.font = `bold ${fontSize}px 'Space Mono', monospace`;
  ctx.shadowColor = '#00ff66';
  ctx.shadowBlur = Math.floor(fontSize * 0.4);

  const padX = Math.floor(width * 0.05);
  const topY = Math.floor(height * 0.08);
  const botY = Math.floor(height * 0.93);

  // Top Left: REC 🟢 PLAY
  ctx.fillStyle = '#ff2222';
  ctx.beginPath();
  ctx.arc(padX + fontSize * 0.35, topY - fontSize * 0.35, fontSize * 0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText('REC', padX + fontSize * 0.9, topY);

  // Green PLAY text
  ctx.fillStyle = '#00ff66';
  ctx.fillText('▶ PLAY', padX + fontSize * 3.8, topY);

  // Top Right: SP (Standard Play)
  ctx.fillStyle = '#ffffff';
  const spText = 'SP';
  const spWidth = ctx.measureText(spText).width;
  ctx.fillText(spText, width - padX - spWidth, topY);

  // Bottom Left: Timecode -0:12:44
  ctx.fillStyle = '#00ff66';
  ctx.fillText('-0:12:44', padX, botY);

  // Bottom Right: OCT.13 1998
  const dateText = 'OCT.13 1998';
  const dateWidth = ctx.measureText(dateText).width;
  ctx.fillText(dateText, width - padX - dateWidth, botY);

  ctx.restore();
}

/**
 * 8. Half Frame Diptych Mode (Olympus Pen F)
 * Merender foto 2 kali berdampingan (kiri & kanan) dipisahkan oleh garis hitam klise film 35mm
 * dan nomor frame film vintage (misal: "12A" dan "13").
 */
export function renderHalfFrameDiptych(
  targetCtx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
) {
  // Divider width: ~2.5% of total width
  const dividerW = Math.max(16, Math.floor(targetWidth * 0.024));
  const frameW = Math.floor((targetWidth - dividerW) / 2);
  const frameH = targetHeight;

  // Source aspect center crop
  const sW = sourceCanvas.width;
  const sH = sourceCanvas.height;

  // Vertical 3:4 crop from source for each half frame
  const targetHalfRatio = frameW / frameH;
  let cropW = sW;
  let cropH = sH;
  let cropX = 0;
  let cropY = 0;

  if (sW / sH > targetHalfRatio) {
    cropW = sH * targetHalfRatio;
    cropX = (sW - cropW) / 2;
  } else {
    cropH = sW / targetHalfRatio;
    cropY = (sH - cropH) / 2;
  }

  // 1. Fill entire canvas with 35mm film black frame
  targetCtx.fillStyle = '#08080a';
  targetCtx.fillRect(0, 0, targetWidth, targetHeight);

  // 2. Draw Left Half Frame
  targetCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    frameW,
    frameH
  );

  // 3. Draw Right Half Frame (slightly shifted or identical for classic diptych)
  targetCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropW,
    cropH,
    frameW + dividerW,
    0,
    frameW,
    frameH
  );

  // 4. Draw Center 35mm Film Gutter Divider
  targetCtx.fillStyle = '#0a0a0c';
  targetCtx.fillRect(frameW, 0, dividerW, targetHeight);

  // Draw authentic orange/amber frame indicator on film divider gutter
  targetCtx.save();
  targetCtx.font = `bold ${Math.max(9, Math.floor(dividerW * 0.65))}px 'Space Mono', monospace`;
  targetCtx.fillStyle = '#ff6610';
  targetCtx.translate(frameW + dividerW / 2, targetHeight / 2);
  targetCtx.rotate(-Math.PI / 2);
  targetCtx.textAlign = 'center';
  targetCtx.fillText('PEN F • 24A / 25', 0, Math.floor(dividerW * 0.2));
  targetCtx.restore();
}

/**
 * 9. Dynamic Glowing Quartz Date Stamp (FR-ENG-05)
 */
export function renderQuartzDateStamp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dateStr: string
) {
  const fontSize = Math.floor(height * 0.038);
  ctx.font = `bold ${fontSize}px 'Space Mono', 'Courier New', monospace`;

  ctx.fillStyle = '#FF5500';
  ctx.shadowColor = 'rgba(255, 85, 0, 0.85)';
  ctx.shadowBlur = Math.floor(fontSize * 0.35);

  const paddingX = Math.floor(width * 0.05);
  const paddingY = Math.floor(height * 0.06);
  const textWidth = ctx.measureText(dateStr).width;

  // Translucent black pill backing for high contrast readability
  ctx.save();
  ctx.fillStyle = 'rgba(14, 14, 17, 0.75)';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  const pillPadding = fontSize * 0.3;
  ctx.fillRect(
    width - textWidth - paddingX - pillPadding,
    height - paddingY - fontSize * 0.85,
    textWidth + pillPadding * 2,
    fontSize * 1.15
  );
  ctx.restore();

  // Draw glowing amber date
  ctx.fillText(dateStr, width - textWidth - paddingX, height - paddingY);
  ctx.fillText(dateStr, width - textWidth - paddingX, height - paddingY);
}

/**
 * Full Pipeline: processAnalogPhoto
 * Executes complete photographic pipeline:
 * 1. Crop & Resolution setup (with half frame & medium format support)
 * 2. Base Color Pass & CSS Filter
 * 3. Advanced RGB Tone Curve & Faded Blacks
 * 4. Chromatic Aberration
 * 5. Halation Effect (Highlight Glow)
 * 6. Realistic Film Grain (Overlay mode)
 * 7. Realistic Burned Light Leak
 * 8. Optical Vignette (Heavy Holga curve for toy_camera)
 * 9. Special Presets: VHS Scanlines & OSD / Glowing Quartz Date Stamp
 * 10. High-res JPG export (0.92)
 */
export async function processAnalogPhoto(options: ProcessPhotoOptions): Promise<{
  dataUrl: string;
  rawSourceUrl: string;
}> {
  const {
    source,
    presetId,
    aspectRatio,
    dateStampEnabled,
    grainIntensity,
    lightLeakIntensity,
    lightLeakRotation = 0,
    halationIntensity,
    chromaticAberration,
  } = options;

  let sourceWidth = 1280;
  let sourceHeight = 960;

  if (source instanceof HTMLVideoElement) {
    sourceWidth = source.videoWidth || 1280;
    sourceHeight = source.videoHeight || 960;
  } else if (source instanceof HTMLImageElement) {
    sourceWidth = source.naturalWidth || 1280;
    sourceHeight = source.naturalHeight || 960;
  } else if (source instanceof HTMLCanvasElement) {
    sourceWidth = source.width;
    sourceHeight = source.height;
  }

  const preset = FILM_PRESETS[presetId] || FILM_PRESETS.classic_90;

  // Medium Format is natively 1:1, or follow aspectRatio
  const effectiveRatio = preset.isMediumFormat ? '1:1' : aspectRatio;

  // Calculate target crop dimensions
  let targetWidth = sourceWidth;
  let targetHeight = sourceHeight;
  let cropX = 0;
  let cropY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (effectiveRatio === '1:1') {
    const squareSize = Math.min(sourceWidth, sourceHeight);
    cropX = (sourceWidth - squareSize) / 2;
    cropY = (sourceHeight - squareSize) / 2;
    cropWidth = squareSize;
    cropHeight = squareSize;
    targetWidth = 1200;
    targetHeight = 1200;
  } else {
    // 4:3 standard film ratio
    const currentRatio = sourceWidth / sourceHeight;
    const targetRatio = 4 / 3;

    if (currentRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      cropHeight = sourceHeight;
      cropX = (sourceWidth - cropWidth) / 2;
      cropY = 0;
    } else {
      cropWidth = sourceWidth;
      cropHeight = sourceWidth / targetRatio;
      cropX = 0;
      cropY = (sourceHeight - cropHeight) / 2;
    }

    targetWidth = 1440;
    targetHeight = 1080;
  }

  // 1. Raw Source Canvas (for re-tuning in Photo Detail)
  let rawCanvas: HTMLCanvasElement | null = createBufferCanvas(targetWidth, targetHeight);
  let canvas: HTMLCanvasElement | null = createBufferCanvas(targetWidth, targetHeight);

  try {
    const rawCtx = rawCanvas.getContext('2d');
    if (!rawCtx) throw new Error('Could not create 2D context');

    rawCtx.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
    const rawSourceUrl = rawCanvas.toDataURL('image/jpeg', 0.95);

    // 2. Offscreen Canvas for Filter Pipeline
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not create 2D context');

    // Step 1: Base Color Pass / Half Frame Diptych handling
    ctx.save();
    ctx.filter = preset.cssFilter;

    if (preset.isHalfFrame) {
      renderHalfFrameDiptych(ctx, rawCanvas, targetWidth, targetHeight);
    } else {
      ctx.drawImage(rawCanvas, 0, 0, targetWidth, targetHeight);
    }

    ctx.filter = 'none';
    ctx.restore();

    // Release rawCanvas immediately once it has been transferred to canvas
    releaseCanvas(rawCanvas);
    rawCanvas = null;

    // Step 2: Advanced RGB Tone Curve & Faded Blacks (Polaroid, 70s, Toy Camera, etc.)
    applyFilmToneCurves(ctx, targetWidth, targetHeight, preset);

    // Step 3: Chromatic Aberration (Toy Camera, Classic 90, VHS, etc.)
    const chromAmount = chromaticAberration ?? preset.chromaticAberration;
    if (chromAmount > 0) {
      applyChromaticAberration(ctx, targetWidth, targetHeight, chromAmount);
    }

    // Step 4: Halation Effect (Highlight Glow on luminance > 80%)
    const halIntensity = halationIntensity ?? preset.halationIntensity;
    if (halIntensity > 0) {
      applyHalation(ctx, targetWidth, targetHeight, halIntensity);
    }

    // Step 5: Realistic Procedural Film Grain (Overlay blend)
    const grainVal = grainIntensity ?? preset.defaultGrain;
    if (grainVal > 0) {
      applyRealisticFilmGrain(ctx, targetWidth, targetHeight, grainVal);
    }

    // Step 6: Realistic Burned Film Light Leak
    const leakVal = lightLeakIntensity ?? preset.defaultLightLeak;
    if (leakVal > 0) {
      applyRealisticLightLeak(ctx, targetWidth, targetHeight, leakVal, lightLeakRotation);
    }

    // Step 7: Optical Vignette (Holga tunnel curve for toy camera)
    applyOpticalVignette(ctx, targetWidth, targetHeight, preset.id === 'toy_camera');

    // Step 8: Preset-Specific Overlays (VHS Scanlines & OSD vs Glowing Quartz Date Stamp)
    if (preset.isVhs) {
      applyVhsEffects(ctx, targetWidth, targetHeight);
    } else if (dateStampEnabled) {
      const today = new Date();
      const dateStr =
        options.dateStr ||
        `${String(today.getDate()).padStart(2, '0')} ${String(today.getMonth() + 1).padStart(2, '0')} '96`;
      renderQuartzDateStamp(ctx, targetWidth, targetHeight, dateStr);
    }

    // Step 9: Export high-res JPG (0.92 quality)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    return {
      dataUrl,
      rawSourceUrl,
    };
  } finally {
    // Explicitly release all remaining canvas backing buffers
    if (rawCanvas) {
      releaseCanvas(rawCanvas);
      rawCanvas = null;
    }
    if (canvas) {
      releaseCanvas(canvas);
      canvas = null;
    }
  }
}

/**
 * Generates framed polaroid or 35mm negative output ready for saving or sharing.
 * Frees canvas memory and drops image object references immediately.
 */
export async function generateFramedPhoto(
  photoUrl: string,
  type: 'pola' | '35mm',
  meta: {
    title: string;
    date: string;
    roll: string;
    iso?: number;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    let img: HTMLImageElement | null = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let canvas: HTMLCanvasElement | null = document.createElement('canvas');
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No 2D context');

        if (type === 'pola') {
          // Classic Polaroid border
          const borderWidth = Math.floor(img!.width * 0.06);
          const bottomBorder = Math.floor(img!.width * 0.22);
          canvas.width = img!.width + borderWidth * 2;
          canvas.height = img!.height + borderWidth + bottomBorder;

          // Vintage off-white polaroid card
          ctx.fillStyle = '#f5f4f0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Subtle paper card texture / edge shadow
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          ctx.fillRect(0, 0, canvas.width, borderWidth * 0.2);

          // Draw photo
          ctx.drawImage(img!, borderWidth, borderWidth);

          // Bottom text: Handwritten / typewriter style metadata
          const fontSize = Math.floor(canvas.width * 0.032);
          ctx.font = `600 ${fontSize}px 'Space Grotesk', sans-serif`;
          ctx.fillStyle = '#3f3f46';
          ctx.fillText(meta.title, borderWidth * 1.2, img!.height + borderWidth + fontSize * 1.8);

          ctx.font = `400 ${Math.floor(fontSize * 0.8)}px 'Space Mono', monospace`;
          ctx.fillStyle = '#71717a';
          ctx.fillText(`${meta.date} • ${meta.roll}`, borderWidth * 1.2, img!.height + borderWidth + fontSize * 3.2);

          // Right side stamp
          const stampText = 'POLAROID PX-680';
          const stampWidth = ctx.measureText(stampText).width;
          ctx.fillText(stampText, canvas.width - borderWidth * 1.2 - stampWidth, img!.height + borderWidth + fontSize * 2.2);

          const result = canvas.toDataURL('image/jpeg', 0.94);
          resolve(result);
        } else {
          // 35mm film negative strip border
          const sprockMargin = Math.floor(img!.width * 0.08);
          canvas.width = img!.width;
          canvas.height = img!.height + sprockMargin * 2;

          // Black film base
          ctx.fillStyle = '#0d0d10';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Sprocket holes
          const holeWidth = Math.floor(sprockMargin * 0.35);
          const holeHeight = Math.floor(sprockMargin * 0.55);
          const holeSpacing = Math.floor(sprockMargin * 0.85);

          ctx.fillStyle = '#1e1e24';
          for (let x = holeSpacing / 2; x < canvas.width; x += holeSpacing) {
            // Top sprockets
            ctx.beginPath();
            ctx.roundRect(x, sprockMargin * 0.2, holeWidth, holeHeight, 4);
            ctx.fill();

            // Bottom sprockets
            ctx.beginPath();
            ctx.roundRect(x, canvas.height - sprockMargin * 0.75, holeWidth, holeHeight, 4);
            ctx.fill();
          }

          // Draw photo centered
          ctx.drawImage(img!, 0, sprockMargin);

          // Orange film edge markings
          ctx.font = `bold ${Math.floor(sprockMargin * 0.28)}px 'Space Mono', monospace`;
          ctx.fillStyle = '#f66018';
          ctx.fillText(`KODAK 400 • ${meta.roll}`, sprockMargin * 0.5, sprockMargin * 0.75);
          ctx.fillText('SAFETY FILM 5063', canvas.width * 0.5, sprockMargin * 0.75);
          ctx.fillText('▶ 24A', canvas.width - sprockMargin * 2.5, canvas.height - sprockMargin * 0.3);

          const result = canvas.toDataURL('image/jpeg', 0.94);
          resolve(result);
        }
      } catch (err) {
        reject(err);
      } finally {
        if (canvas) {
          releaseCanvas(canvas);
          canvas = null;
        }
        if (img) {
          img.onload = null;
          img.onerror = null;
          img.src = '';
          img = null;
        }
      }
    };
    img.onerror = () => {
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        img = null;
      }
      reject('Failed to load image for framing');
    };
    img.src = photoUrl;
  });
}

/**
 * Sequential processing queue to throttle rapid capture bursts,
 * preventing concurrent canvas allocations from spiking memory.
 */
class CanvasProcessingQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } finally {
        this.isProcessing = false;
        // Yield to event loop to allow GC cycle
        setTimeout(() => this.processNext(), 10);
      }
    } else {
      this.isProcessing = false;
    }
  }
}

export const canvasQueue = new CanvasProcessingQueue();
