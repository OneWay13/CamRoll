import React from 'react';

interface ProfileModalProps {
  onClose: () => void;
  onOpenPrd: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, onOpenPrd }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#131316]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-[#1f1f22] rounded-2xl border border-white/10 p-5 flex flex-col gap-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ffb599] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#5a1c00] text-[18px]">person</span>
            </div>
            <div>
              <h3 className="font-mono text-[13px] font-bold text-[#e4e1e6]">ANALOGWEB PHOTOGRAPHER</h3>
              <p className="font-mono text-[9px] text-[#ff5708]">ANALOG MEMBER • FREE PASS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#2a2a2d] text-[#e4e1e6] flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        <div className="bg-[#141417] p-3 rounded-xl border border-white/5 flex flex-col gap-2 font-mono text-[11px]">
          <div className="flex justify-between text-[#a98a7e]">
            <span>STATUS:</span>
            <span className="text-green-400 font-bold">100% GRATIS (TANPA PAYWALL)</span>
          </div>
          <div className="flex justify-between text-[#a98a7e]">
            <span>FILTER UNLOCKED:</span>
            <span className="text-[#ffb59c] font-bold">SEMUA 4 FILM STOCKS</span>
          </div>
          <div className="flex justify-between text-[#a98a7e]">
            <span>RESOLUSI:</span>
            <span className="text-[#e4e1e6]">NATIVE SENSOR (HIGH-RES)</span>
          </div>
          <div className="flex justify-between text-[#a98a7e]">
            <span>PRIVASI:</span>
            <span className="text-[#e4e1e6]">LOKAL PADA PERANGKAT</span>
          </div>
        </div>

        <button
          onClick={() => {
            onClose();
            onOpenPrd();
          }}
          className="w-full py-2.5 rounded-xl bg-[#2a2a2d] hover:bg-[#353438] text-[#ffb599] font-mono text-[11px] font-bold border border-white/5 flex items-center justify-center gap-1.5 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">description</span>
          BACA SPESIFIKASI DOKUMEN PRD.MD
        </button>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#ff5708] text-[#511500] font-mono text-[11px] font-bold tracking-wider uppercase"
        >
          TUTUP
        </button>
      </div>
    </div>
  );
};
