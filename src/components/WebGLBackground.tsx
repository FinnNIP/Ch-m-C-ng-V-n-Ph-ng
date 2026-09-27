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
  Sparkle
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
      
      // Vertical fade - lowered gracefully to wave across mid-sky right behind mountain crests
      float fade = smoothstep(-1.5, 0.15, uv.y) * smoothstep(4.0, 1.6, uv.y);
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
              strength *= smoothstep(-0.5, 2.5, uv.y); // High altitude fade extension
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
      vec2 unwarped_st = st; // Pristine, rock-steady celestial coordinates for background stars, moon & sky

      // --- LOCALIZED TERRAIN SHOCKWAVE DISTORTION ---
      // Energetic impact distortion applied ONLY to local terrain & river, NEVER to sky or celestial stars!
      vec3 shockwaveColorFlash = vec3(0.0);
      vec2 terrain_st = st;
      if (u_shockwave_intensity > 0.002) {
          vec2 toImpact = st - u_impact_pos;
          float distImp = length(toImpact);
          float ringDist = abs(distImp - u_shockwave_radius);
          float ringThickness = 0.40;
          
          if (ringDist < ringThickness && distImp < 2.8) {
              float wave = sin((1.0 - ringDist / ringThickness) * 3.14159);
              vec2 warpDir = normalize(toImpact + vec2(0.0001));
              terrain_st += warpDir * wave * 0.06 * u_shockwave_intensity;
              shockwaveColorFlash = mix(u_impact_color, vec3(0.95, 0.98, 1.0), 0.35) * wave * u_shockwave_intensity * 0.30;
          }
      }

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
      float alphaA  = smoothstep(0.04, -0.04, aboveA);
      
      // Ridge A: Sleek dark nocturnal silhouette with vivid glowing Primary Neon crest stroke
      vec3 mountainBaseA = mix(
          vec3(0.88, 0.92, 0.98), 
          vec3(0.008, 0.012, 0.022), 
          u_is_dark
      );

      float strokeA_razor = exp(-abs(aboveA) * 36.0) * 1.30;
      float strokeA_glow  = exp(-abs(aboveA) * 9.0) * 0.45;
      float crestGradientA = strokeA_razor + strokeA_glow;
      vec3 meteorReflectionA = meteorReflectColor * strokeA_glow * 0.40;

      // Pure glowing colored neon stroke on Ridge A (Primary Color)
      vec3 rimA = (u_neon_color * crestGradientA * 1.10 * u_neon_intensity + meteorReflectionA) * smoothstep(0.08, -0.02, aboveA);
      vec3 colA = mountainBaseA + rimA;

      // Mountain Ridge B (Foreground mountain - natural gentle drift)
      float ridgeB = fbm(vec2(stM.x * 0.31 + 5.7 + t * 0.045, 3.2)) * 5.4 - 0.9;
      float aboveB  = stM.y - ridgeB;
      float alphaB  = smoothstep(0.04, -0.04, aboveB);
      
      // Ridge B: Sleek dark nocturnal silhouette with vivid glowing Secondary Neon crest stroke
      vec3 mountainBaseB = mix(
          vec3(0.82, 0.88, 0.96),
          vec3(0.006, 0.010, 0.018), 
          u_is_dark
      );

      float strokeB_razor = exp(-abs(aboveB) * 36.0) * 1.30;
      float strokeB_glow  = exp(-abs(aboveB) * 9.0) * 0.45;
      float crestGradientB = strokeB_razor + strokeB_glow;
      vec3 meteorReflectionB = meteorReflectColor * strokeB_glow * 0.35;

      // Pure glowing colored neon stroke on Ridge B (Secondary Color)
      vec3 rimB = (u_neon_color2 * crestGradientB * 1.10 * u_neon_intensity + meteorReflectionB) * smoothstep(0.08, -0.02, aboveB);
      vec3 colB = mountainBaseB + rimB;

      // Subtle, poetic cursor sweep bloom on mountain crest
      float topRidgeScreenY = max(ridgeA, ridgeB) - 2.5;
      float distCursorToCrest = abs(mouse_st.y - topRidgeScreenY);
      float horizDistCursor = abs(stM.x - mouse_st.x);
      float cursorSweepBloom = exp(-horizDistCursor * 1.8) * exp(-distCursorToCrest * 2.5) * (0.85 + 0.35 * sin(u_time * 5.0));
      colA += u_neon_color * cursorSweepBloom * 0.45 * strokeA_glow;
      colB += u_neon_color2 * cursorSweepBloom * 0.45 * strokeB_glow;

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

      // Aurora Borealis layer - gracefully lowered to sweep across the sky above and behind the mountain crests (soft ethereal silk)
      vec3 auroraCol = getAurora(unwarped_st - vec2(0.0, 0.25), t) * u_is_dark * (u_aurora_intensity * 0.85) * (1.0 - mountainMask);
      col += auroraCol;

      // --- CELESTIAL REAL-WORLD MOON WITH AUTO-UPDATING LUNAR PHASE ---
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

      if (rDist <= 1.0) {
          float zNorm = sqrt(max(0.0, 1.0 - rDist * rDist));
          vec3 N = vec3(mNorm.x, mNorm.y, zNorm);

          float sunAngle = u_moon_phase * 6.2831853;
          vec3 L = vec3(-sin(sunAngle), 0.0, -cos(sunAngle));

          float NdotL = dot(N, L);
          float sunlit = smoothstep(-0.04, 0.04, NdotL);
          
          float crater = noise(mNorm * 6.5) * 0.16 + noise(mNorm * 16.0) * 0.08;
          
          vec3 sunlitColor = mix(vec3(0.98, 0.96, 0.92), vec3(0.96, 0.91, 0.78), crater * 1.5);
          vec3 earthshineColor = vec3(0.03, 0.05, 0.10) * (1.0 - crater * 0.5);
          float diskEdge = smoothstep(1.0, 0.94, rDist);
          
          moonSurfaceColor = mix(earthshineColor, sunlitColor, sunlit) * diskEdge;
          moonIllum = sunlit;
      }

      // Dynamic Real-time Lunar Corona & Aureole (gentle, poetic starlight, never blinding)
      float phaseIllum = 0.5 * (1.0 - cos(u_moon_phase * 6.2831853));
      float moonCorona = (0.020 + 0.025 * phaseIllum) / (dMoon * dMoon * 4.5 + 0.18);
      float moonAureole = exp(-dMoon * 1.8) * (0.08 + 0.10 * phaseIllum);
      float moonHaze = exp(-dMoon * 0.75) * (0.04 + 0.06 * phaseIllum);

      vec3 moonGlowTint = mix(vec3(0.98, 0.92, 0.78), vec3(0.65, 0.82, 0.98), smoothstep(0.3, 2.5, dMoon));
      vec3 moonTotalLight = moonSurfaceColor * 0.95 + 
                            moonGlowTint * (moonCorona * 0.40 + moonAureole * 0.35 + moonHaze * 0.20);

      col += moonTotalLight * u_is_dark * (1.0 - mountainMask);
      col += meteorSkyLight * u_is_dark * (1.0 - mountainMask);

      // --- ETHEREAL TOPOGRAPHIC CONTOUR RIVER (Contour & Topographic isolines) ---
      // River flows gracefully below Mountain Ridge B in the foreground
      float riverBankY = ridgeB * 0.42 - 0.35;
      float riverWaterMask = smoothstep(0.12, -0.12, stM.y - riverBankY);
      
      float waterDepth = clamp((-stM.y + 1.2) * 0.38, 0.10, 2.2);
      float waterPerspective = 1.0 / (waterDepth + 0.20);
      
      // Gentle, soothing flow rate for topographic contours
      float waveTime = t * 0.45;
      
      // Topographic heightfield coordinates with smooth perspective
      vec2 topoUV = vec2(stM.x * 1.35 * waterPerspective * 0.35 + waveTime * 0.10, stM.y * 3.2 - waveTime * 0.14);
      
      // Organic domain-warped elevation field (smooth, continuous, non-aliasing topographic contours)
      float elev1 = fbm(topoUV);
      float elev2 = fbm(topoUV * 1.6 + vec2(elev1 * 0.75, waveTime * 0.08));
      float elevation = elev1 * 0.62 + elev2 * 0.38;
      
      // 14 glowing topographic contour elevation isolines across the river surface:
      float levels = 13.0;
      float scaledElev = elevation * levels;
      float dContour = abs(fract(scaledElev) - 0.5); // distance to nearest isoline [0..0.5]
      
      // Slender razor-crisp starlight filament core:
      float lineCore = smoothstep(0.065, 0.0, dContour);
      
      // Soft radiant neon aura around each contour line (gentle, harmonious, non-blinding):
      float lineGlow = exp(-dContour * 12.0) * 0.38;
      float lineHalo = exp(-dContour * 5.0) * 0.12;
      float topoLineIntensity = lineCore * 0.60 + lineGlow + lineHalo;
      
      // Alternating elevation tier nuance (graceful color nuances across contour levels):
      float tier = 0.5 + 0.5 * sin(floor(scaledElev) * 1.57);
      vec3 contourTierColor = mix(u_river_color, u_neon_color2, tier * 0.22);
      
      // Luminous fiber-optic core (diamond-starlight highlight on the line core):
      vec3 topoLineColor = mix(contourTierColor, vec3(0.92, 0.96, 1.0), lineCore * 0.35) * topoLineIntensity;
      topoLineColor *= (0.50 + 0.35 * u_neon_intensity);
      
      // Deep nocturnal crystalline abyss base (sleek, dark, elegant - NOT thick, muddy, or heavy):
      vec3 riverBaseColor = mix(
          vec3(0.92, 0.96, 0.99), 
          vec3(0.005, 0.010, 0.022) + u_river_color * 0.03 * u_neon_intensity, 
          u_is_dark
      );
      
      vec2 waterReflCoord = vec2(stM.x, -stM.y * 0.75 + 0.35);
      
      // Reflected Aurora Borealis dancing gently in the river (soft ethereal wash)
      vec3 reflAurora = getAurora(waterReflCoord - vec2(0.0, 0.25), t) * 0.32 * u_aurora_intensity * u_is_dark;
      
      // Reflected Mountain Neon Rim glow shimmering on water surface
      float reflRimLight = exp(-abs(waterReflCoord.y - 1.0) * 1.5) * 0.25;
      vec3 reflMountainGlow = mix(u_neon_color, u_neon_color2, 0.5 + 0.5 * sin(stM.x * 0.5)) * reflRimLight * 0.40 * u_neon_intensity;
      
      // Specular Celestial Moon Path reflection shimmering downstream (lấp lánh vảy bạc êm dịu, không chói)
      float moonDistX = abs(stM.x - moonPos.x);
      float moonColumn = exp(-pow(moonDistX / 1.45, 2.0));
      float moonShimmer = moonColumn * pow(max(0.0, sin(stM.y * 18.0 * waterPerspective * 0.25 + waveTime * 1.8)), 4.0);
      vec3 moonReflectionWater = vec3(0.96, 0.94, 0.88) * (moonShimmer * 0.32 + moonColumn * 0.05) * (0.30 + 0.5 * phaseIllum);
      
      // Soft misty shoreline glow where river kisses the mountain base
      float shoreDist = abs(stM.y - riverBankY);
      float shoreMist = exp(-shoreDist * 5.0) * 0.35;
      vec3 shoreGlow = mix(u_river_color, vec3(0.70, 0.88, 1.0), 0.30) * shoreMist * (u_neon_intensity * 0.55);
      
      // Final Ethereal Topographic River Composition - light, airy, elegant, glowing contour isolines
      vec3 waterCol = riverBaseColor + 
                      topoLineColor + 
                      reflAurora + 
                      reflMountainGlow + 
                      moonReflectionWater + 
                      shoreGlow;

      // Composite Mountains (Rendered on top of 3D meteors!)
      col = mix(col, colA, alphaA);
      col = mix(col, colB, alphaB);

      // Composite River Water in foreground
      col = mix(col, waterCol, clamp(riverWaterMask * 0.92, 0.0, 1.0));

      // Add shockwave chromatic ring flash from impact (soft, subtle pulse, never blinding)
      col += shockwaveColorFlash;

      // Add glowing interactive cursor color on top
      col += cursorColor * (0.85 + 0.15 * sin(u_time * 4.0));

      // Photographic exposure tone mapping preserving vividness, clarity, and preventing harsh blowout:
      col = 1.0 - exp(-col * 1.15);

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
  const [activeTab, setActiveTab] = useState<'preset' | 'custom' | 'aurora' | 'pointcloud'>('preset');
  const [activeAuroraColorIdx, setActiveAuroraColorIdx] = useState<1 | 2 | 3>(1);

  // WebGL Falling Stardust & Van Gogh Starry Sky custom state
  const [pcEnabled, setPcEnabled] = useState<boolean>(() => localStorage.getItem('pc_enabled') !== 'false');
  const [pcCount, setPcCount] = useState<number>(() => Number(localStorage.getItem('pc_count') ?? '280'));
  const [pcSparkleSize, setPcSparkleSize] = useState<number>(() => Number(localStorage.getItem('pc_size') ?? '1.55'));
  const [pcColorMode, setPcColorMode] = useState<number>(() => Number(localStorage.getItem('pc_color_mode') ?? '0'));
  const [pcSpeed, setPcSpeed] = useState<number>(() => Number(localStorage.getItem('pc_speed') ?? '0.30'));
  const [pcParallax, setPcParallax] = useState<number>(() => Number(localStorage.getItem('pc_parallax') ?? '0.15'));
  const [pcShootingStars, setPcShootingStars] = useState<boolean>(() => localStorage.getItem('pc_shooting_stars') !== 'false');
  const [pcCometTail, setPcCometTail] = useState<boolean>(() => localStorage.getItem('pc_comet_tail') !== 'false');

  const updatePointCloud = (updates: Partial<{
    enabled: boolean;
    particleCount: number;
    sparkleSize: number;
    colorMode: number;
    speed: number;
    parallaxStrength: number;
    shootingStarsEnabled: boolean;
    cometTailEnabled: boolean;
  }>) => {
    if (updates.enabled !== undefined) setPcEnabled(updates.enabled);
    if (updates.particleCount !== undefined) setPcCount(updates.particleCount);
    if (updates.sparkleSize !== undefined) setPcSparkleSize(updates.sparkleSize);
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
  }, [preset, primaryColor, secondaryColor, riverColor, opacity, intensity, speed, glassmorphic, auroraIntensity, auroraPreset, auroraCol1, auroraCol2, auroraCol3]);

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
  }, [primaryColor, secondaryColor, riverColor, speed, intensity, isDarkMode, auroraIntensity, auroraCol1, auroraCol2, auroraCol3]);

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
    updatePointCloud({
      enabled: true,
      particleCount: 380,
      sparkleSize: 1.55,
      colorMode: 0,
      speed: 0.35,
      parallaxStrength: 1.35,
      shootingStarsEnabled: true
    });
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

              {/* Sub-tabs */}
              <div className="grid grid-cols-4 bg-slate-100/80 dark:bg-slate-950/60 p-1 rounded-full text-[10px] font-bold">
                <button
                  onClick={() => setActiveTab('preset')}
                  className={`py-1.5 rounded-full text-center transition-all cursor-pointer ${activeTab === 'preset' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Màu Neon
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`py-1.5 rounded-full text-center transition-all cursor-pointer ${activeTab === 'custom' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Tùy chỉnh
                </button>
                <button
                  onClick={() => setActiveTab('aurora')}
                  className={`py-1.5 rounded-full text-center transition-all cursor-pointer ${activeTab === 'aurora' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Cực quang
                </button>
                <button
                  onClick={() => setActiveTab('pointcloud')}
                  className={`py-1.5 rounded-full text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${activeTab === 'pointcloud' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Sao Van Gogh</span>
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

                  {/* Quick Brightness Slider right inside presets tab */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> Mức sáng Neon (Độ sáng núi & cảnh)</span>
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
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                    />
                  </div>

                  {/* Quick Aurora Brightness Slider inside presets tab */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-emerald-500"><Sparkles className="w-3 h-3 text-emerald-500" /> Độ rực Cực quang (Aurora Brightness)</span>
                      <span className="font-mono text-emerald-500 font-bold">{auroraIntensity.toFixed(1)}x</span>
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
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                    />
                  </div>
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

                  {/* Custom River / Fractal Noise Color */}
                  <div className="space-y-2 p-2.5 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/80 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                        🌊 Màu Dòng Sông (Fractal Noise)
                      </span>
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-0.5 shadow-xs">
                        <span className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: riverColor }} />
                        <input 
                          type="text"
                          value={riverColor}
                          onChange={(e) => {
                            setRiverColor(e.target.value);
                            localStorage.setItem('bg_river_color', e.target.value);
                          }}
                          className="w-14 text-center text-[9px] font-mono uppercase bg-transparent border-0 focus:outline-none p-0 text-slate-600 dark:text-slate-400 font-bold"
                        />
                      </div>
                    </div>

                    {/* Quick Swatches for River Fractal Noise */}
                    <div className="flex gap-2 justify-center py-0.5">
                      {['#00f2fe', '#00f5d4', '#0055ff', '#9b5de5', '#ff007f', '#ffd200', '#ff5500', '#10b981'].map((hex) => {
                        const isSelected = riverColor.toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            onClick={() => {
                              setRiverColor(hex);
                              localStorage.setItem('bg_river_color', hex);
                            }}
                            className={`w-5 h-5 rounded-full border cursor-pointer transition-all hover:scale-110 active:scale-90 ${
                              isSelected ? 'border-slate-700 dark:border-white ring-2 ring-cyan-500/40 scale-110' : 'border-white/20 shadow-xs'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        );
                      })}
                    </div>

                    {/* Hue Slider for River */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">
                        <span>Quang phổ Màu Dòng Sông</span>
                        <span>{hexToHue(riverColor)}°</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="360"
                        value={hexToHue(riverColor)}
                        onChange={(e) => {
                          const hex = hueToHex(Number(e.target.value));
                          setRiverColor(hex);
                          localStorage.setItem('bg_river_color', hex);
                        }}
                        className="w-full h-2 rounded-full cursor-pointer appearance-none outline-none accent-cyan-500"
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
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> Mức sáng Neon (Độ sáng núi & cảnh)</span>
                      <span className="font-mono">{intensity.toFixed(2)}x</span>
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
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
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
                      min="0.1" 
                      max="3.0" 
                      step="0.05"
                      value={auroraIntensity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAuroraIntensity(val);
                        localStorage.setItem('bg_aurora_intensity', String(val));
                      }}
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

              {/* WebGL Point Cloud & Van Gogh Starry Sky Tab */}
              {activeTab === 'pointcloud' && (
                <div className="space-y-3.5 max-h-[19.5rem] overflow-y-auto pr-1 text-slate-800 dark:text-slate-100">
                  
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between p-3 bg-amber-50/70 dark:bg-amber-950/25 rounded-2xl border border-amber-200/70 dark:border-amber-900/50">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-500/15 rounded-xl text-amber-500 shadow-xs">
                        <Sparkles className={`w-4 h-4 ${pcEnabled ? 'animate-pulse' : ''}`} />
                      </div>
                      <div>
                        <span className="text-xs font-black block text-slate-800 dark:text-slate-100">
                          Bụi Sao Rơi Lơ Lửng (Van Gogh)
                        </span>
                        <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                          {pcEnabled ? `${pcCount.toLocaleString()} hạt sao nhỏ rơi chậm rãi & lấp lánh 3D` : 'Đang tắt'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePointCloud({ enabled: !pcEnabled })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center ${
                        pcEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <motion.div 
                        layout 
                        className="w-4 h-4 bg-white rounded-full shadow-md"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>

                  {pcEnabled && (
                    <>
                      {/* Shooting Star (Sao Băng Nghệ Thuật) Card */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/25">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🌠</span>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black block">Sao Băng Vũ Trụ</span>
                            <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-medium">
                              {pcShootingStars ? 'Thỉnh thoảng vụt qua chéo bầu trời' : 'Đang tắt'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pcShootingStars && (
                            <button
                              type="button"
                              onClick={() => window.dispatchEvent(new CustomEvent('trigger-shooting-star'))}
                              className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 rounded-lg transition-all cursor-pointer border border-amber-500/35 active:scale-95"
                              title="Kích hoạt vệt sao băng bay qua ngay lập tức"
                            >
                              ✨ Ngắm sao ngay
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => updatePointCloud({ shootingStarsEnabled: !pcShootingStars })}
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center ${
                              pcShootingStars ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                            }`}
                          >
                            <motion.div 
                              layout 
                              className="w-4 h-4 bg-white rounded-full shadow-md"
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Comet Tail (Vệt Sáng Đuôi Sao Chổi Chuột) Card */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-amber-500/10 to-blue-500/10 border border-cyan-500/25">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">☄️</span>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black block">Đuôi Sao Chổi (Comet Tail)</span>
                            <span className="text-[10px] text-cyan-700/80 dark:text-cyan-300/80 font-medium">
                              {pcCometTail ? 'Vệt sáng mềm mại & tàn bụi sao theo con trỏ chuột' : 'Đang tắt'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updatePointCloud({ cometTailEnabled: !pcCometTail })}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer flex items-center shrink-0 ${
                            pcCometTail ? 'bg-cyan-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                          }`}
                        >
                          <motion.div 
                            layout 
                            className="w-4 h-4 bg-white rounded-full shadow-md"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>

                      {/* Gentle Parallax Depth Slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3 h-3 text-amber-500" /> Thị Sai Không Gian (Dịu Êm, Tĩnh Lặng)
                          </span>
                          <span className="font-mono">{pcParallax.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="1.0"
                          step="0.05"
                          value={pcParallax}
                          onChange={(e) => updatePointCloud({ parallaxStrength: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                        />
                      </div>

                      {/* Color Harmonics */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Sắc Màu Hạt Sao (Van Gogh Harmonics)
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 0, label: '🌌 Đêm Đầy Sao (Hổ Phách & Lam)' },
                            { id: 1, label: '🌻 Hướng Dương & Diên Vĩ' },
                            { id: 2, label: '☕ Cà Phê Đêm (Vàng Ấm)' },
                            { id: 3, label: '🎨 Đồng Bộ Theme Neon' },
                          ].map((c) => {
                            const isSelected = pcColorMode === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => updatePointCloud({ colorMode: c.id })}
                                className={`py-2 px-2.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer text-center ${
                                  isSelected
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'border-slate-150 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-950/40 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {c.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Particle Count Slider (Fine Range 100 - 800) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Orbit className="w-3 h-3 text-amber-500" /> Mật độ Bụi Sao (Thoáng đãng, thanh tao)
                          </span>
                          <span className="font-mono">{pcCount.toLocaleString()} hạt</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="800"
                          step="25"
                          value={pcCount}
                          onChange={(e) => updatePointCloud({ particleCount: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                        />
                      </div>

                      {/* Speed Slider (Slow & Meditative 0.10 - 0.70) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Waves className="w-3 h-3 text-amber-500" /> Tốc độ Rơi Chậm Rãi (Thiền định)
                          </span>
                          <span className="font-mono">{pcSpeed.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.10"
                          max="0.70"
                          step="0.05"
                          value={pcSpeed}
                          onChange={(e) => updatePointCloud({ speed: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                        />
                      </div>

                      {/* Sparkle Size Slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Sparkle className="w-3 h-3 text-amber-500" /> Vầng Hào Quang Sao (Luminous Corona)
                          </span>
                          <span className="font-mono">{pcSparkleSize.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.9"
                          max="2.2"
                          step="0.1"
                          value={pcSparkleSize}
                          onChange={(e) => updatePointCloud({ sparkleSize: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full"
                        />
                      </div>

                      {/* Real-world Auto Lunar Phase Card */}
                      {(() => {
                        const lunar = getRealWorldMoonPhase();
                        return (
                          <div className="p-3 bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-blue-500/15 rounded-2xl border border-amber-500/30 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">🌕</span>
                              <div className="flex flex-col text-left">
                                <span className="text-[11px] font-black text-amber-500 flex items-center gap-1">
                                  <span>Chu kỳ Mặt Trăng Thiên Văn</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold uppercase tracking-wider">Tự Động</span>
                                </span>
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                                  {lunar.name}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-amber-500">{lunar.illuminated}%</span>
                              <span className="block text-[8px] text-slate-400">chiếu sáng</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Poetic Interaction Tip */}
                      <div className="p-3 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 rounded-2xl border border-amber-500/20 text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                        <span className="text-sm shrink-0">🎨</span>
                        <span>
                          <strong>Không Gian Vũ Trụ 3D & Núi Neon:</strong> Mặt trăng tự động cập nhật chu kỳ trăng thực tế theo thời gian. Sao băng 3D xuất hiện từ chiều sâu không gian (Z âm) và lao về phía trước, chìm sau dãy núi rực sắc neon. Khi vệt sao chổi quét qua đỉnh núi, những hạt bụi sao lấp lánh sẽ bừng sáng theo sắc độ của núi!
                        </span>
                      </div>
                    </>
                  )}

                </div>
              )}
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
