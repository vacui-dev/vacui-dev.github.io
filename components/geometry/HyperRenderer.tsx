// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../types/simulation';

interface HyperRendererProps {
    entity: Entity;
}

/**
 * Renders N-Dimensional objects by projecting them into 3D space.
 * Currently supports 4D Tesseracts and Pentatopes.
 * 
 * Math:
 * P_3d = P_4d / (w + distance)
 * 
 * Performs real-time 4D rotation before projection.
 */
export const HyperRenderer: React.FC<HyperRendererProps> = ({ entity }) => {
    const { geometryParams, position, color } = entity;
    const groupRef = useRef<THREE.Group>(null);
    
    // Create Geometry from config or default Tesseract
    const vertices4D = useMemo(() => {
        if (geometryParams?.vertices && geometryParams.vertices.length > 0) return geometryParams.vertices;
        
        // Default Tesseract (Hypercube)
        // 16 Vertices: (+-1, +-1, +-1, +-1)
        const verts = [];
        for(let i=0; i<16; i++) {
            verts.push([
                (i & 1) ? 1 : -1,
                (i & 2) ? 1 : -1,
                (i & 4) ? 1 : -1,
                (i & 8) ? 1 : -1
            ]);
        }
        return verts;
    }, [geometryParams]);

    // Edges for Tesseract
    const edges = useMemo(() => {
        if (geometryParams?.edges && geometryParams.edges.length > 0) return geometryParams.edges;
        const e: [number, number][] = [];
        for(let i=0; i<16; i++) {
            for(let j=i+1; j<16; j++) {
                // Connect if they differ by exactly 1 coordinate (Hamming distance 1)
                let diff = 0;
                for(let k=0; k<4; k++) {
                    if (vertices4D[i][k] !== vertices4D[j][k]) diff++;
                }
                if (diff === 1) e.push([i, j]);
            }
        }
        return e;
    }, [vertices4D, geometryParams]);

    // Points for LineSegments
    const geometry = useMemo(() => new THREE.BufferGeometry(), []);
    const positions = useMemo(() => new Float32Array(edges.length * 2 * 3), [edges]); // 2 points per edge, 3 coords per point

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const rotSpeed = geometryParams?.rotationSpeed || [0.5, 0.3, 0.2]; // XY, XZ, XW planes

        // 4D Rotation Matrices (Simplified)
        // We only rotate in XW and ZW planes for that "Hyper" look
        const cosT = Math.cos(t * rotSpeed[0]);
        const sinT = Math.sin(t * rotSpeed[0]);
        
        // Update Projection
        let index = 0;
        const projectedVerts: THREE.Vector3[] = [];

        // 1. Transform Vertices
        vertices4D.forEach(v => {
            let x = v[0], y = v[1], z = v[2], w = v[3];

            // Rotate ZW Plane
            const z_new = z * cosT - w * sinT;
            const w_new = z * sinT + w * cosT;
            z = z_new; w = w_new;

            // Rotate XW Plane
            const x_new = x * Math.cos(t * 0.2) - w * Math.sin(t * 0.2);
            w = x * Math.sin(t * 0.2) + w * Math.cos(t * 0.2);
            x = x_new;

            // Stereographic Projection 4D -> 3D
            const distance = 3;
            const wFactor = 1 / (distance - w);
            
            projectedVerts.push(new THREE.Vector3(
                x * wFactor,
                y * wFactor,
                z * wFactor
            ));
        });

        // 2. Build Lines
        edges.forEach(([i, j]) => {
            const p1 = projectedVerts[i];
            const p2 = projectedVerts[j];

            positions[index++] = p1.x; positions[index++] = p1.y; positions[index++] = p1.z;
            positions[index++] = p2.x; positions[index++] = p2.y; positions[index++] = p2.z;
        });

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.attributes.position.needsUpdate = true;
        
        // Animate Group Position (Levitate)
        if (groupRef.current) {
            groupRef.current.position.set(position.x, position.y + Math.sin(t)*0.2, position.z);
            groupRef.current.rotation.y += 0.005;
        }
    });

    return (
        <group ref={groupRef}>
            <lineSegments geometry={geometry}>
                <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.8} />
            </lineSegments>
            {/* Glow Core */}
            <mesh>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.1} />
            </mesh>
        </group>
    );
};