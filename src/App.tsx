import { useState, useEffect } from 'react';
import { ActiveTab, CameraConfig, CapturedPhoto, FilmPresetId } from './types';
import { INITIAL_SAMPLE_PHOTOS } from './utils/sampleData';
import { soundEngine } from './utils/audio';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ViewfinderScreen } from './components/ViewfinderScreen';
import { PhotoDetailModal } from './components/PhotoDetailModal';
import { FilmRollGallery } from './components/FilmRollGallery';
import { DarkroomLab } from './components/DarkroomLab';
import { CameraSetup } from './components/CameraSetup';
import { ProfileModal } from './components/ProfileModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cam');
  const [activePreset, setActivePreset] = useState<FilmPresetId>('classic_90');
  const [photos, setPhotos] = useState<CapturedPhoto[]>(() => {
    // Attempt to load from localStorage or use initial samples
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('analogweb_photos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Fallback to initial
      }
    }
    return INITIAL_SAMPLE_PHOTOS;
  });

  const [config, setConfig] = useState<CameraConfig>(() => {
    return {
      flashMode: 'AUTO',
      aspectRatio: '4:3',
      dateStampEnabled: true,
      vintageYearMode: true,
      soundEnabled: true,
      hapticEnabled: true,
      currentRollId: 'S-36',
      expCount: 24, // Matches exact LCD in Image 1.png [ 24/36 ]
      maxExp: 36,
    };
  });

  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [showProfile, setShowProfile] = useState<boolean>(false);

  // Sync photos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('analogweb_photos', JSON.stringify(photos.slice(0, 36)));
    } catch {
      // Ignore quota errors
    }
  }, [photos]);

  const handlePhotoCaptured = (newPhoto: CapturedPhoto) => {
    setPhotos((prev) => [newPhoto, ...prev]);
  };

  const handleUpdatePhoto = (updated: CapturedPhoto) => {
    setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPhoto(updated);
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  };

  const handleClearRoll = () => {
    setPhotos([]);
    setConfig((prev) => ({ ...prev, expCount: 0 }));
  };

  // Recent photo for the camera bottom left thumbnail
  const recentPhoto = photos.length > 0 ? photos[0] : null;

  return (
    <div className="min-h-screen bg-[#131316] text-[#e4e1e6] flex flex-col justify-between relative overflow-x-hidden">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        config={config}
        onProfileClick={() => {
          soundEngine.playClickSound();
          setShowProfile(true);
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col relative w-full">
        {activeTab === 'cam' && (
          <ViewfinderScreen
            config={config}
            setConfig={setConfig}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            recentPhoto={recentPhoto}
            onPhotoCaptured={handlePhotoCaptured}
            onOpenRoll={() => {
              soundEngine.playClickSound();
              setActiveTab('roll');
            }}
            onOpenPhotoDetail={(photo) => {
              soundEngine.playClickSound();
              setSelectedPhoto(photo);
            }}
          />
        )}

        {activeTab === 'roll' && (
          <FilmRollGallery
            photos={photos}
            config={config}
            setConfig={setConfig}
            onSelectPhoto={(photo) => {
              setSelectedPhoto(photo);
            }}
            onDeletePhoto={handleDeletePhoto}
            onSwitchToCam={() => setActiveTab('cam')}
          />
        )}

        {activeTab === 'lab' && (
          <DarkroomLab
            config={config}
            setConfig={setConfig}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            onPhotoCaptured={handlePhotoCaptured}
            onOpenPhotoDetail={(photo) => {
              setSelectedPhoto(photo);
            }}
          />
        )}

        {activeTab === 'setup' && (
          <CameraSetup config={config} setConfig={setConfig} onClearRoll={handleClearRoll} />
        )}
      </main>

      {/* Bottom Fixed Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} config={config} />

      {/* Photo Detail Modal (Matching Image 3.jpeg) */}
      {selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onRetake={() => {
            setSelectedPhoto(null);
            setActiveTab('cam');
          }}
          onUpdatePhoto={handleUpdatePhoto}
        />
      )}

      {/* Profile / Credentials Modal */}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          onOpenPrd={() => {
            setActiveTab('setup');
          }}
        />
      )}
    </div>
  );
}
