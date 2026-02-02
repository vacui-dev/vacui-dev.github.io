// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useEffect, useRef } from 'react';
import { useSphere, useSpring } from '@react-three/cannon';
import { Constraint } from '../../types/simulation';
import { chemistryKernel } from '../../services/ChemistryKernel';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import '@react-three/fiber';

interface MoleculeProps {
    config: any; // Physics config
    display: any; // Visual config
    onRef: (ref: THREE.Object3D, api: any) => void;
}

export const Molecule: React.FC<MoleculeProps> = ({ config, display, onRef }) => {
    const { element } = display.chemicalParams || { element: 'H' };
    const props = chemistryKernel.getElementProps(element);
    
    // Atoms are Spheres
    const [ref, api] = useSphere(() => ({ 
        ...config, 
        args: [props.radius],
        mass: props.mass 
    }));

    useEffect(() => {
        if (ref.current) onRef(ref.current, api);
    }, [ref, api, onRef]);

    return (
        <mesh ref={ref as any} castShadow receiveShadow>
            <sphereGeometry args={[props.radius, 32, 32]} />
            <meshStandardMaterial 
                color={props.color} 
                roughness={0.2} 
                metalness={0.1} 
                emissive={props.color}
                emissiveIntensity={0.1}
            />
            {/* Electron Cloud Glow */}
            <mesh scale={[1.2, 1.2, 1.2]}>
                <sphereGeometry args={[props.radius, 16, 16]} />
                <meshBasicMaterial color={props.color} transparent opacity={0.1} depthWrite={false} />
            </mesh>
        </mesh>
    );
};

export const ChemicalBond: React.FC<{ config: Constraint, refA: any, refB: any }> = ({ config, refA, refB }) => {
    const { stiffness, damping, restLength } = config;
    
    useSpring(refA, refB, { stiffness, damping, restLength });

    const meshRef = useRef<THREE.Mesh>(null);
    const vecA = new THREE.Vector3();
    const vecB = new THREE.Vector3();

    useFrame(() => {
        if (!refA || !refB || !meshRef.current) return;
        
        // Get world positions directly from the object refs
        refA.getWorldPosition(vecA);
        refB.getWorldPosition(vecB);

        const dist = vecA.distanceTo(vecB);
        const mid = new THREE.Vector3().addVectors(vecA, vecB).multiplyScalar(0.5);
        
        meshRef.current.position.copy(mid);
        meshRef.current.lookAt(vecB);
        meshRef.current.rotateX(Math.PI / 2);
        meshRef.current.scale.set(1, dist, 1);
    });

    return (
        <mesh ref={meshRef}>
            <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
    );
};