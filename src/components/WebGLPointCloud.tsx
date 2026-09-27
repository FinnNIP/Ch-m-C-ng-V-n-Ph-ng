import React, { useEffect, useRef, useState } from 'react';

// WebGL Van Gogh Celestial Starry Sky & Stardust Engine
// Features:
// 1. Serene Van Gogh Stars with Calming Musical Rhythm, Non-Blinding Gentle Cores & Iridescent Pastel Rainbow Sheen
// 2. Physics-based Accelerating Shooting Stars with Gravity, Air Resistance & Motion Trail
// 3. True Mountain Silhouette & Stroke Glow matching exact mountain color when shooting stars land
// 4. Ultra-slender, Graceful Comet Tail with Fast Fade-out and Steep Needle Taper
// 5. Comet Tail Cursor that Dissolves Stars on Touch into Sinking Stardust
// 6. River Rhône Specular Water Reflection & Soft Floating Stardust

// --- Procedural Terrain Mathematics (Matching WebGLBackground Mountain Skyline Pixel-for-Pixel) ---
function fract(x: number): number {
  return x - Math.floor(x);
}

function hash2D(x: number, y: number): number {
  const dot = x * 127.1 + y * 311.7;
  return fract(Math.sin(dot) * 43758.5453123);
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fract(x);
  const fy = fract(y);
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);

  const bl = hash2D(ix, iy);
  const br = hash2D(ix + 1, iy);
  const tl = hash2D(ix, iy + 1);
  const tr = hash2D(ix + 1, iy + 1);

  const b = bl + (br - bl) * ux;
  const t = tl + (tr - tl) * ux;
  return b + (t - b) * uy;
}

