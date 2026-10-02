import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Palette,
  Eye,
  EyeOff,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Waves,
  Orbit,
  Check,
  ArrowLeft,
  Flame,
  Star,
  MousePointer,
  Compass,
  Layers,
  Save,
  Trash2,
  Plus,
  Sun,
  Moon,
} from 'lucide-react';

interface PresetTheme {
  id: string;
  name: string;
  badge: string;
  primary: string;
  secondary: string;
  river: string;
  aurora: [string, string, string];
  brightness?: number;
}

export interface ZenProfile {
  id: string;
  name: string;
  createdAt: number;
  primary: string;
  secondary: string;
  river: string;
  aurora: [string, string, string];
  brightness: number;
  presetId?: string;
}

const PRESET_THEMES: PresetTheme[] = [
  {
    id: 'cyan_ice',
    name: 'Băng Tuyết Cyber',
    badge: 'Mặc định',
    primary: '#00f2fe',
    secondary: '#4facfe',
    river: '#00f2fe',
    aurora: ['#0aff84', '#00ccff', '#ae26ed'],
    brightness: 1.2,
  },
  {
    id: 'aurora_green',
    name: 'Cực Quang Huyền Bí',
    badge: 'Bắc cực',
    primary: '#00ff87',
    secondary: '#60efff',
    river: '#00ff87',
    aurora: ['#05ffa1', '#00e5ff', '#b800ff'],
    brightness: 1.3,
  },
  {
    id: 'neon_purple',
    name: 'Tinh Vân Tử Đinh Hương',
    badge: 'Huyền ảo',
    primary: '#f355da',
    secondary: '#7000ff',
    river: '#f355da',
    aurora: ['#ff007f', '#7000ff', '#00f2fe'],
    brightness: 1.25,
  },
  {
    id: 'warm_amber',
    name: 'Hổ Phách & Hoàng Hôn',
    badge: 'Ấm áp',
    primary: '#ffb300',
    secondary: '#f59e0b',
    river: '#ff9100',
    aurora: ['#ffb300', '#ff3d00', '#d500f9'],
    brightness: 1.15,
  },
  {
    id: 'mars_rose',
    name: 'Chiều Tà Sao Hỏa',
    badge: 'Rực rỡ',
    primary: '#ff0844',
    secondary: '#ffb199',
    river: '#ff0844',
    aurora: ['#ff0844', '#ff758c', '#7000ff'],
    brightness: 1.2,
  },
  {
    id: 'midnight_obsidian',
    name: 'Đêm Huyền Bí Obsidian',
    badge: 'Tĩnh lặng',
    primary: '#64748b',
    secondary: '#334155',
    river: '#94a3b8',
    aurora: ['#38bdf8', '#818cf8', '#c084fc'],
    brightness: 0.9,
  },
  {
    id: 'emerald_mint',
    name: 'Xanh Ngọc Neon',
    badge: 'Tươi mới',
    primary: '#10b981',
    secondary: '#06b6d4',
    river: '#10b981',
    aurora: ['#10b981', '#06b6d4', '#6366f1'],
    brightness: 1.2,
  },
];

const QUICK_SWATCHES = [
  '#00f2fe', '#4facfe', '#00ff87', '#60efff',
  '#f355da', '#7000ff', '#ffb300', '#ff0844',
  '#10b981', '#06b6d4', '#ec4899', '#ffffff'
];

interface ZenBackgroundToggleProps {
  isZenMode: boolean;
  onToggleZenMode: (enabled: boolean) => void;
}

