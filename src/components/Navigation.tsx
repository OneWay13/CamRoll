import React from 'react';
import { ActiveTab, CameraConfig } from '../types';
import { soundEngine } from '../utils/audio';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: CameraConfig;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, config }) => {
  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'cam', label: 'CAM', icon: 'photo_camera' },
    { id: 'roll', label: 'ROLL', icon: 'motion_photos_on' },
    { id: 'lab', label: 'LAB', icon: 'filter_vintage' },
    { id: 'setup', label: 'SETUP', icon: 'tune' },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    soundEngine.playClickSound();
    setActiveTab(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe bg-[#1b1b1e]/95 backdrop-blur-xl border-t border-white/5 shadow-[0_-1px_12px_rgba(0,0,0,0.6)]">
      <div className="flex justify-around items-center h-16 max-w-[480px] mx-auto px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] transition-colors ${
                isActive ? 'text-[#ffb599] font-bold' : 'text-[#a98a7e] hover:text-[#e4e1e6]'
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">{tab.icon}</span>
              <span className="font-mono text-[9px] mt-0.5 tracking-wider uppercase">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
