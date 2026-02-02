// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useMemo, useRef } from 'react';
import '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../types/simulation';
import { geometryKernel } from '../../services/GeometryKernel';

interface PathRendererProps {
    entity: Entity;
}

export const PathRenderer: React.FC<PathRendererProps> = ({ entity }) => {
    const { pathParams, position } = entity;
    const meshRef = useRef<THREE.Mesh>(null);

    const dims = pathParams?.dimensions || 3;
    const complexity = pathParams?.complexity || 5;
    const resolution = pathParams?.resolution || 200;
    const radius = pathParams?.tubeRadius || 0.1;

    // Generate Path Data
    const { geometry, material } = useMemo(() => {
        // 1. Generate N-Dim Points
        const rawPath = geometryKernel.generateCurvedPath(dims, complexity, resolution);
        
        // 2. Project to 3D for Tube Geometry
        const points3D = rawPath.map(p => geometryKernel.projectTo3D(p, 2)); // Scale factor 2 for visibility
        const curve = new THREE.CatmullRomCurve3(points3D);
        
        // 3. Create Geometry
        const geo = new THREE.TubeGeometry(curve, resolution, radius, 8, false);
        
        // 4. Map Colors (N-Dims to Vertex Colors)
        const colors: number[] = [];
        
        // TubeGeometry generates (radialSegments + 1) vertices per tubularSegment
        // Vertices are ordered ring by ring.
        const radialSegments = 8;
        const tubularSegments = resolution;
        
        for (let i = 0; i <= tubularSegments; i++) {
            // Map the path index to the N-dim point index roughly
            // TubeGeometry interpolates, but we use the raw points index for coloring
            const pointIndex = Math.min(Math.floor((i / tubularSegments) * (rawPath.length - 1)), rawPath.length - 1);
            const rawPoint = rawPath[pointIndex];
            
            // Calculate Color from Hyper-Dimensions
            const c = geometryKernel.projectToColor(rawPoint);
            
            // Apply this color to all vertices in this ring
            for (let j = 0; j <= radialSegments; j++) {
                colors.push(c.r, c.g, c.b);
            }
        }
        
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.3,
            metalness: 0.1,
            emissive: 0x222222,
            flatShading: false
        });

        return { geometry: geo, material: mat };
    }, [dims, complexity, resolution, radius]);

    return (
        <group position={[position.x, position.y, position.z]}>
            <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
        </group>
    );
};