function fbm2D(x: number, y: number): number {
  let v = 0.0;
  let a = 0.5;
  let sx = 1.0;
  let sy = 1.0;
  for (let i = 0; i < 5; i++) {
    v += a * noise2D(x * sx, y * sy);
    sx *= 2.0;
    sy *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Compute the exact visible mountain skyline crest screen Y position matching WebGLBackground GLSL shader
function getMountainRidgeScreenY(screenX: number, width: number, height: number, time: number, speed: number = 0.9): number {
  const t = time * speed;
  const aspect = width / height;
  const stX = ((screenX / width) * 2.0 - 1.0) * aspect * 5.0;

  const ridgeA = fbm2D(stX * 0.20 + 0.3 + t * 0.022, 1.5) * 12.9 - 2.18;
  const ridgeB = fbm2D(stX * 0.31 + 5.7 + t * 0.045, 3.2) * 5.4 - 0.9;
  const maxRidge = Math.max(ridgeA, ridgeB);

  // In stM coords: stM.y = (gl_FragCoord.y / height * 2.0 - 1.0) * 5.0 + 2.5
  // gl_FragCoord.y = height - screenY => screenY = height * (0.75 - maxRidge / 10.0)
  const normY = 0.75 - maxRidge / 10.0;
  return Math.max(height * 0.35, Math.min(height * 0.68, normY * height));
}

// Determine which mountain ridge is topmost at a given screen X to match its exact neon color
function getTopmostMountainColor(screenX: number, width: number, height: number, time: number, primaryColor: string, secondaryColor: string, speed: number = 0.9): string {
  const t = time * speed;
  const aspect = width / height;
  const stX = ((screenX / width) * 2.0 - 1.0) * aspect * 5.0;

  const ridgeA = fbm2D(stX * 0.20 + 0.3 + t * 0.022, 1.5) * 12.9 - 2.18;
  const ridgeB = fbm2D(stX * 0.31 + 5.7 + t * 0.045, 3.2) * 5.4 - 0.9;

  if (ridgeA >= ridgeB) {
    return primaryColor; // Ridge A rim is primary neon color
  } else {
    return secondaryColor; // Ridge B rim is secondary neon color
  }
}

const PC_VERTEX_SHADER = `
  #ifdef GL_ES
  precision mediump float;
  precision mediump int;
  #endif

  attribute vec3 a_base_pos; // x: -1.25..1.25, y: -1.25..1.25, z: 0.20..2.8 (depth layer)
  attribute vec4 a_params;   // x: seed, y: base_size, z: fall_rate, w: twinkle_freq

  uniform vec2 u_resolution;
  uniform mediump float u_time;
  uniform vec2 u_mouse;          // normalized -1.0 .. 1.0 (smoothly damped)
  uniform float u_sparkle_size;
  uniform float u_speed;
  uniform float u_parallax_strength;
  uniform vec3 u_shockwave;      // x: click_x, y: click_y, z: ripple_radius
  uniform float u_shockwave_active;
  uniform float u_is_dark;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform float u_color_mode;    // 0: Van Gogh Starry Gold, 1: Sunflowers & Irises, 2: Warm Amber, 3: Neon Sync

  varying vec3 v_color;
  varying float v_alpha;
  varying float v_sparkle;
  varying float v_depth;
  varying float v_water_factor;  // 0.0: sky star, 1.0: river surface water reflection
  varying float v_seed;

  void main() {
      float t = u_time * u_speed;
      float seed = a_params.x;
      float currentSize = a_params.y; // Modulated by dissolution/respawn state
      float fallRate = a_params.z;
      float z = a_base_pos.z; // 0.20 (foreground dust) to 2.80 (deep celestial dome)

      float aspect = u_resolution.x / u_resolution.y;

      // 1. SERENE CELESTIAL STABILITY (Gentle, peaceful depth - NO dizzying displacement)
      vec2 parallaxOffset = -u_mouse * (0.007 * u_parallax_strength) * (1.0 / (z * 1.4 + 0.6));

      // 2. SLOW, MEDITATIVE VAN GOGH DRIFT
      float fallSpeed = (0.015 + fallRate * 0.026) * (1.0 / (z * 0.75 + 0.45));
      float yRaw = a_base_pos.y - t * fallSpeed;

      // Seamless vertical modulo across -1.25 .. 1.25 (span 2.5)
      float y = mod(yRaw + 1.25, 2.5) - 1.25;

      // 3. POETIC HORIZONTAL HARMONIC SWAY (Van Gogh brushstroke flow)
      float swayFreq = 0.32 + seed * 0.48;
      float swayAmp = (0.012 + seed * 0.020);
      float x = a_base_pos.x + sin(t * swayFreq + seed * 6.28318) * swayAmp;

      vec2 pos = vec2(x, y) + parallaxOffset;

      // 4. WATER SURFACE COUPLING (River Rhône reflection boundary around y < -0.22)
      float waterFactor = smoothstep(-0.20, -0.48, pos.y);
      v_water_factor = waterFactor;
      v_seed = seed;

      // 5. GENTLE WATER DROPLET RIPPLE ON WATER SURFACE ONLY (Sky stars remain rock-steady and serene!)
      float rippleRadius = u_shockwave.z;
      if (u_shockwave_active > 0.5 && rippleRadius > 0.0 && waterFactor > 0.12) {
          vec2 rippleCenter = u_shockwave.xy;
          rippleCenter.x *= aspect;
          vec2 pos_scaled = vec2(pos.x * aspect, pos.y);
          float dRipple = length(pos_scaled - rippleCenter);
          float ring = exp(-pow((dRipple - rippleRadius) / 0.14, 2.0));
          vec2 waveDir = normalize(pos_scaled - rippleCenter + vec2(0.0001));
          pos += (waveDir / aspect) * ring * 0.012 * waterFactor * (1.0 - rippleRadius * 0.75);
      }

      // 6. SMOOTH EDGE VIGNETTE FADE
      float edgeFade = smoothstep(-1.25, -0.98, y) * smoothstep(1.25, 0.98, y) *
                       smoothstep(-1.25, -0.98, pos.x) * smoothstep(1.25, 0.98, pos.x);

      // 7. CALMING SINE-WAVE PULSING RHYTHM (Smooth fade down and brightening up)
      float phase = seed * 6.28318;
      float starFreq = 0.55 + fract(seed * 7.1) * 0.65;
      float sineWave = sin(u_time * starFreq + phase) * 0.5 + 0.5;
      float twinkle = smoothstep(0.06, 0.94, sineWave);

      // Proximity soft aura when cursor moves nearby
      vec2 m = u_mouse;
      m.x *= aspect;
      vec2 pos_m = vec2(pos.x * aspect, pos.y);
      float distToMouse = length(pos_m - m);
      float cursorHalo = exp(-distToMouse * 4.2) * 0.30;
      twinkle = clamp(twinkle + cursorHalo, 0.0, 1.0);

      v_sparkle = twinkle;
      v_depth = z;

      // 8. COLOR HARMONICS INSPIRING VAN GOGH
      vec3 col = vec3(1.0);
      if (u_color_mode < 0.5) {
          // 🌌 VAN GOGH: THE STARRY NIGHT & RHÔNE
          vec3 amberGold    = vec3(1.0, 0.88, 0.44);
          vec3 starlightEgg = vec3(0.98, 0.97, 0.93);
          vec3 nightCobalt  = vec3(0.45, 0.65, 0.98);

          float k = fract(seed * 4.7);
          if (k < 0.68) {
              col = mix(amberGold, starlightEgg, fract(k * 1.5));
          } else {
              col = mix(starlightEgg, nightCobalt, fract(k * 2.8) * 0.50);
          }
      } 
      else if (u_color_mode < 1.5) {
          // 🌻 SUNFLOWERS & IRISES
          vec3 sunflower = vec3(1.0, 0.82, 0.28);
          vec3 iris      = vec3(0.72, 0.56, 0.98);
          col = mix(sunflower, iris, fract(seed * 3.1));
      } 
      else if (u_color_mode < 2.5) {
          // ☕ CAFÉ TERRACE AT NIGHT
          vec3 warmHoney = vec3(1.0, 0.76, 0.36);
          vec3 peachLantern = vec3(0.98, 0.88, 0.72);
          col = mix(warmHoney, peachLantern, fract(seed * 3.4));
      } 
      else {
          // 🎨 NEON SYNC
          col = mix(u_color1, u_color2, sin(seed * 6.28 + t * 0.5) * 0.5 + 0.5);
      }

      // River Rhône reflection tinting
      if (waterFactor > 0.05) {
          vec3 riverGlow = mix(col, vec3(0.22, 0.88, 0.98), 0.35);
          col = mix(col, riverGlow, waterFactor);
      }

      if (u_is_dark < 0.5) {
          col = mix(col, vec3(0.38, 0.48, 0.75), 0.35);
      }

      v_color = col;

      // 9. PERSPECTIVE SIZING & GENTLE PROPORTIONS (Never overly huge or glaring)
      float perspective = 1.0 / (z * 0.85 + 0.40);
      float size = currentSize * u_sparkle_size * perspective * (0.75 + twinkle * 0.35);

      if (waterFactor > 0.1) {
          size *= (1.0 + waterFactor * 0.35);
      }

      v_alpha = edgeFade * mix(0.15, 0.65, twinkle) * mix(0.70, 1.0, u_is_dark);

      // Point size clamp based on screen viewport - gentle and elegant proportions
      gl_PointSize = clamp(size * (u_resolution.y / 768.0) * 0.72, 0.0, 18.0);
      gl_Position = vec4(pos, 0.0, 1.0);
  }
`;

const PC_FRAGMENT_SHADER = `
  #ifdef GL_ES
  precision mediump float;
  precision mediump int;
  #endif

  uniform mediump float u_time;

  varying vec3 v_color;
  varying float v_alpha;
  varying float v_sparkle;
  varying float v_depth;
  varying float v_water_factor;
  varying float v_seed;

  void main() {
      vec2 coord = gl_PointCoord * 2.0 - 1.0;

      // WATER SURFACE ANISOTROPY:
      if (v_water_factor > 0.05) {
          float waveShimmer = 1.9 + sin(u_time * 2.0 + v_seed * 6.28) * 0.35;
          coord.y *= mix(1.0, waveShimmer, v_water_factor);
          coord.x *= mix(1.0, 0.82, v_water_factor);
      }

      float dist = length(coord);
      if (dist > 1.0) discard;

      // Ethereal, whisper-soft pastel rainbow halo (nhẹ nhàng, dịu nhẹ, mờ mờ ảo ảo, không chói)
      vec3 pastelRainbow = 0.82 + 0.18 * cos(6.28318 * (dist * 1.5 - u_time * 0.08 + vec3(0.0, 0.33, 0.67)));
      float rainbowRing = exp(-pow((dist - 0.44) / 0.24, 2.0)) * 0.10;

      // Soft starlight core & gentle central glow (bớt chói gắt, ngọc trai êm dịu, không lóa)
      float core = exp(-dist * 8.0) * 0.18;
      float centerGlow = exp(-dist * 3.6) * 0.14;

      // Soft concentric Van Gogh aura
      float haloRing = sin(dist * 12.0 - u_time * 0.65 + v_seed * 6.28) * 0.5 + 0.5;
      float impastoAura = exp(-dist * 2.6) * (0.12 + 0.08 * haloRing);

      // Delicate 4-pointed celestial glint
      float spikeStrength = mix(0.12, 0.02, v_water_factor);
      float spikeX = max(0.0, 1.0 - abs(coord.x) * 3.0) * max(0.0, 1.0 - abs(coord.y) * 1.0);
      float spikeY = max(0.0, 1.0 - abs(coord.y) * 3.0) * max(0.0, 1.0 - abs(coord.x) * 1.0);
      float spikes = pow(spikeX + spikeY, 2.0) * spikeStrength;

      // Blend starlight hue with delicate pastel rainbow sheen
      vec3 finalCol = mix(v_color, pastelRainbow, rainbowRing * 0.25);
      finalCol = mix(finalCol, vec3(0.98, 0.98, 0.95), core * 0.25);

      float intensity = impastoAura + centerGlow + spikes + core + rainbowRing * 0.15;
      float waterWaveAlpha = mix(1.0, 0.65 + 0.35 * sin(u_time * 1.8 + v_seed * 6.28), v_water_factor);
      float finalAlpha = clamp(intensity * v_alpha * waterWaveAlpha, 0.0, 0.48);

      gl_FragColor = vec4(finalCol * finalAlpha, finalAlpha);
  }
`;

interface ShootingStar {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  color: string;
  impacted: boolean;
  history: Array<{ x: number; y: number }>;
  targetType: 'mountain' | 'sea';
}

// Glowing Mountain Silhouette & Stroke Event when shooting star lands on the mountain
interface MountainStrokeGlow {
  id: number;
  x: number;
  y: number;
  color: string;      // Matched mountain neon color (primary or secondary)
  span: number;       // horizontal extent along ridge
  maxSpan: number;
  alpha: number;      // 1.0 -> 0.0
  sparks: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    size: number;
    color: string;
    decay: number;
  }>;
}

interface CometTrailPoint {
  x: number;
  y: number;
  time: number;
  size: number;
}

interface CometStardust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

// Dissolved stardust particle when comet cursor touches a star ("tan biến dạng particle nhỏ nhỏ lắng xuống tan biến trong hư vô")
interface DissolvedDust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  swayFreq: number;
  swayPhase: number;
  gravity: number;
  rot: number;
  rotSpeed: number;
}

