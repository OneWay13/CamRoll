import React, { useState } from 'react';
import { CameraConfig, CapturedPhoto } from '../types';
import { soundEngine } from '../utils/audio';

interface FilmRollGalleryProps {
  photos: CapturedPhoto[];
  config: CameraConfig;
  setConfig: React.Dispatch<React.SetStateAction<CameraConfig>>;
  onSelectPhoto: (photo: CapturedPhoto) => void;
  onDeletePhoto: (id: string) => void;
  onSwitchToCam: () => void;
}

export const FilmRollGallery: React.FC<FilmRollGalleryProps> = ({
  photos,
  config,
  setConfig,
  onSelectPhoto,
  onDeletePhoto,
  onSwitchToCam,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'strip'>('grid');

  const handleNewRoll = () => {
    soundEngine.playClickSound();
    const currentNum = parseInt(config.currentRollId.replace(/\D/g, '') || '36', 10);
    const nextRollId = `S-${currentNum + 1}`;
    setConfig((prev) => ({
      ...prev,
      currentRollId: nextRollId,
      expCount: 0,
    }));
  };

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-3 pb-24 flex flex-col gap-4 select-none">
      {/* Film Canister Header Card */}
      <div className="bg-[#1b1b1e] rounded-xl p-4 border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.6)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Canister Graphic */}
          <div className="w-12 h-14 bg-[#0e0e11] rounded-sm border-2 border-[#ff5708] p-1 flex flex-col justify-between items-center shadow-inner">
            <span className="font-mono text-[8px] text-[#ffb59c] font-bold">KODAK</span>
            <span className="font-mono text-[10px] text-[#ff5708] font-bold">{config.currentRollId}</span>
            <span className="font-mono text-[7px] text-[#a98a7e]">35MM</span>
          </div>

          <div className="flex flex-col">
            <span className="font-mono text-[14px] font-bold text-[#e4e1e6] uppercase">
              ROLL {config.currentRollId}
            </span>
            <span className="font-mono text-[11px] text-[#a98a7e]">
              {photos.length} DEVELOPED / {config.maxExp} EXPOSURES
            </span>
            <div className="w-36 h-1.5 bg-[#2a2a2d] rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#f66018] to-[#ff5708] transition-all duration-300"
                style={{ width: `${Math.min(100, (photos.length / config.maxExp) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleNewRoll}
          title="Start fresh 36 exp film roll"
          className="px-3 py-1.5 rounded-lg bg-[#2a2a2d] hover:bg-[#353438] text-[#ffb599] font-mono text-[10px] font-bold border border-white/5 active:scale-95 transition-all text-center"
        >
          + NEW ROLL
        </button>
      </div>

      {/* View Switcher & Action Bar */}
      <div className="flex justify-between items-center px-1">
        <span className="font-mono text-[11px] text-[#a98a7e] uppercase font-bold tracking-wider">
          DEVELOPED PRINTS ({photos.length})
        </span>

        <div className="flex bg-[#1b1b1e] rounded-lg p-0.5 border border-white/5">
          <button
            onClick={() => {
              soundEngine.playClickSound();
              setViewMode('grid');
            }}
            className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold transition-all ${
              viewMode === 'grid' ? 'bg-[#ff5708] text-[#511500]' : 'text-[#a98a7e]'
            }`}
          >
            GRID
          </button>
          <button
            onClick={() => {
              soundEngine.playClickSound();
              setViewMode('strip');
            }}
            className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold transition-all ${
              viewMode === 'strip' ? 'bg-[#ff5708] text-[#511500]' : 'text-[#a98a7e]'
            }`}
          >
            STRIP
          </button>
        </div>
      </div>

      {/* Empty State */}
      {photos.length === 0 ? (
        <div className="bg-[#1f1f22] rounded-xl p-8 border border-white/5 text-center flex flex-col items-center gap-3 my-4">
          <span className="material-symbols-outlined text-[#a98a7e] text-[48px]">photo_camera</span>
          <h2 className="font-mono text-[14px] font-bold text-[#e4e1e6]">ROLL BELUM BERISI FOTO</h2>
          <p className="text-[13px] text-[#a98a7e] max-w-xs">
            Buka viewfinder kamera dan tekan tombol shutter oranye untuk mengambil foto analog pertamamu.
          </p>
          <button
            onClick={onSwitchToCam}
            className="mt-2 px-5 py-2.5 rounded-xl bg-[#ff5708] text-[#511500] font-mono text-[11px] font-bold tracking-widest uppercase shadow-md active:scale-95 transition-all"
          >
            BUKA VIEWFINDER
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => {
                soundEngine.playClickSound();
                onSelectPhoto(photo);
              }}
              className="group relative bg-[#1f1f22] rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:border-[#ff5708]"
            >
              {/* Image Preview */}
              <div className="aspect-[4/3] bg-[#0e0e11] overflow-hidden relative">
                <img
                  src={photo.dataUrl}
                  alt={photo.rollNumber}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Orange Frame Pip */}
                <div className="absolute top-1.5 left-1.5 bg-[#0e0e11]/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10">
                  <span className="font-mono text-[9px] text-[#ff5708] font-bold">
                    #{String(photo.frameNumber).padStart(2, '0')}
                  </span>
                </div>

                {/* Quartz Date preview */}
                <div className="absolute bottom-1.5 right-1.5 bg-[#0e0e11]/80 px-1 py-0.5 rounded backdrop-blur-sm">
                  <span className="font-mono text-[9px] text-[#ff5500] font-bold quartz-date-glow">
                    {photo.dateFormatted}
                  </span>
                </div>
              </div>

              {/* Bottom Card Meta */}
              <div className="p-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] text-[#e4e1e6] font-bold truncate">
                    {photo.presetName}
                  </span>
                  <span className="text-[9px] text-[#a98a7e] font-mono">{photo.dateFull}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playClickSound();
                    onDeletePhoto(photo.id);
                  }}
                  title="Hapus foto dari roll"
                  className="w-6 h-6 rounded flex items-center justify-center text-[#a98a7e] hover:text-red-400 hover:bg-[#2a2a2d] transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Negative Film Strip View */
        <div className="flex flex-col gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => {
                soundEngine.playClickSound();
                onSelectPhoto(photo);
              }}
              className="bg-[#0e0e11] rounded-lg p-2 border border-white/10 shadow-lg cursor-pointer hover:border-[#ff5708] transition-all"
            >
              {/* Film Sprockets Header */}
              <div className="flex justify-between items-center px-2 py-1 text-[#f66018] font-mono text-[9px] font-bold">
                <span>ROLL {photo.rollId}</span>
                <div className="flex gap-2">
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                  <span className="w-2.5 h-1.5 rounded-sm bg-[#1f1f22]"></span>
                </div>
                <span>EXP #{photo.frameNumber}</span>
              </div>

              {/* Center Photo */}
              <div className="relative aspect-[4/3] w-full bg-black rounded overflow-hidden my-1">
                <img src={photo.dataUrl} alt={photo.rollNumber} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-[#0e0e11]/80 px-2 py-0.5 rounded backdrop-blur-sm">
                  <span className="font-mono text-[11px] text-[#ff5500] font-bold quartz-date-glow">
                    {photo.dateFormatted}
                  </span>
                </div>
              </div>

              {/* Bottom Sprockets Footer */}
              <div className="flex justify-between items-center px-2 py-1 text-[#a98a7e] font-mono text-[9px]">
                <span className="text-[#ffb59c] font-bold">PRESET: {photo.presetName}</span>
                <span>{photo.dateFull}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
