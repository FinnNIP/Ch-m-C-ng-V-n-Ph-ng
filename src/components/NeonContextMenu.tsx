import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Calculator, 
  MessageSquare, 
  User, 
  BookOpen, 
  Sparkles, 
  Sliders, 
  HelpCircle, 
  Search, 
  Shuffle, 
  Maximize2 
} from 'lucide-react';

interface NeonContextMenuProps {
  setActiveTab?: (tab: 'attendance' | 'employees' | 'reports' | 'guide') => void;
  activeTab?: string;
  onOpenBackgroundConfig?: () => void;
}

export const NeonContextMenu: React.FC<NeonContextMenuProps> = ({
  setActiveTab,
  activeTab,
  onOpenBackgroundConfig
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 140 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  // Hue states (loaded from localStorage or randomized)
  const [hue1, setHue1] = useState<number>(() => {
    const saved = localStorage.getItem('neon-glass-hue1');
    return saved ? Number(saved) : 195; // default matching cyan
  });
  const [hue2, setHue2] = useState<number>(() => {
    const saved = localStorage.getItem('neon-glass-hue2');
    return saved ? Number(saved) : 210; // default matching slate-blue
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Convert HSL Hue to Hex Color
  const hueToHex = (h: number): string => {
    const s = 100;
    const l = 50;
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = (l / 100) - c / 2;
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h <= 360) { r = c; g = 0; b = x; }
    
    const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}`;
  };

  // Convert Hex to Hue
  const hexToHue = (hex: string): number => {
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return Math.round(h * 360);
  };

  // Set the CSS variables and sync to the WebGL background
  const updateHuesAndSync = (h1: number, h2: number) => {
    document.documentElement.style.setProperty('--hue1', String(h1));
    document.documentElement.style.setProperty('--hue2', String(h2));
    localStorage.setItem('neon-glass-hue1', String(h1));
    localStorage.setItem('neon-glass-hue2', String(h2));

    // Convert to Hex and notify WebGLBackground component
    const primaryHex = hueToHex(h1);
    const secondaryHex = hueToHex(h2);
    
    window.dispatchEvent(
      new CustomEvent('update-bg-colors', {
        detail: {
          primary: primaryHex,
          secondary: secondaryHex,
          preset: 'custom'
        }
      })
    );
  };

  // Listen for background updates to synchronize color hues automatically
  useEffect(() => {
    const handleBgUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.primary && customEvent.detail?.secondary) {
        const h1 = hexToHue(customEvent.detail.primary);
        const h2 = hexToHue(customEvent.detail.secondary);
        setHue1(h1);
        setHue2(h2);
        document.documentElement.style.setProperty('--hue1', String(h1));
        document.documentElement.style.setProperty('--hue2', String(h2));
        localStorage.setItem('neon-glass-hue1', String(h1));
        localStorage.setItem('neon-glass-hue2', String(h2));
      }
    };
    window.addEventListener('update-bg-colors-from-bg', handleBgUpdate);
    return () => window.removeEventListener('update-bg-colors-from-bg', handleBgUpdate);
  }, []);

  // Sync state initially
  useEffect(() => {
    document.documentElement.style.setProperty('--hue1', String(hue1));
    document.documentElement.style.setProperty('--hue2', String(hue2));
  }, [hue1, hue2]);

  // Handle right-click context menu opening
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Allow standard context menu inside text inputs or sliders so user is not blocked
      const target = e.target as HTMLElement;
      if (target.closest('input') || target.closest('textarea') || target.closest('select')) {
        return;
      }

      e.preventDefault();

      const menuWidth = 285;
      const menuHeight = 420;
      const xPadding = 25;
      const yPadding = 25;

      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth > window.innerWidth - xPadding) {
        x = window.innerWidth - menuWidth - xPadding;
      }
      if (y + menuHeight > window.innerHeight - yPadding) {
        y = window.innerHeight - menuHeight - yPadding;
      }

      setPosition({ x, y });
      setIsOpen(true);
      setSelectedItem(null);

      // Focus search input after animation delay
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  // Pick random neon colors
  const handleRandomize = () => {
    const r1 = Math.floor(Math.random() * 360);
    const r2 = (r1 + 120 + Math.floor(Math.random() * 120)) % 360;
    setHue1(r1);
    setHue2(r2);
    updateHuesAndSync(r1, r2);
  };

  const handleHue1Change = (val: number) => {
    setHue1(val);
    updateHuesAndSync(val, hue2);
  };

  const handleHue2Change = (val: number) => {
    setHue2(val);
    updateHuesAndSync(hue1, val);
  };

  // Menu Navigation Actions
  const handleItemClick = (action: string) => {
    setIsOpen(false);
    if (!setActiveTab) return;

    switch (action) {
      case 'attendance':
        setActiveTab('attendance');
        break;
      case 'employees':
        setActiveTab('employees');
        break;
      case 'reports':
        setActiveTab('reports');
        break;
      case 'guide':
        setActiveTab('guide');
        break;
      case 'settings':
        if (onOpenBackgroundConfig) {
          onOpenBackgroundConfig();
        } else {
          // Trigger click on Palette trigger to toggle config
          const paletteBtn = document.querySelector('button[title*="Bảng màu"], button[title*="Cá nhân hóa"]') as HTMLButtonElement;
          paletteBtn?.click();
        }
        break;
      case 'logout':
        // Trigger standard back-to-login or reload
        localStorage.removeItem('user_role');
        window.location.href = window.location.pathname;
        break;
    }
  };

  // Filter items based on search query
  const menuSections = [
    {
      title: 'Hành động đề xuất',
      items: [
        { id: 'attendance', name: 'Ghi Nhận Chấm Công', icon: Calendar },
        { id: 'employees', name: 'Danh Sách Nhân Sự', icon: Calculator },
        { id: 'reports', name: 'Xem Báo Cáo Thống Kê', icon: MessageSquare }
      ]
    },
    {
      title: 'Tùy chọn hệ thống',
      items: [
        { id: 'settings', name: 'Cá Nhân Hóa Giao Diện', icon: Sliders },
        { id: 'guide', name: 'Hướng Dẫn Sử Dụng', icon: BookOpen },
        { id: 'logout', name: 'Đổi Cổng Truy Cập', icon: User }
      ]
    }
  ];

  const filteredSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <>
      <aside
        id="neon-menu"
        ref={menuRef}
        className={`neon-context-menu dark ${isOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          display: isOpen ? 'block' : 'none'
        }}
      >
        <span className="shine shine-top"></span>
        <span className="shine shine-bottom"></span>
        <span className="glow glow-top"></span>
        <span className="glow glow-bottom"></span>
        <span className="glow glow-bright glow-top"></span>
        <span className="glow glow-bright glow-bottom"></span>

        <div className="inner">
          {/* Search commands */}
          <label className="search-bar">
            <Search className="w-4 h-4 search-icon text-slate-400" />
            <input
              type="text"
              ref={searchInputRef}
              placeholder="Nhập lệnh hoặc tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </label>

          {/* Dynamic Filtered Sections */}
          {filteredSections.map((section, sIdx) => (
            <section key={section.title} className="menu-sec">
              <header className="menu-header">{section.title}</header>
              <ul>
                {section.items.map((item, iIdx) => {
                  const ItemIcon = item.icon;
                  const itemIndex = sIdx * 10 + iIdx;
                  return (
                    <li
                      key={item.id}
                      tabIndex={0}
                      onClick={() => handleItemClick(item.id)}
                      onMouseEnter={() => setSelectedItem(itemIndex)}
                      className={selectedItem === itemIndex ? 'selected' : ''}
                    >
                      <ItemIcon className="w-4 h-4 menu-item-icon" />
                      {item.name}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center text-slate-500 py-3 text-xs italic font-semibold">
              Không tìm thấy lệnh nào...
            </div>
          )}

          <hr className="menu-hr" />

          {/* Integrated Neon Color Slider section */}
          <section className="menu-sec">
            <header className="menu-header flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
              <span>Bảng Màu Neon</span>
              <button 
                onClick={handleRandomize}
                className="random-btn flex items-center gap-1 hover:text-white transition-colors duration-200"
                title="Ngẫu nhiên hóa màu"
              >
                <Shuffle className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span>Trộn màu</span>
              </button>
            </header>
            
            <div className="space-y-3 px-2 pt-1 pb-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Màu thứ nhất (Hue 1)</span>
                  <span className="font-bold text-slate-200">{hue1}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  value={hue1}
                  onChange={(e) => handleHue1Change(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Màu thứ hai (Hue 2)</span>
                  <span className="font-bold text-slate-200">{hue2}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  value={hue2}
                  onChange={(e) => handleHue2Change(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </section>

          <div className="hint text-[9px] text-center text-slate-500 font-semibold mt-1">
            Click chuột phải ở bất cứ đâu để mở
          </div>
        </div>
      </aside>
    </>
  );
};
