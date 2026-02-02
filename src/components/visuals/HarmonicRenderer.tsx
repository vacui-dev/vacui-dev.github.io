// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../types/simulation';
import { HarmonicParams } from '../../types/legacy';
import { resolvePattern } from '../../services/PatternLibrary';
import { signalEngine } from '../../services/SignalEngine';
import { midiAudio } from '../../services/MidiAudioEngine';

type PatternLayer = any;

interface HarmonicRendererProps {
    entity: Entity;
}

export const HarmonicRenderer: React.FC<HarmonicRendererProps> = ({ entity }) => {
    const { harmonicParams, position, color } = entity;
    const meshRef = useRef<THREE.Line>(null);
    const headRef = useRef<THREE.Mesh>(null);
    
    // Default legacy params
    const params: HarmonicParams = harmonicParams || {
        layers: [{ id: '1', pattern: 'Basic Shapes.circle', intensity: 1, phase: 0, blendMode: 'add' }],
        projection: 'polar',
        speed: 0.02,
        trailLength: 200,
        scale: 5,
        resolution: 1
    };

    const [trailPositions] = useState(() => new Float32Array((params.trailLength || 200) * 3));
    const [angle, setAngle] = useState(0);

    const lineGeometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        return geo;
    }, [trailPositions]);

    // Legacy: Pattern Calc
    const calculateValue = (theta: number, layers: PatternLayer[]): number => {
        let result = 0;
        layers.forEach((layer, i) => {
            const fn = resolvePattern(layer.pattern);
            const val = fn(theta + layer.phase) * layer.intensity;
            if (i === 0) result = val;
            else {
                switch (layer.blendMode) {
                    case 'add': result += val; break;
                    case 'subtract': result -= val; break;
                    case 'multiply': result *= val; break;
                    case 'divide': result /= (val || 0.001); break;
                }
            }
        });
        return result;
    };

    // Legacy: Projection
    const project = (theta: number, value: number, mode: HarmonicParams['projection'], scale: number): THREE.Vector3 => {
        const r = value * scale;
        switch (mode) {
            case 'cylindrical':
                return new THREE.Vector3(Math.cos(theta) * scale, value * scale * 0.5, Math.sin(theta) * scale);
            case 'spiral':
                const z = (theta % (Math.PI * 4)) / (Math.PI * 4) * scale;
                return new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, z);
            case 'spherical':
                const phi = value * Math.PI; 
                return new THREE.Vector3(scale * Math.sin(phi) * Math.cos(theta), scale * Math.cos(phi), scale * Math.sin(phi) * Math.sin(theta));
            case 'polar':
            default:
                return new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0);
        }
    };

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        let localPos = new THREE.Vector3();

        if (params.nodeGraph) {
            // --- NEW SYSTEM: SIGNAL GRAPH DRIVEN ---
            const audioData = midiAudio.getAudioData();
            const graphPos = signalEngine.evaluateGraph(params.nodeGraph, time, audioData, entity.id);
            localPos.set(graphPos.x, graphPos.y, graphPos.z);
        } else {
            // --- OLD SYSTEM: LEGACY PARAMS ---
            const newAngle = angle + (params.speed || 0.02);
            setAngle(newAngle);
            const val = calculateValue(newAngle, params.layers || []);
            localPos.copy(project(newAngle, val, params.projection, params.scale || 5));
        }
        
        // Sanitize NaN to prevent BufferGeometry bounding sphere errors
        // Must check Number.isFinite to catch Inifinity and NaN
        if (!Number.isFinite(localPos.x)) localPos.x = 0;
        if (!Number.isFinite(localPos.y)) localPos.y = 0;
        if (!Number.isFinite(localPos.z)) localPos.z = 0;

        // Shift Trail
        const len = params.trailLength || 200;
        for (let i = len - 1; i > 0; i--) {
            trailPositions[i * 3] = trailPositions[(i - 1) * 3];
            trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
            trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
        }
        trailPositions[0] = localPos.x;
        trailPositions[1] = localPos.y;
        trailPositions[2] = localPos.z;

        if (meshRef.current) {
            meshRef.current.geometry.attributes.position.needsUpdate = true;
            // Recalculate bounds occasionally or if needed to prevent culling issues,
            // but for a trail, setting frustumCulled=false is often smoother performance wise
            meshRef.current.frustumCulled = false; 
        }
        if (headRef.current) {
            headRef.current.position.copy(localPos);
        }
    });

    return (
        <group position={[position.x, position.y, position.z]} rotation={[entity.rotation.x, entity.rotation.y, entity.rotation.z]}>
            {/* @ts-ignore */}
            <line ref={meshRef as any} geometry={lineGeometry}>
                <lineBasicMaterial color={color} opacity={0.6} transparent linewidth={2} />
            </line>
            <mesh ref={headRef}>
                <sphereGeometry args={[(params.scale || 5) * 0.05, 16, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
};