import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  Sliders, 
  Check, 
  Settings, 
  Sparkles, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Layers,
  ChevronDown,
  ChevronUp,
  Waves,
  Zap,
  Sun,
  Moon
} from 'lucide-react';

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_neon_color;
  uniform vec3 u_neon_color2;
  uniform float u_speed;
  uniform float u_neon_intensity;
  uniform float u_is_dark;
  uniform float u_aurora_intensity;
  uniform vec3 u_aurora_col1;
  uniform vec3 u_aurora_col2;
  uniform vec3 u_aurora_col3;
  uniform vec2 u_mouse;

  float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                 u.y);
  }

  float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      vec2 s = vec2(1.0);
      for (float i = 0.0; i < 5.0; i++) {
          v += a * noise(p * s);
          s *= 2.0;
          a *= 0.5;
      }
      return v;
  }

  vec3 getAurora(vec2 uv, float t) {
      if (uv.y < -1.5) return vec3(0.0);
      
      // Vertical fade - peaks in upper sky, decays near bottom/top
      float fade = smoothstep(-1.2, 1.2, uv.y) * smoothstep(4.8, 2.5, uv.y);
      if (fade <= 0.0) return vec3(0.0);

      vec3 auroraColor = vec3(0.0);
      
      // Overlapping dynamic layers with distinct frequency, speed and colors
      for (float i = 0.0; i < 3.0; i++) {
          float shift = i * 2.54;
          float speedFactor = 0.28 + i * 0.15;
          
          // Distort coordinates to form organic curtains of light
          float xDistort = uv.x * (0.35 + i * 0.1) + sin(uv.y * 0.4 + t * speedFactor + shift) * 1.1;
          xDistort += noise(vec2(uv.y * 0.45 - t * 0.18, uv.x * 0.08)) * 1.2;
          
          float noiseVal = noise(vec2(xDistort, uv.y * 0.18 + t * 0.06 + shift));
          
          // Fine vertical rays simulating light streamers
          float ray = noise(vec2(uv.x * 6.0 + sin(t * 0.22 + i * 1.5) * 3.5, uv.y * 0.05 + t * 0.02));
          
          float strength = smoothstep(0.18, 0.75, noiseVal) * (0.2 + 0.8 * ray);
          
          // Custom Aurora Color Spectrum from uniforms
          vec3 col = vec3(0.0);
          if (i == 0.0) {
              col = u_aurora_col1;
          } else if (i == 1.0) {
              col = u_aurora_col2;
          } else {
              col = u_aurora_col3;
              strength *= smoothstep(-0.5, 3.0, uv.y); // High altitude fade extension
          }
          
          auroraColor += col * strength * fade * 0.45;
      }
      
      return auroraColor;
  }

  void main() {
      float t = u_time * u_speed;
      vec2 st = gl_FragCoord.xy / u_resolution.xy * 2.0 - 1.0;
      st.x *= u_resolution.x / u_resolution.y;

      // Mouse interactive position matching st aspect ratio
      vec2 mouse_st = u_mouse * 2.0 - 1.0;
      mouse_st.x *= u_resolution.x / u_resolution.y;

      float distToMouseRaw = length(st - mouse_st);
      
      st *= 5.0;

      // Cursor ambient soft neon illumination (extremely tiny and soft neon bead of light)
      float cursorGlow = 0.012 / (distToMouseRaw * distToMouseRaw * 150.0 + 0.06);
      float cursorBleed = 0.003 / (distToMouseRaw * 8.0 + 0.04);
      vec3 cursorColor = mix(u_neon_color, u_neon_color2, 0.5 + 0.5 * sin(u_time * 1.5)) * (cursorGlow + cursorBleed * 0.2) * u_neon_intensity;

      float horizonBlend = pow(clamp(1.0 - st.y / 5.0, 0.0, 1.0), 2.5);
      
      // Dynamic sky based on Dark/Light mode
      vec3 skyZenith  = mix(vec3(0.93, 0.94, 0.96), vec3(0.002, 0.003, 0.005), u_is_dark);
      vec3 skyHorizon = mix(vec3(0.96, 0.97, 0.98), vec3(0.005, 0.006, 0.012), u_is_dark);
      
      // Blend a touch of the secondary neon color into the horizon for a soft environmental glow
      skyHorizon = mix(skyHorizon, u_neon_color2 * 0.18, u_is_dark);
      vec3 skyBase = mix(skyZenith, skyHorizon, horizonBlend);

      vec2 stM = st;
      stM.y += 2.5;

      // Mountain Ridge A (Deep background mountain)
      float ridgeA = fbm(vec2(stM.x * 0.2 + 0.3 + t * 0.03, 1.5)) * 12.9 - 2.18;
      float aboveA  = stM.y - ridgeA;
      float inA     = step(aboveA, 0.0);
      float alphaA  = smoothstep(0.0, ridgeA, stM.y) * inA * step(0.0, stM.y);
      vec3  mountainBaseA = mix(vec3(0.88, 0.90, 0.93), vec3(0.018, 0.022, 0.045), u_is_dark);
      vec3  rimA    = u_neon_color * u_neon_intensity * 0.7 * smoothstep(0.12, 0.0, abs(aboveA));
      vec3  colA    = mountainBaseA + rimA;

      // Mountain Ridge B (Midground mountain)
      float ridgeB = fbm(vec2(stM.x * 0.31 + 5.7 + t * 0.06, 3.2)) * 5.4 - 0.9;
      float aboveB  = stM.y - ridgeB;
      float inB     = step(aboveB, 0.0);
      float alphaB  = smoothstep(0.0, ridgeB, stM.y) * inB * step(0.0, stM.y);
      vec3  mountainBaseB = mix(vec3(0.84, 0.86, 0.89), vec3(0.012, 0.016, 0.035), u_is_dark);
      vec3  rimB    = u_neon_color2 * u_neon_intensity * 0.7 * smoothstep(0.12, 0.0, abs(aboveB));
      vec3  colB    = mountainBaseB + rimB;

      // Mountain Ridge C (Foreground mountain)
      float ridgeC = fbm(vec2(stM.x * 0.47 + 11.3 + t * 0.12, 7.8)) * 2.9 - 0.55;
      float aboveC  = stM.y - ridgeC;
      float inC     = step(aboveC, 0.0);
      float alphaC  = smoothstep(0.0, ridgeC, stM.y) * inC * step(0.0, stM.y);
      vec3  mountainBaseC = mix(vec3(0.80, 0.82, 0.85), vec3(0.008, 0.012, 0.025), u_is_dark);
      vec3  rimC    = mix(u_neon_color, u_neon_color2, 0.5) * u_neon_intensity * 0.85 * smoothstep(0.12, 0.0, abs(aboveC));
      vec3  colC    = mountainBaseC + rimC;

      // Stars (Only at night/dark)
      vec2 skySt = st;
      float minStarDist = 100.0;
      for (float i = 0.0; i < 40.0; i++) {
          vec2 seed = vec2(i * 127.1, i * 311.7);
          vec2 starPos = vec2(
               hash(seed) * 60.0 - 30.0,
               hash(seed + vec2(17.3)) * 6.0 - 1.0
          );
          float d = length(skySt - starPos);
          minStarDist = min(minStarDist, d);
      }
      float stars = 0.004 / (minStarDist + 0.015);

      // Waves (Interactive glowing water streams)
      st += vec2(0.0, 5.0);
      float l = 0.0;
      for (float i = 0.0; i < 20.0; i++) {
          float wave = sin(st.x * 0.35 + t * 1.3 + i * 0.95) * sin(t * i * 0.085 + noise(st));
          float dist = abs(st.y + wave - i * 0.125);
          float glow = 0.016 / (dist + 0.075);
          l += glow;
      }

      vec3 waterBase = mix(vec3(0.93, 0.95, 0.97), vec3(0.006, 0.012, 0.025), u_is_dark);
      vec3 waterLines = mix(u_neon_color, u_neon_color2, 0.5) * u_neon_intensity * 0.8;
      vec3 waterCol = waterBase + waterLines * l * 0.42;

      float waterMask = smoothstep(0.0, 0.35, l);

      vec3 col = skyBase;

      float mountainMask = max(max(inA, inB), inC);
      float starMask = u_is_dark * (1.0 - mountainMask);
      
      // Starry sky
      col += vec3(0.9, 0.95, 1.0) * stars * 5.0 * starMask;

      // Aurora Borealis layer
      vec3 auroraCol = getAurora(st - vec2(0.0, 5.0), t) * u_is_dark * u_aurora_intensity * (1.0 - mountainMask);
      col += auroraCol;

      // Moon halo ambient glow (Night only)
      float moonDist = length(st - vec2(0.0, 6.5));
      float moonHalo = 0.065 / (moonDist + 0.22);
      col += mix(u_neon_color2, vec3(1.0), 0.4) * moonHalo * u_is_dark * 0.55;

      col = mix(col, waterCol, waterMask);

      col = mix(col, colA, alphaA);
      col = mix(col, colB, alphaB);
      col = mix(col, colC, alphaC);

      col = mix(col, waterCol, waterMask);

      // Add the glowing interactive cursor color on top
      col += cursorColor * (0.85 + 0.15 * sin(u_time * 4.0));

      gl_FragColor = vec4(col, 1.0);
  }
