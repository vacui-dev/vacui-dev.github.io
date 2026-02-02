// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useRef } from 'react';
import '@react-three/fiber';
import { useSpring } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Constraint } from '../../types/simulation';

interface MuscleProps {
    config: Constraint;
    refA: THREE.Object3D;
    refB: THREE.Object3D;
    apiA?: any;
    apiB?: any;
}

export const Muscle: React.FC<MuscleProps> = ({ config, refA, refB }) => {
    const { pivotA = {x:0,y:0,z:0}, pivotB = {x:0,y:0,z:0}, ...opts } = config;
    
    // Physics
    useSpring(refA as any, refB as any, {
        ...opts,
        localAnchorA: [pivotA.x, pivotA.y, pivotA.z],
        localAnchorB: [pivotB.x, pivotB.y, pivotB.z],
    });

    // Visuals
    const meshRef = useRef<THREE.Mesh>(null);
    const worldPivotA = useRef(new THREE.Vector3());
    const worldPivotB = useRef(new THREE.Vector3());

    useFrame(() => {
        if (!meshRef.current || !refA || !refB) return;

        // Calculate world positions of the pivots
        // Note: refA and refB are the bodies. Pivots are local.
        refA.localToWorld(worldPivotA.current.set(pivotA.x, pivotA.y, pivotA.z));
        refB.localToWorld(worldPivotB.current.set(pivotB.x, pivotB.y, pivotB.z));

        // Midpoint
        const mid = new THREE.Vector3().addVectors(worldPivotA.current, worldPivotB.current).multiplyScalar(0.5);
        meshRef.current.position.copy(mid);

        // Orientation
        meshRef.current.lookAt(worldPivotB.current);
        // Rotate 90deg because cylinder default axis is Y, lookAt uses Z
        meshRef.current.rotateX(Math.PI / 2);

        // Stretch (Scale)
        const dist = worldPivotA.current.distanceTo(worldPivotB.current);
        // Squash and stretch: Volume preservation. If length increases, width decreases.
        // Base width = 1. If scale Y is dist, scale X/Z should be 1/sqrt(dist) approx? 
        // Let's keep it simple for now.
        const thickness = Math.max(0.05, 0.2 * (1 / Math.max(0.5, dist/2))); 
        
        meshRef.current.scale.set(thickness, dist, thickness);
    });

    return (
        <mesh ref={meshRef} castShadow>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshStandardMaterial 
                color="#ff4444" 
                roughness={0.4} 
                metalness={0.3}
                transparent
                opacity={0.9}
                emissive="#550000"
            />
        </mesh>
    );
};

export const Rope: React.FC<MuscleProps> = ({ config, refA, refB }) => {
    // Similar to muscle but thin and static thickness
    const { pivotA = {x:0,y:0,z:0}, pivotB = {x:0,y:0,z:0}, ...opts } = config;
    
    useSpring(refA as any, refB as any, {
        ...opts,
        localAnchorA: [pivotA.x, pivotA.y, pivotA.z],
        localAnchorB: [pivotB.x, pivotB.y, pivotB.z],
    });

    const lineRef = useRef<any>(null);
    const points = useRef([new THREE.Vector3(), new THREE.Vector3()]);

    useFrame(() => {
        if (!refA || !refB || !lineRef.current) return;
        refA.localToWorld(points.current[0].set(pivotA.x, pivotA.y, pivotA.z));
        refB.localToWorld(points.current[1].set(pivotB.x, pivotB.y, pivotB.z));
        
        // Update line geometry
        lineRef.current.geometry.setFromPoints(points.current);
    });

    return (
        <line ref={lineRef}>
            <bufferGeometry />
            <lineBasicMaterial color="white" linewidth={2} />
        </line>
    );
}