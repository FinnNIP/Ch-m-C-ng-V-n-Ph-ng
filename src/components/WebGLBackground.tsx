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
  Moon,
  Orbit,
  MousePointer,
  Compass,
  Radio,
  Sparkle,
  Shuffle
} from 'lucide-react';
import { WebGLPointCloud } from './WebGLPointCloud';

const VERTEX_SHADER_SOURCE = `
  #ifdef GL_ES
  precision mediump float;
  #endif
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
  uniform float u_moon_phase;
  uniform vec2 u_impact_pos;
  uniform float u_shockwave_radius;
  uniform float u_shockwave_intensity;
  uniform vec3 u_impact_color;
  uniform vec3 u_river_color;
  uniform float u_dither_strength;
  uniform float u_dither_scale;
  uniform float u_ink_intensity;

  // Authentic 8x8 Bayer Ordered Dithering Matrix (Analytical recursive formula)
  float bayer2(vec2 p) {
      float x = mod(p.x, 2.0);
      float y = mod(p.y, 2.0);
      return (y < 1.0) ? ((x < 1.0) ? 0.0 : 2.0) : ((x < 1.0) ? 3.0 : 1.0);
  }

  float bayer4(vec2 p) {
      return 4.0 * bayer2(p) + bayer2(floor(p * 0.5));
  }

  float bayer8(vec2 p) {
      return (4.0 * bayer4(p) + bayer2(floor(p * 0.25))) / 64.0;
  }

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
      if (uv.y < -1.8) return vec3(0.0);
      
      // Vertical fade - gracefully arched across mid-to-high sky behind mountain crests
      float fade = smoothstep(-0.6, 0.9, uv.y) * smoothstep(3.8, 2.0, uv.y);
      if (fade <= 0.0) return vec3(0.0);

      vec3 auroraColor = vec3(0.0);
      
      // Dynamic organic curtains with distinct folds and streamers
      for (float i = 0.0; i < 3.0; i++) {
          float shift = i * 2.54;
          float speedFactor = 0.28 + i * 0.15;
          
          // Distort coordinates to form organic curtains of light
          float xDistort = uv.x * (0.35 + i * 0.1) + sin(uv.y * 0.4 + t * speedFactor + shift) * 1.1;
          xDistort += noise(vec2(uv.y * 0.45 - t * 0.18, uv.x * 0.08)) * 1.2;
          
          float noiseVal = noise(vec2(xDistort, uv.y * 0.18 + t * 0.06 + shift));
          
          // Fine vertical rays simulating light streamers
          float ray = noise(vec2(uv.x * 6.0 + sin(t * 0.22 + i * 1.5) * 3.5, uv.y * 0.05 + t * 0.02));
          
          // Silky translucent curtain folds leaving clear gaps so celestial stars shine through
          float curtain = smoothstep(0.28, 0.76, noiseVal);
          float strength = pow(curtain, 1.45) * (0.30 + 0.70 * ray);
          
          // Custom Aurora Color Spectrum from uniforms
          vec3 col = vec3(0.0);
          if (i == 0.0) {
              col = u_aurora_col1;
          } else if (i == 1.0) {
              col = u_aurora_col2;
          } else {
              col = u_aurora_col3;
              strength *= smoothstep(-0.2, 2.2, uv.y); // High altitude fade extension
          }
          
          auroraColor += col * strength * fade * 0.26;
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
      vec2 unwarped_st = st; // Pristine, rock-steady celestial coordinates for background stars, moon & sky

      // Localized terrain coordinates (stable, peaceful, no harsh circular distortion rings)
      vec3 shockwaveColorFlash = vec3(0.0);
      vec2 terrain_st = st;

      // Cursor ambient soft neon illumination (whisper-soft and gentle)
      float cursorGlow = 0.006 / (distToMouseRaw * distToMouseRaw * 180.0 + 0.08);
      float cursorBleed = 0.0015 / (distToMouseRaw * 10.0 + 0.06);
      vec3 cursorColor = mix(u_neon_color, u_neon_color2, 0.5 + 0.5 * sin(u_time * 1.5)) * (cursorGlow + cursorBleed * 0.2) * (u_neon_intensity * 0.5);

      float horizonBlend = pow(clamp(1.0 - unwarped_st.y / 5.0, 0.0, 1.0), 2.5);
      
      // Dynamic sky based on Dark/Light mode - deep, poetic, serene night
      vec3 skyZenith  = mix(vec3(0.93, 0.94, 0.96), vec3(0.003, 0.005, 0.010), u_is_dark);
      vec3 skyHorizon = mix(vec3(0.96, 0.97, 0.98), vec3(0.006, 0.010, 0.018), u_is_dark);
      
      // Blend a delicate touch of secondary neon color into the horizon for a soft environmental glow
      skyHorizon = mix(skyHorizon, u_neon_color2 * 0.06, u_is_dark);
      vec3 skyBase = mix(skyZenith, skyHorizon, horizonBlend);

      // Natural serene mountains & flowing river
      vec2 stM = terrain_st;
      stM.y += 2.5;

      // --- CELESTIAL 3D PERSPECTIVE SHOOTING STARS FALLING BEHIND MOUNTAINS ---
      // Rendered with unwarped_st so shooting stars and trails never jitter or shake on impact!
      vec3 meteorSkyLight = vec3(0.0);
      float meteorReflectA = 0.0;
      float meteorReflectB = 0.0;
      vec3 meteorReflectColor = vec3(0.0);

      for (float mi = 0.0; mi < 3.0; mi++) {
          float mCycle = 5.8 + mi * 3.1;
          float mTime = mod(t * 1.05 + mi * 3.9, mCycle);
          
          if (mTime < 2.2) {
              float mProg = mTime / 2.2;
              vec2 mSeed = vec2(floor((t * 1.05 + mi * 3.9) / mCycle), mi * 37.1);
              
              float startX = (hash(mSeed) * 2.0 - 1.0) * 13.0;
              float startY = 3.8 + hash(mSeed + vec2(19.2)) * 1.4;
              float startZ = -4.5;
              
              float curZ = startZ + mTime * 1.95;
              float curX = startX + mTime * 5.6;
              float curY = startY - mTime * 2.7 - mTime * mTime * 0.82;
              
              float depthFactor = 1.0 / (1.0 - curZ * 0.28);
              vec2 screenPos = vec2(curX, curY) * depthFactor;
              
              vec2 vel3D = vec2(5.6, -2.7 - mTime * 1.6);
              vec2 screenVel = normalize(vel3D);
              
              vec2 vHead = unwarped_st - screenPos;
              float proj = dot(vHead, -screenVel);
              float trailLength = (2.4 + mProg * 1.8) * depthFactor;
              
              if (proj >= 0.0 && proj <= trailLength) {
                  float distPerp = length(vHead + screenVel * proj);
                  float trailProgress = (1.0 - proj / trailLength);
                  float ribbonWidth = 0.038 * depthFactor * (0.35 + 0.65 * trailProgress);
                  float trailIntensity = exp(-distPerp / ribbonWidth) * pow(trailProgress, 1.4);
                  
                  float depthBrightness = 0.50 + 0.60 * smoothstep(-4.5, -0.5, curZ);
                  vec3 trailCol = mix(vec3(1.0, 0.96, 0.90), mix(u_neon_color, u_neon_color2, 0.4), proj / trailLength);
                  meteorSkyLight += trailCol * trailIntensity * depthBrightness * 0.75;
              }
              
              // Meteor glowing nucleus head
              float dHead = length(vHead);
              float headCore = exp(-dHead / (0.045 * depthFactor)) * 0.70;
              float headAura = exp(-dHead / (0.18 * depthFactor)) * 0.20;
              meteorSkyLight += vec3(1.0, 0.98, 0.94) * (headCore + headAura) * depthFactor;
              
              // Trailing effect behind moving meteors (soft persistent path)
              for (float k = 0.0; k < 15.0; k++) {
                  float pastTime = mTime - k * 0.026;
                  if (pastTime < 0.0) break;
                  
                  float pZ = startZ + pastTime * 1.95;
                  float pX = startX + pastTime * 5.6;
                  float pY = startY - pastTime * 2.7 - pastTime * pastTime * 0.82;
                  float pDepth = 1.0 / (1.0 - pZ * 0.28);
                  vec2 pScreen = vec2(pX, pY) * pDepth;
                  
                  float dPast = length(unwarped_st - pScreen);
                  float frameAlpha = pow(0.78, k);
                  float rPast = (0.025 + 0.014 * (1.0 - k / 15.0)) * pDepth;
                  float pastIntensity = exp(-dPast / rPast) * frameAlpha;
                  
                  vec3 pastCol = mix(u_neon_color, vec3(1.0, 0.98, 0.92), 1.0 - k / 15.0);
                  meteorSkyLight += pastCol * pastIntensity * pDepth * 0.28;
              }

              // Mountain crest reflections in screen space:
              float ridgeAY = fbm(vec2(screenPos.x * 0.20 + 0.3 + t * 0.022, 1.5)) * 12.9 - 2.18 - 2.5;
              float distToRidgeA = abs(screenPos.y - ridgeAY);
              float horizDistA = abs(stM.x - screenPos.x);
              
              if (distToRidgeA < 2.5 && horizDistA < 4.0) {
                  float reflA = exp(-distToRidgeA * 1.2) * exp(-horizDistA * 0.85);
                  meteorReflectA += reflA;
                  meteorReflectColor += mix(vec3(1.0, 0.96, 0.84), u_neon_color, 0.55) * reflA;
              }
              
              float ridgeBY = fbm(vec2(screenPos.x * 0.31 + 5.7 + t * 0.045, 3.2)) * 5.4 - 0.9 - 2.5;
              float distToRidgeB = abs(screenPos.y - ridgeBY);
              float horizDistB = abs(stM.x - screenPos.x);
              if (distToRidgeB < 2.2 && horizDistB < 3.5) {
                  float reflB = exp(-distToRidgeB * 1.3) * exp(-horizDistB * 0.95);
                  meteorReflectB += reflB;
              }
          }
      }

      // Mountain Ridge A (Deep background mountain - slow celestial drift)
      float ridgeA = fbm(vec2(stM.x * 0.20 + 0.3 + t * 0.022, 1.5)) * 12.9 - 2.18;
      float aboveA  = stM.y - ridgeA;
      float alphaA  = smoothstep(0.015, -0.015, aboveA);
      
      // Ridge A: Exactly ONE crisp, single razor stroke outlining the crest rim
      float strokeA = exp(-abs(aboveA) * 44.0) * 1.45;
      vec3 rimA = u_neon_color * strokeA * u_neon_intensity;
      rimA += meteorReflectColor * strokeA * 0.30;

      // --- SPARSE RETRO HALFTONE ORDERED DITHERING (RIDGE A) ---
      float slopeA = max(0.0, -aboveA);
      // Strictly confine dither to upper mountain slope (zero dots anywhere else!)
      float ditherZoneA = smoothstep(0.48, 0.02, slopeA) * smoothstep(0.015, 0.05, slopeA);
      float facetA = sin(stM.x * 2.2 + slopeA * 1.2) * 0.5 + 0.5;
      
      // Delicate gradient just below the crest, fading quickly so mountain body is pure deep black
      float lightA = exp(-slopeA * 2.6) * (0.12 + 0.58 * facetA);

      // Halftone screen rotated 45 degrees:
      float htSpacingA = max(5.0, u_dither_scale * 3.6);
      vec2 htPosA = (vec2(gl_FragCoord.x + gl_FragCoord.y, gl_FragCoord.y - gl_FragCoord.x) * 0.7071) / htSpacingA;
      vec2 htCellA = fract(htPosA) - 0.5;
      float dotDistA = length(htCellA);

      // Sparse halftone dots: capped at 0.35 radius so dots stay isolated and sparse (thưa thớt)
      float dotRadiusA = sqrt(lightA) * 0.35;
      float htDotA = smoothstep(dotRadiusA, dotRadiusA - 0.07, dotDistA);

      // Bayer 8x8 with a solid positive offset so (0,0) never produces stray dots when light is 0
      float bayerA = bayer8(gl_FragCoord.xy / max(1.0, u_dither_scale));
      float bayerDotA = step(bayerA + 0.04, lightA * 0.45);

      // Combined sparse halftone dither (strictly zero outside ditherZoneA!)
      float ditherPatternA = max(htDotA, bayerDotA * 0.6) * ditherZoneA;

      // Neon halftone dots matching the single stroke's color (u_neon_color):
      vec3 ditherA = u_neon_color * ditherPatternA * u_dither_strength * u_neon_intensity;

      // Pitch black mountain body in dark mode:
      vec3 darkMountainBaseA = mix(vec3(0.0, 0.0, 0.001), vec3(0.92, 0.94, 0.98), 1.0 - u_is_dark);
      vec3 colA = darkMountainBaseA + rimA + ditherA;

      // Mountain Ridge B (Foreground mountain - natural gentle drift)
      float ridgeB = fbm(vec2(stM.x * 0.31 + 5.7 + t * 0.045, 3.2)) * 5.4 - 0.9;
      float aboveB  = stM.y - ridgeB;
      float alphaB  = smoothstep(0.015, -0.015, aboveB);
      
      // Ridge B: Exactly ONE crisp, single razor stroke outlining the crest rim
      float strokeB = exp(-abs(aboveB) * 44.0) * 1.45;
      vec3 rimB = u_neon_color2 * strokeB * u_neon_intensity;
      rimB += meteorReflectColor * strokeB * 0.25;

      // --- SPARSE RETRO HALFTONE ORDERED DITHERING (RIDGE B) ---
      float slopeB = max(0.0, -aboveB);
      // Strictly confine dither to upper mountain slope (zero dots anywhere else!)
      float ditherZoneB = smoothstep(0.48, 0.02, slopeB) * smoothstep(0.015, 0.05, slopeB);
      float facetB = sin(stM.x * 2.6 - slopeB * 1.4) * 0.5 + 0.5;
      
      float lightB = exp(-slopeB * 2.8) * (0.12 + 0.58 * facetB);

      // Halftone screen rotated -30 degrees for Ridge B:
      float htSpacingB = max(5.5, u_dither_scale * 4.0);
      vec2 htPosB = (vec2(gl_FragCoord.x * 0.866 - gl_FragCoord.y * 0.5, gl_FragCoord.x * 0.5 + gl_FragCoord.y * 0.866) + vec2(17.4, 31.9)) / htSpacingB;
      vec2 htCellB = fract(htPosB) - 0.5;
      float dotDistB = length(htCellB);

      float dotRadiusB = sqrt(lightB) * 0.35;
      float htDotB = smoothstep(dotRadiusB, dotRadiusB - 0.07, dotDistB);

      float bayerB = bayer8((gl_FragCoord.xy + vec2(4.0, 4.0)) / max(1.0, u_dither_scale));
      float bayerDotB = step(bayerB + 0.04, lightB * 0.45);

      float ditherPatternB = max(htDotB, bayerDotB * 0.6) * ditherZoneB;
      vec3 ditherB = u_neon_color2 * ditherPatternB * u_dither_strength * u_neon_intensity;

      // Pitch black mountain body in dark mode:
      vec3 darkMountainBaseB = mix(vec3(0.0, 0.0, 0.001), vec3(0.88, 0.91, 0.96), 1.0 - u_is_dark);
      vec3 colB = darkMountainBaseB + rimB + ditherB;

      // Subtle cursor sweep glint on mountain single crest stroke
      float topRidgeScreenY = max(ridgeA, ridgeB) - 2.5;
      float distCursorToCrest = abs(mouse_st.y - topRidgeScreenY);
      float horizDistCursor = abs(stM.x - mouse_st.x);
      float cursorSweepGlint = exp(-horizDistCursor * 2.0) * exp(-distCursorToCrest * 3.0) * (0.8 + 0.2 * sin(u_time * 5.0));
      colA += u_neon_color * cursorSweepGlint * 0.35 * strokeA;
      colB += u_neon_color2 * cursorSweepGlint * 0.35 * strokeB;

      // Background Celestial Stars: Gentle Sine Pulsing & Twinkling with Soft Central Glow (Rock-steady, NO jitter!)
      vec2 skySt = unwarped_st;
      vec3 starColorSum = vec3(0.0);
      for (float i = 0.0; i < 28.0; i++) {
          vec2 seed = vec2(i * 127.1, i * 311.7);
          vec2 starPos = vec2(
               hash(seed) * 50.0 - 25.0,
               hash(seed + vec2(17.3)) * 4.6 + 0.35
          );
          vec2 dVec = skySt - starPos;
          float d = length(dVec);
          if (d > 2.2) continue;

          float starFreq = 0.50 + hash(seed + vec2(4.1)) * 0.60;
          float starPhase = hash(seed) * 6.28318;
          float sineWave = sin(t * starFreq + starPhase) * 0.5 + 0.5;
          float twinkle = smoothstep(0.08, 0.92, sineWave);

          // Gentle center core (không chói gắt, ngọc trai êm dịu)
          float centerCore = exp(-d * 22.0) * (0.05 + 0.10 * twinkle);
          float softCenterGlow = exp(-d * 7.5) * (0.03 + 0.06 * twinkle);
          float diffuseAura = exp(-d * 2.8) * (0.012 + 0.025 * twinkle);

          vec3 pastelRainbow = 0.85 + 0.15 * cos(6.28318 * (d * 1.5 - t * 0.035 + vec3(0.0, 0.33, 0.67)));
          float rainbowHalo = exp(-pow((d - 0.22) / 0.16, 2.0)) * 0.025 * twinkle;

          vec3 starHue = mix(vec3(1.0, 0.94, 0.82), vec3(0.95, 0.97, 1.0), twinkle);
          vec3 starLight = starHue * (centerCore + softCenterGlow + diffuseAura) + pastelRainbow * rainbowHalo;

          starColorSum += starLight * (0.20 + 0.80 * twinkle);
      }

      float mountainMask = max(alphaA, alphaB);
      float starMask = u_is_dark * (1.0 - mountainMask);
      
      // Dynamic sky composition
      vec3 col = skyBase;
      col += starColorSum * 0.55 * starMask;

      // Aurora Borealis layer - gracefully draped in translucent silk, vibrant yet harmonious (never blinding)
      vec3 auroraCol = getAurora(unwarped_st - vec2(0.0, 0.25), t) * u_is_dark * (u_aurora_intensity * 0.70) * (1.0 - mountainMask);
      col += auroraCol;

      // --- CELESTIAL REAL-WORLD MOON WITH ORDERED DITHERING & AUTO LUNAR PHASE ---
      float moonArcAngle = 0.88 + sin(t * 0.005) * 0.26;
      float moonArcRadius = 4.6;
      vec2 moonOrbitCenter = vec2(0.2, -0.9);
      vec2 moonPos = moonOrbitCenter + vec2(cos(moonArcAngle), sin(moonArcAngle)) * moonArcRadius;

      vec2 moonUV = unwarped_st - moonPos;
      float moonRadius = 0.42;
      float dMoon = length(moonUV);
      vec2 mNorm = moonUV / moonRadius;
      float rDist = length(mNorm);

      vec3 moonSurfaceColor = vec3(0.0);
      float moonIllum = 0.0;

      float bayerMoon = bayer8(gl_FragCoord.xy / max(1.0, u_dither_scale));

      if (rDist <= 1.0) {
          float zNorm = sqrt(max(0.0, 1.0 - rDist * rDist));
          vec3 N = vec3(mNorm.x, mNorm.y, zNorm);

          float sunAngle = u_moon_phase * 6.2831853;
          vec3 L = vec3(-sin(sunAngle), 0.0, -cos(sunAngle));

          float NdotL = dot(N, L);
          
          // ORDERED DITHERING ON LUNAR TERMINATOR & CRATERS (Bayer 8x8 Stippling)
          float ditherOffset = (bayerMoon - 0.5) * 0.42 * u_dither_strength;
          float sunlitSmooth = smoothstep(-0.04, 0.04, NdotL);
          float sunlitDithered = smoothstep(-0.20, 0.20, NdotL + ditherOffset);
          float sunlit = mix(sunlitSmooth, sunlitDithered, u_dither_strength);
          
          float crater = noise(mNorm * 6.5) * 0.16 + noise(mNorm * 16.0) * 0.08;
          float ditherCrater = crater + (bayerMoon - 0.5) * 0.10 * u_dither_strength;
          
          vec3 sunlitColor = mix(vec3(0.98, 0.96, 0.92), vec3(0.96, 0.91, 0.78), ditherCrater * 1.5);
          vec3 earthshineColor = vec3(0.03, 0.05, 0.10) * (1.0 - ditherCrater * 0.5);
          float diskEdge = smoothstep(1.0, 0.94, rDist);
          
          moonSurfaceColor = mix(earthshineColor, sunlitColor, sunlit) * diskEdge;
          moonIllum = sunlit;
      }

      // Dynamic Real-time Lunar Corona & Aureole with Concentric Ordered Dither Halftone Rings
      float phaseIllum = 0.5 * (1.0 - cos(u_moon_phase * 6.2831853));
      float moonCorona = (0.020 + 0.025 * phaseIllum) / (dMoon * dMoon * 4.5 + 0.18);
      float moonAureole = exp(-dMoon * 1.8) * (0.08 + 0.10 * phaseIllum);
      float moonHaze = exp(-dMoon * 0.75) * (0.04 + 0.06 * phaseIllum);

      // Concentric ordered dither halftone stipple rings around moon (vintage celestial engraving)
      float ringFreq = dMoon * 14.0;
      float ringStipple = (sin(ringFreq) * 0.5 + 0.5);
      float ditherHalo = step(bayerMoon, (moonAureole * 3.8 + ringStipple * 0.14) * u_dither_strength);
      vec3 moonHaloStipple = vec3(0.98, 0.95, 0.85) * ditherHalo * 0.040 * smoothstep(2.5, 0.4, dMoon) * u_dither_strength;

      vec3 moonGlowTint = mix(vec3(0.98, 0.92, 0.78), vec3(0.65, 0.82, 0.98), smoothstep(0.3, 2.5, dMoon));
      vec3 moonTotalLight = moonSurfaceColor * 0.95 + 
                            moonGlowTint * (moonCorona * 0.40 + moonAureole * 0.35 + moonHaze * 0.20) +
                            moonHaloStipple;

      col += moonTotalLight * u_is_dark * (1.0 - mountainMask);
      col += meteorSkyLight * u_is_dark * (1.0 - mountainMask);

      // --- POETIC CELESTIAL TOPOGRAPHY & MOONLIT RIVER (CLEAN, ZEN, CRYSTALLINE) ---
      // River valley bed nestled peacefully at the foot of the pitch-black mountains
      float riverValleyY = ridgeB * 0.35 - 0.40;
      float riverDepthFactor = clamp((-stM.y + 0.8) * 0.45, 0.05, 1.8);
      float waterPerspective = 1.0 / (riverDepthFactor + 0.30);
      float riverWaterMask = smoothstep(0.05, -0.45, stM.y - riverValleyY);
      
      float waveTime = t * 0.30;
      
      // Deep midnight obsidian crystalline water basin
      vec3 riverBasin = mix(
          vec3(0.001, 0.003, 0.008), 
          vec3(0.004, 0.016, 0.035) + u_river_color * 0.035, 
          smoothstep(0.0, 1.5, riverDepthFactor)
      );

      // Smooth elevation coordinate with gentle mouse ripple wake (zen water ripples)
      vec2 topoUV = vec2(stM.x * 0.32 * waterPerspective + waveTime * 0.04, stM.y * 1.5 - waveTime * 0.03);
      vec2 toMouse = stM - mouse_st;
      float mDist = length(toMouse);
      float mRipple = sin(mDist * 14.0 - t * 3.5) * exp(-mDist * 2.8) * 0.08;
      topoUV += vec2(mRipple * 0.4, mRipple);

      // Pristine, smooth topographic elevation field (clean, organic, no chaotic curl noise)
      float elev = fbm(topoUV) * 0.65 + fbm(topoUV * 1.8 + vec2(1.2, 0.7)) * 0.25;
      
      // 10 distinct, serene elevation contour isolines
      float levels = 10.0;
      float scaledElev = elev * levels;
      float dContour = abs(fract(scaledElev) - 0.5);
      
      // Major index contours (every 5th line has a bolder starlight accent)
      float isMajorLine = smoothstep(0.35, 0.0, abs(fract(scaledElev / 5.0) - 0.5) * 5.0);
      
      // Laser-fine, crisp luminous core
      float lineCore = smoothstep(0.024, 0.002, dContour);
      float lineAura = exp(-dContour * 16.0) * 0.25;
      float topoLineIntensity = lineCore * 0.85 + lineAura + isMajorLine * lineCore * 0.45;
      
      // Pure, ethereal starlight cyan / champagne gold contour color
      vec3 baseTopoColor = mix(u_river_color, vec3(0.85, 0.96, 1.0), 0.45);
      vec3 topoLineColor = baseTopoColor * topoLineIntensity * (0.65 + 0.35 * u_neon_intensity) * u_ink_intensity;

      // Specular moonbeam reflection column along the vertical path under the moon
      float moonDistX = abs(stM.x - moonPos.x);
      float moonColumn = exp(-pow(moonDistX / 1.4, 2.0));
      
      // Surface ripples catching moonlight (smooth, silky, pure specular reflection - NO dither!)
      float waterRipple = sin(stM.y * 22.0 * waterPerspective * 0.25 + waveTime * 1.8 + sin(stM.x * 3.0) * 1.5);
      float rippleSpecular = pow(max(0.0, waterRipple), 3.5);
      
      vec3 moonGlintColor = mix(vec3(0.98, 0.95, 0.88), vec3(0.65, 0.88, 1.0), 0.30);
      vec3 moonReflectionWater = moonGlintColor * (
          moonColumn * 0.05 + 
          rippleSpecular * moonColumn * 0.40
      ) * (0.30 + 0.70 * phaseIllum);

      // Soft ambient reflection of mountain neon rims in deep water
      float neonReflectFade = smoothstep(-0.4, 0.4, riverDepthFactor);
      vec3 mountainNeonReflection = (u_neon_color * 0.035 + u_neon_color2 * 0.045) * neonReflectFade * u_neon_intensity;
      
      // Ethereal river mist hovering softly where water meets the pitch-black mountain foot
      float shoreMist = exp(-abs(stM.y - riverValleyY) * 4.0) * 0.35;
      vec3 riverMistGlow = mix(u_river_color, vec3(0.7, 0.88, 1.0), 0.35) * shoreMist * (u_neon_intensity * 0.30);
      
      // Final poetic, crystalline river composition:
      vec3 waterCol = riverBasin + 
                      topoLineColor + 
                      moonReflectionWater + 
                      mountainNeonReflection +
                      riverMistGlow;

      // Composite Mountains (Rendered with solid opacity so mountains are deep, pure pitch black)
      col = mix(col, colA, alphaA);
      col = mix(col, colB, alphaB);

      // Composite River Water in foreground (Solid 100% water body so no background mountain dots leak through)
      col = mix(col, waterCol, riverWaterMask);

      // Add shockwave chromatic ring flash from impact (soft, subtle pulse, never blinding)
      col += shockwaveColorFlash;

      // Add glowing interactive cursor color on top
      col += cursorColor * (0.85 + 0.15 * sin(u_time * 4.0));

      // Photographic exposure tone mapping preserving vividness, clarity, and preventing harsh blowout:
      col = 1.0 - exp(-col * 1.05);

      gl_FragColor = vec4(col, 1.0);
  }
`;

