import React, { useState, useEffect } from 'react';
import { CapturedPhoto } from '../types';
import { soundEngine } from '../utils/audio';
import { processAnalogPhoto } from '../utils/imageProcessing';

interface PhotoDetailModalProps {
  photo: CapturedPhoto;
  onClose: () => void;
  onRetake: () => void;
  onUpdatePhoto: (updated: CapturedPhoto) => void;
}

export const PhotoDetailModal: React.FC<PhotoDetailModalProps> = ({
  photo,
  onClose,
  onRetake,
  onUpdatePhoto,
}) => {
  const [frameType, setFrameType] = useState<'pola' | '35mm'>(photo.frameType || 'pola');
  const [grain, setGrain] = useState<number>(photo.grain ?? 75);
  const [lightLeak, setLightLeak] = useState<number>(photo.lightLeak ?? 65);
  const [halation, setHalation] = useState<number>(photo.halation ?? 65);
  const [chromatic, setChromatic] = useState<number>(photo.chromaticAberration ?? 3.5);
  const [isReProcessing, setIsReProcessing] = useState<boolean>(false);
  const [currentDataUrl, setCurrentDataUrl] = useState<string>(photo.dataUrl);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync state if photo prop changes
  useEffect(() => {
    setCurrentDataUrl(photo.dataUrl);
    setGrain(photo.grain ?? 75);
    setLightLeak(photo.lightLeak ?? 65);
    setHalation(photo.halation ?? 65);
    setChromatic(photo.chromaticAberration ?? 3.5);
    setFrameType(photo.frameType || 'pola');
  }, [photo]);

  // Re-render when emulsion sliders change (debounced)
  useEffect(() => {
    if (!photo.rawSourceUrl) return;

    const timer = setTimeout(async () => {
      try {
        setIsReProcessing(true);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = photo.rawSourceUrl!;
        await new Promise((res) => {
          img.onload = res;
        });

        const reprocessed = await processAnalogPhoto({
          source: img,
          presetId: photo.presetId,
          aspectRatio: photo.aspectRatio,
          dateStampEnabled: true,
          dateStr: photo.dateFormatted,
          grainIntensity: grain,
          lightLeakIntensity: lightLeak,
          lightLeakRotation: photo.lightLeakRotation,
          halationIntensity: halation,
          chromaticAberration: chromatic,
        });

        // Release temporary image memory
        img.onload = null;
        img.src = '';

        setCurrentDataUrl(reprocessed.dataUrl);
        onUpdatePhoto({
          ...photo,
          dataUrl: reprocessed.dataUrl,
          grain,
          lightLeak,
          halation,
          chromaticAberration: chromatic,
          frameType,
        });
      } catch (err) {
        console.error('Failed to reprocess photo:', err);
      } finally {
        setIsReProcessing(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [grain, lightLeak, halation, chromatic, photo.rawSourceUrl, photo.presetId, photo.aspectRatio, photo.dateFormatted, photo.lightLeakRotation]);

  const handleResetControls = () => {
    soundEngine.playClickSound();
    setGrain(65);
    setLightLeak(50);
    setHalation(60);
    setChromatic(3.5);
  };

  // Direct High-Res JPG Download (FR-OUT-03)
  const handleDownload = () => {
    soundEngine.playClickSound();
    try {
      const a = document.createElement('a');
      a.href = currentDataUrl;
      const filename = `analogweb_${photo.rollId}_exp${String(photo.frameNumber).padStart(2, '0')}.jpg`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSaveToast('Foto berhasil disimpan ke galeri (.JPG 0.92)');
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      setSaveToast('Gagal mengunduh gambar');
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Web Share API Integration (FR-OUT-02)
  const handleWebShare = async () => {
    soundEngine.playClickSound();
    try {
      // Check if native Web Share with files is supported
      if (navigator.share) {
        // Convert dataURL to Blob/File for sharing
        const res = await fetch(currentDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `analogweb_photo_${photo.frameNumber}.jpg`, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'AnalogWeb 35mm Vintage Photo',
            text: `Taken with AnalogWeb Point & Shoot (${photo.presetName}, ISO ${photo.iso})`,
            files: [file],
          });
          setSaveToast('Foto berhasil dibagikan!');
          setTimeout(() => setSaveToast(null), 3000);
          return;
        } else {
          // Fallback share without file
          await navigator.share({
            title: 'AnalogWeb 35mm Vintage Photo',
            text: `Taken with AnalogWeb Point & Shoot (${photo.presetName}, ISO ${photo.iso})`,
            url: window.location.href,
          });
          setSaveToast('Tautan berhasil dibagikan!');
          setTimeout(() => setSaveToast(null), 3000);
          return;
        }
      }

      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      setSaveToast('Tautan aplikasi disalin ke clipboard!');
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Share error:', err);
        setSaveToast('Berbagi dibatalkan');
        setTimeout(() => setSaveToast(null), 2500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#131316] overflow-y-auto flex flex-col items-center">
      {/* Top Header Bar */}
      <header className="sticky top-0 w-full z-20 bg-[#131316]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between max-w-[480px]">
        <button
          onClick={() => {
            soundEngine.playClickSound();
            onClose();
          }}
          className="w-9 h-9 rounded-lg bg-[#1f1f22] flex items-center justify-center text-[#e4e1e6] active:scale-95 transition-all hover:bg-[#2a2a2d]"
          aria-label="Kembali"
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
        </button>

        <h1 className="font-mono text-[16px] font-bold tracking-wider uppercase text-[#e4e1e6]">
          PHOTO DETAIL
        </h1>

        <div className="w-8 h-8 rounded-full bg-[#ffb599] flex items-center justify-center">
          <span className="material-symbols-outlined text-[#5a1c00] text-[18px]">person</span>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="w-full max-w-[480px] px-4 py-3 flex flex-col gap-3 pb-12 select-none">
        {/* Subbar: RETAKE, EJECT READY, POLA / 35MM */}
        <div className="flex items-center justify-between py-1">
          <button
            onClick={() => {
              soundEngine.playClickSound();
              onRetake();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f1f22] text-[#e4e1e6] border border-white/5 active:scale-95 transition-all text-[11px] font-mono font-bold tracking-wider hover:bg-[#2a2a2d]"
          >
            <span className="text-[#f66018] font-bold">✕</span> RETAKE
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e0e11] border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5708] animate-pulse"></span>
            <span className="font-mono text-[9px] text-[#ffb59c] font-bold tracking-widest uppercase">
              EJECT READY
            </span>
          </div>

          <div className="flex items-center bg-[#1f1f22] rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => {
                soundEngine.playClickSound();
                setFrameType('pola');
              }}
              className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-all ${
                frameType === 'pola' ? 'bg-[#ff5708] text-[#511500]' : 'text-[#a98a7e] hover:text-[#e4e1e6]'
              }`}
            >
              POLA
            </button>
            <button
              onClick={() => {
                soundEngine.playClickSound();
                setFrameType('35mm');
              }}
              className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-all ${
                frameType === '35mm' ? 'bg-[#ff5708] text-[#511500]' : 'text-[#a98a7e] hover:text-[#e4e1e6]'
              }`}
            >
              35MM
            </button>
          </div>
        </div>

        {/* Framed Photo Container (Matching Image 3.jpeg) */}
        <div className="w-full flex justify-center py-1">
          {frameType === 'pola' ? (
            /* Classic 90s Polaroid Integral Card */
            <div className="w-full bg-[#edece8] text-[#1f1f22] rounded-lg p-3 pb-4 shadow-[0_12px_32px_rgba(0,0,0,0.85)] border border-black/20 flex flex-col">
              {/* Polaroid Header Info */}
              <div className="flex justify-between items-center text-[10px] font-mono text-[#52525b] font-bold pb-1.5 px-0.5 tracking-wider">
                <span>90s ANALOG PHOTO</span>
                <span>19:48</span>
              </div>

              {/* Photo Area with Inner Bezel */}
              <div className="relative w-full aspect-[4/3] bg-[#0e0e11] rounded overflow-hidden shadow-inner">
                <img
                  src={currentDataUrl}
                  alt="Analog developed frame"
                  className="w-full h-full object-cover"
                />

                {/* Live Quartz Date Stamp Badge on Photo */}
                <div className="absolute bottom-2 right-2 bg-[#0e0e11]/80 px-2 py-0.5 rounded backdrop-blur-sm">
                  <span className="font-mono text-[11px] text-[#ff5500] font-bold quartz-date-glow">
                    {photo.dateFormatted}
                  </span>
                </div>

                {isReProcessing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="font-mono text-[11px] text-[#ffb599] font-bold bg-[#131316]/90 px-3 py-1.5 rounded-full border border-white/10">
                      Processing Emulsion...
                    </span>
                  </div>
                )}
              </div>

              {/* Polaroid Bottom Chin Metadata */}
              <div className="flex justify-between items-center pt-3 px-1">
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#27272a] italic">
                    {photo.dateFull} • {photo.rollNumber}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold text-[#71717a] tracking-wider">
                  PX-680 N
                </span>
              </div>
            </div>
          ) : (
            /* Authentic 35mm Negative Film Frame */
            <div className="w-full bg-[#0d0d10] rounded-lg p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.9)] border border-white/10 flex flex-col">
              {/* Top Sprocket Hole Strip */}
              <div className="flex justify-between items-center py-1 px-2 text-[#f66018] font-mono text-[9px] font-bold tracking-widest border-b border-white/5">
                <span>KODAK 400 • {photo.rollId}</span>
                <div className="flex gap-2">
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                </div>
                <span>SAFETY FILM 5063</span>
              </div>

              {/* Photo Area */}
              <div className="relative w-full aspect-[4/3] bg-black my-1.5 rounded-sm overflow-hidden">
                <img
                  src={currentDataUrl}
                  alt="35mm negative frame"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-[#0e0e11]/80 px-2 py-0.5 rounded backdrop-blur-sm">
                  <span className="font-mono text-[11px] text-[#ff5500] font-bold quartz-date-glow">
                    {photo.dateFormatted}
                  </span>
                </div>
              </div>

              {/* Bottom Sprocket Hole Strip */}
              <div className="flex justify-between items-center py-1 px-2 text-[#f66018] font-mono text-[9px] font-bold tracking-widest border-t border-white/5">
                <span>▶ {String(photo.frameNumber).padStart(2, '0')}A</span>
                <div className="flex gap-2">
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                </div>
                <span>EXP #{photo.frameNumber}</span>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Banner Strip */}
        <div className="bg-[#1b1b1e] rounded-lg px-3 py-2 border border-white/5 flex items-center justify-center gap-2 text-center">
          <span className="material-symbols-outlined text-[#a98a7e] text-[16px]">tune</span>
          <span className="font-mono text-[10px] text-[#e2bfb2] tracking-wider uppercase font-bold">
            PRESET: {photo.presetName} • ISO {photo.iso} • SHUTTER {photo.shutterSpeed}
          </span>
        </div>

        {/* Vintage Emulsion Controls Card */}
        <div className="bg-[#1f1f22] rounded-xl p-3.5 shadow-md border border-white/5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-[#a98a7e] font-bold tracking-wider uppercase">
              VINTAGE EMULSION CONTROLS
            </span>
            <button
              onClick={handleResetControls}
              className="font-mono text-[10px] text-[#ffb599] hover:underline font-bold tracking-wider"
            >
              RESET
            </button>
          </div>

          {/* Film Grain Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[12px] font-mono text-[#e4e1e6]">
              <span>Film Grain</span>
              <span className="text-[#ff5708] font-bold">{grain}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={grain}
              onChange={(e) => setGrain(Number(e.target.value))}
              aria-label="Film Grain Level"
              className="w-full cursor-pointer accent-[#ff5708]"
            />
          </div>

          {/* Warm Light Leak Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[12px] font-mono text-[#e4e1e6]">
              <span>Warm Light Leak</span>
              <span className="text-[#ff5708] font-bold">{lightLeak}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={lightLeak}
              onChange={(e) => setLightLeak(Number(e.target.value))}
              aria-label="Warm Light Leak Level"
              className="w-full cursor-pointer accent-[#ff5708]"
            />
          </div>

          {/* Halation Effect Slider (Highlight Glow) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[12px] font-mono text-[#e4e1e6]">
              <span className="flex items-center gap-1">
                Halation Glow (Luminance &gt; 80%)
              </span>
              <span className="text-[#ff5708] font-bold">{halation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={halation}
              onChange={(e) => setHalation(Number(e.target.value))}
              aria-label="Halation Glow Level"
              className="w-full cursor-pointer accent-[#ff5708]"
            />
          </div>

          {/* Chromatic Aberration Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[12px] font-mono text-[#e4e1e6]">
              <span>Chromatic Aberration (Outer 25%)</span>
              <span className="text-[#ff5708] font-bold">{chromatic}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.5"
              value={chromatic}
              onChange={(e) => setChromatic(Number(e.target.value))}
              aria-label="Chromatic Aberration Shift"
              className="w-full cursor-pointer accent-[#ff5708]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Save to Gallery JPG */}
          <button
            id="saveGalleryBtn"
            onClick={handleDownload}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#f66018] to-[#ff5708] text-[#511500] font-mono text-[12px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(246,96,24,0.4)] active:scale-[0.98] transition-all hover:brightness-105"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            SIMPAN KE GALERI (.JPG)
          </button>

          {/* Native Web Share */}
          <button
            id="webShareBtn"
            onClick={handleWebShare}
            className="w-full py-3 px-4 rounded-xl bg-transparent border border-white/10 hover:bg-[#1f1f22] text-[#e4e1e6] font-mono text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            BAGIKAN (WEB SHARE)
          </button>
        </div>

        {/* Toast Feedback Notification */}
        {saveToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1f1f22] border border-[#ff5708] text-[#ffdbce] font-mono text-[11px] font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 z-50 animate-bounce">
            <span className="material-symbols-outlined text-[#ff5708] text-[16px]">check_circle</span>
            {saveToast}
          </div>
        )}
      </main>
    </div>
  );
};
