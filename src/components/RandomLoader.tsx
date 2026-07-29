import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Shuffle, Play, Pause, ChevronRight } from 'lucide-react';

interface RandomLoaderProps {
  message?: string;
  subMessage?: string;
  autoCycle?: boolean;
  cycleIntervalMs?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  themeColor?: string; // e.g., 'text-indigo-600', 'text-emerald-500'
}

export const LOADER_NAMES: { [key: number]: string } = {
  1: 'Lưới Đa Chiều vô cực (Square Infinite Grid)',
  2: 'Quỹ Đạo Liên Kết lặp (Orbit Node Binder)',
  3: 'Ô Cờ Ma Trận dịch chuyển (Translating Mosaic)',
  4: 'Làn Sóng Hạt nhân phát tán (Expanding Particle Waves)',
  5: 'Đồng Hồ Cát Tam Giác lật (Ticking Hex-Hourglass)',
  6: 'Khung Điểm Chữ Thập xoay (Rotated Crosshair Frame)',
  7: 'Kính Vạn Hoa Caro phản chiếu (Chroma Checkerboard)',
  8: 'Giao Thoa Điểm Sáng kép (Dual Radial Conic Nodes)',
  9: 'Răng Cưa Vòng Tròn ma thuật (Magic Sun Toothwheel)',
  10: 'Hào Quang Hoa Sen đối lưu (Lotus Inversion Rays)',
  11: 'Xoay Trục Con lắc nghịch hành (Retrograde Pendulum Core)',
  12: 'Hình Elip Trọng Lực kép (Double Gravity Ellipses)',
  13: 'Sóng Cuộn Âm Dương liên tục (Infinite Yin-Yang Ripple)',
  14: 'Vòng Quay Lốc Xoáy nghịch cực (Counter-Current Cyclone)',
  15: 'Cột Cát Conic trượt ngang (Horizontal Conic Slides)',
  16: 'Thấu Kính Quang Học 180 độ (Optic Aperture Transition)',
  17: 'Đồng Hồ Cát Phép Thuật mảnh (Slender Magical hourglass)',
  18: 'Trục Đèn Lồng Trụ cổ điển (Classic Cylindrical Lantern)',
  19: 'Ma Trận Quạt Tròn khuếch tán (Radial Fan Segments)',
  20: 'Vòng Tròn Đồng Tâm ma quái (Concentric Spectral Ripple)',
};

