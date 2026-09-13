import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraConfig, CapturedPhoto, FilmPresetId, PresetCategory } from '../types';
import { FILM_PRESETS, FILM_PRESET_LIST, FILM_CATEGORIES } from '../utils/filmPresets';
import { soundEngine } from '../utils/audio';
import { processAnalogPhoto } from '../utils/imageProcessing';
import { SIMULATED_CAMERA_SCENES } from '../utils/sampleData';

interface ViewfinderScreenProps {
  config: CameraConfig;
  setConfig: React.Dispatch<React.SetStateAction<CameraConfig>>;
  activePreset: FilmPresetId;
  setActivePreset: (preset: FilmPresetId) => void;
  recentPhoto: CapturedPhoto | null;
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onOpenRoll: () => void;
  onOpenPhotoDetail: (photo: CapturedPhoto) => void;
}

export const ViewfinderScreen: React.FC<ViewfinderScreenProps> = ({
  config,
  setConfig,
  activePreset,
  setActivePreset,
  recentPhoto,
  onPhotoCaptured,
  onOpenRoll,
  onOpenPhotoDetail,
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraStreamActive, setCameraStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [simulatedSceneIdx, setSimulatedSceneIdx] = useState<number>(0);
  const [isShutterPressed, setIsShutterPressed] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | PresetCategory>('all');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const simulatedImgRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStreamActive(true);
      setCameraError(null);
    } catch (err: unknown) {
      console.warn('Camera access unavailable or declined, using simulated vintage lens feed:', err);
      setCameraStreamActive(false);
      setCameraError('Camera access in preview mode. Using simulated 35mm optical feed.');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // Flash cycle: AUTO -> ON -> OFF
  const cycleFlash = () => {
    soundEngine.playClickSound();
    setConfig((prev) => {
      const modes: CameraConfig['flashMode'][] = ['AUTO', 'ON', 'OFF'];
      const nextIdx = (modes.indexOf(prev.flashMode) + 1) % modes.length;
      return { ...prev, flashMode: modes[nextIdx] };
    });
  };

  // Toggle Aspect Ratio: 4:3 vs 1:1
  const toggleRatio = () => {
    soundEngine.playClickSound();
    setConfig((prev) => ({
      ...prev,
      aspectRatio: prev.aspectRatio === '4:3' ? '1:1' : '4:3',
    }));
  };

  // Flip Camera
  const flipCamera = () => {
    soundEngine.playClickSound();
    if (cameraStreamActive) {
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    } else {
      // Cycle through simulated vintage scenes!
      setSimulatedSceneIdx((prev) => (prev + 1) % SIMULATED_CAMERA_SCENES.length);
    }
  };

  // Toggle Date Stamp
  const toggleDate = () => {
    soundEngine.playClickSound();
    setConfig((prev) => ({
      ...prev,
      dateStampEnabled: !prev.dateStampEnabled,
    }));
  };

  // Shutter trigger actuation
  const triggerShutter = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setIsShutterPressed(true);

    if (config.hapticEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60);
    }

    // Play mechanical dual-curtain shutter sound
    soundEngine.playShutterSound();

    // Trigger screen flash overlay (FR-CAM-04: 150ms white flash)
    if (config.flashMode === 'ON' || config.flashMode === 'AUTO') {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);
    }

    try {
      const source = cameraStreamActive && videoRef.current ? videoRef.current : simulatedImgRef.current;

      if (!source) {
        throw new Error('No visual source available for capture');
      }

      const today = new Date();
      const currentYearStr = config.vintageYearMode ? "'96" : `'${String(today.getFullYear()).slice(-2)}`;
      const dateFormatted = `${String(today.getDate()).padStart(2, '0')} ${String(today.getMonth() + 1).padStart(
        2,
        '0'
      )} ${currentYearStr}`;

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateFull = `${months[today.getMonth()]} ${today.getDate()}, ${
        config.vintageYearMode ? 1996 : today.getFullYear()
      }`;

      const selectedPreset = FILM_PRESETS[activePreset];
      const randomRotations = [0, 90, 180, 270];
      const randomRot = randomRotations[Math.floor(Math.random() * randomRotations.length)];

      const processed = await processAnalogPhoto({
        source,
        presetId: activePreset,
        aspectRatio: config.aspectRatio,
        dateStampEnabled: config.dateStampEnabled,
        dateStr: dateFormatted,
        grainIntensity: selectedPreset.defaultGrain,
        lightLeakIntensity: selectedPreset.defaultLightLeak,
        lightLeakRotation: randomRot,
      });

      const nextExp = config.expCount < config.maxExp ? config.expCount + 1 : 1;
      const newPhoto: CapturedPhoto = {
        id: `shot-${Date.now()}`,
        rollNumber: `Roll ${config.currentRollId} #${String(nextExp).padStart(2, '0')}`,
        rollId: config.currentRollId,
        frameNumber: nextExp,
        timestamp: Date.now(),
        dateFormatted,
        dateFull,
        dataUrl: processed.dataUrl,
        rawSourceUrl: processed.rawSourceUrl,
        presetId: activePreset,
        presetName: selectedPreset.name,
        iso: selectedPreset.iso,
        shutterSpeed: '1/125S',
        aspectRatio: config.aspectRatio,
        frameType: config.aspectRatio === '1:1' ? 'pola' : '35mm',
        grain: selectedPreset.defaultGrain,
        lightLeak: selectedPreset.defaultLightLeak,
        lightLeakRotation: randomRot,
        halation: selectedPreset.halationIntensity,
        chromaticAberration: selectedPreset.chromaticAberration,
      };

      setConfig((prev) => ({
        ...prev,
        expCount: nextExp,
      }));

      onPhotoCaptured(newPhoto);

      // Transition to detail modal shortly after shutter completes
      setTimeout(() => {
        setIsProcessing(false);
        setIsShutterPressed(false);
        onOpenPhotoDetail(newPhoto);
      }, 350);
    } catch (err) {
      console.error('Shutter capture failed:', err);
      setIsProcessing(false);
      setIsShutterPressed(false);
    }
  };

  const currentPreset = FILM_PRESETS[activePreset] || FILM_PRESETS.classic_90;
  const simulatedScene = SIMULATED_CAMERA_SCENES[simulatedSceneIdx];

  return (
    <div className="flex flex-col w-full max-w-[480px] mx-auto select-none pt-2 pb-24 px-3 sm:px-4">
      {/* Mechanical Screws Accent Top */}
      <div className="flex justify-between items-center py-1 px-1">
        <div className="w-2.5 h-2.5 rounded-full bg-[#353438] screw-head flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-[#0e0e11] rotate-45"></div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0e0e11] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5708] animate-pulse"></span>
          <span className="font-mono text-[9px] text-[#a98a7e] tracking-widest uppercase font-bold">
            OPTICAL SENSOR 35MM F/2.8
          </span>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#353438] screw-head flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-[#0e0e11] -rotate-45"></div>
        </div>
      </div>

      {/* Top Plate Hardware Control Strip */}
      <div className="my-2">
        <div className="bg-[#1b1b1e] rounded-xl p-2 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center justify-between border border-white/5">
          {/* Flash Mode Toggle Button */}
          <button
            id="flashToggleBtn"
            onClick={cycleFlash}
            aria-label="Toggle Flash Mode"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2a2a2d] active:translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.8)] text-[#e4e1e6] transition-all hover:bg-[#353438]"
          >
            <span className="material-symbols-outlined text-[#f66018] text-[18px]">
              {config.flashMode === 'AUTO' ? 'flash_auto' : config.flashMode === 'ON' ? 'flash_on' : 'flash_off'}
            </span>
            <span className="font-mono text-[10px] text-[#ffb59c] tracking-wider uppercase font-bold">
              {config.flashMode}
            </span>
          </button>

          {/* Aspect Ratio Switch (4:3 vs 1:1) */}
          <button
            id="ratioToggleBtn"
            onClick={toggleRatio}
            aria-label="Toggle Aspect Ratio"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2a2a2d] active:translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.8)] text-[#e4e1e6] transition-all hover:bg-[#353438]"
          >
            <span className="material-symbols-outlined text-[#a98a7e] text-[18px]">aspect_ratio</span>
            <span className="font-mono text-[10px] text-[#ffb599] font-bold tracking-widest">
              {config.aspectRatio}
            </span>
          </button>

          {/* Flip Cam Button */}
          <button
            id="flipCamBtn"
            onClick={flipCamera}
            aria-label="Flip Camera Lens"
            title={cameraStreamActive ? 'Switch Camera' : 'Cycle Simulated Lens Scene'}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2a2a2d] active:rotate-180 transition-transform duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.8)] text-[#e2bfb2] hover:bg-[#353438]"
          >
            <span className="material-symbols-outlined text-[18px]">flip_camera_ios</span>
          </button>

          {/* Mini LCD Frame Counter Display */}
          <div className="flex flex-col items-end px-2.5 py-0.5 rounded-lg bg-[#0e0e11] shadow-[inset_0_2px_5px_rgba(0,0,0,0.95)] border border-white/5">
            <span className="font-mono text-[9px] text-[#a98a7e] tracking-tight font-bold">
              ROLL {config.currentRollId}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[9px] text-[#ff5708] font-bold">EXP</span>
              <span
                id="expLcdCounter"
                className="font-mono text-[12px] text-[#f66018] font-bold tracking-widest quartz-date-glow"
              >
                [{' '}
                {String(config.expCount).padStart(2, '0')}/{config.maxExp}{' '}
                ]
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Viewfinder Optical Chamber Container */}
      <div className="flex flex-col items-center w-full">
        <div className="w-full relative rounded-xl p-1.5 bg-[#0e0e11] shadow-[inset_0_3px_10px_rgba(0,0,0,1),0_2px_6px_rgba(255,255,255,0.03)] border border-white/10">
          {/* Lens Chamfer Bezel */}
          <div
            id="viewfinderBezel"
            className={`relative w-full overflow-hidden transition-all duration-300 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)] bg-[#1f1f22] rounded-lg ${
              config.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/3]'
            }`}
          >
            {/* Live Camera Stream Video Feed */}
            {cameraStreamActive ? (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{ filter: currentPreset.cssFilter }}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  facingMode === 'user' ? 'scale-x-[-1]' : 'scale-100'
                }`}
              />
            ) : (
              /* Simulated High-Res Street & Portrait Lens Feed */
              <img
                ref={simulatedImgRef}
                src={simulatedScene.url}
                alt={simulatedScene.title}
                crossOrigin="anonymous"
                style={{ filter: currentPreset.cssFilter }}
                className="w-full h-full object-cover transition-transform duration-500 scale-100"
              />
            )}

            {/* Optical Vignette & Convex Lens Flare Overlays */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0e0e11]/80 via-transparent to-[#0e0e11]/40"></div>
            <div className={`absolute inset-0 pointer-events-none ${
              currentPreset.id === 'toy_camera'
                ? 'shadow-[inset_0_0_80px_rgba(0,0,0,0.95)]'
                : 'shadow-[inset_0_0_50px_rgba(0,0,0,0.85)]'
            }`}></div>

            {/* VHS Scanlines live preview overlay if vhs_1998 */}
            {currentPreset.isVhs && (
              <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.25)_0px,rgba(0,0,0,0.25)_2px,transparent_2px,transparent_4px)]">
                <div className="absolute top-3 left-3 text-[#00ff66] font-mono text-[9px] font-bold drop-shadow-[0_0_4px_#00ff66] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  REC ● PLAY
                </div>
                <div className="absolute top-3 right-3 text-white font-mono text-[9px] font-bold">
                  SP
                </div>
                <div className="absolute bottom-3 left-3 text-[#00ff66] font-mono text-[9px] font-bold drop-shadow-[0_0_4px_#00ff66]">
                  -0:12:44
                </div>
                <div className="absolute bottom-3 right-3 text-white font-mono text-[9px] font-bold">
                  OCT.13 1998
                </div>
              </div>
            )}

            {/* Half Frame diptych center dividing frame line if half_frame */}
            {currentPreset.isHalfFrame && (
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3.5 bg-[#0a0a0c] pointer-events-none flex items-center justify-center border-x border-black/40 z-10">
                <span className="text-[7px] font-mono text-orange-500 font-bold -rotate-90 whitespace-nowrap">
                  PEN F
                </span>
              </div>
            )}

            {/* Rangefinder Frame Crop Reticles (┌ ┐ └ ┘) */}
            <div className="absolute inset-3 pointer-events-none flex flex-col justify-between">
              {/* Top corners */}
              <div className="flex justify-between items-center text-[#ffdbce] opacity-90">
                <svg fill="none" height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 18V2H18" stroke="currentColor" strokeWidth="2"></path>
                </svg>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0e0e11]/75 backdrop-blur-sm border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <span className="font-mono text-[10px] text-[#ffb59c] tracking-wider font-bold">REC</span>
                </div>
                <svg fill="none" height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 18V2H6" stroke="currentColor" strokeWidth="2"></path>
                </svg>
              </div>

              {/* Rangefinder Auto-Focus Center Target Box */}
              <div className="self-center flex items-center justify-center w-16 h-16 pointer-events-none">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 border border-[#ffb599]/70 rounded-sm"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f66018] shadow-[0_0_6px_rgba(246,96,24,0.9)] animate-pulse"></div>
                  <span className="absolute -top-3.5 font-mono text-[9px] text-[#ffb599] tracking-widest font-bold opacity-90">
                    AF-S
                  </span>
                </div>
              </div>

              {/* Bottom corners */}
              <div className="flex justify-between items-end text-[#ffdbce] opacity-90">
                <svg fill="none" height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 6V22H18" stroke="currentColor" strokeWidth="2"></path>
                </svg>

                {/* Vintage Glowing Quartz Date Stamp (hidden if VHS active) */}
                {config.dateStampEnabled && !currentPreset.isVhs && (
                  <div
                    id="dateStampBadge"
                    className="flex flex-col items-end pointer-events-auto bg-[#0e0e11]/85 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5"
                  >
                    <span
                      id="liveDateDisplay"
                      className="font-mono text-[11px] text-[#f66018] tracking-widest font-bold quartz-date-glow"
                    >
                      {new Date().getDate().toString().padStart(2, '0')}{' '}
                      {(new Date().getMonth() + 1).toString().padStart(2, '0')}{' '}
                      {config.vintageYearMode ? "'96" : `'${String(new Date().getFullYear()).slice(-2)}`}
                    </span>
                  </div>
                )}

                <svg fill="none" height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 6V22H6" stroke="currentColor" strokeWidth="2"></path>
                </svg>
              </div>
            </div>

            {/* Shutter Flash Simulation Overlay (FR-CAM-04: 150ms) */}
            <div
              className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${
                isFlashing ? 'opacity-95' : 'opacity-0'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tactile Camera Chassis Body & Grain Strip */}
      <div className="mt-3 bg-[#1f1f22] rounded-xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_16px_rgba(0,0,0,0.7)] flex flex-col gap-2.5 border border-white/5">
        {/* Vintage Film Stock Selector Title and Embossed Plate */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#ff5708] text-[16px]">camera_roll</span>
            <span className="font-mono text-[10px] text-[#ffb59c] tracking-wider uppercase font-bold">
              {currentPreset.categoryLabel} • {currentPreset.cameraModel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#0e0e11] px-2 py-0.5 rounded border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5708]"></span>
            <span className="font-mono text-[10px] text-[#ffb59c] tracking-widest font-bold">
              ISO {currentPreset.iso}
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 px-0.5 scrollbar-none text-[10px] font-mono">
          <button
            onClick={() => {
              soundEngine.playClickSound();
              setCategoryFilter('all');
            }}
            className={`px-2 py-0.5 rounded transition-all whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-[#ff5708]/25 text-[#ffb59c] border border-[#ff5708]/50 font-bold shadow-sm'
                : 'text-[#a98a7e] hover:text-[#e4e1e6] bg-[#2a2a2d]'
            }`}
          >
            SEMUA (10)
          </button>
          {FILM_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundEngine.playClickSound();
                setCategoryFilter(cat.id);
              }}
              className={`px-2 py-0.5 rounded transition-all whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-[#ff5708]/25 text-[#ffb59c] border border-[#ff5708]/50 font-bold shadow-sm'
                  : 'text-[#a98a7e] hover:text-[#e4e1e6] bg-[#2a2a2d]'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Film Type Horizontal Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-1 px-0.5" id="filmCarousel">
          {FILM_PRESET_LIST.filter(
            (p) => categoryFilter === 'all' || p.category === categoryFilter
          ).map((preset) => {
            const isActive = preset.id === activePreset;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  soundEngine.playClickSound();
                  setActivePreset(preset.id);
                }}
                className={`film-tab flex-shrink-0 flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#ff5708] text-[#3e1100] shadow-[0_2px_8px_rgba(255,87,8,0.4)] scale-105 font-bold'
                    : 'bg-[#2a2a2d] text-[#e2bfb2] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-[#353438]'
                }`}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className="material-symbols-outlined text-[15px]">{preset.icon}</span>
                  <span className="font-mono text-[10px] tracking-wider whitespace-nowrap">{preset.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] font-mono opacity-80 whitespace-nowrap">
                  <span>{preset.badge}</span>
                  <span>•</span>
                  <span>ISO {preset.iso}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tactile Lower Primary Control Strip */}
        <div className="flex items-center justify-between pt-1 px-2">
          {/* Last Photo Frame Polaroid Thumbnail (Gallery Trigger) */}
          <div className="flex flex-col items-center gap-1">
            <button
              id="galleryBtn"
              onClick={() => {
                if (recentPhoto) {
                  onOpenPhotoDetail(recentPhoto);
                } else {
                  onOpenRoll();
                }
              }}
              aria-label="Open Roll Gallery"
              className="relative p-1 bg-[#353438] rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_8px_rgba(0,0,0,0.7)] active:scale-95 transition-transform hover:brightness-110"
            >
              <div className="w-12 h-12 rounded overflow-hidden bg-[#0e0e11] flex items-center justify-center border border-white/10">
                {recentPhoto ? (
                  <img
                    src={recentPhoto.dataUrl}
                    alt="Latest shot"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-[#a98a7e] text-[22px]">photo_library</span>
                )}
              </div>
              {recentPhoto && (
                <span className="absolute -top-1 -right-1 bg-[#f66018] text-[#ffdbce] font-mono text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                  {recentPhoto.frameNumber}
                </span>
              )}
            </button>
            <span className="font-mono text-[9px] text-[#a98a7e] uppercase tracking-wider font-bold">ROLL</span>
          </div>

          {/* Main Mechanical Dual-Ring Shutter Button */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-24 h-24 rounded-full bg-[#353438] p-1.5 flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.2)]">
              {/* Satin Silver Outer Collar */}
              <div className="w-full h-full rounded-full bg-[#909099] p-1 flex items-center justify-center shadow-[inset_0_2px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
                {/* Anodized Crimson-Orange Center Trigger Dish */}
                <button
                  id="mainShutterBtn"
                  onClick={triggerShutter}
                  disabled={isProcessing}
                  aria-label="Actuate Shutter"
                  className={`w-full h-full rounded-full bg-gradient-to-b from-[#f66018] to-[#ff5708] flex items-center justify-center transition-all ${
                    isShutterPressed
                      ? 'scale-95 shadow-[0_1px_3px_rgba(246,96,24,0.8),inset_0_3px_6px_rgba(0,0,0,0.8)]'
                      : 'shadow-[0_4px_10px_rgba(246,96,24,0.6),inset_0_2px_2px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.6)] active:scale-95 hover:brightness-105'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#4f1700] text-[20px]">
                      {isProcessing ? 'hourglass_empty' : 'lens'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
            <span className="font-mono text-[10px] text-[#ffb599] font-bold tracking-widest uppercase">
              {isProcessing ? 'DEVELOPING...' : 'TRIGGER'}
            </span>
          </div>

          {/* Date Stamp Hardware Toggle */}
          <div className="flex flex-col items-center gap-1">
            <button
              id="dateToggleBtn"
              onClick={toggleDate}
              aria-label="Toggle Quartz Date Stamp"
              className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_8px_rgba(0,0,0,0.7)] active:scale-95 transition-all ${
                config.dateStampEnabled
                  ? 'bg-[#2a2a2d] text-[#ffb59c]'
                  : 'bg-[#1b1b1e] text-[#a98a7e]/50 opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              <span className="font-mono text-[9px] font-bold tracking-tighter">
                {config.dateStampEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
            <span className="font-mono text-[9px] text-[#a98a7e] uppercase tracking-wider font-bold">DATE</span>
          </div>
        </div>

        {/* Screws and Classic Metal Plate Markings */}
        <div className="flex justify-between items-center px-1 pt-1 border-t border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#353438] screw-head flex items-center justify-center">
            <div className="w-1.5 h-0.5 bg-[#0e0e11]"></div>
          </div>
          <div className="flex items-center gap-2 text-[#a98a7e] font-mono text-[9px] tracking-widest uppercase font-bold">
            <span>MADE IN JAPAN</span>
            <span className="w-1 h-1 rounded-full bg-[#a98a7e]"></span>
            <span>SERIES 1996</span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#353438] screw-head flex items-center justify-center">
            <div className="w-1.5 h-0.5 bg-[#0e0e11]"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
