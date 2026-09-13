/**
 * Types and interfaces for AnalogWeb / RetroCam Web application
 * Matching PRD.md functional specifications & OldRoll/Fomz analog filter engine
 */

export type PresetCategory = '35mm' | 'digital_instant' | 'artistic';

export type FilmPresetId =
  | 'classic_90'
  | 'premium_35mm'
  | 'rangefinder_70s'
  | 'half_frame'
  | 'y2k_ccd'
  | 'faded_polaroid'
  | 'vhs_1998'
  | 'bw_noir'
  | 'medium_format'
  | 'toy_camera';

export interface FilmToneCurveConfig {
  blackLift: number; // 0 - 50 (lifted shadow floor for faded blacks)
  shadowTint: { r: number; g: number; b: number }; // shadow color cast
  midtoneWarmth: number; // -50 to +50 (warm/cool midtone shift)
  highlightRollOff: number; // 0 - 30 (soft highlight compression)
  contrast: number; // 0.8 - 1.5
  saturation: number; // 0.0 - 2.0
  sepia: number; // 0 - 100
}

export interface FilmPreset {
  id: FilmPresetId;
  name: string;
  badge: string;
  category: PresetCategory;
  categoryLabel: string;
  cameraModel: string;
  iso: number;
  cssFilter: string;
  description: string;
  icon: string;
  defaultGrain: number; // 0 - 100
  defaultLightLeak: number; // 0 - 100
  yearVibe: string;
  colorHex: string;
  // Advanced OldRoll / Fomz optical emulation attributes
  halationIntensity: number; // 0 - 100 (red-orange glow on luminance > 80%)
  chromaticAberration: number; // 0 - 10 (lens edge R/B channel shift)
  toneCurve: FilmToneCurveConfig;
  isHalfFrame?: boolean;
  isVhs?: boolean;
  isMediumFormat?: boolean;
}

export interface CapturedPhoto {
  id: string;
  rollNumber: string; // e.g. "Roll S-36 #04"
  rollId: string; // "S-36"
  frameNumber: number; // e.g. 24
  timestamp: number;
  dateFormatted: string; // e.g. "13 09 '96"
  dateFull: string; // e.g. "Sep 13, 1996"
  dataUrl: string; // final processed image
  rawSourceUrl?: string; // unedited capture for adjusting sliders
  presetId: FilmPresetId;
  presetName: string;
  iso: number;
  shutterSpeed: string; // e.g. "1/125S"
  aspectRatio: '4:3' | '1:1';
  frameType: 'pola' | '35mm';
  grain: number; // 0 - 100
  lightLeak: number; // 0 - 100
  lightLeakRotation: number; // 0, 90, 180, 270
  halation?: number; // 0 - 100
  chromaticAberration?: number; // 0 - 10
}

export type FlashMode = 'AUTO' | 'ON' | 'OFF';
export type AspectRatio = '4:3' | '1:1';
export type ActiveTab = 'cam' | 'roll' | 'lab' | 'setup';

export interface CameraConfig {
  flashMode: FlashMode;
  aspectRatio: AspectRatio;
  dateStampEnabled: boolean;
  vintageYearMode: boolean; // if true, uses 1996 date, else current year
  soundEnabled: boolean;
  hapticEnabled: boolean;
  currentRollId: string;
  expCount: number;
  maxExp: number;
}
