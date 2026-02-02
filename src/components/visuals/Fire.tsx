// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useMemo } from 'react';
import '@react-three/fiber';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Volumetric Fire Shader
 * Simulates combustion based on first-principles fuel properties.
 */

const FireShader = {
  vertexShader: `
    varying vec2 vUv;
    varying float vNoise;
    uniform float uTime;
    uniform float uPorosity;

    // Simple Perlin-ish noise function
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + .1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(in vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                     mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                     mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }

    void main() {
      vUv = uv;
      
      // Vertex Displacement based on porosity (turbulence)
      // Higher porosity = more air pockets = more turbulent flickering
      float turbulence = noise(position * 2.0 + vec3(0, uTime * (2.0 + uPorosity * 2.0), 0));
      vNoise = turbulence;
      
      vec3 newPos = position + normal * turbulence * 0.2 * uv.y; // Expand top
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vNoise;
    uniform float uTime;
    uniform float uMoisture;
    uniform float uTemperature; // Kelvin
    uniform vec3 uColor;

    // Blackbody radiation approximation (Temperature to Color)
    vec3 blackbody(float Temp) {
        vec3 col = vec3(255.);
        col.x = 56100000. * pow(Temp,(-3. / 2.)) + 148.;
        col.y = 100040000. * pow(Temp,(-3. / 2.)) + 28.;
        col.z = 188200000000. * pow(Temp,(-3. / 2.)) + 1.;
        return col / 255.;
    }

    void main() {
      // Shape mask (Cone/Flame shape)
      float shape = 1.0 - length((vUv - vec2(0.5, 0.0)) * vec2(2.0, 1.0));
      shape = clamp(shape, 0.0, 1.0);
      shape = pow(shape, 2.0); // Taper

      // Combustion Logic
      // Moisture introduces black smoke and lowers localized temperature/alpha
      float combustionEfficiency = 1.0 - uMoisture; 
      
      // The "Flame"
      float fireIntensity = smoothstep(0.2, 0.8, vNoise) * shape;
      
      // Color based on temperature
      vec3 heatColor = blackbody(uTemperature);
      vec3 coreColor = mix(vec3(1.0, 0.1, 0.0), heatColor, 0.5);
      
      // Smoke (based on moisture)
      vec3 smokeColor = vec3(0.1, 0.1, 0.1);
      
      vec3 finalColor = mix(smokeColor, coreColor, combustionEfficiency * (vUv.y + 0.5));
      
      // Alpha Fade
      float alpha = fireIntensity * combustionEfficiency;
      alpha *= smoothstep(0.0, 0.2, vUv.y); // Fade bottom
      alpha *= smoothstep(1.0, 0.4, vUv.y); // Fade top

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

interface FireProps {
  config: any;
  display: any;
  onRef?: any;
}

export const Fire: React.FC<FireProps> = ({ config, display, onRef }) => {
  const { 
    temperature = 1500, // Standard wood fire
    moisture = 0.1, // Dry wood
    porosity = 0.5 // Medium density
  } = display.fireParams || {};

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMoisture: { value: moisture },
    uPorosity: { value: porosity },
    uTemperature: { value: temperature },
    uColor: { value: new THREE.Color(display.color || '#ff4400') }
  }), [moisture, porosity, temperature, display.color]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[config.position[0], config.position[1], config.position[2]]} rotation={[0,0,0]}>
      {/* Flame uses a cone geometry that gets displaced by shader */}
      <coneGeometry args={[display.args[0] || 0.5, display.args[1] || 2, 32, 16, true]} />
      <shaderMaterial
        vertexShader={FireShader.vertexShader}
        fragmentShader={FireShader.fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
      
      {/* Simple point light to illuminate surroundings based on temp */}
      <pointLight 
        intensity={2 * (1 - moisture)} 
        distance={10} 
        color={temperature > 2000 ? '#aaaaff' : '#ffaa00'} 
        decay={2}
      />
    </mesh>
  );
};