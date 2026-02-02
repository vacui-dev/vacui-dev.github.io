// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Entity } from '../../types/simulation';
import { textureGenerator } from '../../services/TextureGenerator';
import { Atmosphere } from './Atmosphere';
import '@react-three/fiber';

interface PlanetProps {
    entity: Entity;
    onRef: (ref: THREE.Object3D, api: any) => void;
    // We need the registry to find the Sun for the shader
    sunPosition?: THREE.Vector3;
}

export const Planet: React.FC<PlanetProps> = ({ entity, onRef, sunPosition = new THREE.Vector3(0, 0, 0) }) => {
    const { planetParams, position } = entity;
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);

    // Generate Textures
    const { map, specularMap } = useMemo(() => {
        return textureGenerator.generatePlanetTexture(planetParams?.textureSeed || 'earth');
    }, [planetParams?.textureSeed]);

    // Shader Material for Day/Night Cycle
    const material = useMemo(() => {
        return new THREE.MeshPhongMaterial({
            map: map,
            specularMap: specularMap,
            specular: new THREE.Color(0x333333),
            shininess: 15,
            emissive: new THREE.Color(0x000000)
        });
    }, [map, specularMap]);

    // Use Sphere logic for physics interaction
    // We wrap it in a group to handle Axial Tilt cleanly
    React.useEffect(() => {
        if (groupRef.current) {
            onRef(groupRef.current, { 
                position: { set: (x: number, y: number, z: number) => groupRef.current?.position.set(x,y,z) },
                rotation: { set: (x: number, y: number, z: number) => groupRef.current?.rotation.set(x,y,z) },
                velocity: { set: () => {} } // Dummy for kinematic
            });
        }
    }, [onRef]);

    return (
        <group ref={groupRef} position={[position.x, position.y, position.z]}>
            <mesh ref={meshRef} castShadow receiveShadow>
                <sphereGeometry args={[planetParams?.radius || 1, 64, 64]} />
                <primitive object={material} attach="material" />
            </mesh>
            
            {/* Atmosphere Glow */}
            <Atmosphere 
                config={{ position: [0,0,0] }} 
                display={{ 
                    args: [(planetParams?.radius || 1) * 1.025], // Slightly larger
                    color: planetParams?.atmosphereColor || '#00aaff',
                    shaderParams: entity.shaderParams 
                }} 
            />

            {/* City Lights (Night side emissive) - Simplistic implementation via separate mesh or shader enhancement */}
            {/* For MVP, we rely on the Atmosphere to provide the aesthetic punch */}
        </group>
    );
};