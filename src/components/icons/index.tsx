import React, { forwardRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import {
  Activity as IconsaxActivity,
  Danger as IconsaxDanger,
  Warning2 as IconsaxWarning2,
  ArrowLeft2 as IconsaxArrowLeft2,
  ArrowRight2 as IconsaxArrowRight2,
  Book1 as IconsaxBook1,
  SmartCar as IconsaxSmartCar,
  Briefcase as IconsaxBriefcase,
  Calculator as IconsaxCalculator,
  Calendar as IconsaxCalendar,
  TickCircle as IconsaxTickCircle,
  TickSquare as IconsaxTickSquare,
  ArrowDown2 as IconsaxArrowDown2,
  ArrowUp2 as IconsaxArrowUp2,
  Clock as IconsaxClock,
  Coffee as IconsaxCoffee,
  Coin as IconsaxCoin,
  Discover as IconsaxDiscover,
  Copy as IconsaxCopy,
  Data as IconsaxData,
  ImportCurve as IconsaxImportCurve,
  Edit2 as IconsaxEdit2,
  ExportSquare as IconsaxExportSquare,
  Eye as IconsaxEye,
  EyeSlash as IconsaxEyeSlash,
  DocumentCode as IconsaxDocumentCode,
  DocumentText as IconsaxDocumentText,
  Filter as IconsaxFilter,
  Gift as IconsaxGift,
  Global as IconsaxGlobal,
  InfoCircle as IconsaxInfoCircle,
  Key as IconsaxKey,
  Layer as IconsaxLayer,
  Element4 as IconsaxElement4,
  Task as IconsaxTask,
  Lock1 as IconsaxLock1,
  LogoutCurve as IconsaxLogoutCurve,
  Maximize2 as IconsaxMaximize2,
  Maximize3 as IconsaxMaximize3,
  Messages1 as IconsaxMessages1,
  Moon as IconsaxMoon,
  Mouse as IconsaxMouse,
  Hierarchy as IconsaxHierarchy,
  Colorfilter as IconsaxColorfilter,
  MagicStar as IconsaxMagicStar,
  Star as IconsaxStar,
  Flash as IconsaxFlash,
  Pause as IconsaxPause,
  Play as IconsaxPlay,
  Add as IconsaxAdd,
  Printer as IconsaxPrinter,
  Radio as IconsaxRadio,
  Refresh2 as IconsaxRefresh2,
  RotateLeft as IconsaxRotateLeft,
  Save2 as IconsaxSave2,
  SearchNormal1 as IconsaxSearchNormal1,
  Send2 as IconsaxSend2,
  Setting2 as IconsaxSetting2,
  Share as IconsaxShare,
  ShieldCross as IconsaxShieldCross,
  ShieldTick as IconsaxShieldTick,
  Shuffle as IconsaxShuffle,
  Slider as IconsaxSlider,
  Happyemoji as IconsaxHappyemoji,
  Sun1 as IconsaxSun1,
  Trash as IconsaxTrash,
  TrendUp as IconsaxTrendUp,
  ExportCurve as IconsaxExportCurve,
  Profile as IconsaxProfile,
  UserTick as IconsaxUserTick,
  UserAdd as IconsaxUserAdd,
  Profile2User as IconsaxProfile2User,
  VolumeHigh as IconsaxVolumeHigh,
  VolumeCross as IconsaxVolumeCross,
  AudioSquare as IconsaxAudioSquare,
  CloseCircle as IconsaxCloseCircle,
} from 'iconsax-react';

export type IconVariant = 'Linear' | 'Outline' | 'Broken' | 'Bold' | 'Bulk' | 'TwoTone';

export interface AnimatedIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number | string;
  color?: string;
  variant?: IconVariant;
  strokeWidth?: number | string;
  animateMode?: 'hover' | 'always' | 'none';
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

// Helper to determine pixel size from Tailwind className if size is not provided
function resolveSize(size?: number | string, className?: string): number | string {
  if (size !== undefined) return size;
  if (!className) return 20;

  if (className.includes('w-3 ') || className.endsWith('w-3') || className.includes('h-3')) return 12;
  if (className.includes('w-3.5') || className.includes('h-3.5')) return 14;
  if (className.includes('w-4 ') || className.endsWith('w-4') || className.includes('h-4')) return 16;
  if (className.includes('w-5 ') || className.endsWith('w-5') || className.includes('h-5')) return 20;
  if (className.includes('w-6 ') || className.endsWith('w-6') || className.includes('h-6')) return 24;
  if (className.includes('w-7 ') || className.endsWith('w-7') || className.includes('h-7')) return 28;
  if (className.includes('w-8 ') || className.endsWith('w-8') || className.includes('h-8')) return 32;
  if (className.includes('w-9 ') || className.endsWith('w-9') || className.includes('h-9')) return 36;
  if (className.includes('w-10') || className.includes('h-10')) return 40;
  if (className.includes('w-12') || className.includes('h-12')) return 48;
  if (className.includes('w-16') || className.includes('h-16')) return 64;

  return 20;
}

type AnimationCategory =
  | 'spin'
  | 'rotateCcw'
  | 'gear'
  | 'twinkle'
  | 'bell'
  | 'search'
  | 'page'
  | 'avatar'
  | 'heart'
  | 'plane'
  | 'trash'
  | 'pop'
  | 'bounceDown'
  | 'bounceUp'
  | 'lock'
  | 'surge'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'wave'
  | 'blink'
  | 'sun'
  | 'moon'
  | 'plus'
  | 'default';

const animations: Record<AnimationCategory, { hover: any; tap?: any; always?: any }> = {
  spin: {
    hover: { rotate: 360, transition: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] } },
    tap: { scale: 0.88 },
    always: { rotate: 360, transition: { repeat: Infinity, duration: 2, ease: 'linear' } },
  },
  rotateCcw: {
    hover: { rotate: -360, transition: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] } },
    tap: { scale: 0.88 },
  },
  gear: {
    hover: { rotate: [0, 90, 0], scale: [1, 1.12, 1], transition: { duration: 0.7, ease: 'easeInOut' } },
    tap: { scale: 0.9 },
  },
  twinkle: {
    hover: {
      scale: [1, 1.28, 0.92, 1.18, 1],
      rotate: [0, 22, -18, 10, 0],
      filter: [
        'drop-shadow(0 0 0px transparent)',
        'drop-shadow(0 0 8px currentColor)',
        'drop-shadow(0 0 0px transparent)',
      ],
      transition: { duration: 0.85, ease: 'easeInOut' },
    },
    tap: { scale: 0.88 },
    always: {
      scale: [1, 1.15, 1],
      rotate: [0, 10, -10, 0],
      transition: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' },
    },
  },
  bell: {
    hover: {
      rotate: [0, -22, 18, -12, 8, -4, 0],
      scale: [1, 1.12, 1],
      transition: { duration: 0.7, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  search: {
    hover: {
      scale: [1, 1.22, 1],
      rotate: [0, -15, 5, 0],
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
    tap: { scale: 0.92 },
  },
  page: {
    hover: {
      y: [0, -3.5, 0],
      rotate: [0, -5, 5, 0],
      scale: [1, 1.08, 1],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    tap: { scale: 0.92 },
  },
  avatar: {
    hover: {
      y: [0, -3.5, 0],
      scale: [1, 1.12, 1],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  heart: {
    hover: {
      scale: [1, 1.3, 1, 1.2, 1],
      transition: { duration: 0.65, ease: 'easeInOut' },
    },
    tap: { scale: 0.85 },
  },
  plane: {
    hover: {
      x: [0, 5, -2, 0],
      y: [0, -5, 1, 0],
      scale: [1, 1.15, 1],
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
    tap: { scale: 0.88 },
  },
  trash: {
    hover: {
      rotate: [0, -16, 4, 0],
      y: [0, -2.5, 0],
      scale: [1, 1.08, 1],
      transition: { duration: 0.55, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  pop: {
    hover: {
      scale: [1, 1.28, 0.95, 1],
      transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
    },
    tap: { scale: 0.88 },
  },
  bounceDown: {
    hover: {
      y: [0, 4, -1, 0],
      scale: [1, 1.1, 1],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  bounceUp: {
    hover: {
      y: [0, -4, 1, 0],
      scale: [1, 1.1, 1],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  lock: {
    hover: {
      y: [0, -2.5, 0],
      scale: [1, 1.08, 1],
      transition: { duration: 0.45, ease: 'easeInOut' },
    },
    tap: { scale: 0.92 },
  },
  surge: {
    hover: {
      y: [0, -3.5, 0],
      scale: [1, 1.15, 1],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  left: {
    hover: { x: [0, -4, 0], transition: { duration: 0.4, ease: 'easeInOut' } },
    tap: { x: -2 },
  },
  right: {
    hover: { x: [0, 4, 0], transition: { duration: 0.4, ease: 'easeInOut' } },
    tap: { x: 2 },
  },
  up: {
    hover: { y: [0, -4, 0], transition: { duration: 0.4, ease: 'easeInOut' } },
    tap: { y: -2 },
  },
  down: {
    hover: { y: [0, 4, 0], transition: { duration: 0.4, ease: 'easeInOut' } },
    tap: { y: 2 },
  },
  wave: {
    hover: {
      scale: [1, 1.18, 1],
      x: [0, 2.5, 0],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  blink: {
    hover: {
      scaleY: [1, 0.15, 1.15, 1],
      transition: { duration: 0.45, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  sun: {
    hover: {
      rotate: 180,
      scale: [1, 1.18, 1],
      transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] },
    },
    tap: { scale: 0.9 },
  },
  moon: {
    hover: {
      rotate: [0, -20, 15, -8, 0],
      scale: [1, 1.12, 1],
      transition: { duration: 0.65, ease: 'easeInOut' },
    },
    tap: { scale: 0.9 },
  },
  plus: {
    hover: {
      rotate: [0, 90],
      scale: [1, 1.18, 1],
      transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
    },
    tap: { scale: 0.88 },
  },
  default: {
    hover: {
      y: -2,
      scale: 1.14,
      transition: { type: 'spring', stiffness: 450, damping: 18 },
    },
    tap: { scale: 0.92 },
  },
};

export function createAnimatedIcon(
  IconsaxComponent: React.ComponentType<any>,
  category: AnimationCategory = 'default',
  defaultVariant: IconVariant = 'TwoTone'
) {
  const Component = forwardRef<HTMLSpanElement, AnimatedIconProps>((props, ref) => {
    const {
      size,
      color,
      variant = defaultVariant,
      className = '',
      strokeWidth,
      animateMode = 'hover',
      onClick,
      style,
      ...rest
    } = props;

    const [isTriggered, setIsTriggered] = useState(false);
    const parsedSize = resolveSize(size, className);
    const isSpinning = className.includes('animate-spin');
    const animConfig = animations[category] || animations.default;

    // Filter out size classes for inner SVG so it inherits properly or uses parsedSize
    const innerClassName = className
      .split(' ')
      .filter((c) => !c.startsWith('hover:') && !c.includes('animate-spin'))
      .join(' ');

    const triggerAnimation = () => {
      setIsTriggered(true);
      setTimeout(() => setIsTriggered(false), 800);
    };

    return (
      <motion.span
        ref={ref}
        role="img"
        data-iconsax-anim={category}
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
        style={{
          display: 'inline-flex',
          verticalAlign: 'middle',
          ...style,
        }}
        onClick={(e) => {
          triggerAnimation();
          onClick?.(e);
        }}
        onMouseEnter={() => triggerAnimation()}
        whileHover={!isSpinning && animateMode === 'hover' ? animConfig.hover : undefined}
        whileTap={animConfig.tap}
        animate={
          isSpinning
            ? { rotate: 360 }
            : animateMode === 'always' && animConfig.always
            ? animConfig.always
            : isTriggered && !isSpinning
            ? animConfig.hover
            : undefined
        }
        transition={
          isSpinning
            ? { repeat: Infinity, duration: 1, ease: 'linear' }
            : undefined
        }
        {...(rest as any)}
      >
        <IconsaxComponent
          size={parsedSize}
          color={color || 'currentColor'}
          variant={variant}
          className={innerClassName}
        />
      </motion.span>
    );
  });

  Component.displayName = `AnimatedIcon(${IconsaxComponent.displayName || IconsaxComponent.name || 'Iconsax'})`;
  return Component;
}

// 81 Mappings from Lucide to Iconsax Animated equivalents
export const Activity = createAnimatedIcon(IconsaxActivity, 'surge');
export const AlertCircle = createAnimatedIcon(IconsaxDanger, 'bell');
export const AlertTriangle = createAnimatedIcon(IconsaxWarning2, 'bell');
export const ArrowLeft = createAnimatedIcon(IconsaxArrowLeft2, 'left');
export const ArrowRight = createAnimatedIcon(IconsaxArrowRight2, 'right');
export const BookOpen = createAnimatedIcon(IconsaxBook1, 'page');
export const Bot = createAnimatedIcon(IconsaxSmartCar, 'avatar');
export const Briefcase = createAnimatedIcon(IconsaxBriefcase, 'default');
export const Calculator = createAnimatedIcon(IconsaxCalculator, 'pop');
export const Calendar = createAnimatedIcon(IconsaxCalendar, 'page');
export const Check = createAnimatedIcon(IconsaxTickCircle, 'pop');
export const CheckCircle = createAnimatedIcon(IconsaxTickCircle, 'pop');
export const CheckCircle2 = createAnimatedIcon(IconsaxTickCircle, 'pop');
export const CheckSquare = createAnimatedIcon(IconsaxTickSquare, 'pop');
export const ChevronDown = createAnimatedIcon(IconsaxArrowDown2, 'down');
export const ChevronLeft = createAnimatedIcon(IconsaxArrowLeft2, 'left');
export const ChevronRight = createAnimatedIcon(IconsaxArrowRight2, 'right');
export const ChevronUp = createAnimatedIcon(IconsaxArrowUp2, 'up');
export const Clock = createAnimatedIcon(IconsaxClock, 'spin');
export const Coffee = createAnimatedIcon(IconsaxCoffee, 'default');
export const Coins = createAnimatedIcon(IconsaxCoin, 'pop');
export const Compass = createAnimatedIcon(IconsaxDiscover, 'spin');
export const Copy = createAnimatedIcon(IconsaxCopy, 'pop');
export const Database = createAnimatedIcon(IconsaxData, 'surge');
export const Download = createAnimatedIcon(IconsaxImportCurve, 'bounceDown');
export const Edit2 = createAnimatedIcon(IconsaxEdit2, 'default');
export const ExternalLink = createAnimatedIcon(IconsaxExportSquare, 'plane');
export const Eye = createAnimatedIcon(IconsaxEye, 'blink');
export const EyeOff = createAnimatedIcon(IconsaxEyeSlash, 'blink');
export const FileSpreadsheet = createAnimatedIcon(IconsaxDocumentCode, 'page');
export const FileText = createAnimatedIcon(IconsaxDocumentText, 'page');
export const Filter = createAnimatedIcon(IconsaxFilter, 'pop');
export const Gift = createAnimatedIcon(IconsaxGift, 'heart');
export const Globe = createAnimatedIcon(IconsaxGlobal, 'spin');
export const HelpCircle = createAnimatedIcon(IconsaxInfoCircle, 'pop');
export const Info = createAnimatedIcon(IconsaxInfoCircle, 'pop');
export const Key = createAnimatedIcon(IconsaxKey, 'spin');
export const Layers = createAnimatedIcon(IconsaxLayer, 'surge');
export const LayoutGrid = createAnimatedIcon(IconsaxElement4, 'pop');
export const List = createAnimatedIcon(IconsaxTask, 'page');
export const Lock = createAnimatedIcon(IconsaxLock1, 'lock');
export const LogOut = createAnimatedIcon(IconsaxLogoutCurve, 'plane');
export const Maximize2 = createAnimatedIcon(IconsaxMaximize2, 'pop');
export const Minimize2 = createAnimatedIcon(IconsaxMaximize3, 'pop');
export const MessageSquare = createAnimatedIcon(IconsaxMessages1, 'avatar');
export const Moon = createAnimatedIcon(IconsaxMoon, 'moon');
export const MousePointer = createAnimatedIcon(IconsaxMouse, 'default');
export const Orbit = createAnimatedIcon(IconsaxHierarchy, 'spin');
export const Palette = createAnimatedIcon(IconsaxColorfilter, 'twinkle');
export const PartyPopper = createAnimatedIcon(IconsaxMagicStar, 'twinkle');
export const Star = createAnimatedIcon(IconsaxStar, 'twinkle');
export const Flame = createAnimatedIcon(IconsaxFlash, 'twinkle');
export const Pause = createAnimatedIcon(IconsaxPause, 'pop');
export const Play = createAnimatedIcon(IconsaxPlay, 'pop');
export const Plus = createAnimatedIcon(IconsaxAdd, 'plus');
export const Printer = createAnimatedIcon(IconsaxPrinter, 'bounceDown');
export const Radio = createAnimatedIcon(IconsaxRadio, 'wave');
export const RefreshCw = createAnimatedIcon(IconsaxRefresh2, 'spin');
export const RotateCcw = createAnimatedIcon(IconsaxRotateLeft, 'rotateCcw');
export const Save = createAnimatedIcon(IconsaxSave2, 'pop');
export const Search = createAnimatedIcon(IconsaxSearchNormal1, 'search');
export const Send = createAnimatedIcon(IconsaxSend2, 'plane');
export const Settings = createAnimatedIcon(IconsaxSetting2, 'gear');
export const Share2 = createAnimatedIcon(IconsaxShare, 'plane');
export const ShieldAlert = createAnimatedIcon(IconsaxShieldCross, 'bell');
export const ShieldCheck = createAnimatedIcon(IconsaxShieldTick, 'pop');
export const Shuffle = createAnimatedIcon(IconsaxShuffle, 'spin');
export const Sliders = createAnimatedIcon(IconsaxSlider, 'gear');
export const Smile = createAnimatedIcon(IconsaxHappyemoji, 'heart');
export const Sparkle = createAnimatedIcon(IconsaxMagicStar, 'twinkle');
export const Sparkles = createAnimatedIcon(IconsaxMagicStar, 'twinkle');
export const Sun = createAnimatedIcon(IconsaxSun1, 'sun');
export const Trash2 = createAnimatedIcon(IconsaxTrash, 'trash');
export const TrendingUp = createAnimatedIcon(IconsaxTrendUp, 'surge');
export const Upload = createAnimatedIcon(IconsaxExportCurve, 'bounceUp');
export const User = createAnimatedIcon(IconsaxProfile, 'avatar');
export const UserCheck = createAnimatedIcon(IconsaxUserTick, 'avatar');
export const UserPlus = createAnimatedIcon(IconsaxUserAdd, 'avatar');
export const Users = createAnimatedIcon(IconsaxProfile2User, 'avatar');
export const Volume2 = createAnimatedIcon(IconsaxVolumeHigh, 'wave');
export const VolumeX = createAnimatedIcon(IconsaxVolumeCross, 'wave');
export const Waves = createAnimatedIcon(IconsaxAudioSquare, 'wave');
export const X = createAnimatedIcon(IconsaxCloseCircle, 'pop');
export const Zap = createAnimatedIcon(IconsaxFlash, 'twinkle');
