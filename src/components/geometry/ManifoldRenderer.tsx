// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../types/simulation';
import { geometryKernel } from '../../services/GeometryKernel';

interface ManifoldRendererProps {
    entity: Entity;
}

/**
 * Manifold Renderer
 * Visualizes the equation x = x * R * sR * sR
 * Renders a "Main" shape, and then "Ghost" shapes that represent
 * the divergence of the manifold under scaled rotation.
 */
export const ManifoldRenderer: React.FC<ManifoldRendererProps> = ({ entity }) => {
    const { manifoldParams, position, color } = entity;
    const groupRef = useRef<THREE.Group>(null);

    const iterations = manifoldParams?.iterations || 3;
    const scaleFactor = manifoldParams?.scaleFactor || 0.5;
    const rotVel = manifoldParams?.rotationalVelocity || { x: 0.01, y: 0.02, z: 0.01 };
    const divergenceColor = manifoldParams?.divergenceColor || '#ff0088';

    // Geometry Data (Pyramid)
    const baseShape = useMemo(() => geometryKernel.createPyramidShape(), []);
    const edges = useMemo(() => geometryKernel.getPyramidEdges(), []);

    // Create a geometry for LINES
    const buildGeometry = (points: number[][]) => {
        const positions: number[] = [];
        edges.forEach(([i, j]) => {
            const p1 = points[i];
            const p2 = points[j];
            positions.push(p1[0], p1[1], p1[2]);
            positions.push(p2[0], p2[1], p2[2]);
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geo;
    };

    // State for the animation integration
    const accumulatedRotation = useRef({ x: 0, y: 0, z: 0 });

    // Refs for the ghosts to update them imperatively
    const ghostsRef = useRef<THREE.LineSegments[]>([]);

    useFrame(() => {
        if (!groupRef.current) return;
        
        // 1. Update Base Rotation
        const speed = 1.0; 
        accumulatedRotation.current.x += rotVel.x * speed;
        accumulatedRotation.current.y += rotVel.y * speed;
        accumulatedRotation.current.z += rotVel.z * speed;

        const rx = accumulatedRotation.current.x;
        const ry = accumulatedRotation.current.y;
        const rz = accumulatedRotation.current.z;

        // 2. Compute Manifold Steps
        // Step 0: Base Rotated
        let currentShape = baseShape.map(p => geometryKernel.rotate3D(p, rx, ry, rz));
        
        // Update Main Shape (Index 0 in children usually, but we use refs)
        if (ghostsRef.current[0]) {
             ghostsRef.current[0].geometry.dispose();
             ghostsRef.current[0].geometry = buildGeometry(currentShape);
        }

        // Steps 1 to N: Scaled Rotation (x * R * sR...)
        let accumulatedScaleRx = rx;
        let accumulatedScaleRy = ry;
        let accumulatedScaleRz = rz;

        for(let i = 1; i <= iterations; i++) {
            // Apply scale factor to rotation magnitude for next step
            accumulatedScaleRx *= scaleFactor;
            accumulatedScaleRy *= scaleFactor;
            accumulatedScaleRz *= scaleFactor;

            // Apply transformation on top of previous
            // Logic from HTML: shape = shape.map(p => rotate3D(p, rx*scale, ...))
            // But accumulated.
            
            // Note: The HTML logic accumulates the transformation on the *points*.
            // Here we re-calculate from the previous step's points.
            currentShape = currentShape.map(p => geometryKernel.rotate3D(p, accumulatedScaleRx, accumulatedScaleRy, accumulatedScaleRz));

            if (ghostsRef.current[i]) {
                ghostsRef.current[i].geometry.dispose();
                ghostsRef.current[i].geometry = buildGeometry(currentShape);
                
                // Pulse opacity/color based on step
                const mat = ghostsRef.current[i].material as THREE.LineBasicMaterial;
                mat.opacity = 1.0 - (i / (iterations + 1));
            }
        }
        
        // Move entire group
        groupRef.current.position.set(position.x, position.y, position.z);
    });

    return (
        <group ref={groupRef}>
            {/* Render Iterations */}
            {Array.from({ length: iterations + 1 }).map((_, i) => (
                <lineSegments 
                    key={i} 
                    ref={el => ghostsRef.current[i] = el!}
                >
                    <bufferGeometry />
                    <lineBasicMaterial 
                        color={i === 0 ? color : divergenceColor} 
                        transparent 
                        opacity={i === 0 ? 1 : 0.5} 
                        linewidth={2}
                    />
                </lineSegments>
            ))}
            
            {/* Center Marker */}
            <mesh>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial color={color} />
            </mesh>
        </group>
    );
};