# PRD.md — Product Requirements Document

## 1. Document Control & Overview
- **Nama Produk**: AnalogWeb / RetroCam Web
- **Tipe Produk**: Mobile-First Web Application (PWA Ready)
- **Target OS/Browser**: iOS (Safari), Android (Chrome/Edge), Desktop Modern Browsers
- **Model Bisnis**: 100% Gratis, Tanpa Registrasi, Tanpa Paywall / Subscription
- **Tujuan Utama**: Menyediakan aplikasi kamera bernuansa analog/vintage yang ringan, instan diakses via browser HP tanpa instalasi, dan tidak membatasi filter di balik paywall.

## 2. Problem Statement & Value Proposition
- **Problem**: Aplikasi kamera analog populer (seperti Dazz Cam, Fomz, OldRoll) mengunci filter terbaik di balik skema berlangganan Pro/VIP dan memerlukan instalasi aplikasi dari App Store / Play Store.
- **Value Proposition**:
  - Akses langsung via link URL / QR code tanpa install.
  - 100% gratis untuk semua filter dan efek film analog.
  - Pemrosesan foto 100% lokal (client-side), menjaga privasi penuh pengguna tanpa mengunggah data ke server luar.

## 3. Functional Requirements (FR)

### 3.1 Modul Akses & Kontrol Kamera (FR-CAM)
- **FR-CAM-01 (Media Stream Access)**: Mengakses kamera belakang smartphone secara bawaan (`facingMode: "environment"`) via Web MediaDevices API saat aplikasi dibuka, dengan fallback graceful (simulated lens feed / file upload) bila izin tidak diberikan.
- **FR-CAM-02 (Flip Camera)**: Tombol toggle untuk beralih antara kamera belakang (`facingMode: "environment"`) dan kamera depan (`facingMode: "user"`).
- **FR-CAM-03 (Aspect Ratio Toggle)**: Dukungan pengubahan rasio layar bidik (viewfinder) antara 4:3 (standar film 35mm) dan 1:1 (square Polaroid).
- **FR-CAM-04 (Screen Flash Simulation)**: Jika flash diaktifkan (Auto/On), layar HP akan memancarkan kilatan warna putih cerah (*white flash overlay*) selama 150ms bersamaan dengan penekanan tombol shutter mekanis.

### 3.2 Modul Engine Filter & Kanvas (FR-ENG)
- **FR-ENG-01 (Offscreen Canvas Processing)**: Pemrosesan filter warna dilakukan pada *offscreen canvas* tersembunyi beresolusi asli sensor kamera.
- **FR-ENG-02 (Preset Filter Color Matrix)**: Terdapat 4 preset film gratis:
  1. **Classic '90**: Warm tone, kontras tinggi, saturasi alami (sepia 20%, contrast 115%, saturate 135%, brightness 95%).
  2. **Y2K CCD**: Cool tone (kebiruan), kontras tajam, tekstur khas kamera saku digital 2000-an (contrast 130%, hue-rotate 15deg, saturate 160%).
  3. **B&W Noir 35mm**: Monokrom kontras tinggi dengan tekstur grain tebal (grayscale 100%, contrast 140%, brightness 90%).
  4. **Faded Polaroid (Faded 600)**: Warna pudar (*faded blacks*), bernuansa sepia tint (brightness 110%, contrast 90%, sepia 40%).
- **FR-ENG-03 (Procedural Grain & Noise)**: Penambahan bintik grain film buatan secara prosedural di atas gambar untuk menciptakan tekstur organik analog.
- **FR-ENG-04 (Light Leak & Dust Overlay)**: Overlay efek kebocoran cahaya (*warm amber light leaks*) yang diputar posisinya secara acak (0°, 90°, 180°, 270°) di setiap jepretan agar setiap foto memiliki karakter unik.
- **FR-ENG-05 (Dynamic LED Date Stamp)**: Penambahan tanggal pengambilan foto secara otomatis di pojok kanan bawah:
  - Format: `DD MM 'YY` (contoh: `13 09 '96` atau tanggal saat ini dengan opsi vintage '90-an).
  - Visual: Font digital monospace warna oranye menyala (`#FF5500`) dengan efek glow halus (`rgba(255, 85, 0, 0.6)`).
  - Opsi toggle ON/OFF langsung dari tombol hardware "DATE".

### 3.3 Modul Hasil & Ekspor (FR-OUT)
- **FR-OUT-01 (Instant Output Modal & Photo Detail)**: Foto yang selesai diolah langsung ditampilkan dalam modal pratinjau / detail dengan animasi cetak instan bergaya retro, lengkap dengan toggle bingkai Polaroid vs 35mm Film.
- **FR-OUT-02 (Web Share API Integration)**: Integrasi fitur native share (`navigator.share()`) untuk membagikan foto langsung ke Instagram Stories, WhatsApp, Twitter/X, dll., dengan fallback salin ke clipboard.
- **FR-OUT-03 (Direct High-Res JPG Download)**: Ekspor file gambar akhir berformat `.jpg` (kualitas 0.92) langsung ke penyimpanan galeri pengguna.
- **FR-OUT-04 (Live Emulsion Tuning)**: Slider real-time untuk mengatur intensitas Grain (0 - 100%) dan Warm Light Leak (0 - 100%) serta tombol Reset.

## 4. Non-Functional Requirements (NFR)
- **NFR-01 (Performance)**: Durasi dari penekanan tombol shutter hingga foto siap diunduh tidak boleh melebihi 1,2 detik pada HP mid-range.
- **NFR-02 (Privacy & Security)**: Pemrosesan dilakukan 100% *client-side*. Tidak ada foto atau data biometrik yang diunggah ke server pihak ketiga.
- **NFR-03 (Compatibility)**: Mendukung browser mobile modern: Safari iOS 14+ dan Chrome Android 90+, serta desktop responsive.
- **NFR-04 (PWA Offline Capability)**: Dilengkapi `manifest.json` dan caching offline agar aplikasi dapat diinstal ke Home Screen HP dan diakses secara mandiri.

## 5. Alur Pemrosesan Gambar (Image Processing Pipeline)
```
[ Camera Stream (<video>) ]
       │
       ▼ (User menekan Shutter Button)
[ Capture Frame ke Hidden Canvas (Resolusi Native Sensor) ]
       │
       ▼
[ Step 1: Terapkan Matrix Filter Warna (Contrast, Sepia, Saturation) ]
       │
       ▼
[ Step 2: Render Procedural Grain Noise & Light Leak Overlay ]
       │
       ▼
[ Step 3: Gambar Teks Date Stamp di Canvas (Canvas fillText + Glow) ]
       │
       ▼
[ Step 4: Convert Canvas ke Data URL / Blob (.jpg 0.92) ]
       │
       ▼
[ Render Preview Modal & Aktifkan Tombol Download / Share / Adjust ]
```