export function ZenBackgroundToggle(props: ZenBackgroundToggleProps) {
  const { isZenMode, onToggleZenMode } = props;

  // State for colors
  const [primaryColor, setPrimaryColor] = useState<string>(
    () => localStorage.getItem('bg_primary') || '#00f2fe'
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    () => localStorage.getItem('bg_secondary') || '#4facfe'
  );
  const [riverColor, setRiverColor] = useState<string>(
    () => localStorage.getItem('bg_river_color') || '#00f2fe'
  );
  const [activePresetId, setActivePresetId] = useState<string>(
    () => localStorage.getItem('bg_preset') || 'cyan_ice'
  );

  // Aurora colors
  const [auroraCol1, setAuroraCol1] = useState<string>(
    () => localStorage.getItem('bg_aurora_col1') || '#0aff84'
  );
  const [auroraCol2, setAuroraCol2] = useState<string>(
    () => localStorage.getItem('bg_aurora_col2') || '#00ccff'
  );
  const [auroraCol3, setAuroraCol3] = useState<string>(
    () => localStorage.getItem('bg_aurora_col3') || '#ae26ed'
  );

  // Brightness / Glow Intensity filter
  const [brightness, setBrightness] = useState<number>(() => {
    const saved = localStorage.getItem('bg_intensity');
    if (!saved) return 1.2;
    const n = Number(saved);
    return isNaN(n) ? 1.2 : Math.max(0.3, Math.min(n, 2.5));
  });

  // Star & Physics settings
  const [cometTail, setCometTail] = useState<boolean>(
    () => localStorage.getItem('pc_comet_tail') !== 'false'
  );
  const [shootingStars, setShootingStars] = useState<boolean>(
    () => localStorage.getItem('pc_shooting_stars') !== 'false'
  );
  const [starColorMode, setStarColorMode] = useState<number>(
    () => Number(localStorage.getItem('pc_color_mode') ?? '0')
  );
  const [starSpeed, setStarSpeed] = useState<number>(
    () => Number(localStorage.getItem('pc_speed') ?? '0.30')
  );

  // Compact Popover & Immersion mode states
  const [isColorStudioOpen, setIsColorStudioOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'custom' | 'themes' | 'stars' | 'favorites'>('custom');
  const [isCompletelyHidden, setIsCompletelyHidden] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isIdle, setIsIdle] = useState<boolean>(false);

  // Feedback toast message (compact floating pill)
  const [toastMsg, setToastMsg] = useState<string>('');

  const [newProfileName, setNewProfileName] = useState<string>('');
  const [savedProfiles, setSavedProfiles] = useState<ZenProfile[]>(() => {
    try {
      const raw = localStorage.getItem('bg_zen_profiles');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  // Auto-dim / idle timer: when user is not moving mouse in Zen Mode, fade toolbar down to 20%
  useEffect(() => {
    if (!isZenMode) return;
    let timer: NodeJS.Timeout;

    const onUserActive = () => {
      setIsIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsIdle(true);
      }, 3000);
    };

    window.addEventListener('mousemove', onUserActive, { passive: true });
    window.addEventListener('mousedown', onUserActive, { passive: true });
    timer = setTimeout(() => setIsIdle(true), 3000);

    return () => {
      window.removeEventListener('mousemove', onUserActive);
      window.removeEventListener('mousedown', onUserActive);
      clearTimeout(timer);
    };
  }, [isZenMode]);

  // Sync state if other components update colors
  useEffect(() => {
    const handleBgColorUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        if (detail.primary) setPrimaryColor(detail.primary);
        if (detail.secondary) setSecondaryColor(detail.secondary);
        if (detail.preset) setActivePresetId(detail.preset);
        if (detail.river) setRiverColor(detail.river);
        if (detail.auroraCol1) setAuroraCol1(detail.auroraCol1);
        if (detail.auroraCol2) setAuroraCol2(detail.auroraCol2);
        if (detail.auroraCol3) setAuroraCol3(detail.auroraCol3);
        if (detail.intensity !== undefined) setBrightness(detail.intensity);
      }
    };
    window.addEventListener('update-bg-colors', handleBgColorUpdate);
    window.addEventListener('update-bg-colors-from-bg', handleBgColorUpdate);
    return () => {
      window.removeEventListener('update-bg-colors', handleBgColorUpdate);
      window.removeEventListener('update-bg-colors-from-bg', handleBgColorUpdate);
    };
  }, []);

  // Dispatch background colors & brightness to WebGLBackground
  const applyColors = (
    p: string,
    s: string,
    r: string,
    presetId: string,
    a1?: string,
    a2?: string,
    a3?: string,
    b?: number
  ) => {
    setPrimaryColor(p);
    setSecondaryColor(s);
    setRiverColor(r);
    setActivePresetId(presetId);

    const ac1 = a1 || auroraCol1;
    const ac2 = a2 || auroraCol2;
    const ac3 = a3 || auroraCol3;
    const curBrightness = b !== undefined ? b : brightness;

    if (a1) setAuroraCol1(a1);
    if (a2) setAuroraCol2(a2);
    if (a3) setAuroraCol3(a3);
    if (b !== undefined) setBrightness(b);

    localStorage.setItem('bg_primary', p);
    localStorage.setItem('bg_secondary', s);
    localStorage.setItem('bg_river_color', r);
    localStorage.setItem('bg_preset', presetId);
    localStorage.setItem('bg_aurora_col1', ac1);
    localStorage.setItem('bg_aurora_col2', ac2);
    localStorage.setItem('bg_aurora_col3', ac3);
    localStorage.setItem('bg_intensity', String(curBrightness));
    localStorage.setItem('bg_aurora_intensity', String(Math.max(0.2, curBrightness * 0.95)));

    window.dispatchEvent(
      new CustomEvent('update-bg-colors', {
        detail: {
          primary: p,
          secondary: s,
          river: r,
          preset: presetId,
          auroraCol1: ac1,
          auroraCol2: ac2,
          auroraCol3: ac3,
          intensity: curBrightness,
          auroraIntensity: Math.max(0.2, curBrightness * 0.95),
        },
      })
    );
  };

  // Change brightness directly
  const handleBrightnessChange = (newVal: number) => {
    setBrightness(newVal);
    localStorage.setItem('bg_intensity', String(newVal));
    localStorage.setItem('bg_aurora_intensity', String(Math.max(0.2, newVal * 0.95)));
    window.dispatchEvent(
      new CustomEvent('update-bg-colors', {
        detail: {
          intensity: newVal,
          auroraIntensity: Math.max(0.2, newVal * 0.95),
        },
      })
    );
  };

  // Quick 1-click save as default favorite
  const handleSaveAsDefaultFavorite = () => {
    const favoriteConfig: ZenProfile = {
      id: 'default_fav_' + Date.now(),
      name: 'Mặc định Yêu thích',
      createdAt: Date.now(),
      primary: primaryColor,
      secondary: secondaryColor,
      river: riverColor,
      aurora: [auroraCol1, auroraCol2, auroraCol3],
      brightness,
      presetId: activePresetId,
    };

    try {
      localStorage.setItem('bg_zen_favorite_profile', JSON.stringify(favoriteConfig));
      localStorage.setItem('bg_auto_apply_favorite', 'true');
      setToastMsg('⭐ Đã lưu cấu hình làm mặc định!');
      setTimeout(() => setToastMsg(''), 2500);
    } catch {
      setToastMsg('Lỗi khi lưu');
      setTimeout(() => setToastMsg(''), 2000);
    }
  };

  // Save as a named preset
  const handleSaveNamedProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newProfileName.trim() || `Mẫu Vũ Trụ ${savedProfiles.length + 1}`;
    const newProfile: ZenProfile = {
      id: 'profile_' + Date.now(),
      name,
      createdAt: Date.now(),
      primary: primaryColor,
      secondary: secondaryColor,
      river: riverColor,
      aurora: [auroraCol1, auroraCol2, auroraCol3],
      brightness,
      presetId: activePresetId,
    };

    const updated = [newProfile, ...savedProfiles.slice(0, 15)];
    setSavedProfiles(updated);
    localStorage.setItem('bg_zen_profiles', JSON.stringify(updated));
    setNewProfileName('');
    setToastMsg(`✓ Đã lưu mẫu "${name}"!`);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Apply a saved profile
  const handleApplyProfile = (prof: ZenProfile) => {
    applyColors(
      prof.primary,
      prof.secondary,
      prof.river,
      prof.presetId || 'custom',
      prof.aurora[0],
      prof.aurora[1],
      prof.aurora[2],
      prof.brightness
    );
    setToastMsg(`✓ Đã áp dụng mẫu "${prof.name}"!`);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Delete a saved profile
  const handleDeleteProfile = (id: string) => {
    const updated = savedProfiles.filter((p) => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('bg_zen_profiles', JSON.stringify(updated));
  };

  // Trigger shooting star across sky
  const handleTriggerShootingStar = () => {
    window.dispatchEvent(new CustomEvent('trigger-shooting-star'));
    setToastMsg('🌠 Bắn sao băng!');
    setTimeout(() => setToastMsg(''), 1800);
  };

  // Toggle comet tail
  const handleToggleCometTail = () => {
    const nextVal = !cometTail;
    setCometTail(nextVal);
    localStorage.setItem('pc_comet_tail', String(nextVal));
    window.dispatchEvent(
      new CustomEvent('update-pointcloud-settings', {
        detail: { cometTailEnabled: nextVal },
      })
    );
  };

  // Toggle shooting stars
  const handleToggleShootingStars = () => {
    const nextVal = !shootingStars;
    setShootingStars(nextVal);
    localStorage.setItem('pc_shooting_stars', String(nextVal));
    window.dispatchEvent(
      new CustomEvent('update-pointcloud-settings', {
        detail: { shootingStarsEnabled: nextVal },
      })
    );
  };

  // Change star color mode
  const handleChangeStarColorMode = (mode: number) => {
    setStarColorMode(mode);
    localStorage.setItem('pc_color_mode', String(mode));
    window.dispatchEvent(
      new CustomEvent('update-pointcloud-settings', {
        detail: { colorMode: mode },
      })
    );
  };

  // Change star speed
  const handleChangeStarSpeed = (speed: number) => {
    setStarSpeed(speed);
    localStorage.setItem('pc_speed', String(speed));
    window.dispatchEvent(
      new CustomEvent('update-pointcloud-settings', {
        detail: { speed },
      })
    );
  };

  // Reset to default
  const handleResetColors = () => {
    const def = PRESET_THEMES[0];
    applyColors(
      def.primary,
      def.secondary,
      def.river,
      def.id,
      def.aurora[0],
      def.aurora[1],
      def.aurora[2],
      def.brightness || 1.2
    );
    setToastMsg('✓ Khôi phục mặc định');
    setTimeout(() => setToastMsg(''), 2000);
  };

  return (
    <div
      className="fixed top-3 left-3 sm:top-4 sm:left-4 z-[99999] font-sans no-print select-none"
      style={{ isolation: 'isolate' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ================= NORMAL MODE: SLEEK CORNER TOGGLE BUTTON ================= */}
      {!isZenMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => onToggleZenMode(true)}
            className="group relative flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white backdrop-blur-xl border border-indigo-500/40 hover:border-cyan-400 shadow-lg shadow-indigo-950/40 hover:shadow-cyan-500/25 transition-all duration-300 cursor-pointer active:scale-95 text-xs font-bold"
            title="Bật chế độ chỉ hiển thị background và tương tác chuột với các vì sao"
          >
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: primaryColor }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: primaryColor }}
              />
            </span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-[12px] font-bold text-white tracking-tight">
              Chỉ xem Nền & Sao
            </span>
          </button>
        </motion.div>
      )}

      {/* ================= ZEN MODE: ULTRA-SLIM IMMERSIVE FLOATING HUD ================= */}
      {isZenMode && (
        <div className="flex flex-col items-start gap-2">
          {/* Subtle Starlight Toast Feedback */}
          <AnimatePresence>
            {toastMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="px-3 py-1 rounded-full bg-slate-950/90 border border-cyan-400/50 text-cyan-300 text-[11px] font-bold shadow-lg shadow-cyan-950/60 flex items-center gap-1.5"
              >
                <span>{toastMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GHOST / MINIMIZED MODE: Just a tiny breathing starlight dot */}
          {isCompletelyHidden ? (
            <motion.button
              type="button"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              whileHover={{ scale: 1.25, opacity: 1 }}
              onClick={() => setIsCompletelyHidden(false)}
              className="w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-900/90 text-cyan-300 backdrop-blur-md border border-cyan-400/30 flex items-center justify-center cursor-pointer shadow-lg transition-all"
              title="Hiện lại thanh điều khiển Zen (hoặc nhấn ESC để quay lại ứng dụng)"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            </motion.button>
          ) : (
            /* ULTRA-SLIM 1-ROW FLOATING HUD */
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: isIdle && !isHovered && !isColorStudioOpen ? 0.22 : 1.0,
                y: 0,
              }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-950/75 hover:bg-slate-950/95 backdrop-blur-xl border border-white/10 hover:border-cyan-400/40 shadow-xl shadow-black/60 transition-all text-white"
            >
              {/* Exit to Main App */}
              <button
                type="button"
                onClick={() => onToggleZenMode(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer text-xs font-bold active:scale-95"
                title="Quay lại ứng dụng (phím ESC)"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px]">Thoát</span>
                <span className="text-[9px] text-cyan-300/80 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-500/30 font-mono">
                  ESC
                </span>
              </button>

              <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

              {/* Color & Brightness Popover Toggle */}
              <button
                type="button"
                onClick={() => setIsColorStudioOpen(!isColorStudioOpen)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  isColorStudioOpen
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Mở bảng chỉnh màu sắc background & bộ lọc độ sáng"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="text-[11px]">Màu & Sáng</span>
                {isColorStudioOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {/* Quick Trigger Shooting Star */}
              <button
                type="button"
                onClick={handleTriggerShootingStar}
                className="p-1.5 rounded-full text-amber-300 hover:text-amber-200 hover:bg-white/10 transition-colors cursor-pointer active:scale-90"
                title="Bắn sao băng lướt qua bầu trời"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
              </button>

              {/* 1-Click Save as Default */}
              <button
                type="button"
                onClick={handleSaveAsDefaultFavorite}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-amber-300 hover:text-amber-200 hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold active:scale-95"
                title="Lưu màu sắc và độ sáng hiện tại làm mặc định cho các lần sau"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="text-[11px]">Lưu</span>
              </button>

              <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

              {/* Hide completely into Ghost Mode */}
              <button
                type="button"
                onClick={() => {
                  setIsCompletelyHidden(true);
                  setIsColorStudioOpen(false);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Ẩn thanh công cụ để trải nghiệm 100% không gian tĩnh lặng (nhấn ESC hoặc click lại để mở)"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* ================= COMPACT FLOATING COLOR & BRIGHTNESS STUDIO ================= */}
          <AnimatePresence>
            {isColorStudioOpen && !isCompletelyHidden && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="w-80 sm:w-92 max-h-[78vh] overflow-y-auto pr-1 bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-4 shadow-2xl shadow-black/80 text-white flex flex-col gap-3 text-left custom-scrollbar"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/30"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span className="text-xs font-black tracking-tight text-white">
                      Bảng Chỉnh Màu & Độ Sáng
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleResetColors}
                      className="p-1 hover:bg-white/10 text-slate-400 hover:text-cyan-300 rounded-lg transition-colors cursor-pointer"
                      title="Khôi phục mặc định"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsColorStudioOpen(false)}
                      className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="grid grid-cols-4 bg-slate-900/80 p-1 rounded-2xl border border-white/10 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('custom')}
                    className={`py-1 px-1 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeTab === 'custom'
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Màu & Sáng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('themes')}
                    className={`py-1 px-1 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeTab === 'themes'
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Palette className="w-3 h-3" />
                    <span>Chủ Đề</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stars')}
                    className={`py-1 px-1 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeTab === 'stars'
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Orbit className="w-3 h-3" />
                    <span>Vũ Trụ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('favorites')}
                    className={`py-1 px-1 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeTab === 'favorites'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'text-amber-300/80 hover:text-amber-200'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    <span>Mẫu Lưu</span>
                  </button>
                </div>

                {/* TAB 1: CUSTOM COLOR PICKERS & BRIGHTNESS */}
                {activeTab === 'custom' && (
                  <div className="space-y-3">
                    {/* Brightness Filter Slider */}
                    <div className="bg-slate-900/60 p-3 rounded-2xl border border-amber-400/30 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>Độ Sáng Background</span>
                        </div>
                        <span className="font-mono text-xs font-black text-amber-400 px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-500/40">
                          {Math.round(brightness * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.30"
                        max="2.50"
                        step="0.05"
                        value={brightness}
                        onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-full"
                      />
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {[
                          { label: '🌙 Dịu', val: 0.60 },
                          { label: '⚖️ Chuẩn', val: 1.00 },
                          { label: '☀️ Sáng', val: 1.50 },
                          { label: '⚡ Max', val: 2.20 },
                        ].map((b) => (
                          <button
                            key={b.label}
                            type="button"
                            onClick={() => handleBrightnessChange(b.val)}
                            className={`py-0.8 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center border ${
                              Math.abs(brightness - b.val) < 0.08
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                : 'bg-slate-950 text-slate-300 border-white/10 hover:border-amber-400/40'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Primary Neon Color */}
                    <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-200">Màu Núi 1 (Chủ Đạo)</span>
                        <span className="font-mono text-[11px] text-cyan-300 uppercase">
                          {primaryColor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) =>
                            applyColors(e.target.value, secondaryColor, riverColor, 'custom')
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={primaryColor.toUpperCase()}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (!val.startsWith('#')) val = '#' + val;
                            if (val.length <= 7) {
                              setPrimaryColor(val);
                              if (val.length === 7) applyColors(val, secondaryColor, riverColor, 'custom');
                            }
                          }}
                          className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white uppercase focus:border-cyan-400 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1 pt-0.5 overflow-x-auto custom-scrollbar">
                        {QUICK_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            onClick={() => applyColors(swatch, secondaryColor, riverColor, 'custom')}
                            className="w-4 h-4 rounded-full border border-black/40 shadow-xs shrink-0 cursor-pointer hover:scale-120 transition-transform"
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Secondary Neon Color */}
                    <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-200">Màu Núi 2 (Thứ Hai)</span>
                        <span className="font-mono text-[11px] text-cyan-300 uppercase">
                          {secondaryColor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) =>
                            applyColors(primaryColor, e.target.value, riverColor, 'custom')
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={secondaryColor.toUpperCase()}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (!val.startsWith('#')) val = '#' + val;
                            if (val.length <= 7) {
                              setSecondaryColor(val);
                              if (val.length === 7) applyColors(primaryColor, val, riverColor, 'custom');
                            }
                          }}
                          className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white uppercase focus:border-cyan-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* River Water Color */}
                    <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-200">Màu Dòng Sông Ngân Hà</span>
                        <span className="font-mono text-[11px] text-cyan-300 uppercase">
                          {riverColor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={riverColor}
                          onChange={(e) =>
                            applyColors(primaryColor, secondaryColor, e.target.value, 'custom')
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={riverColor.toUpperCase()}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (!val.startsWith('#')) val = '#' + val;
                            if (val.length <= 7) {
                              setRiverColor(val);
                              if (val.length === 7) applyColors(primaryColor, secondaryColor, val, 'custom');
                            }
                          }}
                          className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white uppercase focus:border-cyan-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Aurora Borealis Colors */}
                    <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-white/10 space-y-1.5">
                      <span className="text-xs font-bold text-slate-200 block">
                        3 Tầng Màu Cực Quang (Aurora)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="color"
                            value={auroraCol1}
                            onChange={(e) =>
                              applyColors(
                                primaryColor,
                                secondaryColor,
                                riverColor,
                                'custom',
                                e.target.value,
                                auroraCol2,
                                auroraCol3
                              )
                            }
                            className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                          />
                          <span className="text-[9px] font-mono text-slate-300 uppercase">{auroraCol1}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="color"
                            value={auroraCol2}
                            onChange={(e) =>
                              applyColors(
                                primaryColor,
                                secondaryColor,
                                riverColor,
                                'custom',
                                auroraCol1,
                                e.target.value,
                                auroraCol3
                              )
                            }
                            className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                          />
                          <span className="text-[9px] font-mono text-slate-300 uppercase">{auroraCol2}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="color"
                            value={auroraCol3}
                            onChange={(e) =>
                              applyColors(
                                primaryColor,
                                secondaryColor,
                                riverColor,
                                'custom',
                                auroraCol1,
                                auroraCol2,
                                e.target.value
                              )
                            }
                            className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                          />
                          <span className="text-[9px] font-mono text-slate-300 uppercase">{auroraCol3}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PRESET THEMES */}
                {activeTab === 'themes' && (
                  <div className="space-y-1.5">
                    {PRESET_THEMES.map((theme) => {
                      const isActive = activePresetId === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() =>
                            applyColors(
                              theme.primary,
                              theme.secondary,
                              theme.river,
                              theme.id,
                              theme.aurora[0],
                              theme.aurora[1],
                              theme.aurora[2],
                              theme.brightness
                            )
                          }
                          className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-left ${
                            isActive
                              ? 'bg-cyan-950/50 border-cyan-400/80 shadow-xs'
                              : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center -space-x-1 shrink-0">
                              <div
                                className="w-4 h-4 rounded-full border border-black/40"
                                style={{ backgroundColor: theme.primary }}
                              />
                              <div
                                className="w-4 h-4 rounded-full border border-black/40"
                                style={{ backgroundColor: theme.secondary }}
                              />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                {theme.name}
                                {isActive && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500 text-slate-950 font-black">
                                    Đang chọn
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {theme.badge} • Sáng: {Math.round((theme.brightness || 1.2) * 100)}%
                              </div>
                            </div>
                          </div>
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-white/20" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TAB 3: STARS & PHYSICS */}
                {activeTab === 'stars' && (
                  <div className="space-y-2.5">
                    {/* Comet tail toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
                      <div className="text-xs font-bold text-white">Đuôi sao chổi theo chuột</div>
                      <button
                        type="button"
                        onClick={handleToggleCometTail}
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                          cometTail ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 bg-white rounded-full shadow-xs" />
                      </button>
                    </div>

                    {/* Auto shooting stars toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
                      <div className="text-xs font-bold text-white">Mưa sao băng tự động</div>
                      <button
                        type="button"
                        onClick={handleToggleShootingStars}
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                          shootingStars ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 bg-white rounded-full shadow-xs" />
                      </button>
                    </div>

                    {/* Star color mode */}
                    <div className="space-y-1 p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
                      <span className="text-[11px] font-bold text-slate-300 block">Màu hạt sao:</span>
                      <div className="grid grid-cols-2 gap-1 pt-0.5">
                        {[
                          { id: 0, label: '✨ Vàng Van Gogh' },
                          { id: 1, label: '🌸 Hoa Diên Vĩ' },
                          { id: 2, label: '🍂 Hổ phách ấm' },
                          { id: 3, label: '⚡ Đồng bộ Neon' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleChangeStarColorMode(m.id)}
                            className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-left border ${
                              starColorMode === m.id
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                                : 'bg-slate-950 text-slate-300 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Star Speed */}
                    <div className="space-y-1 p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-300">Tốc độ chuyển động</span>
                        <span className="font-mono text-cyan-400 text-xs">
                          {Math.round(starSpeed * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={starSpeed}
                        onChange={(e) => handleChangeStarSpeed(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-full"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: SAVED PROFILES */}
                {activeTab === 'favorites' && (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleSaveAsDefaultFavorite}
                      className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu Màu & Sáng Này Làm Mặc Định</span>
                    </button>

                    <form onSubmit={handleSaveNamedProfile} className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        placeholder="Đặt tên mẫu..."
                        className="flex-1 bg-slate-900 border border-white/15 focus:border-amber-400 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Lưu</span>
                      </button>
                    </form>

                    <div className="space-y-1 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                      {savedProfiles.length === 0 ? (
                        <div className="p-3 text-center text-[10px] text-slate-400 italic bg-slate-900/40 rounded-xl border border-white/5">
                          Chưa có mẫu nào được lưu.
                        </div>
                      ) : (
                        savedProfiles.map((prof) => (
                          <div
                            key={prof.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-white/10 text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="flex items-center -space-x-1 shrink-0">
                                <div
                                  className="w-3.5 h-3.5 rounded-full border border-black/30"
                                  style={{ backgroundColor: prof.primary }}
                                />
                                <div
                                  className="w-3.5 h-3.5 rounded-full border border-black/30"
                                  style={{ backgroundColor: prof.secondary }}
                                />
                              </div>
                              <span className="font-bold text-white text-[11px] truncate">
                                {prof.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleApplyProfile(prof)}
                                className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] transition-colors cursor-pointer"
                              >
                                Tải
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProfile(prof.id)}
                                className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
