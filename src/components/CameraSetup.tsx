import React, { useState } from 'react';
import { CameraConfig } from '../types';
import { soundEngine } from '../utils/audio';

interface CameraSetupProps {
  config: CameraConfig;
  setConfig: React.Dispatch<React.SetStateAction<CameraConfig>>;
  onClearRoll: () => void;
}

export const CameraSetup: React.FC<CameraSetupProps> = ({ config, setConfig, onClearRoll }) => {
  const [showPrdModal, setShowPrdModal] = useState<boolean>(false);
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);

  const toggleSound = () => {
    soundEngine.playClickSound();
    soundEngine.enabled = !config.soundEnabled;
    setConfig((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const toggleHaptic = () => {
    soundEngine.playClickSound();
    setConfig((prev) => ({ ...prev, hapticEnabled: !prev.hapticEnabled }));
  };

  const toggleVintageYear = () => {
    soundEngine.playClickSound();
    setConfig((prev) => ({ ...prev, vintageYearMode: !prev.vintageYearMode }));
  };

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-3 pb-24 flex flex-col gap-4 select-none">
      {/* Hardware Settings Card */}
      <div className="bg-[#1b1b1e] rounded-xl p-4 border border-white/5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#353438] flex items-center justify-center text-[#ffb599]">
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </div>
          <div>
            <h2 className="font-mono text-[14px] font-bold text-[#e4e1e6] uppercase">CAMERA SETUP</h2>
            <p className="font-mono text-[10px] text-[#a98a7e]">
              KONFIGURASI MEKANIKAL & ELEKTRONIK
            </p>
          </div>
        </div>
      </div>

      {/* Switches Card */}
      <div className="bg-[#1f1f22] rounded-xl p-3.5 border border-white/5 shadow-lg flex flex-col gap-3">
        <span className="font-mono text-[10px] text-[#a98a7e] font-bold tracking-wider uppercase">
          PENGATURAN FISIK KAMERA
        </span>

        {/* Shutter Sound */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex flex-col">
            <span className="font-mono text-[12px] font-bold text-[#e4e1e6]">
              Suara Shutter Mekanikal
            </span>
            <span className="text-[11px] text-[#a98a7e]">
              Efek suara snap curtain & motor gulung film sintetis Web Audio
            </span>
          </div>
          <button
            onClick={toggleSound}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
              config.soundEnabled ? 'bg-[#ff5708]' : 'bg-[#2a2a2d]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-[#131316] shadow-sm transform transition-transform ${
                config.soundEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Haptic Feedback */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex flex-col">
            <span className="font-mono text-[12px] font-bold text-[#e4e1e6]">
              Getaran Haptic Trigger
            </span>
            <span className="text-[11px] text-[#a98a7e]">
              Sensasi getaran tactile saat tombol shutter ditekan
            </span>
          </div>
          <button
            onClick={toggleHaptic}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
              config.hapticEnabled ? 'bg-[#ff5708]' : 'bg-[#2a2a2d]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-[#131316] shadow-sm transform transition-transform ${
                config.hapticEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Vintage Year Mode */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex flex-col">
            <span className="font-mono text-[12px] font-bold text-[#e4e1e6]">
              Mode Tahun Vintage 1996 ('96)
            </span>
            <span className="text-[11px] text-[#a98a7e]">
              {config.vintageYearMode
                ? "Aktif: Stempel tanggal mencetak tahun '96"
                : 'Nonaktif: Mengikuti tahun saat ini'}
            </span>
          </div>
          <button
            onClick={toggleVintageYear}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
              config.vintageYearMode ? 'bg-[#ff5708]' : 'bg-[#2a2a2d]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-[#131316] shadow-sm transform transition-transform ${
                config.vintageYearMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Reset Film Roll */}
        <div className="flex items-center justify-between py-2">
          <div className="flex flex-col">
            <span className="font-mono text-[12px] font-bold text-[#e4e1e6]">Reset Roll Film</span>
            <span className="text-[11px] text-[#a98a7e]">
              Hapus semua foto di roll saat ini dan mulai dari eksposur 0/36
            </span>
          </div>
          {resetConfirm ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  soundEngine.playClickSound();
                  onClearRoll();
                  setResetConfirm(false);
                }}
                className="px-2.5 py-1 rounded bg-red-600 text-white font-mono text-[10px] font-bold"
              >
                YA
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className="px-2.5 py-1 rounded bg-[#2a2a2d] text-[#e4e1e6] font-mono text-[10px]"
              >
                BATAL
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              className="px-3 py-1 rounded-lg bg-[#2a2a2d] hover:bg-red-950/40 text-red-400 font-mono text-[10px] font-bold border border-red-500/20"
            >
              RESET
            </button>
          )}
        </div>
      </div>

      {/* PRD Specifications Viewer Button */}
      <div className="bg-[#1f1f22] rounded-xl p-4 border border-white/5 shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff5708] text-[20px]">description</span>
            <span className="font-mono text-[12px] font-bold text-[#e4e1e6]">
              SPESIFIKASI FUNGSIONAL (PRD.MD)
            </span>
          </div>
          <span className="font-mono text-[9px] bg-[#ff5708]/20 text-[#ffb59c] px-2 py-0.5 rounded font-bold">
            DOKUMEN RESMI
          </span>
        </div>
        <p className="text-[11px] text-[#a98a7e]">
          Lihat modul fungsional lengkap (FR-CAM, FR-ENG, FR-OUT), alur pipeline pemrosesan kanvas, dan standar NFR aplikasi ini.
        </p>
        <button
          onClick={() => {
            soundEngine.playClickSound();
            setShowPrdModal(true);
          }}
          className="mt-1 w-full py-2 rounded-lg bg-[#2a2a2d] hover:bg-[#353438] text-[#ffb599] font-mono text-[11px] font-bold border border-white/5 flex items-center justify-center gap-1.5 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          BACA DOKUMEN PRD LENGKAP
        </button>
      </div>

      {/* Camera Hardware Specs Plate */}
      <div className="bg-[#0e0e11] rounded-xl p-3 border border-white/5 font-mono text-[10px] text-[#a98a7e] flex flex-col gap-1.5">
        <div className="flex justify-between border-b border-white/5 pb-1">
          <span>MODEL:</span>
          <span className="text-[#e4e1e6]">ANALOGWEB RETROCAM 35</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-1">
          <span>OPTICAL SENSOR:</span>
          <span className="text-[#e4e1e6]">35MM F/2.8 MULTI-COATED</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-1">
          <span>PIPELINE:</span>
          <span className="text-[#e4e1e6]">OFFSCREEN CANVAS 2D (CLIENT-SIDE)</span>
        </div>
        <div className="flex justify-between">
          <span>PRIVACY STATUS:</span>
          <span className="text-green-400 font-bold">100% LOKAL (NO SERVER UPLOAD)</span>
        </div>
      </div>

      {/* PRD Viewer Modal */}
      {showPrdModal && (
        <div className="fixed inset-0 z-50 bg-[#131316]/95 backdrop-blur-md overflow-y-auto p-4 flex flex-col items-center">
          <div className="w-full max-w-[500px] bg-[#1f1f22] rounded-2xl border border-white/10 p-5 flex flex-col gap-4 my-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708]">article</span>
                <h3 className="font-mono text-[14px] font-bold text-[#e4e1e6]">PRD.MD SPESIFIKASI</h3>
              </div>
              <button
                onClick={() => setShowPrdModal(false)}
                className="w-8 h-8 rounded-lg bg-[#2a2a2d] text-[#e4e1e6] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-[12px] text-[#e4e1e6]/90 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <h4 className="font-mono text-[12px] font-bold text-[#ff5708] mb-1">1. DOKUMEN KONTROL</h4>
                <p className="text-[#a98a7e]">
                  Nama Produk: AnalogWeb / RetroCam Web (PWA Ready), 100% Gratis Tanpa Paywall, 100% Client-side.
                </p>
              </div>

              <div>
                <h4 className="font-mono text-[12px] font-bold text-[#ff5708] mb-1">2. MODUL AKSES & KONTROL (FR-CAM)</h4>
                <ul className="list-disc pl-4 text-[#a98a7e] space-y-1">
                  <li><strong>FR-CAM-01</strong>: Media Stream Access kamera belakang bawaan smartphone via MediaDevices API.</li>
                  <li><strong>FR-CAM-02</strong>: Flip Camera beralih antara kamera belakang dan depan.</li>
                  <li><strong>FR-CAM-03</strong>: Aspect Ratio Toggle antara 4:3 (film) dan 1:1 (Polaroid).</li>
                  <li><strong>FR-CAM-04</strong>: Screen Flash Simulation overlay putih 150ms saat shutter dipicu.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-mono text-[12px] font-bold text-[#ff5708] mb-1">3. ENGINE FILTER & KANVAS (FR-ENG)</h4>
                <ul className="list-disc pl-4 text-[#a98a7e] space-y-1">
                  <li><strong>FR-ENG-01</strong>: Pemrosesan offscreen canvas tersembunyi resolusi native.</li>
                  <li><strong>FR-ENG-02</strong>: 4 Preset Film: Classic '90, Y2K CCD, B&W Noir 35mm, Faded Polaroid.</li>
                  <li><strong>FR-ENG-03</strong>: Procedural Grain Noise tekstur organik analog.</li>
                  <li><strong>FR-ENG-04</strong>: Light Leak overlay dengan rotasi acak (0°, 90°, 180°, 270°).</li>
                  <li><strong>FR-ENG-05</strong>: Dynamic Glowing LED Date Stamp warna #FF5500 di pojok kanan bawah.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-mono text-[12px] font-bold text-[#ff5708] mb-1">4. HASIL & EKSPOR (FR-OUT)</h4>
                <ul className="list-disc pl-4 text-[#a98a7e] space-y-1">
                  <li><strong>FR-OUT-01</strong>: Instant Output Modal dengan animasi cetak instan & live tuning.</li>
                  <li><strong>FR-OUT-02</strong>: Native Web Share API integration (navigator.share).</li>
                  <li><strong>FR-OUT-03</strong>: Direct High-Res JPG download (kualitas 0.92).</li>
                </ul>
              </div>

              <div>
                <h4 className="font-mono text-[12px] font-bold text-[#ff5708] mb-1">5. NON-FUNCTIONAL REQUIREMENTS</h4>
                <p className="text-[#a98a7e]">
                  Durasi pemrosesan &lt; 1.2 detik, 100% privasi lokal tanpa upload server, kompatibel iOS Safari 14+ & Android Chrome 90+.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPrdModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#ff5708] text-[#511500] font-mono text-[11px] font-bold tracking-widest uppercase"
            >
              TUTUP DOKUMEN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
