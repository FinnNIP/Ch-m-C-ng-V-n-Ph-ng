import React, { forwardRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import * as Iconsax from 'iconsax-react';

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
export const Activity = createAnimatedIcon(Iconsax.Activity, 'surge');
export const AlertCircle = createAnimatedIcon(Iconsax.Danger, 'bell');
export const AlertTriangle = createAnimatedIcon(Iconsax.Warning2, 'bell');
export const ArrowLeft = createAnimatedIcon(Iconsax.ArrowLeft2, 'left');
export const ArrowRight = createAnimatedIcon(Iconsax.ArrowRight2, 'right');
export const BookOpen = createAnimatedIcon(Iconsax.Book1, 'page');
export const Bot = createAnimatedIcon(Iconsax.SmartCar, 'avatar');
export const Briefcase = createAnimatedIcon(Iconsax.Briefcase, 'default');
export const Calculator = createAnimatedIcon(Iconsax.Calculator, 'pop');
export const Calendar = createAnimatedIcon(Iconsax.Calendar, 'page');
export const Check = createAnimatedIcon(Iconsax.TickCircle, 'pop');
export const CheckCircle = createAnimatedIcon(Iconsax.TickCircle, 'pop');
export const CheckCircle2 = createAnimatedIcon(Iconsax.TickCircle, 'pop');
export const CheckSquare = createAnimatedIcon(Iconsax.TickSquare, 'pop');
export const ChevronDown = createAnimatedIcon(Iconsax.ArrowDown2, 'down');
export const ChevronLeft = createAnimatedIcon(Iconsax.ArrowLeft2, 'left');
export const ChevronRight = createAnimatedIcon(Iconsax.ArrowRight2, 'right');
export const ChevronUp = createAnimatedIcon(Iconsax.ArrowUp2, 'up');
export const Clock = createAnimatedIcon(Iconsax.Clock, 'spin');
export const Coffee = createAnimatedIcon(Iconsax.Coffee, 'default');
export const Coins = createAnimatedIcon(Iconsax.Coin, 'pop');
export const Compass = createAnimatedIcon(Iconsax.Discover, 'spin');
export const Copy = createAnimatedIcon(Iconsax.Copy, 'pop');
export const Database = createAnimatedIcon(Iconsax.Data, 'surge');
export const Download = createAnimatedIcon(Iconsax.ImportCurve, 'bounceDown');
export const Edit2 = createAnimatedIcon(Iconsax.Edit2, 'default');
export const ExternalLink = createAnimatedIcon(Iconsax.ExportSquare, 'plane');
export const Eye = createAnimatedIcon(Iconsax.Eye, 'blink');
export const EyeOff = createAnimatedIcon(Iconsax.EyeSlash, 'blink');
export const FileSpreadsheet = createAnimatedIcon(Iconsax.DocumentCode, 'page');
export const FileText = createAnimatedIcon(Iconsax.DocumentText, 'page');
export const Filter = createAnimatedIcon(Iconsax.Filter, 'pop');
export const Gift = createAnimatedIcon(Iconsax.Gift, 'heart');
export const Globe = createAnimatedIcon(Iconsax.Global, 'spin');
export const HelpCircle = createAnimatedIcon(Iconsax.InfoCircle, 'pop');
export const Info = createAnimatedIcon(Iconsax.InfoCircle, 'pop');
export const Key = createAnimatedIcon(Iconsax.Key, 'spin');
export const Layers = createAnimatedIcon(Iconsax.Layer, 'surge');
export const LayoutGrid = createAnimatedIcon(Iconsax.Element4, 'pop');
export const List = createAnimatedIcon(Iconsax.Task, 'page');
export const Lock = createAnimatedIcon(Iconsax.Lock1, 'lock');
export const LogOut = createAnimatedIcon(Iconsax.LogoutCurve, 'plane');
export const Maximize2 = createAnimatedIcon(Iconsax.Maximize2, 'pop');
export const MessageSquare = createAnimatedIcon(Iconsax.Messages1, 'avatar');
export const Moon = createAnimatedIcon(Iconsax.Moon, 'moon');
export const MousePointer = createAnimatedIcon(Iconsax.Mouse, 'default');
export const Orbit = createAnimatedIcon(Iconsax.Hierarchy, 'spin');
export const Palette = createAnimatedIcon(Iconsax.Colorfilter, 'twinkle');
export const PartyPopper = createAnimatedIcon(Iconsax.MagicStar, 'twinkle');
export const Pause = createAnimatedIcon(Iconsax.Pause, 'pop');
export const Play = createAnimatedIcon(Iconsax.Play, 'pop');
export const Plus = createAnimatedIcon(Iconsax.Add, 'plus');
export const Printer = createAnimatedIcon(Iconsax.Printer, 'bounceDown');
export const Radio = createAnimatedIcon(Iconsax.Radio, 'wave');
export const RefreshCw = createAnimatedIcon(Iconsax.Refresh2, 'spin');
export const RotateCcw = createAnimatedIcon(Iconsax.RotateLeft, 'rotateCcw');
export const Save = createAnimatedIcon(Iconsax.Save2, 'pop');
export const Search = createAnimatedIcon(Iconsax.SearchNormal1, 'search');
export const Send = createAnimatedIcon(Iconsax.Send2, 'plane');
export const Settings = createAnimatedIcon(Iconsax.Setting2, 'gear');
export const Share2 = createAnimatedIcon(Iconsax.Share, 'plane');
export const ShieldAlert = createAnimatedIcon(Iconsax.ShieldCross, 'bell');
export const ShieldCheck = createAnimatedIcon(Iconsax.ShieldTick, 'pop');
export const Shuffle = createAnimatedIcon(Iconsax.Shuffle, 'spin');
export const Sliders = createAnimatedIcon(Iconsax.Slider, 'gear');
export const Smile = createAnimatedIcon(Iconsax.Happyemoji, 'heart');
export const Sparkle = createAnimatedIcon(Iconsax.MagicStar, 'twinkle');
export const Sparkles = createAnimatedIcon(Iconsax.MagicStar, 'twinkle');
export const Sun = createAnimatedIcon(Iconsax.Sun1, 'sun');
export const Trash2 = createAnimatedIcon(Iconsax.Trash, 'trash');
export const TrendingUp = createAnimatedIcon(Iconsax.TrendUp, 'surge');
export const Upload = createAnimatedIcon(Iconsax.ExportCurve, 'bounceUp');
export const User = createAnimatedIcon(Iconsax.Profile, 'avatar');
export const UserCheck = createAnimatedIcon(Iconsax.UserTick, 'avatar');
export const UserPlus = createAnimatedIcon(Iconsax.UserAdd, 'avatar');
export const Users = createAnimatedIcon(Iconsax.Profile2User, 'avatar');
export const Volume2 = createAnimatedIcon(Iconsax.VolumeHigh, 'wave');
export const VolumeX = createAnimatedIcon(Iconsax.VolumeCross, 'wave');
export const Waves = createAnimatedIcon(Iconsax.AudioSquare, 'wave');
export const X = createAnimatedIcon(Iconsax.CloseCircle, 'pop');
export const Zap = createAnimatedIcon(Iconsax.Flash, 'twinkle');

// Export Iconsax library direct access as well
export { Iconsax };
