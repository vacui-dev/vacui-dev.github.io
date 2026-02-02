// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useMemo } from 'react';
import '@react-three/fiber';
import * as THREE from 'three';

/**
 * First Principles Atmospheric Scattering Shader
 * Calculates color based on physical interaction of light vectors with particulate matter.
 * Based on Rayleigh (molecules) and Mie (aerosols) scattering equations.
 */

const AtmosphereShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunPosition;
    uniform vec3 uRayleigh;
    uniform float uMieCoefficient;
    uniform float uMieDirectionalG;
    uniform vec3 uColor;
    
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Normalize vectors
      vec3 viewVector = normalize(vPosition);
      vec3 sunVector = normalize(uSunPosition);
      vec3 normal = normalize(vNormal);

      // Cosine angles
      float dotNV = dot(normal, viewVector); // Viewing angle
      float dotNL = dot(normal, sunVector); // Light angle (Day/Night)
      float dotVL = dot(viewVector, sunVector); // Angle between view and light (Sun glare)

      // Simple Atmosphere approximation using gradients and scattering principles
      
      // Rayleigh (Blue Sky) - Stronger when looking away from sun, or at horizon
      float rayleighPhase = 0.75 * (1.0 + dotVL * dotVL);
      vec3 rayleighColor = uRayleigh * rayleighPhase;

      // Mie (White Haze/Sun) - Stronger near sun
      float g = uMieDirectionalG;
      float g2 = g * g;
      float miePhase = (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * dotVL, 1.5));
      vec3 mieColor = vec3(1.0) * uMieCoefficient * miePhase;

      // Day/Night Cycle Intensity
      // Smooth step for twilight transition
      float dayIntensity = smoothstep(-0.2, 0.2, dotNL);

      // Fresnel rim lighting (Atmosphere glow)
      float fresnel = pow(1.0 - abs(dot(viewVector, normal)), 2.0);
      vec3 atmosphereGlow = (rayleighColor + mieColor) * fresnel * 2.0;

      // Composition
      vec3 finalColor = uColor * dayIntensity + atmosphereGlow * dayIntensity;
      
      // Alpha fade on dark side
      float alpha = 0.9 * dayIntensity + (fresnel * 0.5);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

interface AtmosphereProps {
  config: any;
  display: any;
}

export const Atmosphere: React.FC<AtmosphereProps> = ({ config, display }) => {
  const { 
    rayleigh = { x: 0.1, y: 0.3, z: 0.8 }, 
    mieCoefficient = 0.005, 
    mieDirectionalG = 0.8, 
    sunPosition = { x: 10, y: 5, z: 0 } 
  } = display.shaderParams || {};

  const uniforms = useMemo(() => ({
    uSunPosition: { value: new THREE.Vector3(sunPosition.x, sunPosition.y, sunPosition.z) },
    uRayleigh: { value: new THREE.Vector3(rayleigh.x, rayleigh.y, rayleigh.z) }, // Physics: Wavelength scattering
    uMieCoefficient: { value: mieCoefficient }, // Physics: Haze density
    uMieDirectionalG: { value: mieDirectionalG }, // Physics: Haze anisotropy
    uColor: { value: new THREE.Color(display.color || '#000000') }
  }), [rayleigh, mieCoefficient, mieDirectionalG, sunPosition, display.color]);

  return (
    <mesh position={[config.position[0], config.position[1], config.position[2]]} scale={display.args}>
      <sphereGeometry args={[1, 64, 64]} /> 
      {/* Use generic radius 1 and scale it, better for shader precision on large objects */}
      <shaderMaterial
        vertexShader={AtmosphereShader.vertexShader}
        fragmentShader={AtmosphereShader.fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide} // Render on inside of sphere if we are inside, or BackSide for outer glow shell?
        // Usually atmosphere is a shell around the planet.
        // If we view from space, FrontSide is better. If from ground, BackSide.
        // Let's assume FrontSide for "Marble" view, but with blending.
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};