export function RandomLoader({
  message = 'Đang xử lý dữ liệu...',
  subMessage,
  autoCycle = true,
  cycleIntervalMs = 3000,
  className = '',
  size = 'md',
  themeColor = 'text-indigo-600 dark:text-indigo-400',
}: RandomLoaderProps) {
  const [loaderIndex, setLoaderIndex] = useState<number>(() => {
    return Math.floor(Math.random() * 20) + 1;
  });

  // Switch to another random loader index
  const triggerRandomChange = () => {
    setLoaderIndex((prev) => {
      let next = prev;
      while (next === prev) {
        next = Math.floor(Math.random() * 20) + 1;
      }
      return next;
    });
  };

  // Automatic transition mode (When one loader duration ends, switch to another random one)
  useEffect(() => {
    if (!autoCycle) return;

    const interval = setInterval(() => {
      triggerRandomChange();
    }, cycleIntervalMs);

    return () => clearInterval(interval);
  }, [autoCycle, cycleIntervalMs]);

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'scale-75';
      case 'lg':
        return 'scale-125';
      case 'md':
      default:
        return 'scale-100';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 ${className}`} id={`random-loader-container-${loaderIndex}`}>
      <div className="relative h-28 flex items-center justify-center mb-4">
        {/* Decorative backdrop glow */}
        <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-400/5 blur-2xl rounded-full w-24 h-24 mx-auto pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={loaderIndex}
            initial={{ opacity: 0, scale: 0.8, rotate: -15, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, rotate: 15, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`flex items-center justify-center ${getSizeClass()} ${themeColor}`}
          >
            {/* Dynamic CSS Loading Indicator injected directly */}
            <div className={`loader-${loaderIndex}`} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-1 z-10">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-normal flex items-center justify-center gap-1.5">
          <span>{message}</span>
        </h4>
        {subMessage ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
            {subMessage}
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
            <span>Mẫu #{loaderIndex}: {LOADER_NAMES[loaderIndex]}</span>
          </p>
        )}
      </div>
    </div>
  );
}

interface LoadingPlaygroundProps {
  onSelectLoader?: (index: number) => void;
}

export function LoadingPlayground({ onSelectLoader }: LoadingPlaygroundProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [autoCycleSeconds, setAutoCycleSeconds] = useState<number>(4);
  const [colorScheme, setColorScheme] = useState<string>('indigo');

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSelectedIdx((prev) => {
        let next = Math.floor(Math.random() * 20) + 1;
        while (next === prev && next !== 1) {
          next = Math.floor(Math.random() * 20) + 1;
        }
        return next;
      });
    }, autoCycleSeconds * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, autoCycleSeconds]);

  const getColorClasses = () => {
    switch (colorScheme) {
      case 'emerald':
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/20';
      case 'rose':
        return 'text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/20';
      case 'amber':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/20';
      case 'cyan':
        return 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/20';
      case 'violet':
        return 'text-violet-500 bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/20';
      case 'indigo':
      default:
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/20';
    }
  };

  const getTextColor = () => {
    switch (colorScheme) {
      case 'emerald': return 'text-emerald-600 dark:text-emerald-400';
      case 'rose': return 'text-rose-600 dark:text-rose-400';
      case 'amber': return 'text-amber-600 dark:text-amber-400';
      case 'cyan': return 'text-cyan-600 dark:text-cyan-400';
      case 'violet': return 'text-violet-600 dark:text-violet-400';
      default: return 'text-indigo-600 dark:text-indigo-400';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-600 shadow-pop-card-indigo overflow-hidden transition-all duration-300" id="loading-playground-section">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-sans font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Phòng Thử Nghiệm Loading Mĩ Thuật
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Trình diễn 20 kiểu Loading CSS độc đáo, tự động luân chuyển hoặc tùy chỉnh màu sắc sinh động.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Colors */}
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-full border border-slate-100 dark:border-slate-800/80">
            {(['indigo', 'cyan', 'emerald', 'amber', 'rose', 'violet'] as const).map((color) => (
              <button
                key={color}
                onClick={() => setColorScheme(color)}
                className={`w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
                  color === 'indigo' ? 'bg-indigo-500' :
                  color === 'cyan' ? 'bg-cyan-500' :
                  color === 'emerald' ? 'bg-emerald-500' :
                  color === 'amber' ? 'bg-amber-500' :
                  color === 'rose' ? 'bg-rose-500' : 'bg-violet-500'
                }`}
              >
                {colorScheme === color && (
                  <span className="absolute inset-0 rounded-full border-2 border-white dark:border-slate-900 scale-90" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Dynamic Display Area */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 relative min-h-[340px]">
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 text-[11px] font-mono shadow-xs">
            <span className="relative flex h-2 w-2 shrink-0">
              {isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {isPlaying ? `Tự động chuyển (${autoCycleSeconds}s)` : 'Đang tạm dừng'}
            </span>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 border border-slate-150 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-xs"
              title={isPlaying ? 'Tạm dừng tự động chuyển' : 'Bật tự động chuyển'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                let next = Math.floor(Math.random() * 20) + 1;
                while (next === selectedIdx) {
                  next = Math.floor(Math.random() * 20) + 1;
                }
                setSelectedIdx(next);
              }}
              className="p-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 border border-slate-150 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Lấy random một loading khác"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Render Active Loader */}
          <div className="h-44 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedIdx}-${colorScheme}`}
                initial={{ opacity: 0, scale: 0.75, y: 15, filter: 'blur(5px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.75, y: -15, filter: 'blur(5px)' }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`flex items-center justify-center p-8 rounded-full ${getTextColor()}`}
              >
                <div className={`loader-${selectedIdx}`} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Active Meta info */}
          <div className="text-center space-y-1.5 max-w-sm mt-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Loading Mĩ Thuật #{selectedIdx}
            </h4>
            <p className={`text-sm font-bold ${getTextColor()}`}>
              {LOADER_NAMES[selectedIdx]}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal px-4">
              Mẫu CSS thuần khiết không cần JavaScript để hoạt động. Thích hợp cho các thao tác đồng bộ mượt mà.
            </p>
          </div>

          {/* Cycle Interval Adjustment */}
          {isPlaying && (
            <div className="w-full max-w-xs px-6 mt-6 flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono shrink-0">Tốc độ: {autoCycleSeconds}s</span>
              <input
                type="range"
                min="2"
                max="10"
                value={autoCycleSeconds}
                onChange={(e) => setAutoCycleSeconds(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Right Side: Grid of 20 loaders for selective activation */}
        <div className="lg:col-span-5 p-5 bg-slate-50/20 dark:bg-slate-950/10 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
              Danh Sách Tất Cả 20 Loader
            </h4>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">Total: 20</span>
          </div>

          <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((idx) => {
              const isActive = selectedIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedIdx(idx);
                    setIsPlaying(false); // Pause auto rotation upon manual selection
                  }}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                      : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850/40'
                  }`}
                  title={LOADER_NAMES[idx]}
                >
                  <span className={`text-[10px] font-bold font-mono ${isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    #{idx}
                  </span>
                  
                  {/* Micro icon scale preview */}
                  <div className={`mt-2 scale-[0.25] h-5 w-5 flex items-center justify-center ${isActive ? 'text-white' : getTextColor()}`}>
                    <div className={`loader-${idx}`} style={{ width: '16px', borderSize: '1px' }} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/30 dark:border-indigo-900/10 flex items-start gap-2.5">
              <Shuffle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Trải nghiệm thực tế:</span> Khi hệ thống thực hiện thao tác đồng bộ với Google Sheets hoặc tính lương, một Loader ngẫu nhiên sẽ xuất hiện và tự động hoán đổi để đem lại cảm giác mới mẻ không lặp lại!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
