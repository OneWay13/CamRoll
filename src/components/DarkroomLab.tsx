import React, { useState } from 'react';
import { CameraConfig, CapturedPhoto, FilmPresetId, PresetCategory } from '../types';
import { FILM_PRESETS, FILM_PRESET_LIST, FILM_CATEGORIES } from '../utils/filmPresets';
import { soundEngine } from '../utils/audio';
import { processAnalogPhoto } from '../utils/imageProcessing';
import { SIMULATED_CAMERA_SCENES } from '../utils/sampleData';

interface DarkroomLabProps {
  config: CameraConfig;
  setConfig: React.Dispatch<React.SetStateAction<CameraConfig>>;
  activePreset: FilmPresetId;
  setActivePreset: (preset: FilmPresetId) => void;
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onOpenPhotoDetail: (photo: CapturedPhoto) => void;
}

export const DarkroomLab: React.FC<DarkroomLabProps> = ({
  config,
  setConfig,
  activePreset,
  setActivePreset,
  onPhotoCaptured,
  onOpenPhotoDetail,
}) => {
  const [selectedLabPreset, setSelectedLabPreset] = useState<FilmPresetId>(activePreset);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | PresetCategory>('all');
  const [sampleImgIdx, setSampleImgIdx] = useState<number>(0);
  const [customImgUrl, setCustomImgUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const currentSample = customImgUrl || SIMULATED_CAMERA_SCENES[sampleImgIdx].url;
  const currentPreset = FILM_PRESETS[selectedLabPreset] || FILM_PRESETS.classic_90;

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEngine.playClickSound();
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomImgUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Develop image using selected preset into the film roll
  const handleDevelopToRoll = async () => {
    soundEngine.playShutterSound();
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentSample;
      await new Promise((res) => {
        img.onload = res;
      });

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

      const processed = await processAnalogPhoto({
        source: img,
        presetId: selectedLabPreset,
        aspectRatio: currentPreset.isMediumFormat ? '1:1' : config.aspectRatio,
        dateStampEnabled: config.dateStampEnabled,
        dateStr: dateFormatted,
        grainIntensity: currentPreset.defaultGrain,
        lightLeakIntensity: currentPreset.defaultLightLeak,
        lightLeakRotation: 90,
      });

      // Clear image reference
      img.onload = null;
      img.src = '';

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
        presetId: selectedLabPreset,
        presetName: currentPreset.name,
        iso: currentPreset.iso,
        shutterSpeed: '1/125S',
        aspectRatio: currentPreset.isMediumFormat ? '1:1' : config.aspectRatio,
        frameType: currentPreset.isMediumFormat ? 'pola' : '35mm',
        grain: currentPreset.defaultGrain,
        lightLeak: currentPreset.defaultLightLeak,
        lightLeakRotation: 90,
        halation: currentPreset.halationIntensity,
        chromaticAberration: currentPreset.chromaticAberration,
      };

      setConfig((prev) => ({
        ...prev,
        expCount: nextExp,
      }));

      onPhotoCaptured(newPhoto);

      setTimeout(() => {
        setIsProcessing(false);
        onOpenPhotoDetail(newPhoto);
      }, 400);
    } catch (err) {
      console.error('Failed to develop in lab:', err);
      setIsProcessing(false);
    }
  };

  const filteredPresets = FILM_PRESET_LIST.filter(
    (p) => activeCategoryTab === 'all' || p.category === activeCategoryTab
  );

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-3 pb-24 flex flex-col gap-4 select-none">
      {/* Lab Header */}
      <div className="bg-[#1b1b1e] rounded-xl p-4 border border-white/5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#ff5708]/15 border border-[#ff5708]/30 flex items-center justify-center text-[#ff5708]">
            <span className="material-symbols-outlined text-[20px]">filter_vintage</span>
          </div>
          <div>
            <h2 className="font-mono text-[14px] font-bold text-[#e4e1e6] uppercase">EMULSION LAB (10 PRESET)</h2>
            <p className="font-mono text-[10px] text-[#a98a7e]">
              PROSES FILTER KIMIAWI, RETRO CCD & VHS 1998
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Emulsion Live Comparator */}
      <div className="bg-[#1f1f22] rounded-xl p-3 border border-white/5 shadow-lg flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff5708]"></span>
            <span className="font-mono text-[11px] text-[#ffb59c] font-bold uppercase tracking-wider">
              {currentPreset.name} • {currentPreset.cameraModel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEngine.playClickSound();
                setCustomImgUrl(null);
                setSampleImgIdx((prev) => (prev + 1) % SIMULATED_CAMERA_SCENES.length);
              }}
              className="font-mono text-[10px] text-[#a98a7e] hover:text-[#e4e1e6] border border-white/10 px-2 py-0.5 rounded transition-colors"
            >
              GANTI SAMPEL
            </button>

            <label className="cursor-pointer font-mono text-[10px] text-[#ff5708] border border-[#ff5708]/40 px-2 py-0.5 rounded hover:bg-[#ff5708]/10 transition-colors">
              UPLOAD
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Live Filter Comparison Box */}
        <div className="relative w-full aspect-[4/3] bg-[#0e0e11] rounded-lg overflow-hidden border border-white/10 shadow-inner">
          <img
            src={currentSample}
            alt="Emulsion simulation"
            style={{ filter: currentPreset.cssFilter }}
            className="w-full h-full object-cover transition-all duration-300"
          />

          {/* Vignette Overlay (deeper for toy camera) */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              currentPreset.id === 'toy_camera'
                ? 'shadow-[inset_0_0_80px_rgba(0,0,0,0.95)]'
                : 'shadow-[inset_0_0_40px_rgba(0,0,0,0.85)]'
            }`}
          ></div>

          {/* Special live overlay: VHS 1998 */}
          {currentPreset.isVhs && (
            <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.25)_0px,rgba(0,0,0,0.25)_2px,transparent_2px,transparent_4px)] flex flex-col justify-between p-3">
              <div className="flex justify-between items-center text-emerald-400 font-mono text-[9px] font-bold drop-shadow-[0_0_4px_#00ff66]">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  REC ● PLAY
                </span>
                <span className="text-white">SP</span>
              </div>
              <div className="flex justify-between items-center font-mono text-[9px] font-bold">
                <span className="text-emerald-400 drop-shadow-[0_0_4px_#00ff66]">-0:12:44</span>
                <span className="text-white">OCT.13 1998</span>
              </div>
            </div>
          )}

          {/* Special live overlay: Half Frame diptych line */}
          {currentPreset.isHalfFrame && (
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 bg-[#0a0a0c] pointer-events-none flex items-center justify-center border-x border-black/50">
              <span className="text-[6px] font-mono text-orange-500 font-bold -rotate-90 whitespace-nowrap">
                PEN F
              </span>
            </div>
          )}

          {/* Glowing quartz stamp demo (if not VHS) */}
          {!currentPreset.isVhs && (
            <div className="absolute bottom-2 right-2 bg-[#0e0e11]/85 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5">
              <span className="font-mono text-[11px] text-[#ff5500] font-bold quartz-date-glow">
                13 09 '96
              </span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-[#0e0e11]/85 text-[#ffb599] font-bold border border-white/10">
              {currentPreset.badge}
            </span>
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-[#0e0e11]/85 text-[#ff5708] font-bold border border-white/10">
              ISO {currentPreset.iso}
            </span>
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-[#0e0e11]/85 text-[#a98a7e] font-bold border border-white/10 uppercase">
              {currentPreset.categoryLabel}
            </span>
          </div>
        </div>

        {/* Emulsion Chemistry Description */}
        <p className="text-[12px] text-[#e4e1e6]/80 px-1 leading-relaxed">
          {currentPreset.description}
        </p>

        {/* Develop Button */}
        <button
          onClick={handleDevelopToRoll}
          disabled={isProcessing}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f66018] to-[#ff5708] text-[#511500] font-mono text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          {isProcessing ? 'SEDANG MEMPROSES EMULSI...' : 'CETAK KE FILM ROLL (S-36)'}
        </button>
      </div>

      {/* 10 Presets Catalog with Category Filter Tabs */}
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center px-1">
          <span className="font-mono text-[11px] text-[#a98a7e] uppercase font-bold tracking-wider">
            KATALOG 10 PRESET ANALOG & RETRO
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => {
              soundEngine.playClickSound();
              setActiveCategoryTab('all');
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all ${
              activeCategoryTab === 'all'
                ? 'bg-[#ff5708] text-[#3e1100] font-bold shadow-md'
                : 'bg-[#1f1f22] text-[#a98a7e] hover:text-[#e4e1e6] border border-white/5'
            }`}
          >
            SEMUA (10)
          </button>
          {FILM_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundEngine.playClickSound();
                setActiveCategoryTab(cat.id);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all ${
                activeCategoryTab === cat.id
                  ? 'bg-[#ff5708] text-[#3e1100] font-bold shadow-md'
                  : 'bg-[#1f1f22] text-[#a98a7e] hover:text-[#e4e1e6] border border-white/5'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Grid of Preset Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {filteredPresets.map((preset) => {
            const isSelected = selectedLabPreset === preset.id;
            const isCameraActive = activePreset === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => {
                  soundEngine.playClickSound();
                  setSelectedLabPreset(preset.id);
                  setActivePreset(preset.id);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-[#1f1f22] border-[#ff5708] shadow-[0_0_14px_rgba(255,87,8,0.3)]'
                    : 'bg-[#1b1b1e] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[#ff5708] text-[20px]">
                    {preset.icon}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-[#0e0e11] text-[#a98a7e] font-bold">
                      {preset.yearVibe}
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#0e0e11] text-[#ffb59c] font-bold">
                      ISO {preset.iso}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-[12px] font-bold text-[#e4e1e6] truncate">
                      {preset.name}
                    </h3>
                  </div>
                  <p className="font-mono text-[9px] text-[#ffb59c] font-medium truncate">
                    {preset.cameraModel}
                  </p>
                  <span className="font-mono text-[8px] text-[#a98a7e] uppercase tracking-wider">
                    {preset.badge} • {preset.categoryLabel}
                  </span>
                </div>

                {isCameraActive && (
                  <div className="pt-1 flex items-center gap-1 text-[#ff5708] font-mono text-[8px] font-bold border-t border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff5708] animate-ping"></span>
                    AKTIF DI KAMERA
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