`;

interface Preset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

const PRESETS: Preset[] = [
  { id: 'cyan_ice', name: 'Băng Dương Neon', primary: '#00f2fe', secondary: '#4facfe' },
  { id: 'cyber_purple', name: 'Tử Đinh Hương', primary: '#ff007f', secondary: '#9b5de5' },
  { id: 'aurora', name: 'Cực Quang Lục', primary: '#00f5d4', secondary: '#10b981' },
  { id: 'sunset', name: 'Hoàng Hôn Visual', primary: '#ff4500', secondary: '#f9d976' },
  { id: 'synth_retro', name: 'Hồng Kông Retro', primary: '#ff2e93', secondary: '#0575e6' },
];

interface AuroraPalette {
  id: string;
  name: string;
  col1: string;
  col2: string;
  col3: string;
}

const AURORA_PALETTES: AuroraPalette[] = [
  { id: 'classic_green', name: 'Lục Bảo Tuyết', col1: '#0aff84', col2: '#00ccff', col3: '#ae26ed' },
  { id: 'sunset_dream', name: 'Bắc Cực Hoàng Hôn', col1: '#ff007f', col2: '#8a2be2', col3: '#0000ff' },
  { id: 'cosmic_fire', name: 'Bão Lửa Vũ Trụ', col1: '#ffaa00', col2: '#ff2200', col3: '#9400d3' },
  { id: 'neon_cyan', name: 'Dạ Quang Băng', col1: '#00ffff', col2: '#0055ff', col3: '#ff00ff' },
  { id: 'custom', name: 'Màu tự chọn', col1: '#0aff84', col2: '#00ccff', col3: '#ae26ed' },
];

const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  return [r, g, b];
};

const hexToHue = (hex: string): number => {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  if (cleanHex.length < 6) return 0;
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else if (max === b) {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return Math.round(h * 360);
};

const hueToHex = (h: number): string => {
  const s = 1.0;
  const l = 0.5;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h <= 360) {
    r = c; g = 0; b = x;
  }
  const toHex = (n: number) => {
    const hexVal = Math.round((n + m) * 255).toString(16);
    return hexVal.padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const WebGLBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse position tracking for beautiful interaction
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetMouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: 1.0 - (e.clientY / window.innerHeight)
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Load custom state from localstorage
  const [preset, setPreset] = useState<string>(() => localStorage.getItem('bg_preset') || 'cyan_ice');
  const [primaryColor, setPrimaryColor] = useState<string>(() => localStorage.getItem('bg_primary') || '#00f2fe');
  const [secondaryColor, setSecondaryColor] = useState<string>(() => localStorage.getItem('bg_secondary') || '#4facfe');
  const [opacity, setOpacity] = useState<number>(() => Number(localStorage.getItem('bg_opacity') || '1.00'));
  const [intensity, setIntensity] = useState<number>(() => Number(localStorage.getItem('bg_intensity') || '1.6'));
  const [speed, setSpeed] = useState<number>(() => Number(localStorage.getItem('bg_speed') || '0.9'));
  const [glassmorphic, setGlassmorphic] = useState<boolean>(() => localStorage.getItem('bg_glassmorphic') !== 'false');
  const [auroraIntensity, setAuroraIntensity] = useState<number>(() => Number(localStorage.getItem('bg_aurora_intensity') || '1.3'));
  
  // Aurora custom colors
  const [auroraPreset, setAuroraPreset] = useState<string>(() => localStorage.getItem('bg_aurora_preset') || 'classic_green');
  const [auroraCol1, setAuroraCol1] = useState<string>(() => localStorage.getItem('bg_aurora_col1') || '#0aff84');
  const [auroraCol2, setAuroraCol2] = useState<string>(() => localStorage.getItem('bg_aurora_col2') || '#00ccff');
  const [auroraCol3, setAuroraCol3] = useState<string>(() => localStorage.getItem('bg_aurora_col3') || '#ae26ed');

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom' | 'aurora'>('preset');
  const [activeAuroraColorIdx, setActiveAuroraColorIdx] = useState<1 | 2 | 3>(1);

  // Sync isDarkMode dynamically by observing document element classList
  useEffect(() => {
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDark();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Update glassmorphic class on body element
  useEffect(() => {
    if (glassmorphic) {
      document.body.classList.add('glassmorphic-active');
    } else {
      document.body.classList.remove('glassmorphic-active');
    }
  }, [glassmorphic]);

  // Sync color changes with the Neon Glass Context Menu
  useEffect(() => {
    const handleColorUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (customEvent.detail.primary) setPrimaryColor(customEvent.detail.primary);
        if (customEvent.detail.secondary) setSecondaryColor(customEvent.detail.secondary);
        if (customEvent.detail.preset) setPreset(customEvent.detail.preset);
      }
    };
    window.addEventListener('update-bg-colors', handleColorUpdate);
    return () => window.removeEventListener('update-bg-colors', handleColorUpdate);
  }, []);

  // Dispatch color changes to the Neon Glass Context Menu
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('update-bg-colors-from-bg', {
        detail: { primary: primaryColor, secondary: secondaryColor }
      })
    );
  }, [primaryColor, secondaryColor]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('bg_preset', preset);
    localStorage.setItem('bg_primary', primaryColor);
    localStorage.setItem('bg_secondary', secondaryColor);
    localStorage.setItem('bg_opacity', String(opacity));
    localStorage.setItem('bg_intensity', String(intensity));
    localStorage.setItem('bg_speed', String(speed));
    localStorage.setItem('bg_glassmorphic', String(glassmorphic));
    localStorage.setItem('bg_aurora_intensity', String(auroraIntensity));
    localStorage.setItem('bg_aurora_preset', auroraPreset);
    localStorage.setItem('bg_aurora_col1', auroraCol1);
    localStorage.setItem('bg_aurora_col2', auroraCol2);
    localStorage.setItem('bg_aurora_col3', auroraCol3);
  }, [preset, primaryColor, secondaryColor, opacity, intensity, speed, glassmorphic, auroraIntensity, auroraPreset, auroraCol1, auroraCol2, auroraCol3]);

  // WebGL Shader pipeline setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.warn('WebGL background is not supported in this browser.');
      return;
    }

    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('WebGL Shader Compilation Error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const createProgram = (
      gl: WebGLRenderingContext,
      vertexShader: WebGLShader,
      fragmentShader: WebGLShader
    ) => {
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('WebGL Program Link Error:', gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);

    // Uniform locations
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const neonColorLocation = gl.getUniformLocation(program, 'u_neon_color');
    const neonColor2Location = gl.getUniformLocation(program, 'u_neon_color2');
    const speedLocation = gl.getUniformLocation(program, 'u_speed');
    const intensityLocation = gl.getUniformLocation(program, 'u_neon_intensity');
    const isDarkLocation = gl.getUniformLocation(program, 'u_is_dark');
    const auroraIntensityLocation = gl.getUniformLocation(program, 'u_aurora_intensity');
    const auroraCol1Location = gl.getUniformLocation(program, 'u_aurora_col1');
    const auroraCol2Location = gl.getUniformLocation(program, 'u_aurora_col2');
    const auroraCol3Location = gl.getUniformLocation(program, 'u_aurora_col3');
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');

    let animationFrameId: number;

    const resize = () => {
      if (!canvas) return;
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.25); // optimized ratio
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (time: number) => {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Smooth mouse interpolation (lerp)
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.08;

      if (mouseLocation) {
        gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);
      }

      const [r1, g1, b1] = hexToRgb(primaryColor);
      const [r2, g2, b2] = hexToRgb(secondaryColor);
      
      const [ac1_r, ac1_g, ac1_b] = hexToRgb(auroraCol1);
      const [ac2_r, ac2_g, ac2_b] = hexToRgb(auroraCol2);
      const [ac3_r, ac3_g, ac3_b] = hexToRgb(auroraCol3);

      if (resolutionLocation) {
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      }
      if (timeLocation) {
        gl.uniform1f(timeLocation, time * 0.001);
      }
      if (neonColorLocation) {
        gl.uniform3f(neonColorLocation, r1, g1, b1);
      }
      if (neonColor2Location) {
        gl.uniform3f(neonColor2Location, r2, g2, b2);
      }
      if (speedLocation) {
        gl.uniform1f(speedLocation, speed);
      }
      if (intensityLocation) {
        gl.uniform1f(intensityLocation, intensity);
      }
      if (isDarkLocation) {
        gl.uniform1f(isDarkLocation, isDarkMode ? 1.0 : 0.0);
      }
      if (auroraIntensityLocation) {
        gl.uniform1f(auroraIntensityLocation, auroraIntensity);
      }
      if (auroraCol1Location) {
        gl.uniform3f(auroraCol1Location, ac1_r, ac1_g, ac1_b);
      }
      if (auroraCol2Location) {
        gl.uniform3f(auroraCol2Location, ac2_r, ac2_g, ac2_b);
      }
      if (auroraCol3Location) {
        gl.uniform3f(auroraCol3Location, ac3_r, ac3_g, ac3_b);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [primaryColor, secondaryColor, speed, intensity, isDarkMode, auroraIntensity, auroraCol1, auroraCol2, auroraCol3]);

  const selectPreset = (p: Preset) => {
    setPreset(p.id);
    setPrimaryColor(p.primary);
    setSecondaryColor(p.secondary);
  };

  const handleReset = () => {
    setPreset('cyan_ice');
    setPrimaryColor('#00f2fe');
    setSecondaryColor('#4facfe');
    setOpacity(1.00);
    setIntensity(1.6);
    setSpeed(0.9);
    setGlassmorphic(true);
    setAuroraIntensity(1.3);
    setAuroraPreset('classic_green');
    setAuroraCol1('#0aff84');
    setAuroraCol2('#00ccff');
    setAuroraCol3('#ae26ed');
  };

  return (
    <>
      {/* Dynamic Style Injection for Glassmorphic Cards */}
      <style>{`
        html, body {
          background-color: transparent !important;
        }
        html:not(.dark) body.glassmorphic-active .bg-white {
          background-color: rgba(255, 255, 255, ${0.72 * opacity}) !important;
          backdrop-filter: blur(${14 * opacity}px) saturate(180%) !important;
          border-color: rgba(255, 255, 255, ${0.4 * opacity}) !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, ${0.03 * opacity}) !important;
        }
        html.dark body.glassmorphic-active .bg-white,
        html.dark body.glassmorphic-active .bg-slate-900,
        html.dark body.glassmorphic-active .bg-slate-950,
        html.dark body.glassmorphic-active .bg-slate-900\\/50 {
          background-color: rgba(11, 15, 27, ${0.65 * opacity}) !important;
          backdrop-filter: blur(${16 * opacity}px) saturate(190%) !important;
          border-color: rgba(255, 255, 255, ${0.08 * opacity}) !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, ${0.25 * opacity}) !important;
        }
        body.glassmorphic-active .bg-slate-50\\/70,
        body.glassmorphic-active .bg-slate-950\\/75,
        body.glassmorphic-active .bg-slate-50,
        html.dark body.glassmorphic-active .bg-slate-950 {
          background-color: transparent !important;
        }
        /* Style adjustments for headers and inner inputs to maintain readability */
        html:not(.dark) body.glassmorphic-active header,
        html:not(.dark) body.glassmorphic-active .sticky {
          background-color: rgba(255, 255, 255, ${0.8 * opacity}) !important;
          backdrop-filter: blur(${12 * opacity}px) !important;
        }
        html.dark body.glassmorphic-active header,
        html.dark body.glassmorphic-active .sticky {
          background-color: rgba(11, 15, 27, ${0.75 * opacity}) !important;
          backdrop-filter: blur(${12 * opacity}px) !important;
        }
      `}</style>

      {/* Actual canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-20 pointer-events-none transition-opacity duration-500"
        style={{ 
          opacity: isDarkMode ? 1.0 : 0.85,
          mixBlendMode: 'normal'
        }}
      />

      {/* Floating Configuration Widget - Shifted to bottom-left to avoid chatbot and toast collisions */}
      <div className="fixed bottom-6 left-6 z-[60] flex flex-col items-start gap-3 font-sans no-print">
        
        {/* Expanded Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-[28px] shadow-2xl flex flex-col gap-4 text-slate-800 dark:text-slate-100 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span className="text-sm font-black tracking-tight">Cá nhân hóa Giao diện</span>
                </div>
                <button 
                  onClick={handleReset}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-full transition-colors cursor-pointer"
                  title="Đặt lại cài đặt mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex bg-slate-100/80 dark:bg-slate-950/60 p-1 rounded-full text-[11px] font-bold">
                <button
                  onClick={() => setActiveTab('preset')}
                  className={`flex-1 py-1.5 rounded-full text-center transition-all cursor-pointer ${activeTab === 'preset' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Màu Neon
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`flex-1 py-1.5 rounded-full text-center transition-all cursor-pointer ${activeTab === 'custom' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Tùy chỉnh
                </button>
                <button
                  onClick={() => setActiveTab('aurora')}
                  className={`flex-1 py-1.5 rounded-full text-center transition-all cursor-pointer ${activeTab === 'aurora' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Cực quang
                </button>
              </div>

              {/* Presets Grid */}
              {activeTab === 'preset' && (
                <div className="grid grid-cols-1 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {PRESETS.map((p) => {
                    const isSelected = preset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => selectPreset(p)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-indigo-500/80 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' 
                            : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-white/20 shadow-xs"
                            style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})` }}
                          />
                          <span>{p.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom Sliders & Color Pickers */}
              {activeTab === 'custom' && (
                <div className="space-y-3.5 max-h-[17.5rem] overflow-y-auto pr-1">
                  
                  {/* Custom Neon 1 */}
                  <div className="space-y-2 p-2.5 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/80 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Màu Neon 1 (Chủ Đạo)</span>
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-0.5 shadow-xs">
                        <span className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: primaryColor }} />
                        <input 
                          type="text"
                          value={primaryColor}
                          onChange={(e) => {
                            setPreset('custom');
                            setPrimaryColor(e.target.value);
                          }}
                          className="w-14 text-center text-[9px] font-mono uppercase bg-transparent border-0 focus:outline-none p-0 text-slate-600 dark:text-slate-400 font-bold"
                        />
                      </div>
                    </div>

                    {/* Quick Swatches */}
                    <div className="flex gap-2 justify-center py-0.5">
                      {['#00f2fe', '#ff007f', '#00f5d4', '#ff4500', '#ae26ed', '#ffeb3b'].map((hex) => {
                        const isSelected = primaryColor.toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            onClick={() => {
                              setPreset('custom');
                              setPrimaryColor(hex);
                            }}
                            className={`w-5 h-5 rounded-full border cursor-pointer transition-all hover:scale-110 active:scale-90 ${
                              isSelected ? 'border-slate-700 dark:border-white ring-2 ring-indigo-500/30 scale-110' : 'border-white/20 shadow-xs'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        );
                      })}
                    </div>

                    {/* Hue Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">
                        <span>Quang phổ Màu 1</span>
                        <span>{hexToHue(primaryColor)}°</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="360"
                        value={hexToHue(primaryColor)}
                        onChange={(e) => {
                          setPreset('custom');
                          setPrimaryColor(hueToHex(Number(e.target.value)));
                        }}
                        className="w-full h-2 rounded-full cursor-pointer appearance-none outline-none accent-slate-800 dark:accent-white"
                        style={{
                          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Custom Neon 2 */}
                  <div className="space-y-2 p-2.5 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/80 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Màu Neon 2 (Phụ Trợ)</span>
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-0.5 shadow-xs">
                        <span className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: secondaryColor }} />
                        <input 
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => {
                            setPreset('custom');
                            setSecondaryColor(e.target.value);
                          }}
                          className="w-14 text-center text-[9px] font-mono uppercase bg-transparent border-0 focus:outline-none p-0 text-slate-600 dark:text-slate-400 font-bold"
                        />
                      </div>
                    </div>

                    {/* Quick Swatches */}
                    <div className="flex gap-2 justify-center py-0.5">
                      {['#4facfe', '#9b5de5', '#10b981', '#f9d976', '#0575e6', '#ff8c00'].map((hex) => {
                        const isSelected = secondaryColor.toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            onClick={() => {
                              setPreset('custom');
                              setSecondaryColor(hex);
                            }}
                            className={`w-5 h-5 rounded-full border cursor-pointer transition-all hover:scale-110 active:scale-90 ${
                              isSelected ? 'border-slate-700 dark:border-white ring-2 ring-indigo-500/30 scale-110' : 'border-white/20 shadow-xs'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        );
                      })}
                    </div>

                    {/* Hue Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">
                        <span>Quang phổ Màu 2</span>
                        <span>{hexToHue(secondaryColor)}°</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="360"
                        value={hexToHue(secondaryColor)}
                        onChange={(e) => {
                          setPreset('custom');
                          setSecondaryColor(hueToHex(Number(e.target.value)));
                        }}
                        className="w-full h-2 rounded-full cursor-pointer appearance-none outline-none accent-slate-800 dark:accent-white"
                        style={{
                          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Độ mờ thẻ UI (UI Opacity)</span>
                      <span className="font-mono">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.00" 
                      max="1.00" 
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                    />
                  </div>

                  {/* Glow intensity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Mức sáng Neon</span>
                      <span className="font-mono">{intensity.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.4" 
                      max="3.0" 
                      step="0.2"
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                    />
                  </div>

                  {/* Speed Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Waves className="w-3 h-3" /> Tốc độ trôi dạt</span>
                      <span className="font-mono">{speed.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="2.5" 
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                    />
                  </div>

                </div>
              )}

              {/* Aurora Custom Tab */}
              {activeTab === 'aurora' && (
                <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1 text-slate-800 dark:text-slate-100">
                  {/* Aurora Intensity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-emerald-500"><Sparkles className="w-3 h-3 text-emerald-500 shrink-0" /> Độ rực Cực quang</span>
                      <span className="font-mono">{auroraIntensity.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.0" 
                      max="2.5" 
                      step="0.1"
                      value={auroraIntensity}
                      onChange={(e) => setAuroraIntensity(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                    />
                  </div>

                  {/* Aurora Presets List */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gói màu cực quang</span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {AURORA_PALETTES.map((ap) => {
                        const isSelected = auroraPreset === ap.id;
                        return (
                          <button
                            key={ap.id}
                            onClick={() => {
                              setAuroraPreset(ap.id);
                              if (ap.id !== 'custom') {
                                setAuroraCol1(ap.col1);
                                setAuroraCol2(ap.col2);
                                setAuroraCol3(ap.col3);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                                : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/40'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: ap.col1 }} />
                                <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: ap.col2 }} />
                                <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: ap.col3 }} />
                              </div>
                              <span>{ap.name}</span>
                            </div>
                            {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Aurora Custom Color Pickers */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tự thiết lập màu cực quang</span>
                    
                    {/* Color Swatches selection */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Màu 1', color: auroraCol1, idx: 1 as const },
                        { label: 'Màu 2', color: auroraCol2, idx: 2 as const },
                        { label: 'Màu 3', color: auroraCol3, idx: 3 as const },
                      ].map((item) => {
                        const isSelected = activeAuroraColorIdx === item.idx;
                        return (
                          <button
                            type="button"
                            key={item.idx}
                            onClick={() => setActiveAuroraColorIdx(item.idx)}
                            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border text-[9px] font-bold cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                                : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50'
                            }`}
                          >
                            <span>{item.label}</span>
                            <div 
                              className={`w-6 h-6 rounded-lg border shadow-xs transition-all ${
                                isSelected ? 'scale-110 ring-2 ring-emerald-500/30 border-emerald-500' : 'border-white/20'
                              }`} 
                              style={{ backgroundColor: item.color }} 
                            />
                            <span className="font-mono text-[8px] uppercase tracking-tighter opacity-70">{item.color}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Integrated Slider for Selected Aurora Color */}
                    <div className="space-y-1.5 bg-slate-50/50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100/60 dark:border-slate-800/40 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          Sửa Màu {activeAuroraColorIdx}
                        </span>
                        <input 
                          type="text"
                          value={
                            activeAuroraColorIdx === 1 ? auroraCol1 :
                            activeAuroraColorIdx === 2 ? auroraCol2 :
                            auroraCol3
                          }
                          onChange={(e) => {
                            setAuroraPreset('custom');
                            const val = e.target.value;
                            if (activeAuroraColorIdx === 1) setAuroraCol1(val);
                            else if (activeAuroraColorIdx === 2) setAuroraCol2(val);
                            else setAuroraCol3(val);
                          }}
                          className="w-14 text-center text-[9px] font-mono uppercase bg-transparent border-0 border-b border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none p-0 text-slate-600 dark:text-slate-400 font-bold"
                        />
                      </div>

                      {/* Spectrum Hue Slider */}
                      <input 
                        type="range"
                        min="0"
                        max="360"
                        value={hexToHue(
                          activeAuroraColorIdx === 1 ? auroraCol1 :
                          activeAuroraColorIdx === 2 ? auroraCol2 :
                          auroraCol3
                        )}
                        onChange={(e) => {
                          setAuroraPreset('custom');
                          const nextHex = hueToHex(Number(e.target.value));
                          if (activeAuroraColorIdx === 1) setAuroraCol1(nextHex);
                          else if (activeAuroraColorIdx === 2) setAuroraCol2(nextHex);
                          else setAuroraCol3(nextHex);
                        }}
                        className="w-full h-1.5 rounded-full cursor-pointer appearance-none outline-none accent-slate-800 dark:accent-white"
                        style={{
                          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Glassmorphic Checkbox Toggle */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/30 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/50 mt-1">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs font-black flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" /> Giao diện Kính mờ
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Nhìn xuyên thấu qua các bảng thẻ UI</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGlassmorphic(!glassmorphic)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center ${
                    glassmorphic ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <motion.div 
                    layout 
                    className="w-4 h-4 bg-white rounded-full shadow-md"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-full shadow-2xl transition-all cursor-pointer z-50 hover:shadow-indigo-500/25 ${isOpen ? 'ring-4 ring-indigo-500/20' : ''}`}
        >
          <Palette className={`w-4 h-4 ${isOpen ? 'rotate-12' : ''} transition-transform duration-300`} />
          <span className="text-xs tracking-tight">
            {isOpen ? 'Đóng bộ chỉnh' : 'Bảng màu Neon'}
          </span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </motion.button>

      </div>
    </>
  );
};