interface Preset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  river?: string;
}

const PRESETS: Preset[] = [
  { id: 'cyan_ice', name: 'Băng Dương Neon', primary: '#00f2fe', secondary: '#4facfe', river: '#00f2fe' },
  { id: 'cyber_purple', name: 'Tử Đinh Hương', primary: '#ff007f', secondary: '#9b5de5', river: '#9b5de5' },
  { id: 'aurora', name: 'Cực Quang Lục', primary: '#00f5d4', secondary: '#10b981', river: '#00f5d4' },
  { id: 'sunset', name: 'Hoàng Hôn Visual', primary: '#ff4500', secondary: '#f9d976', river: '#ff5500' },
  { id: 'synth_retro', name: 'Hồng Kông Retro', primary: '#ff2e93', secondary: '#0575e6', river: '#00c6ff' },
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

export function getRealWorldMoonPhase(date: Date = new Date()): {
  phase: number;
  name: string;
  illuminated: number;
  ageDays: number;
} {
  const KNOWN_NEW_MOON = 1704974220000; // Jan 11, 2024, 11:57 UTC
  const SYNODIC_MONTH = 29.53058867 * 86400 * 1000;
  const time = date.getTime();
  const diff = (time - KNOWN_NEW_MOON) % SYNODIC_MONTH;
  const phase = ((diff % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;
  const ageDays = phase * 29.53058867;
  const illuminated = Math.round(0.5 * (1.0 - Math.cos(phase * 2 * Math.PI)) * 100);

  let name = 'Trăng non (Sóc)';
  if (phase >= 0.02 && phase < 0.23) {
    name = 'Trăng lưỡi liềm đầu tháng (Waxing Crescent)';
  } else if (phase >= 0.23 && phase < 0.27) {
    name = 'Trăng bán nguyệt đầu tháng (Thượng huyền / First Quarter)';
  } else if (phase >= 0.27 && phase < 0.47) {
    name = 'Trăng khuyết đầu tháng (Waxing Gibbous)';
  } else if (phase >= 0.47 && phase < 0.53) {
    name = 'Trăng tròn (Vọng / Full Moon)';
  } else if (phase >= 0.53 && phase < 0.73) {
    name = 'Trăng khuyết cuối tháng (Waning Gibbous)';
  } else if (phase >= 0.73 && phase < 0.77) {
    name = 'Trăng bán nguyệt cuối tháng (Hạ huyền / Last Quarter)';
  } else if (phase >= 0.77 && phase < 0.98) {
    name = 'Trăng lưỡi liềm cuối tháng (Waning Crescent)';
  } else {
    name = 'Trăng non / Trăng mới (New Moon)';
  }

  return { phase, name, illuminated, ageDays };
}

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

const normalizeHex = (hex: string): string => {
  let clean = hex.trim();
  if (!clean.startsWith('#')) clean = '#' + clean;
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toLowerCase();
  }
  return '#00f2fe';
};

interface ColorFieldProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (hex: string) => void;
  presetSwatches?: string[];
}

const ColorField: React.FC<ColorFieldProps> = ({
  label,
  sublabel,
  value,
  onChange,
  presetSwatches = []
}) => {
  const [inputVal, setInputVal] = useState(value.toUpperCase());

  useEffect(() => {
    setInputVal(value.toUpperCase());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    setInputVal(raw.toUpperCase());
    const formatted = raw.startsWith('#') ? raw : '#' + raw;
    if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
      onChange(formatted.toLowerCase());
    } else if (/^#[0-9A-Fa-f]{3}$/.test(formatted)) {
      const full = `#${formatted[1]}${formatted[1]}${formatted[2]}${formatted[2]}${formatted[3]}${formatted[3]}`;
      onChange(full.toLowerCase());
    }
  };

  const handleBlur = () => {
    const formatted = inputVal.startsWith('#') ? inputVal : '#' + inputVal;
    if (!/^#[0-9A-Fa-f]{6}$/.test(formatted) && !/^#[0-9A-Fa-f]{3}$/.test(formatted)) {
      setInputVal(value.toUpperCase());
    } else {
      setInputVal(formatted.toUpperCase());
    }
  };

  const safeHexForInputColor = normalizeHex(value);

  return (
    <div className="p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 block truncate">
            {label}
          </span>
          {sublabel && (
            <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate">
              {sublabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Interactive Native Color Wheel Swatch */}
          <div className="relative group cursor-pointer" title="Bấm để mở bảng chọn màu tự do (Color Wheel)">
            <input
              type="color"
              value={safeHexForInputColor}
              onChange={(e) => {
                onChange(e.target.value.toLowerCase());
                setInputVal(e.target.value.toUpperCase());
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <div 
              className="w-7 h-7 rounded-xl border-2 border-white/60 dark:border-slate-700 shadow-xs flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md cursor-pointer"
              style={{ backgroundColor: safeHexForInputColor }}
            >
              <Palette className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-90 group-hover:opacity-100" />
            </div>
          </div>

          {/* Direct Hex Code Input */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2 py-1 text-[10px] font-mono shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500">
            <span className="text-slate-400 font-bold mr-0.5 select-none">#</span>
            <input
              type="text"
              value={inputVal.replace(/^#/, '')}
              onChange={handleInputChange}
              onBlur={handleBlur}
              maxLength={6}
              placeholder="00F2FE"
              className="w-14 uppercase outline-none bg-transparent font-bold text-slate-800 dark:text-slate-100 tracking-wider"
            />
          </div>
        </div>
      </div>

      {/* Preset Swatches Bar */}
      {presetSwatches.length > 0 && (
        <div className="flex items-center justify-between gap-1 pt-0.5">
          {presetSwatches.map((hex) => {
            const isMatch = value.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  onChange(hex.toLowerCase());
                  setInputVal(hex.toUpperCase());
                }}
                title={hex}
                className={`w-5 h-5 rounded-lg border transition-all cursor-pointer ${
                  isMatch 
                    ? 'ring-2 ring-indigo-500 scale-115 shadow-sm border-white' 
                    : 'border-black/10 dark:border-white/20 hover:scale-110 hover:opacity-100 opacity-80'
                }`}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export const WebGLBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse position tracking for beautiful interaction
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });

  // Energetic meteor collision shockwave distortion state
  const shockwaveRef = useRef({
    x: 0,
    y: 0,
    radius: 0,
    intensity: 0,
    color: [0, 0.95, 1.0] as [number, number, number]
  });

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

  useEffect(() => {
    const handleImpact = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { clientX, clientY, color } = customEvent.detail;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        const stX = ((clientX / width) * 2.0 - 1.0) * aspect * 5.0;
        const stY = ((1.0 - clientY / height) * 2.0 - 1.0) * 5.0;
        const rgb = hexToRgb(color || primaryColor);

        shockwaveRef.current = {
          x: stX,
          y: stY,
          radius: 0.1,
          intensity: 1.0,
          color: rgb
        };
      }
    };
    window.addEventListener('meteor-mountain-impact', handleImpact);
    return () => window.removeEventListener('meteor-mountain-impact', handleImpact);
  }, [primaryColor]);
  const [opacity, setOpacity] = useState<number>(() => Number(localStorage.getItem('bg_opacity') || '1.00'));
  const [intensity, setIntensity] = useState<number>(() => {
    const saved = localStorage.getItem('bg_intensity');
    if (!saved) return 1.20;
    const n = Number(saved);
    return isNaN(n) ? 1.20 : Math.max(0.2, Math.min(n, 2.5));
  });
  const [speed, setSpeed] = useState<number>(() => Number(localStorage.getItem('bg_speed') || '0.9'));
  const [glassmorphic, setGlassmorphic] = useState<boolean>(() => localStorage.getItem('bg_glassmorphic') !== 'false');
  const [auroraIntensity, setAuroraIntensity] = useState<number>(() => {
    const saved = localStorage.getItem('bg_aurora_intensity');
    if (!saved) return 1.15;
    const n = Number(saved);
    return isNaN(n) ? 1.15 : Math.max(0.1, Math.min(n, 3.0));
  });
  
  // Custom River / Fractal Noise Color
  const [riverColor, setRiverColor] = useState<string>(() => localStorage.getItem('bg_river_color') || '#00f2fe');

  // Aurora custom colors
  const [auroraPreset, setAuroraPreset] = useState<string>(() => localStorage.getItem('bg_aurora_preset') || 'classic_green');
  const [auroraCol1, setAuroraCol1] = useState<string>(() => localStorage.getItem('bg_aurora_col1') || '#0aff84');
  const [auroraCol2, setAuroraCol2] = useState<string>(() => localStorage.getItem('bg_aurora_col2') || '#00ccff');
  const [auroraCol3, setAuroraCol3] = useState<string>(() => localStorage.getItem('bg_aurora_col3') || '#ae26ed');

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'theme' | 'landscape' | 'stars'>('theme');
  const [showCustomColors, setShowCustomColors] = useState<boolean>(false);
  const [activeAuroraColorIdx, setActiveAuroraColorIdx] = useState<1 | 2 | 3>(1);

  // WebGL Falling Stardust & Van Gogh Starry Sky custom state
  const [pcEnabled, setPcEnabled] = useState<boolean>(() => localStorage.getItem('pc_enabled') !== 'false');
  const [pcCount, setPcCount] = useState<number>(() => Number(localStorage.getItem('pc_count') ?? '280'));
  const [pcSparkleSize, setPcSparkleSize] = useState<number>(() => {
    const saved = localStorage.getItem('pc_size');
    if (!saved) return 1.40;
    const n = Number(saved);
    return isNaN(n) ? 1.40 : Math.max(0.3, Math.min(n, 3.5));
  });
  const [pcCometSize, setPcCometSize] = useState<number>(() => {
    const saved = localStorage.getItem('pc_comet_size');
    if (!saved) return 1.0;
    const n = Number(saved);
    return isNaN(n) ? 1.0 : Math.max(0.3, Math.min(n, 3.5));
  });
  const [pcColorMode, setPcColorMode] = useState<number>(() => Number(localStorage.getItem('pc_color_mode') ?? '0'));
  const [pcSpeed, setPcSpeed] = useState<number>(() => Number(localStorage.getItem('pc_speed') ?? '0.30'));
  const [pcParallax, setPcParallax] = useState<number>(() => Number(localStorage.getItem('pc_parallax') ?? '0.15'));
  const [pcShootingStars, setPcShootingStars] = useState<boolean>(() => localStorage.getItem('pc_shooting_stars') !== 'false');
  const [pcCometTail, setPcCometTail] = useState<boolean>(() => localStorage.getItem('pc_comet_tail') !== 'false');

  // Ordered Dithering (Bayer 8x8) and Ink Current state
  const [ditherEnabled, setDitherEnabled] = useState<boolean>(() => localStorage.getItem('bg_dither_enabled') !== 'false');
  const [ditherStrength, setDitherStrength] = useState<number>(() => {
    const saved = localStorage.getItem('bg_dither_strength');
    if (!saved) return 1.0;
    const n = Number(saved);
    return isNaN(n) ? 1.0 : Math.max(0.0, Math.min(n, 2.0));
  });
  const [ditherScale, setDitherScale] = useState<number>(() => {
    const saved = localStorage.getItem('bg_dither_scale');
    if (!saved) return 1.0;
    const n = Number(saved);
    return isNaN(n) ? 1.0 : Math.max(1.0, Math.min(n, 3.0));
  });
  const [inkIntensity, setInkIntensity] = useState<number>(() => {
    const saved = localStorage.getItem('bg_ink_intensity');
    if (!saved) return 1.0;
    const n = Number(saved);
    return isNaN(n) ? 1.0 : Math.max(0.2, Math.min(n, 2.5));
  });

  const updatePointCloud = (updates: Partial<{
    enabled: boolean;
    particleCount: number;
    sparkleSize: number;
    cometSize: number;
    colorMode: number;
    speed: number;
    parallaxStrength: number;
    shootingStarsEnabled: boolean;
    cometTailEnabled: boolean;
  }>) => {
    if (updates.enabled !== undefined) setPcEnabled(updates.enabled);
    if (updates.particleCount !== undefined) setPcCount(updates.particleCount);
    if (updates.sparkleSize !== undefined) setPcSparkleSize(updates.sparkleSize);
    if (updates.cometSize !== undefined) setPcCometSize(updates.cometSize);
    if (updates.colorMode !== undefined) setPcColorMode(updates.colorMode);
    if (updates.speed !== undefined) setPcSpeed(updates.speed);
    if (updates.parallaxStrength !== undefined) setPcParallax(updates.parallaxStrength);
    if (updates.shootingStarsEnabled !== undefined) setPcShootingStars(updates.shootingStarsEnabled);
    if (updates.cometTailEnabled !== undefined) setPcCometTail(updates.cometTailEnabled);

    window.dispatchEvent(new CustomEvent('update-pointcloud-settings', {
      detail: updates
    }));
  };

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
    localStorage.setItem('bg_river_color', riverColor);
    localStorage.setItem('bg_opacity', String(opacity));
    localStorage.setItem('bg_intensity', String(intensity));
    localStorage.setItem('bg_speed', String(speed));
    localStorage.setItem('bg_glassmorphic', String(glassmorphic));
    localStorage.setItem('bg_aurora_intensity', String(auroraIntensity));
    localStorage.setItem('bg_aurora_preset', auroraPreset);
    localStorage.setItem('bg_aurora_col1', auroraCol1);
    localStorage.setItem('bg_aurora_col2', auroraCol2);
    localStorage.setItem('bg_aurora_col3', auroraCol3);
    localStorage.setItem('bg_dither_enabled', String(ditherEnabled));
    localStorage.setItem('bg_dither_strength', String(ditherStrength));
    localStorage.setItem('bg_dither_scale', String(ditherScale));
    localStorage.setItem('bg_ink_intensity', String(inkIntensity));
  }, [preset, primaryColor, secondaryColor, riverColor, opacity, intensity, speed, glassmorphic, auroraIntensity, auroraPreset, auroraCol1, auroraCol2, auroraCol3, ditherEnabled, ditherStrength, ditherScale, inkIntensity]);

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
    const moonPhaseLocation = gl.getUniformLocation(program, 'u_moon_phase');
    const impactPosLocation = gl.getUniformLocation(program, 'u_impact_pos');
    const shockwaveRadiusLocation = gl.getUniformLocation(program, 'u_shockwave_radius');
    const shockwaveIntensityLocation = gl.getUniformLocation(program, 'u_shockwave_intensity');
    const impactColorLocation = gl.getUniformLocation(program, 'u_impact_color');
    const riverColorLocation = gl.getUniformLocation(program, 'u_river_color');
    const ditherStrengthLocation = gl.getUniformLocation(program, 'u_dither_strength');
    const ditherScaleLocation = gl.getUniformLocation(program, 'u_dither_scale');
    const inkIntensityLocation = gl.getUniformLocation(program, 'u_ink_intensity');

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
      const [rc_r, rc_g, rc_b] = hexToRgb(riverColor);
      
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
      if (riverColorLocation) {
        gl.uniform3f(riverColorLocation, rc_r, rc_g, rc_b);
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
      if (moonPhaseLocation) {
        gl.uniform1f(moonPhaseLocation, getRealWorldMoonPhase().phase);
      }

      // Update shockwave expansion and decay
      if (shockwaveRef.current.intensity > 0.005) {
        shockwaveRef.current.radius += 0.08 * (speed * 0.5 + 0.5);
        shockwaveRef.current.intensity *= 0.94;
      } else {
        shockwaveRef.current.intensity = 0.0;
      }

      if (impactPosLocation) {
        gl.uniform2f(impactPosLocation, shockwaveRef.current.x, shockwaveRef.current.y);
      }
      if (shockwaveRadiusLocation) {
        gl.uniform1f(shockwaveRadiusLocation, shockwaveRef.current.radius);
      }
      if (shockwaveIntensityLocation) {
        gl.uniform1f(shockwaveIntensityLocation, shockwaveRef.current.intensity);
      }
      if (impactColorLocation) {
        gl.uniform3f(
          impactColorLocation,
          shockwaveRef.current.color[0],
          shockwaveRef.current.color[1],
          shockwaveRef.current.color[2]
        );
      }
      if (ditherStrengthLocation) {
        gl.uniform1f(ditherStrengthLocation, ditherEnabled ? ditherStrength : 0.0);
      }
      if (ditherScaleLocation) {
        gl.uniform1f(ditherScaleLocation, ditherScale);
      }
      if (inkIntensityLocation) {
        gl.uniform1f(inkIntensityLocation, inkIntensity);
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
  }, [primaryColor, secondaryColor, riverColor, speed, intensity, isDarkMode, auroraIntensity, auroraCol1, auroraCol2, auroraCol3, ditherEnabled, ditherStrength, ditherScale, inkIntensity]);

  const selectPreset = (p: Preset) => {
    setPreset(p.id);
    setPrimaryColor(p.primary);
    setSecondaryColor(p.secondary);
    if (p.river) {
      setRiverColor(p.river);
      localStorage.setItem('bg_river_color', p.river);
    }
  };

  const handleReset = () => {
    setPreset('cyan_ice');
    setPrimaryColor('#00f2fe');
    setSecondaryColor('#4facfe');
    setRiverColor('#00f2fe');
    setOpacity(1.00);
    setIntensity(1.20);
    setSpeed(0.9);
    setGlassmorphic(true);
    setAuroraIntensity(0.85);
    setAuroraPreset('classic_green');
    setAuroraCol1('#0aff84');
    setAuroraCol2('#00ccff');
    setAuroraCol3('#ae26ed');
    setDitherEnabled(true);
    setDitherStrength(1.0);
    setDitherScale(1.0);
    setInkIntensity(1.0);
    updatePointCloud({
      enabled: true,
      particleCount: 280,
      sparkleSize: 1.40,
      cometSize: 1.0,
      colorMode: 0,
      speed: 0.30,
      parallaxStrength: 0.15,
      shootingStarsEnabled: true,
      cometTailEnabled: true
    });
  };

  const handleRandomizeThemeColors = () => {
    const palettes = [
      { p: '#00f2fe', s: '#4facfe', r: '#00f2fe' },
      { p: '#ff007f', s: '#9b5de5', r: '#9b5de5' },
      { p: '#00f5d4', s: '#10b981', r: '#00f5d4' },
      { p: '#ff4500', s: '#f9d976', r: '#ff5500' },
      { p: '#ff2e93', s: '#0575e6', r: '#00c6ff' },
      { p: '#38bdf8', s: '#818cf8', r: '#c084fc' },
      { p: '#f43f5e', s: '#fb923c', r: '#fde047' },
      { p: '#a855f7', s: '#ec4899', r: '#06b6d4' },
    ];
    const choice = palettes[Math.floor(Math.random() * palettes.length)];
    setPreset('custom');
    setPrimaryColor(choice.p);
    setSecondaryColor(choice.s);
    setRiverColor(choice.r);
    localStorage.setItem('bg_preset', 'custom');
    localStorage.setItem('bg_primary', choice.p);
    localStorage.setItem('bg_secondary', choice.s);
    localStorage.setItem('bg_river_color', choice.r);
  };

  const handleRandomizeAurora = () => {
    const auroraSets = [
      ['#0aff84', '#00ccff', '#ae26ed'],
      ['#ff007f', '#8a2be2', '#0000ff'],
      ['#ffaa00', '#ff2200', '#9400d3'],
      ['#00ffff', '#0055ff', '#ff00ff'],
      ['#00f5d4', '#10b981', '#6366f1'],
      ['#38bdf8', '#818cf8', '#f43f5e'],
      ['#ff70a6', '#ff9770', '#ffd670'],
      ['#00ff87', '#60efff', '#ff00aa']
    ];
    const choice = auroraSets[Math.floor(Math.random() * auroraSets.length)];
    setAuroraCol1(choice[0]);
    setAuroraCol2(choice[1]);
    setAuroraCol3(choice[2]);
    setAuroraPreset('custom');
    localStorage.setItem('bg_aurora_preset', 'custom');
    localStorage.setItem('bg_aurora_col1', choice[0]);
    localStorage.setItem('bg_aurora_col2', choice[1]);
    localStorage.setItem('bg_aurora_col3', choice[2]);
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

      {/* 3D WebGL Point Cloud Interactive Sparkle & Stardust Engine */}
      <WebGLPointCloud
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        isDarkMode={isDarkMode}
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
              className="w-88 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-[28px] shadow-2xl flex flex-col gap-4 text-slate-800 dark:text-slate-100 text-left"
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

              {/* Sub-tabs: 3 clear, uncluttered sections */}
              <div className="grid grid-cols-3 bg-slate-100/80 dark:bg-slate-950/70 p-1 rounded-2xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('theme')}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'theme' 
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Chủ đề</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('landscape')}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'landscape' 
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <span>⛰️</span>
                  <span>Cảnh quan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('stars')}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'stars' 
                      ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Bầu trời</span>
                </button>
              </div>

              {/* TAB 1: CHỦ ĐỀ & MÀU SẮC */}
              {activeTab === 'theme' && (
                <div className="space-y-3.5 max-h-[26rem] overflow-y-auto pr-1.5 text-slate-800 dark:text-slate-100">
                  {/* Presets Grid */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Gói màu sắc chủ đề
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {PRESETS.map((p) => {
                        const isSelected = preset === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selectPreset(p)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-xs font-semibold cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs' 
                                : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div 
                                className="w-4 h-4 rounded-full border border-white/20 shadow-xs shrink-0"
                                style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})` }}
                              />
                              <span className="text-xs font-bold">{p.name}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[3px]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lighting & Motion controls */}
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-800/70 space-y-3">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Ánh sáng & Tốc độ
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Mức sáng Neon tổng thể</span>
                        <span className="font-mono text-amber-500 font-bold">{intensity.toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.2" 
                        max="2.5" 
                        step="0.05"
                        value={intensity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setIntensity(val);
                          localStorage.setItem('bg_intensity', String(val));
                        }}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><Waves className="w-3.5 h-3.5 text-indigo-500" /> Tốc độ trôi dạt thiên hà</span>
                        <span className="font-mono text-indigo-500 font-bold">{speed.toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="2.5" 
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Optional Custom Hex/Hue palette expander */}
                  <div className="rounded-2xl border border-slate-150 dark:border-slate-800/80 overflow-hidden bg-white/50 dark:bg-slate-900/50">
                    <button
                      type="button"
                      onClick={() => setShowCustomColors(!showCustomColors)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Tùy biến mã màu riêng (Núi & Dòng Sông)</span>
                      </span>
                      <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 font-semibold">
                        {showCustomColors ? '▲ Thu gọn' : '▼ Tự do chọn màu'}
                      </span>
                    </button>

                    {showCustomColors && (
                      <div className="p-3 space-y-3 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>Click ô màu để mở bảng chọn hoặc gõ mã HEX</span>
                          <button
                            type="button"
                            onClick={handleRandomizeThemeColors}
                            className="flex items-center gap-1 text-[9px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                            title="Trộn ngẫu nhiên bộ màu phối cảnh"
                          >
                            <Shuffle className="w-3 h-3" /> Trộn màu
                          </button>
                        </div>

                        {/* Neon 1: Primary Mountain Rim */}
                        <ColorField
                          label="Màu Viền Núi 1"
                          sublabel="Rặng núi xa (Ridge A)"
                          value={primaryColor}
                          onChange={(c) => {
                            setPreset('custom');
                            setPrimaryColor(c);
                            localStorage.setItem('bg_preset', 'custom');
                            localStorage.setItem('bg_primary', c);
                          }}
                          presetSwatches={['#00f2fe', '#ff007f', '#00f5d4', '#ff4500', '#ae26ed', '#ffeb3b', '#10b981']}
                        />

                        {/* Neon 2: Secondary Mountain Rim */}
                        <ColorField
                          label="Màu Viền Núi 2"
                          sublabel="Rặng núi gần (Ridge B)"
                          value={secondaryColor}
                          onChange={(c) => {
                            setPreset('custom');
                            setSecondaryColor(c);
                            localStorage.setItem('bg_preset', 'custom');
                            localStorage.setItem('bg_secondary', c);
                          }}
                          presetSwatches={['#4facfe', '#9b5de5', '#10b981', '#f9d976', '#0575e6', '#ff8c00', '#ff007f']}
                        />

                        {/* River Color */}
                        <ColorField
                          label="Màu Dòng Sông Topography"
                          sublabel="Đường đồng mức & ánh phản chiếu"
                          value={riverColor}
                          onChange={(c) => {
                            setPreset('custom');
                            setRiverColor(c);
                            localStorage.setItem('bg_preset', 'custom');
                            localStorage.setItem('bg_river_color', c);
                          }}
                          presetSwatches={['#00f2fe', '#00f5d4', '#0055ff', '#9b5de5', '#ff007f', '#10b981', '#38bdf8']}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CẢNH QUAN (NÚI, SÔNG & CỰC QUANG) */}
              {activeTab === 'landscape' && (
                <div className="space-y-3.5 max-h-[26rem] overflow-y-auto pr-1.5 text-slate-800 dark:text-slate-100">
                  {/* Mountain Dither Card */}
                  <div className="p-3 bg-fuchsia-50/50 dark:bg-fuchsia-950/25 rounded-2xl border border-fuchsia-200/60 dark:border-fuchsia-800/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-wide flex items-center gap-1.5">
                        <span>🏁</span> Hạt Dither Núi & Mặt Trăng
                      </span>
                      <button
                        type="button"
                        onClick={() => setDitherEnabled(!ditherEnabled)}
                        className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition-colors ${
                          ditherEnabled 
                            ? 'bg-fuchsia-600 text-white shadow-xs' 
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {ditherEnabled ? 'Đang Bật' : 'Đã Tắt'}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        <span>Cường độ Dither (Halftone)</span>
                        <span className="font-mono text-fuchsia-600 dark:text-fuchsia-400 font-bold">{ditherStrength.toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range"
                        min="0.2"
                        max="2.0"
                        step="0.05"
                        value={ditherStrength}
                        onChange={(e) => setDitherStrength(Number(e.target.value))}
                        className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        <span>Cỡ hạt Dither (Bayer Scale)</span>
                        <span className="font-mono text-fuchsia-600 dark:text-fuchsia-400 font-bold">{ditherScale.toFixed(1)}px</span>
                      </div>
                      <input 
                        type="range"
                        min="1.0"
                        max="3.0"
                        step="0.2"
                        value={ditherScale}
                        onChange={(e) => setDitherScale(Number(e.target.value))}
                        className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                      />
                    </div>
                  </div>

                  {/* River Topography Card */}
                  <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/25 rounded-2xl border border-cyan-200/60 dark:border-cyan-800/40 space-y-2">
                    <span className="text-[11px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                      <span>🌊</span> Dòng Sông Topography (Mặt Nước Thủy Kính)
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        <span>Độ sáng đường đồng mức sông</span>
                        <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{inkIntensity.toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.2" 
                        max="2.5" 
                        step="0.05"
                        value={inkIntensity}
                        onChange={(e) => setInkIntensity(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Aurora Card */}
                  <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/25 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Dải Cực Quang (Aurora Borealis)
                      </span>
                      <span className="font-mono font-bold">{auroraIntensity.toFixed(2)}x</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        <span>Độ sáng & rực rỡ cực quang</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{auroraIntensity.toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="3.0" 
                        step="0.05"
                        value={auroraIntensity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAuroraIntensity(val);
                          localStorage.setItem('bg_aurora_intensity', String(val));
                        }}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                      />
                    </div>

                    {/* Live Aurora Spectrum Ribbon Preview */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>🌈</span> Phổ màu 3 tầng đang chiếu
                        </span>
                        <button
                          type="button"
                          onClick={handleRandomizeAurora}
                          className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                          title="Trộn ngẫu nhiên màu cực quang"
                        >
                          <Shuffle className="w-3 h-3" /> Trộn màu
                        </button>
                      </div>
                      <div 
                        className="h-5 rounded-xl border border-white/20 shadow-xs relative overflow-hidden transition-all duration-300"
                        style={{
                          background: `linear-gradient(90deg, ${auroraCol1} 0%, ${auroraCol2} 50%, ${auroraCol3} 100%)`,
                          boxShadow: `0 0 14px ${auroraCol1}40, 0 0 20px ${auroraCol2}25`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-between px-2 text-[8px] font-mono font-bold text-black/70 dark:text-white/90 select-none">
                          <span className="drop-shadow-xs">Tầng 1</span>
                          <span className="drop-shadow-xs">Tầng 2</span>
                          <span className="drop-shadow-xs">Tầng 3</span>
                        </div>
                      </div>
                    </div>

                    {/* Aurora Preset pills */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Bộ phối màu có sẵn
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {AURORA_PALETTES.map((ap) => {
                          const isSelected = auroraPreset === ap.id;
                          return (
                            <button
                              key={ap.id}
                              type="button"
                              onClick={() => {
                                setAuroraPreset(ap.id);
                                if (ap.id !== 'custom') {
                                  setAuroraCol1(ap.col1);
                                  setAuroraCol2(ap.col2);
                                  setAuroraCol3(ap.col3);
                                  localStorage.setItem('bg_aurora_preset', ap.id);
                                  localStorage.setItem('bg_aurora_col1', ap.col1);
                                  localStorage.setItem('bg_aurora_col2', ap.col2);
                                  localStorage.setItem('bg_aurora_col3', ap.col3);
                                }
                              }}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/30' 
                                  : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex gap-0.5 shrink-0">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ap.col1 }} />
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ap.col2 }} />
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ap.col3 }} />
                              </div>
                              <span className="truncate">{ap.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Freedom 3-Tier Aurora Color Pickers */}
                    <div className="space-y-2.5 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40">
                      <div className="flex items-center justify-between text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                        <span>Tùy biến 3 tầng cực quang</span>
                        <span className="text-[9px] text-slate-400 font-normal">Click ô màu hoặc gõ HEX</span>
                      </div>

                      {/* Layer 1 */}
                      <ColorField
                        label="Tầng 1: Đỉnh rèm cực quang"
                        sublabel="Dải sáng phía trên (Ribbon Crest)"
                        value={auroraCol1}
                        onChange={(c) => {
                          setAuroraCol1(c);
                          setAuroraPreset('custom');
                          localStorage.setItem('bg_aurora_preset', 'custom');
                          localStorage.setItem('bg_aurora_col1', c);
                        }}
                        presetSwatches={['#0aff84', '#00f5d4', '#00ccff', '#ff007f', '#ffaa00', '#ae26ed', '#ffffff']}
                      />

                      {/* Layer 2 */}
                      <ColorField
                        label="Tầng 2: Thân dải lụa phát sáng"
                        sublabel="Dải chuyển tiếp ở giữa (Mid Curtain)"
                        value={auroraCol2}
                        onChange={(c) => {
                          setAuroraCol2(c);
                          setAuroraPreset('custom');
                          localStorage.setItem('bg_aurora_preset', 'custom');
                          localStorage.setItem('bg_aurora_col2', c);
                        }}
                        presetSwatches={['#00ccff', '#0055ff', '#8a2be2', '#ff2200', '#10b981', '#ff00aa', '#00f2fe']}
                      />

                      {/* Layer 3 */}
                      <ColorField
                        label="Tầng 3: Chân mây huyền ảo"
                        sublabel="Dải khói đáy cực quang (Base Flow)"
                        value={auroraCol3}
                        onChange={(c) => {
                          setAuroraCol3(c);
                          setAuroraPreset('custom');
                          localStorage.setItem('bg_aurora_preset', 'custom');
                          localStorage.setItem('bg_aurora_col3', c);
                        }}
                        presetSwatches={['#ae26ed', '#0000ff', '#9400d3', '#ff00ff', '#00ffcc', '#ff3366', '#4facfe']}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BẦU TRỜ (SAO VAN GOGH, SAO BĂNG, MẶT TRĂNG) */}
              {activeTab === 'stars' && (
                <div className="space-y-3.5 max-h-[26rem] overflow-y-auto pr-1.5 text-slate-800 dark:text-slate-100">
                  {/* Van Gogh Star Dust Toggle & Controls */}
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/25 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkle className="w-3.5 h-3.5 text-amber-500" /> Bụi Sao Rơi Van Gogh
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePointCloud({ enabled: !pcEnabled })}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center ${
                          pcEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                        }`}
                      >
                        <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-md" />
                      </button>
                    </div>

                    {pcEnabled && (
                      <div className="space-y-2.5 pt-1 border-t border-amber-200/40 dark:border-amber-800/30">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            <span>Độ to hạt sao</span>
                            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{pcSparkleSize.toFixed(2)}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.3" 
                            max="3.5" 
                            step="0.05"
                            value={pcSparkleSize}
                            onChange={(e) => updatePointCloud({ sparkleSize: Number(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            <span>Mật độ bụi sao</span>
                            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{pcCount} hạt</span>
                          </div>
                          <input 
                            type="range" 
                            min="100" 
                            max="800" 
                            step="25"
                            value={pcCount}
                            onChange={(e) => updatePointCloud({ particleCount: Number(e.target.value) })}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                          />
                        </div>

                        {/* Color modes for stars */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {[
                            { id: 0, label: '🌌 Đêm Đầy Sao' },
                            { id: 1, label: '🌻 Hướng Dương' },
                            { id: 2, label: '☕ Cà Phê Đêm' },
                            { id: 3, label: '🎨 Đồng Bộ Theme' },
                          ].map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => updatePointCloud({ colorMode: c.id })}
                              className={`py-1.5 px-2 rounded-xl border text-[9px] font-bold transition-all cursor-pointer text-center ${
                                pcColorMode === c.id
                                  ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-300'
                                  : 'border-slate-150 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meteors & Comet Card */}
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/25 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 space-y-2.5">
                    <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block">
                      Sao Băng & Chuột Sao Chổi
                    </span>

                    {/* Shooting stars row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <span>🌠</span>
                        <span>Sao băng vũ trụ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {pcShootingStars && (
                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('trigger-shooting-star'))}
                            className="px-2 py-0.5 text-[9px] font-bold bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-lg cursor-pointer"
                          >
                            Phóng sao ngay
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => updatePointCloud({ shootingStarsEnabled: !pcShootingStars })}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center ${
                            pcShootingStars ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                          }`}
                        >
                          <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </button>
                      </div>
                    </div>

                    {/* Comet tail row */}
                    <div className="space-y-1.5 pt-1 border-t border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                          <span>☄️</span>
                          <span>Vệt sao chổi chuột</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updatePointCloud({ cometTailEnabled: !pcCometTail })}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center ${
                            pcCometTail ? 'bg-cyan-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                          }`}
                        >
                          <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </button>
                      </div>
                      {pcCometTail && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                            <span>Độ to vệt sao chổi</span>
                            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{pcCometSize.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.3"
                            max="3.5"
                            step="0.05"
                            value={pcCometSize}
                            onChange={(e) => updatePointCloud({ cometSize: Number(e.target.value) })}
                            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Moon phase card */}
                  {(() => {
                    const lunar = getRealWorldMoonPhase();
                    return (
                      <div className="p-2.5 bg-slate-50/60 dark:bg-slate-950/30 rounded-2xl border border-slate-150 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🌕</span>
                          <div>
                            <span className="font-bold block text-slate-700 dark:text-slate-200">Chu kỳ Mặt Trăng</span>
                            <span className="text-[10px] text-slate-400">{lunar.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-amber-500 text-xs">{lunar.illuminated}%</span>
                          <span className="block text-[8px] text-slate-400">chiếu sáng</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* FOOTER: GIAO DIỆN KÍNH MỜ & ĐỘ TRONG SUỐT */}
              <div className="flex flex-col gap-2 bg-slate-50/80 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/60 mt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-left">
                    <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div>
                      <span className="text-xs font-black block">Giao diện Kính mờ (Glassmorphic)</span>
                      <span className="text-[9px] text-slate-400 font-medium">Nhìn xuyên thấu qua các bảng thẻ UI</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGlassmorphic(!glassmorphic)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center shrink-0 ${
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
                {glassmorphic && (
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Độ trong suốt thẻ UI</span>
                      <span className="font-mono text-indigo-500 font-bold">{Math.round((1 - opacity) * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.00" 
                      max="1.00" 
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                    />
                  </div>
                )}
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
