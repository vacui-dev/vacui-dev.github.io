// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { useFrame } from '@react-three/fiber';
import { WorldConfig } from '../../types/simulation';
import { timeEngine } from '../../services/TimeEngine';
import * as THREE from 'three';

interface OrbitalSystemProps {
    config: WorldConfig;
    registry: Record<string, { ref: THREE.Object3D, api: any }>;
}

export const OrbitalSystem: React.FC<OrbitalSystemProps> = ({ config, registry }) => {
    
    useFrame(() => {
        // 1. Update Time Engine
        // The Time Engine updates its internal JD based on real time delta * multiplier
        // We don't need to pass delta here, it tracks it internally via Date.now()
        const jd = timeEngine.getJulianDate();
        
        // 2. Update Orbits
        config.entities.forEach(entity => {
            if (entity.orbitParams) {
                const reg = registry[entity.id];
                if (!reg || !reg.ref) return;

                // Calculate Position based on Keplerian Elements
                const { radius, inclination, speed, epochOffset, parentBodyId } = entity.orbitParams;
                
                // Current angle (Mean Anomaly approximation)
                // speed is in radians per day (approx) if 1.0 = Earth Year?
                // Let's normalize: speed 1.0 = 1 orbit per "Sim Year".
                // A sim year is 365.25 days.
                
                const daysSinceEpoch = jd - 2451545.0; // J2000
                const meanAnomaly = (daysSinceEpoch * speed * 0.01720209895) + epochOffset; // 0.017... is Earth's mean motion (rad/day)
                
                // Solve Kepler's Equation (Simplified: assume circular for visualization or low eccentricity)
                // x = r * cos(theta), z = r * sin(theta)
                const theta = meanAnomaly;
                
                const x = radius * Math.cos(theta);
                const z = radius * Math.sin(theta);
                const y = 0; // Orbital plane (before inclination)

                // Apply Inclination (Rotate around X axis)
                const incRad = inclination * (Math.PI / 180);
                const y_inc = y * Math.cos(incRad) - z * Math.sin(incRad);
                const z_inc = y * Math.sin(incRad) + z * Math.cos(incRad);

                // Parent Offset
                let parentPos = new THREE.Vector3(0, 0, 0);
                if (parentBodyId) {
                    const parentReg = registry[parentBodyId];
                    if (parentReg && parentReg.ref) {
                        parentPos.copy(parentReg.ref.position);
                    } else {
                        // Fallback to entity config position if parent ref not ready
                        const parentEntity = config.entities.find(e => e.id === parentBodyId);
                        if (parentEntity) {
                            parentPos.set(parentEntity.position.x, parentEntity.position.y, parentEntity.position.z);
                        }
                    }
                }

                // Apply
                if (reg.api && entity.mass === 0) {
                    // Kinematic update via API if supported, or direct position set
                    reg.api.position.set(parentPos.x + x, parentPos.y + y_inc, parentPos.z + z_inc);
                } else if (reg.api) {
                    // Dynamic body being forced into orbit? Usually orbits are kinematic.
                    reg.api.position.set(parentPos.x + x, parentPos.y + y_inc, parentPos.z + z_inc);
                    // Reset velocity to prevent physics fighting
                    reg.api.velocity.set(0,0,0);
                } else {
                    // Direct ref update
                    reg.ref.position.set(parentPos.x + x, parentPos.y + y_inc, parentPos.z + z_inc);
                }

                // 3. Update Rotation (Axial Tilt + Spin)
                if (entity.planetParams) {
                    const { rotationSpeed, axialTilt } = entity.planetParams;
                    // Spin around Y (local)
                    const spin = daysSinceEpoch * rotationSpeed * (Math.PI * 2); 
                    // Axial Tilt is usually applied to the Group or by rotating the mesh inside
                    // Here we just set rotation. 
                    // Note: Real planets allow tilt relative to ecliptic. 
                    // We'll approximate by rotating the object Z (tilt) then Y (spin).
                    // Euler Order matters. YXZ is typical for planets (Spin then Tilt).
                    
                    // reg.ref.rotation.order = 'ZYX'; // Tilt Z, then Spin Y.
                    reg.ref.rotation.z = axialTilt * (Math.PI / 180);
                    reg.ref.rotation.y = spin;
                }
            }
        });
    });

    return null;
};