interface StarEntity {
  id: number;
  baseX: number;
  baseY: number;
  depth: number;
  baseSize: number;
  seed: number;
  twinkleFreq: number;
  fallRate: number;
  shattered: boolean;
  dissolveAlpha: number; // 1.0 (intact) -> 0.0 (dissolved)
  respawnTime: number;   // Timestamp to re-condense
  screenX: number;
  screenY: number;
  colorMode: number;
}

export interface PointCloudSettings {
  enabled: boolean;
  particleCount: number;      // default ~280
  sparkleSize: number;        // 0.9 .. 2.2
  colorMode: number;          // 0: Van Gogh Starry Gold, 1: Sunflowers, 2: Café Terrace, 3: Neon Sync
  speed: number;              // 0.10 .. 0.70
  parallaxStrength: number;   // 0.0 .. 1.0 (default 0.15)
  shootingStarsEnabled: boolean; // default true
  cometTailEnabled: boolean;     // default true
}

export const WebGLPointCloud: React.FC<{
  primaryColor?: string;
  secondaryColor?: string;
  isDarkMode?: boolean;
}> = ({
  primaryColor = '#00f2fe',
  secondaryColor = '#4facfe',
  isDarkMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const celestialCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Settings from localStorage with optimized defaults
  const [settings, setSettings] = useState<PointCloudSettings>(() => ({
    enabled: localStorage.getItem('pc_enabled') !== 'false',
    particleCount: Number(localStorage.getItem('pc_count') ?? '280'),
    sparkleSize: Number(localStorage.getItem('pc_size') ?? '1.55'),
    colorMode: Number(localStorage.getItem('pc_color_mode') ?? '0'),
    speed: Number(localStorage.getItem('pc_speed') ?? '0.30'),
    parallaxStrength: Number(localStorage.getItem('pc_parallax') ?? '0.15'),
    shootingStarsEnabled: localStorage.getItem('pc_shooting_stars') !== 'false',
    cometTailEnabled: localStorage.getItem('pc_comet_tail') !== 'false',
  }));

  const mouseRef = useRef({ x: 0.0, y: 0.0 });
  const targetMouseRef = useRef({ x: 0.0, y: 0.0 });
  const shockwaveRef = useRef({ x: 0.0, y: 0.0, radius: 0.0, active: false });
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const mountainGlowsRef = useRef<MountainStrokeGlow[]>([]);

  // Star entities list for interactive star collision and dissolution
  const starsRef = useRef<StarEntity[]>([]);
  const dissolvedDustRef = useRef<DissolvedDust[]>([]);

  // Comet Tail tracking refs
  const cometTrailRef = useRef<CometTrailPoint[]>([]);
  const cometSparksRef = useRef<CometStardust[]>([]);
  const lastMousePosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Helper to spawn a shooting star with realistic atmospheric entry
  const spawnShootingStar = () => {
    if (!settings.shootingStarsEnabled || !settings.enabled) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Start high up in the sky
    const isFromLeft = Math.random() > 0.50;
    const startX = isFromLeft 
      ? Math.random() * (width * 0.55)
      : width * 0.45 + Math.random() * (width * 0.55);
    const startY = -15 + Math.random() * (height * 0.12);

    // Initial velocity entering orbit
    const angle = isFromLeft 
      ? (Math.PI / 180) * (20 + Math.random() * 22)
      : (Math.PI / 180) * (138 + Math.random() * 22);
    const initialSpeed = 220 + Math.random() * 110;

    const colors = [
      '#ffe082', // Warm Van Gogh Gold
      '#fff9c4', // Radiant Starlight Amber
      '#80d8ff', // Celestial Rhône Cyan
      '#ea80fc', // Ethereal Twilight Violet
      '#ffcc80'  // Golden Honey Lantern
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const targetType: 'mountain' | 'sea' = Math.random() < 0.45 ? 'sea' : 'mountain';

    shootingStarsRef.current.push({
      id: Date.now() + Math.random(),
      x: startX,
      y: startY,
      vx: Math.cos(angle) * initialSpeed,
      vy: Math.sin(angle) * initialSpeed,
      opacity: 0,
      size: 3.4 + Math.random() * 2.0,
      color,
      impacted: false,
      history: [],
      targetType
    });
  };

  // Trigger water splash & ripple when shooting star plunges into the river / sea
  const triggerSeaImpact = (x: number, y: number, starColor: string) => {
    // Water ripple shockwave in WebGLBackground
    window.dispatchEvent(new CustomEvent('meteor-mountain-impact', {
      detail: {
        clientX: x,
        clientY: y,
        color: '#00f2fe'
      }
    }));

    // Water droplet sparks splashing upwards from the river
    const sparks: MountainStrokeGlow['sparks'] = [];
    const count = 10 + Math.floor(Math.random() * 8);
    const sparkColors = ['#ffffff', '#80d8ff', '#00f2fe', starColor];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
      const speed = 30 + Math.random() * 60;
      sparks.push({
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 4 - 2),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        alpha: 0.95,
        size: 1.2 + Math.random() * 2.0,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        decay: 1.2 + Math.random() * 0.7
      });
    }

    mountainGlowsRef.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      color: '#00f2fe',
      span: 0,
      maxSpan: 55 + Math.random() * 30,
      alpha: 0.80,
      sparks
    });
  };

  // Trigger glowing stroke & silhouette of the mountain ridge where the shooting star strikes
  const triggerMountainStrokeGlow = (x: number, y: number, mountainColor: string) => {
    const sparks: MountainStrokeGlow['sparks'] = [];
    const sparkCount = 8 + Math.floor(Math.random() * 6);
    const sparkColors = ['#fff8e1', '#ffffff', mountainColor];

    for (let i = 0; i < sparkCount; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
      const speed = 25 + Math.random() * 55;
      sparks.push({
        x: x + (Math.random() * 6 - 3),
        y: y + (Math.random() * 2 - 1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.9,
        size: 1.0 + Math.random() * 1.8,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        decay: 1.1 + Math.random() * 0.6
      });
    }

    // Delicate poetic span along mountain slope
    mountainGlowsRef.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      color: mountainColor,
      span: 0,
      maxSpan: 65 + Math.random() * 25,
      alpha: 0.70,
      sparks
    });
  };

  // Trigger interactive sparkle burst & glowing bloom when comet tail sweeps across mountain stroke
  const lastSweepTimeRef = useRef(0);
  const triggerMountainSweepGlow = (x: number, y: number, mountainColor: string, speedFactor: number) => {
    const now = performance.now();
    if (now - lastSweepTimeRef.current < 65) return;
    lastSweepTimeRef.current = now;

    const sparks: MountainStrokeGlow['sparks'] = [];
    const count = 5 + Math.floor(Math.random() * 5);
    const sparkColors = ['#ffffff', '#fff9c4', mountainColor, primaryColor, secondaryColor];

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
      const sp = 20 + Math.random() * (45 + Math.min(speedFactor * 35, 50));
      sparks.push({
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 4 - 2),
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp - 15,
        alpha: 0.95,
        size: 1.0 + Math.random() * 1.8,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        decay: 1.4 + Math.random() * 0.8
      });
    }

    mountainGlowsRef.current.push({
      id: now + Math.random(),
      x,
      y,
      color: mountainColor,
      span: 0,
      maxSpan: 90 + Math.random() * 50,
      alpha: 0.85,
      sparks
    });
  };

  // Global settings update listener & manual trigger event
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSettings(prev => {
          const next = { ...prev, ...detail };
          if (detail.enabled !== undefined) localStorage.setItem('pc_enabled', String(detail.enabled));
          if (detail.particleCount !== undefined) localStorage.setItem('pc_count', String(detail.particleCount));
          if (detail.sparkleSize !== undefined) localStorage.setItem('pc_size', String(detail.sparkleSize));
          if (detail.colorMode !== undefined) localStorage.setItem('pc_color_mode', String(detail.colorMode));
          if (detail.speed !== undefined) localStorage.setItem('pc_speed', String(detail.speed));
          if (detail.parallaxStrength !== undefined) localStorage.setItem('pc_parallax', String(detail.parallaxStrength));
          if (detail.shootingStarsEnabled !== undefined) localStorage.setItem('pc_shooting_stars', String(detail.shootingStarsEnabled));
          if (detail.cometTailEnabled !== undefined) localStorage.setItem('pc_comet_tail', String(detail.cometTailEnabled));
          return next;
        });
      }
    };

    const handleTriggerShootingStar = () => {
      spawnShootingStar();
      if (Math.random() < 0.35) {
        setTimeout(spawnShootingStar, 450 + Math.random() * 600);
      }
    };

    window.addEventListener('update-pointcloud-settings', handleUpdate);
    window.addEventListener('trigger-shooting-star', handleTriggerShootingStar);
    return () => {
      window.removeEventListener('update-pointcloud-settings', handleUpdate);
      window.removeEventListener('trigger-shooting-star', handleTriggerShootingStar);
    };
  }, []);

  // Organic Shooting Star Low Frequency Timer (Every 10 - 22s)
  useEffect(() => {
    if (!settings.shootingStarsEnabled || !settings.enabled) return;

    let timeoutId: number;

    const scheduleNext = () => {
      const delay = 10000 + Math.random() * 12000;
      timeoutId = window.setTimeout(() => {
        spawnShootingStar();
        if (Math.random() < 0.28) {
          setTimeout(spawnShootingStar, 500 + Math.random() * 700);
        }
        scheduleNext();
      }, delay);
    };

    const initialTimer = window.setTimeout(() => {
      spawnShootingStar();
      scheduleNext();
    }, 2400);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(timeoutId);
    };
  }, [settings.shootingStarsEnabled, settings.enabled]);

  // Smooth mouse tracking, Slender Comet Tail recording & click ripple
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;
      const now = performance.now();

      // Normalize mouse to -1.0 .. 1.0 for WebGL
      targetMouseRef.current = {
        x: (clientX / window.innerWidth) * 2.0 - 1.0,
        y: (1.0 - clientY / window.innerHeight) * 2.0 - 1.0
      };

      // Record Slender Comet Tail node
      if (settings.cometTailEnabled && settings.enabled) {
        const last = lastMousePosRef.current;
        const dx = clientX - last.x;
        const dy = clientY - last.y;
        const dt = Math.max(now - last.time, 1);
        const mouseSpeed = Math.hypot(dx, dy) / dt;

        lastMousePosRef.current = { x: clientX, y: clientY, time: now };

        // Add slender trail node (narrow width, graceful, airy)
        cometTrailRef.current.unshift({
          x: clientX,
          y: clientY,
          time: now,
          size: Math.min(3.2 + mouseSpeed * 1.0, 5.2)
        });

        // Limit trail length for slender elegance
        if (cometTrailRef.current.length > 14) {
          cometTrailRef.current.pop();
        }

        // Check if mouse / comet tail sweeps across the mountain ridge stroke
        const ridgeY = getMountainRidgeScreenY(clientX, window.innerWidth, window.innerHeight, now * 0.001, 0.9);
        const prevRidgeY = getMountainRidgeScreenY(last.x, window.innerWidth, window.innerHeight, now * 0.001, 0.9);
        const distToRidge = Math.abs(clientY - ridgeY);
        const crossedRidge = (last.y < prevRidgeY && clientY >= ridgeY) || (last.y > prevRidgeY && clientY <= ridgeY);

        if (distToRidge < 32 || crossedRidge) {
          const mountainCol = getTopmostMountainColor(clientX, window.innerWidth, window.innerHeight, now * 0.001, primaryColor, secondaryColor, 0.9);
          triggerMountainSweepGlow(clientX, ridgeY, mountainCol, mouseSpeed);
        }

        // Spawn delicate stardust sparks in the comet's wake
        if (mouseSpeed > 0.08) {
          const sparkColors = ['#fff8e1', '#ffe082', '#80d8ff', '#ffffff'];
          if (Math.random() < 0.55) {
            const angle = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5) * 1.2;
            const sparkVel = 18 + Math.random() * 45;
            cometSparksRef.current.push({
              x: clientX + (Math.random() * 4 - 2),
              y: clientY + (Math.random() * 4 - 2),
              vx: Math.cos(angle) * sparkVel,
              vy: Math.sin(angle) * sparkVel + 8.0,
              alpha: 0.75,
              size: 0.8 + Math.random() * 1.3,
              color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
              rotation: Math.random() * Math.PI,
              rotSpeed: (Math.random() - 0.5) * 3.0
            });
          }
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      shockwaveRef.current = {
        x: (e.clientX / window.innerWidth) * 2.0 - 1.0,
        y: (1.0 - e.clientY / window.innerHeight) * 2.0 - 1.0,
        radius: 0.02,
        active: true
      };
      window.dispatchEvent(new CustomEvent('meteor-mountain-impact', {
        detail: {
          clientX: e.clientX,
          clientY: e.clientY,
          color: primaryColor
        }
      }));
    };

    const onDblClick = () => {
      spawnShootingStar();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const now = performance.now();
        targetMouseRef.current = {
          x: (t.clientX / window.innerWidth) * 2.0 - 1.0,
          y: (1.0 - t.clientY / window.innerHeight) * 2.0 - 1.0
        };

        if (settings.cometTailEnabled && settings.enabled) {
          cometTrailRef.current.unshift({
            x: t.clientX,
            y: t.clientY,
            time: now,
            size: 4.0
          });
          if (cometTrailRef.current.length > 12) {
            cometTrailRef.current.pop();
          }

          const ridgeY = getMountainRidgeScreenY(t.clientX, window.innerWidth, window.innerHeight, now * 0.001, 0.9);
          if (Math.abs(t.clientY - ridgeY) < 36) {
            const mountainCol = getTopmostMountainColor(t.clientX, window.innerWidth, window.innerHeight, now * 0.001, primaryColor, secondaryColor, 0.9);
            triggerMountainSweepGlow(t.clientX, ridgeY, mountainCol, 0.6);
          }
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('dblclick', onDblClick, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [settings.shootingStarsEnabled, settings.cometTailEnabled, settings.enabled]);

  // Celestial Canvas Render Loop (Physics Shooting Stars, True Mountain Silhouette & Stroke Glow & Slender Comet Tail)
  useEffect(() => {
    if (!settings.enabled) return;

    const celestialCanvas = celestialCanvasRef.current;
    if (!celestialCanvas) return;

    const ctx = celestialCanvas.getContext('2d');
    if (!ctx) return;

    const resizeCelestialCanvas = () => {
      celestialCanvas.width = window.innerWidth;
      celestialCanvas.height = window.innerHeight;
    };
    resizeCelestialCanvas();
    window.addEventListener('resize', resizeCelestialCanvas);

    let animId: number;
    let lastTime = performance.now();

    const renderCelestial = (timeNow: number) => {
      const dt = Math.min((timeNow - lastTime) * 0.001, 0.05);
      lastTime = timeNow;

      const width = celestialCanvas.width;
      const height = celestialCanvas.height;

      ctx.clearRect(0, 0, width, height);

      // --- 1. RENDER PHYSICS SHOOTING STARS FALLING BEHIND MOUNTAINS ---
      if (settings.shootingStarsEnabled) {
        const meteors = shootingStarsRef.current;

        // Clip meteors strictly to the sky region ABOVE the mountain crest
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);

        const sampleSteps = 50;
        for (let s = sampleSteps; s >= 0; s--) {
          const sx = (s / sampleSteps) * width;
          const sy = getMountainRidgeScreenY(sx, width, height, timeNow * 0.001, 0.9);
          ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.clip();

        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];

          // Physics update: gravity acceleration downwards & subtle air friction
          const gravity = 680; // px/sec^2
          const airResistance = 0.20;
          m.vy += gravity * dt;
          m.vx -= m.vx * airResistance * dt;
          m.vy -= m.vy * (airResistance * 0.35) * dt;

          m.x += m.vx * dt;
          m.y += m.vy * dt;

          // Record position history across 12-15 frames for smooth connected trail
          m.history.unshift({ x: m.x, y: m.y });
          if (m.history.length > 15) {
            m.history.pop();
          }

          // Smooth fade-in on entry
          if (!m.impacted) {
            m.opacity = Math.min(1.0, m.opacity + dt * 3.5);
          } else {
            // After hitting mountain stroke, fade out remaining trail
            m.opacity = Math.max(0.0, m.opacity - dt * 3.2);
          }

          // Check if meteor's head has reached the exact mountain skyline stroke
          const ridgeY = getMountainRidgeScreenY(m.x, width, height, timeNow * 0.001, 0.9);
          if (m.y >= ridgeY && !m.impacted) {
            m.impacted = true;
            m.y = ridgeY; // snap right onto the mountain stroke!
            
            // Match the exact neon color of the mountain ridge struck by the meteor
            const mountainCol = getTopmostMountainColor(m.x, width, height, timeNow * 0.001, primaryColor, secondaryColor, 0.9);
            triggerMountainStrokeGlow(m.x, ridgeY, mountainCol);

            // Trigger energetic shockwave distortion in WebGLBackground!
            window.dispatchEvent(new CustomEvent('meteor-mountain-impact', {
              detail: {
                clientX: m.x,
                clientY: ridgeY,
                color: mountainCol
              }
            }));
          }

          // DRAW 10-15 FRAME CONNECTED MOTION TRAIL
          if (m.history.length > 1) {
            for (let k = 0; k < m.history.length - 1; k++) {
              const p0 = m.history[k];
              const p1 = m.history[k + 1];
              const tRatio = 1.0 - k / m.history.length;
              const segAlpha = m.opacity * Math.pow(tRatio, 1.35);
              const segWidth = Math.max(0.6, m.size * (0.35 + 1.15 * tRatio));

              // Outer luminous ribbon (soft and slender)
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.strokeStyle = `${m.color}${Math.floor(segAlpha * 95).toString(16).padStart(2, '0')}`;
              ctx.lineWidth = segWidth * 1.5;
              ctx.lineCap = 'round';
              ctx.stroke();

              // Radiant soft starlight inner core ribbon
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${segAlpha * 0.60})`;
              ctx.lineWidth = segWidth * 0.75;
              ctx.lineCap = 'round';
              ctx.stroke();
            }
          }

          // Glowing meteor nucleus head (gentle starlight pearl)
          if (!m.impacted && m.opacity > 0.1) {
            const headGlow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 3.0);
            headGlow.addColorStop(0, `rgba(255, 255, 255, ${m.opacity * 0.75})`);
            headGlow.addColorStop(0.35, `${m.color}${Math.floor(m.opacity * 130).toString(16).padStart(2, '0')}`);
            headGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size * 3.0, 0, Math.PI * 2);
            ctx.fillStyle = headGlow;
            ctx.fill();

            // Delicate starlight cross glint
            ctx.strokeStyle = `rgba(255, 255, 255, ${m.opacity * 0.50})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(m.x - m.size * 2.2, m.y);
            ctx.lineTo(m.x + m.size * 2.2, m.y);
            ctx.moveTo(m.x, m.y - m.size * 2.2);
            ctx.lineTo(m.x, m.y + m.size * 2.2);
            ctx.stroke();
          }

          // Remove meteor when faded or out of frame
          if ((m.impacted && m.opacity <= 0.02) || m.x < -120 || m.x > width + 120 || m.y > height + 120) {
            meteors.splice(i, 1);
          }
        }

        ctx.restore(); // End mountain sky clipping
      }

      // --- 2. RENDER MOUNTAIN SILHOUETTE & STROKE GLOW (Matches mountain color & clearly shows mountain shape) ---
      const strokeGlows = mountainGlowsRef.current;
      for (let i = strokeGlows.length - 1; i >= 0; i--) {
        const glow = strokeGlows[i];
        glow.span += (glow.maxSpan - glow.span) * dt * 4.5;
        glow.alpha -= dt * 0.85; // glows and fades over ~1.2s

        if (glow.alpha <= 0) {
          strokeGlows.splice(i, 1);
          continue;
        }

        ctx.save();

        const span = glow.span;
        const startX = Math.max(0, glow.x - span);
        const endX = Math.min(width, glow.x + span);
        const stepPx = 4;

        // 1. FILL MOUNTAIN BODY SILHOUETTE BENEATH CREST (Shows true triangular / undulating shape of the mountain)
        ctx.beginPath();
        let isFirst = true;
        for (let sx = startX; sx <= endX; sx += stepPx) {
          const sy = getMountainRidgeScreenY(sx, width, height, timeNow * 0.001, 0.9);
          if (isFirst) {
            ctx.moveTo(sx, sy);
            isFirst = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.lineTo(endX, height);
        ctx.lineTo(startX, height);
        ctx.closePath();

        const mountainBodyGrad = ctx.createLinearGradient(0, glow.y - 10, 0, glow.y + 160);
        mountainBodyGrad.addColorStop(0, `${glow.color}${Math.floor(glow.alpha * 70).toString(16).padStart(2, '0')}`);
        mountainBodyGrad.addColorStop(0.35, `${glow.color}${Math.floor(glow.alpha * 30).toString(16).padStart(2, '0')}`);
        mountainBodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = mountainBodyGrad;
        ctx.fill();

        // 2. TRACE & STROKE THE DELICATE MOUNTAIN CREST OUTLINE (Slender, graceful hairline stroke)
        ctx.beginPath();
        isFirst = true;
        for (let sx = startX; sx <= endX; sx += stepPx) {
          const sy = getMountainRidgeScreenY(sx, width, height, timeNow * 0.001, 0.9);
          if (isFirst) {
            ctx.moveTo(sx, sy);
            isFirst = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }

        // Gradient along mountain crest centered at impact X
        const strokeGrad = ctx.createLinearGradient(glow.x - span, 0, glow.x + span, 0);
        strokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        strokeGrad.addColorStop(0.35, `${glow.color}${Math.floor(glow.alpha * 110).toString(16).padStart(2, '0')}`);
        strokeGrad.addColorStop(0.50, `rgba(255, 255, 255, ${glow.alpha * 0.65})`);
        strokeGrad.addColorStop(0.65, `${glow.color}${Math.floor(glow.alpha * 110).toString(16).padStart(2, '0')}`);
        strokeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        // Slender luminous mountain neon stroke
        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Crisp hairline starlight peak wire
        ctx.strokeStyle = `rgba(255, 255, 255, ${glow.alpha * 0.55})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Soft, gentle starlight contact aura on the mountain stroke (subtle, non-blinding)
        const spotGlow = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, span * 0.45);
        spotGlow.addColorStop(0, `rgba(255, 255, 255, ${glow.alpha * 0.40})`);
        spotGlow.addColorStop(0.40, `${glow.color}${Math.floor(glow.alpha * 80).toString(16).padStart(2, '0')}`);
        spotGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(glow.x, glow.y, span * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = spotGlow;
        ctx.fill();

        // Delicate stardust sparks splashing along the mountain slope
        for (let s = glow.sparks.length - 1; s >= 0; s--) {
          const sp = glow.sparks[s];
          sp.vy += dt * 25.0;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.alpha -= dt * sp.decay;
          sp.size *= 0.97;

          if (sp.alpha <= 0 || sp.size <= 0.3) {
            glow.sparks.splice(s, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = Math.max(0, sp.alpha * glow.alpha);
          ctx.fill();
        }

        ctx.restore();
      }

      // --- 3. RENDER DISSOLVING STARDUST PARTICLES ("Lắng xuống tan biến trong hư vô") ---
      const dissolved = dissolvedDustRef.current;
      if (dissolved.length > 0) {
        ctx.save();
        for (let i = dissolved.length - 1; i >= 0; i--) {
          const p = dissolved[i];

          p.vy += p.gravity * dt;
          p.y += p.vy * dt;
          p.x += (p.vx + Math.sin(timeNow * 0.0025 * p.swayFreq + p.swayPhase) * 14.0) * dt;
          p.alpha -= p.decay * dt;
          p.size *= 0.985;
          p.rot += p.rotSpeed * dt;

          if (p.alpha <= 0 || p.size <= 0.3) {
            dissolved.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = Math.max(0, p.alpha);

          // Render miniature glowing starlight diamond
          const r = p.size;
          ctx.beginPath();
          ctx.moveTo(0, -r * 1.5);
          ctx.lineTo(r * 0.65, 0);
          ctx.lineTo(0, r * 1.5);
          ctx.lineTo(-r * 0.65, 0);
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.fill();

          // Soft ambient halo around dissolved spark
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.35})`;
          ctx.fill();

          ctx.restore();
        }
        ctx.restore();
      }

      // --- 4. RENDER SLENDER, AIRY COMET TAIL (Fast fade-out, steep needle taper) ---
      if (settings.cometTailEnabled && cometTrailRef.current.length > 1) {
        const trail = cometTrailRef.current;
        const maxAge = 180; // Fast fade-out (180ms: completely prevents heavy smears)

        // Prune stale trail nodes
        while (trail.length > 1 && (timeNow - trail[trail.length - 1].time) > maxAge) {
          trail.pop();
        }

        if (trail.length > 1) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Pass 1: Whisper-thin starlight aura (tapering down smoothly)
          for (let i = 0; i < trail.length - 1; i++) {
            const p1 = trail[i];
            const p2 = trail[i + 1];
            const ageRatio = (timeNow - p1.time) / maxAge;
            const t = Math.max(0, 1.0 - ageRatio);
            const alpha = Math.pow(t, 2.2) * 0.20;
            const strokeW = Math.max(0.4, p1.size * 1.4 * Math.pow(t, 1.8));

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(128, 216, 255, ${alpha})`;
            ctx.lineWidth = strokeW;
            ctx.stroke();
          }

          // Pass 2: Slender golden starlight ribbon (steep cubic needle-taper to 0)
          for (let i = 0; i < trail.length - 1; i++) {
            const p1 = trail[i];
            const p2 = trail[i + 1];
            const ageRatio = (timeNow - p1.time) / maxAge;
            const t = Math.max(0, 1.0 - ageRatio);
            const alpha = Math.pow(t, 1.6) * 0.70;
            const strokeW = Math.max(0.2, p1.size * Math.pow(t, 2.5)); // Steep cubic taper to 0

            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, `rgba(255, 255, 245, ${alpha})`);
            grad.addColorStop(0.5, `rgba(255, 224, 130, ${alpha * 0.65})`);
            grad.addColorStop(1, `rgba(255, 183, 77, ${alpha * 0.30})`);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = strokeW;
            ctx.stroke();
          }

          // Pass 3: Radiant delicate Comet Nucleus Head
          const head = trail[0];
          const headAge = (timeNow - head.time) / maxAge;
          if (headAge < 0.95) {
            const headAlpha = Math.max(0, 1.0 - headAge);

            const headGlow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, head.size * 2.2);
            headGlow.addColorStop(0, `rgba(255, 255, 255, ${headAlpha * 0.90})`);
            headGlow.addColorStop(0.40, `rgba(255, 224, 130, ${headAlpha * 0.55})`);
            headGlow.addColorStop(1, 'rgba(128, 216, 255, 0)');

            ctx.beginPath();
            ctx.arc(head.x, head.y, head.size * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = headGlow;
            ctx.fill();

            // Rotating delicate celestial glint
            const flareAngle = timeNow * 0.0025;
            const flareR = head.size * 1.6;
            ctx.save();
            ctx.translate(head.x, head.y);
            ctx.rotate(flareAngle);
            ctx.strokeStyle = `rgba(255, 255, 255, ${headAlpha * 0.70})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(-flareR, 0);
            ctx.lineTo(flareR, 0);
            ctx.moveTo(0, -flareR);
            ctx.lineTo(0, flareR);
            ctx.stroke();
            ctx.restore();
          }

          ctx.restore();
        }
      }

      // --- 5. TRAILING STARDUST SPARKS FROM COMET ---
      if (settings.cometTailEnabled && cometSparksRef.current.length > 0) {
        ctx.save();
        for (let i = cometSparksRef.current.length - 1; i >= 0; i--) {
          const s = cometSparksRef.current[i];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.alpha -= dt * 2.0;
          s.size *= 0.95;
          s.rotation += s.rotSpeed * dt;

          if (s.alpha <= 0 || s.size <= 0.25) {
            cometSparksRef.current.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rotation);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = Math.max(0, s.alpha);

          const r = s.size;
          ctx.beginPath();
          ctx.moveTo(0, -r * 1.4);
          ctx.lineTo(r * 0.6, 0);
          ctx.lineTo(0, r * 1.4);
          ctx.lineTo(-r * 0.6, 0);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(renderCelestial);
    };

    animId = requestAnimationFrame(renderCelestial);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCelestialCanvas);
    };
  }, [settings.shootingStarsEnabled, settings.cometTailEnabled, settings.enabled, primaryColor, secondaryColor]);

  // WebGL Render Loop (Point Cloud Van Gogh Star & Stardust Engine with Real-Time Star Dissolution on Touch)
  useEffect(() => {
    if (!settings.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { 
      alpha: true, 
      antialias: false, 
      depth: false, 
      preserveDrawingBuffer: false 
    });
    if (!gl) return;

    const compileShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Point Cloud Shader Error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = compileShader(gl.VERTEX_SHADER, PC_VERTEX_SHADER);
    const frag = compileShader(gl.FRAGMENT_SHADER, PC_FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Point Cloud Program Link Error:', gl.getProgramInfoLog(program));
      return;
    }

    // Generate Stardust Particles Distributed Across Space & Depth
    const count = settings.particleCount;
    const basePositions = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    const starEntities: StarEntity[] = [];

    for (let i = 0; i < count; i++) {
      const ratio = i / count;
      let posX = (Math.random() * 2.4 - 1.2);
      let posY = (Math.random() * 2.4 - 1.2);
      let posZ = 1.0;
      let size = 4.8;

      if (ratio < 0.28) {
        posZ = 0.25 + Math.random() * 0.45;
        size = 5.2 + Math.random() * 6.5;
      } else if (ratio < 0.72) {
        posZ = 0.85 + Math.random() * 0.75;
        size = 3.8 + Math.random() * 5.0;
      } else {
        posZ = 1.85 + Math.random() * 0.75;
        size = 2.4 + Math.random() * 3.2;
      }

      basePositions[i * 3 + 0] = posX;
      basePositions[i * 3 + 1] = posY;
      basePositions[i * 3 + 2] = posZ;

      const seed = Math.random();
      const fallRate = 0.4 + Math.random() * 0.8;
      const twinkleFreq = 0.4 + Math.random() * 1.2;

      // Seed, Base size, Fall rate variation, Twinkle frequency
      params[i * 4 + 0] = seed;
      params[i * 4 + 1] = size;
      params[i * 4 + 2] = fallRate;
      params[i * 4 + 3] = twinkleFreq;

      starEntities.push({
        id: i,
        baseX: posX,
        baseY: posY,
        depth: posZ,
        baseSize: size,
        seed,
        twinkleFreq,
        fallRate,
        shattered: false,
        dissolveAlpha: 1.0,
        respawnTime: 0,
        screenX: 0,
        screenY: 0,
        colorMode: settings.colorMode
      });
    }

    starsRef.current = starEntities;

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, basePositions, gl.STATIC_DRAW);

    const paramBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, paramBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, params, gl.DYNAMIC_DRAW);

    // Uniform locations
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uSparkleSize = gl.getUniformLocation(program, 'u_sparkle_size');
    const uSpeed = gl.getUniformLocation(program, 'u_speed');
    const uParallaxStrength = gl.getUniformLocation(program, 'u_parallax_strength');
    const uShockwave = gl.getUniformLocation(program, 'u_shockwave');
    const uShockwaveActive = gl.getUniformLocation(program, 'u_shockwave_active');
    const uIsDark = gl.getUniformLocation(program, 'u_is_dark');
    const uColor1 = gl.getUniformLocation(program, 'u_color1');
    const uColor2 = gl.getUniformLocation(program, 'u_color2');
    const uColorMode = gl.getUniformLocation(program, 'u_color_mode');

    // Attributes
    const aBasePos = gl.getAttribLocation(program, 'a_base_pos');
    const aParams = gl.getAttribLocation(program, 'a_params');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const hexToRgb = (hex: string): [number, number, number] => {
      const clean = hex.startsWith('#') ? hex.slice(1) : hex;
      return [
        parseInt(clean.slice(0, 2), 16) / 255 || 0,
        parseInt(clean.slice(2, 4), 16) / 255 || 0,
        parseInt(clean.slice(4, 6), 16) / 255 || 0
      ];
    };

    let animId: number;
    let lastTime = performance.now();

    const render = (timeNow: number) => {
      const dt = Math.min((timeNow - lastTime) * 0.001, 0.1);
      lastTime = timeNow;

      // Soft damping for mouse
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      // Gentle ripple on click
      if (shockwaveRef.current.active) {
        shockwaveRef.current.radius += dt * 0.65;
        if (shockwaveRef.current.radius > 1.3) {
          shockwaveRef.current.active = false;
          shockwaveRef.current.radius = 0.0;
        }
      }

      // --- MOUSE & COMET CURSOR INTERACTION: DISSOLVE TOUCHED STARS ---
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const cursorX = cometTrailRef.current.length > 0
        ? cometTrailRef.current[0].x
        : (mouseRef.current.x * 0.5 + 0.5) * screenW;
      const cursorY = cometTrailRef.current.length > 0
        ? cometTrailRef.current[0].y
        : (0.5 - mouseRef.current.y * 0.5) * screenH;

      let bufferNeedsUpdate = false;
      const t = timeNow * 0.001 * settings.speed;
      const hitRadius = 30.0; // Interactive touch radius of the comet head

      for (let i = 0; i < count; i++) {
        const star = starEntities[i];
        const z = star.depth;

        // Calculate exact screen position of this star matching vertex shader
        const parallaxX = -mouseRef.current.x * (0.007 * settings.parallaxStrength) * (1.0 / (z * 1.4 + 0.6));
        const parallaxY = -mouseRef.current.y * (0.007 * settings.parallaxStrength) * (1.0 / (z * 1.4 + 0.6));
        const fallSpeed = (0.015 + star.fallRate * 0.026) * (1.0 / (z * 0.75 + 0.45));
        const yRaw = star.baseY - t * fallSpeed;
        const yNorm = ((yRaw + 1.25) % 2.5 + 2.5) % 2.5 - 1.25;
        const swayFreq = 0.32 + star.seed * 0.48;
        const swayAmp = 0.012 + star.seed * 0.020;
        const xNorm = star.baseX + Math.sin(t * swayFreq + star.seed * 6.28318) * swayAmp;

        const posX = xNorm + parallaxX;
        const posY = yNorm + parallaxY;

        star.screenX = (posX * 0.5 + 0.5) * screenW;
        star.screenY = (0.5 - posY * 0.5) * screenH;

        // Detect collision with comet cursor
        const dist = Math.hypot(star.screenX - cursorX, star.screenY - cursorY);
        if (dist < hitRadius && !star.shattered && star.dissolveAlpha > 0.45) {
          star.shattered = true;
          star.respawnTime = timeNow + 6000 + Math.random() * 4000;
          bufferNeedsUpdate = true;

          // Spawn 16 to 24 tiny stardust specks that settle downwards and fade away
          const sparkCount = 16 + Math.floor(Math.random() * 9);
          const sparkColors = ['#fff8e1', '#ffe082', '#ffd54f', '#ffffff', '#80d8ff', '#ffcc80'];

          for (let k = 0; k < sparkCount; k++) {
            const burstAngle = Math.random() * Math.PI * 2;
            const burstSpeed = 8 + Math.random() * 30;
            dissolvedDustRef.current.push({
              x: star.screenX + (Math.random() * 6 - 3),
              y: star.screenY + (Math.random() * 6 - 3),
              vx: Math.cos(burstAngle) * burstSpeed,
              vy: Math.sin(burstAngle) * burstSpeed - 8.0,
              alpha: 0.90 + Math.random() * 0.08,
              decay: 0.24 + Math.random() * 0.16,
              size: 1.1 + Math.random() * 1.8,
              color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
              swayFreq: 1.8 + Math.random() * 2.5,
              swayPhase: Math.random() * Math.PI * 2,
              gravity: 16 + Math.random() * 20,
              rot: Math.random() * Math.PI,
              rotSpeed: (Math.random() - 0.5) * 4.0
            });
          }
        }

        // Animate dissolve / respawn transition
        if (star.shattered) {
          if (star.dissolveAlpha > 0.0) {
            star.dissolveAlpha = Math.max(0.0, star.dissolveAlpha - dt * 4.5);
            bufferNeedsUpdate = true;
          }
          if (timeNow >= star.respawnTime) {
            star.shattered = false;
          }
        } else {
          if (star.dissolveAlpha < 1.0) {
            star.dissolveAlpha = Math.min(1.0, star.dissolveAlpha + dt * 0.55);
            bufferNeedsUpdate = true;
          }
        }

        // Update vertex size in dynamic parameter buffer
        params[i * 4 + 1] = star.baseSize * star.dissolveAlpha;
      }

      // Re-upload parameters if any stars dissolved or respawned
      if (bufferNeedsUpdate) {
        gl.bindBuffer(gl.ARRAY_BUFFER, paramBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, params);
      }

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(aBasePos);
      gl.vertexAttribPointer(aBasePos, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, paramBuffer);
      gl.enableVertexAttribArray(aParams);
      gl.vertexAttribPointer(aParams, 4, gl.FLOAT, false, 0, 0);

      // Set Uniforms
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, timeNow * 0.001);
      if (uMouse) gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      if (uSparkleSize) gl.uniform1f(uSparkleSize, settings.sparkleSize);
      if (uSpeed) gl.uniform1f(uSpeed, settings.speed);
      if (uParallaxStrength) gl.uniform1f(uParallaxStrength, settings.parallaxStrength);

      if (uShockwave) {
        gl.uniform3f(
          uShockwave, 
          shockwaveRef.current.x, 
          shockwaveRef.current.y, 
          shockwaveRef.current.radius
        );
      }
      if (uShockwaveActive) {
        gl.uniform1f(uShockwaveActive, shockwaveRef.current.active ? 1.0 : 0.0);
      }
      if (uIsDark) gl.uniform1f(uIsDark, isDarkMode ? 1.0 : 0.0);

      const [c1r, c1g, c1b] = hexToRgb(primaryColor);
      const [c2r, c2g, c2b] = hexToRgb(secondaryColor);
      if (uColor1) gl.uniform3f(uColor1, c1r, c1g, c1b);
      if (uColor2) gl.uniform3f(uColor2, c2r, c2g, c2b);
      if (uColorMode) gl.uniform1f(uColorMode, settings.colorMode);

      gl.drawArrays(gl.POINTS, 0, count);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(paramBuffer);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteProgram(program);
    };
  }, [
    settings.enabled, 
    settings.particleCount, 
    settings.sparkleSize, 
    settings.colorMode, 
    settings.speed, 
    settings.parallaxStrength,
    primaryColor, 
    secondaryColor, 
    isDarkMode
  ]);

  if (!settings.enabled) return null;

  return (
    <>
      {/* WebGL Van Gogh Point Cloud Star & Stardust Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        style={{
          opacity: isDarkMode ? 0.95 : 0.75,
          mixBlendMode: isDarkMode ? 'screen' : 'multiply'
        }}
      />

      {/* Celestial Overlay Canvas (Shooting Stars behind Mountains, Mountain Ridge Stroke Glow & Slender Comet Tail) */}
      {(settings.shootingStarsEnabled || settings.cometTailEnabled) && (
        <canvas
          ref={celestialCanvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-[1]"
          style={{
            mixBlendMode: 'screen'
          }}
        />
      )}
    </>
  );
};
