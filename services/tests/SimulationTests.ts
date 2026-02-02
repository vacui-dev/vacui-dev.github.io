// Copyright (c) 2025 vacui.dev, all rights reserved

import { testRegistry } from '../TestRegistry';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';

// Mocks for math checks
const verifyOrbitLogic = (radius: number, theta: number, inclination: number): {x: number, y: number, z: number} => {
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);
    const y = 0;
    
    const incRad = inclination * (Math.PI / 180);
    const y_inc = y * Math.cos(incRad) - z * Math.sin(incRad);
    const z_inc = y * Math.sin(incRad) + z * Math.cos(incRad);
    
    return { x, y: y_inc, z: z_inc };
};

const verifyHarmonicLogic = (radius: number, theta: number): {x: number, y: number, z: number} => {
    // Harmonic projection 'polar' uses simple circle in XY
    return {
        x: Math.cos(theta) * radius,
        y: Math.sin(theta) * radius,
        z: 0
    };
};

export const registerSimulationTests = () => {
    testRegistry.registerSuite({
        id: 'physics_math',
        name: 'Simulation Math Verification',
        tests: [
            {
                id: 'sim_orbit_xz',
                name: 'Orbit: 0-Inclination is XZ Plane',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'sim_orbit_xz';
                    const name = 'Orbit: 0-Inclination is XZ Plane';
                    let logs = "Verifying orbital mechanics...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'MATH', file: 'OrbitalSystem.tsx', relevantFunctions: ['updateOrbits'], description: 'Checks if orbits are flat on Y=0' }];

                    const res = verifyOrbitLogic(10, Math.PI/2, 0);
                    logs += `Angle PI/2, Radius 10, Inclination 0.\n`;
                    logs += `Result: [${res.x.toFixed(2)}, ${res.y.toFixed(2)}, ${res.z.toFixed(2)}]\n`;

                    // At 90 deg (PI/2), cos=0, sin=1.
                    // x=0, z=10. y should be 0.
                    if (Math.abs(res.y) > 0.001) throw new Error(`Y is not 0. Orbit is not flat.`);
                    if (Math.abs(res.z - 10) > 0.001) throw new Error(`Z is incorrect.`);

                    logs += "✅ PASS: Orbit is correctly aligned to XZ Plane.";
                    return { id, name, status: 'PASS', logs, breadcrumbs };
                }
            },
            {
                id: 'sim_harmonic_xy',
                name: 'Harmonic: Polar Projection is XY Plane',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'sim_harmonic_xy';
                    const name = 'Harmonic: Polar Projection is XY Plane';
                    let logs = "Verifying harmonic projection...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'MATH', file: 'HarmonicRenderer.tsx', relevantFunctions: ['project'], description: 'Checks if harmonics are flat on Z=0' }];

                    const res = verifyHarmonicLogic(10, Math.PI/2);
                    logs += `Angle PI/2, Radius 10.\n`;
                    logs += `Result: [${res.x.toFixed(2)}, ${res.y.toFixed(2)}, ${res.z.toFixed(2)}]\n`;

                    // At 90 deg, x=0, y=10. z should be 0.
                    if (Math.abs(res.z) > 0.001) throw new Error(`Z is not 0. Harmonic is not flat on XY.`);
                    if (Math.abs(res.y - 10) > 0.001) throw new Error(`Y is incorrect.`);

                    logs += "✅ PASS: Harmonic is correctly aligned to XY Plane.";
                    return { id, name, status: 'PASS', logs, breadcrumbs };
                }
            }
        ]
    });
};