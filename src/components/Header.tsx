import React from 'react';
import { ActiveTab, CameraConfig } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  config: CameraConfig;
  onProfileClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, config, onProfileClick }) => {
  const getTitle = () => {
    switch (activeTab) {
      case 'cam':
        return 'VIEWFINDER';
      case 'roll':
        return 'FILM ROLL';
      case 'lab':
        return 'DARKROOM LAB';
      case 'setup':
        return 'SETUP';
      default:
        return 'VIEWFINDER';
    }
  };

  return (
    <header className="sticky top-0 w-full z-40 bg-[#131316]/90 backdrop-blur-xl border-b border-white/5 shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
      <div className="h-14 max-w-[480px] mx-auto px-4 flex items-center justify-between">
        {/* Left: EXP counter & status icons */}
        <div className="flex items-center gap-2">
          <div className="bg-[#0e0e11] px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] border border-white/5">
            <span className="font-mono text-[9px] text-[#ffb59c] tracking-widest font-bold">EXP</span>
            <span className="font-mono text-[11px] text-[#f66018] font-bold quartz-date-glow">
              [&nbsp;{String(config.expCount).padStart(2, '0')}&nbsp;]
            </span>
          </div>

          <div className="flex items-center gap-1 text-[#a98a7e]">
            <span
              className={`material-symbols-outlined text-[16px] ${
                config.flashMode !== 'OFF' ? 'text-[#f66018]' : 'text-[#a98a7e]/60'
              }`}
            >
              {config.flashMode === 'OFF' ? 'flash_off' : 'flash_on'}
            </span>
            <span className="material-symbols-outlined text-[16px] text-green-400">battery_full</span>
          </div>
        </div>

        {/* Center: Title */}
        <div className="font-mono text-[16px] uppercase tracking-wider text-[#e4e1e6] font-bold">
          {getTitle()}
        </div>

        {/* Right: User Profile Avatar */}
        <button
          onClick={onProfileClick}
          aria-label="User Profile"
          className="w-8 h-8 rounded-full bg-[#ffb599] flex items-center justify-center active:scale-95 transition-transform hover:brightness-105"
        >
          <span className="material-symbols-outlined text-[#5a1c00] text-[18px]">person</span>
        </button>
      </div>
    </header>
  );
};
