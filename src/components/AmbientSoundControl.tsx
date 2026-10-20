import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  Sparkles,
  Sliders,
  ChevronDown,
  X,
  Radio,
} from 'lucide-react';
import { ambientAudio, AMBIENT_TRACKS, AmbientTrackId } from '../ambientAudio';

interface AmbientSoundControlProps {
  className?: string;
  compact?: boolean;
}

export const AmbientSoundControl: React.FC<AmbientSoundControlProps> = ({
  className = '',
  compact = false,
}) => {
  const [audioState, setAudioState] = useState(ambientAudio.getState());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = ambientAudio.subscribe(setAudioState);
    return () => unsubscribe();
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentTrackInfo =
    AMBIENT_TRACKS.find((t) => t.id === audioState.track) || AMBIENT_TRACKS[0];

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    ambientAudio.toggle();
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Control Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all duration-300 shadow-sm cursor-pointer ${
          audioState.isPlaying
            ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-950/40 shadow-indigo-500/10'
            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
        }`}
        title={
          audioState.isPlaying
            ? `Nhạc nền vũ trụ: Đang phát "${currentTrackInfo.name}" (Nhấp để tùy chỉnh)`
            : 'Nhạc nền vũ trụ: Tắt (Nhấp để bật)'
        }
      >
        {/* Animated Audio Equalizer Bars when playing */}
        {audioState.isPlaying ? (
          <div className="flex items-end gap-[2px] h-3.5 w-3.5 px-0.5" aria-hidden="true">
            <span className="w-1 bg-indigo-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
            <span className="w-1 bg-purple-500 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.2s] h-2/3" />
            <span className="w-1 bg-pink-500 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.4s] h-4/5" />
          </div>
        ) : (
          <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500" />
        )}

        {!compact && (
          <span className="text-xs font-bold whitespace-nowrap hidden sm:inline-block">
            {audioState.isPlaying ? currentTrackInfo.name : 'Nhạc Nền'}
          </span>
        )}

        {/* Quick Play/Pause indicator */}
        <div
          onClick={handleTogglePlay}
          className={`p-1 rounded-full transition-colors ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 ${
            audioState.isPlaying
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
          title={audioState.isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc nền'}
        >
          {audioState.isPlaying ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
        </div>
      </motion.button>

      {/* Floating Sound Panel Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-88 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-indigo-950/20 text-slate-800 dark:text-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 text-xs">
                  ✨
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-tight">Âm Thanh Nền Vũ Trụ</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Tổng hợp trực tiếp từ trình duyệt • 0 KB tải về
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Toggle & Volume */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-850 rounded-2xl p-3.5 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => ambientAudio.toggle()}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      audioState.isPlaying
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {audioState.isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div>
                    <span className="text-xs font-bold block leading-tight">
                      {audioState.isPlaying ? 'Đang phát âm nền' : 'Đang tắt âm nền'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {audioState.isPlaying ? currentTrackInfo.name : 'Nhấp phát để kích hoạt'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    audioState.isPlaying
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {audioState.isPlaying ? 'LIVE' : 'OFF'}
                </span>
              </div>

              {/* Volume Slider */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    {audioState.volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                    Âm lượng
                  </span>
                  <span className="font-mono text-[10px]">{Math.round(audioState.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioState.volume}
                  onChange={(e) => ambientAudio.setVolume(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            {/* Soundscape Track Selection */}
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 px-1">
                Giai Điệu Vũ Trụ
              </span>
              <div className="space-y-1.5">
                {AMBIENT_TRACKS.map((t) => {
                  const isSelected = audioState.track === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        ambientAudio.setTrack(t.id);
                        if (!audioState.isPlaying) ambientAudio.start();
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{t.icon}</span>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            {t.name}
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping inline-block" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {t.description}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <span className="text-[9px]">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
