// Copyright (c) 2025 vacui.dev, all rights reserved

import * as THREE from 'three';

/**
 * Geometry Kernel
 * Handles N-Dimensional mathematics, Manifold Rotation logic, and Bézier Curve fitting.
 */
class GeometryKernel {
    
    // --- N-DIMENSIONAL PATH GENERATION ---
    // Ported from "Bézier Path Approximator 3D" logic
    
    public generateCurvedPath(dim: number, numCurves: number, numPoints: number = 100): number[][] {
        const path: number[][] = [];
        const frequencies = Array(numCurves).fill(0).map((_, i) => (i + 1) * 0.7);
        const phases = Array(numCurves).fill(0).map(() => Math.random() * Math.PI * 2);
        const amplitudes = Array(numCurves).fill(0).map(() => 0.4 + Math.random() * 0.4);
        
        for (let i = 0; i < numPoints; i++) {
            const t = (i / (numPoints - 1)) * Math.PI * 2;
            const point = Array(dim).fill(0);
            
            for (let d = 0; d < dim; d++) {
                for (let c = 0; c < numCurves; c++) {
                    const freq = frequencies[c] * (1 + d * 0.15);
                    const phase = phases[c] + d * 0.7;
                    const amp = amplitudes[c] * (0.7 + d * 0.15);
                    point[d] += amp * Math.sin(freq * t + phase);
                }
            }
            
            path.push(point);
        }
        
        return path;
    }

    public projectTo3D(point: number[], scale: number = 5): THREE.Vector3 {
        // Simple projection: Take first 3 dimensions, use others for color/effects elsewhere
        const x = (point[0] || 0) * scale;
        const y = (point[1] || 0) * scale;
        const z = (point[2] || 0) * scale;
        return new THREE.Vector3(x, y, z);
    }

    public projectToColor(point: number[]): THREE.Color {
        // Map dimensions 3,4,5 to RGB
        if (point.length < 4) return new THREE.Color(0.5, 0.5, 0.5);
        
        const r = Math.max(0, Math.min(1, ((point[3] || 0) + 2) * 0.25));
        const g = Math.max(0, Math.min(1, ((point[4] || 0) + 2) * 0.25));
        const b = Math.max(0, Math.min(1, ((point[5] || 0) + 2) * 0.25));
        
        return new THREE.Color(r, g, b);
    }

    // --- MANIFOLD ROTATION LOGIC ---
    // Ported from "Rotation Manifold Visualizer" logic
    
    public rotateX(point: number[], angle: number): number[] {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            point[0],
            point[1] * cos - point[2] * sin,
            point[1] * sin + point[2] * cos
        ];
    }

    public rotateY(point: number[], angle: number): number[] {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            point[0] * cos + point[2] * sin,
            point[1],
            -point[0] * sin + point[2] * cos
        ];
    }

    public rotateZ(point: number[], angle: number): number[] {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
            point[0] * cos - point[1] * sin,
            point[0] * sin + point[1] * cos,
            point[2]
        ];
    }

    public rotate3D(point: number[], rx: number, ry: number, rz: number): number[] {
        let p = this.rotateX(point, rx);
        p = this.rotateY(p, ry);
        p = this.rotateZ(p, rz);
        return p;
    }
    
    // Generates the geometry for the Manifold Pyramid
    public createPyramidShape(): number[][] {
        return [
            [0, 1.5, 0],     // apex
            [1, -0.5, 1],    // base corners
            [1, -0.5, -1],
            [-1, -0.5, -1],
            [-1, -0.5, 1],
            [0, -0.5, 0]     // base center
        ];
    }
    
    public getPyramidEdges(): number[][] {
        return [
            [0, 1], [0, 2], [0, 3], [0, 4],  // apex to base
            [1, 2], [2, 3], [3, 4], [4, 1],  // base perimeter
            [1, 5], [2, 5], [3, 5], [4, 5]   // base to center
        ];
    }
}

export const geometryKernel = new GeometryKernel();