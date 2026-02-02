// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../types/simulation';

interface MarketHandProps {
    config: any;
    display: any;
    registry: Record<string, { ref: THREE.Object3D, api: any }>;
    allEntities: Entity[];
}

/**
 * Visualizes the "Invisible Hand of the Market"
 * Reacts to the aggregate spatial and emotional state of all "Agent" entities in the scene.
 */
export const MarketHand: React.FC<MarketHandProps> = ({ registry, allEntities }) => {
    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    
    // Find all agents to track
    const agentIds = useMemo(() => 
        allEntities.filter(e => e.type === 'Agent').map(e => e.id), 
    [allEntities]);

    useFrame((state) => {
        if (!groupRef.current) return;

        // 1. Calculate Aggregate Sentiment from Agents
        let totalSentiment = 0; // -1 (Bearish/Sad) to 1 (Bullish/Happy)
        let totalX = 0;
        let totalZ = 0;
        let count = 0;

        agentIds.forEach(id => {
            const entry = registry[id];
            // Find static data for emotion (since it's not changing in this sim loop yet, but we check config)
            const entity = allEntities.find(e => e.id === id);
            
            if (entry && entry.ref && entity) {
                const pos = entry.ref.position;
                totalX += pos.x;
                totalZ += pos.z;
                
                // Parse sentiment from emotion string or personality matrix
                const emo = entity.socialParams?.emotionalState || 'neutral';
                let val = 0;
                if (emo.includes('joy') || emo.includes('bull') || emo.includes('happy')) val = 1;
                else if (emo.includes('sad') || emo.includes('bear') || emo.includes('ang')) val = -1;
                
                totalSentiment += val;
                count++;
            }
        });

        if (count === 0) return;

        const avgSentiment = totalSentiment / count; // -1 to 1
        const centerX = totalX / count;
        const centerZ = totalZ / count;

        // 2. Animate the Hand
        const t = state.clock.elapsedTime;
        
        // Position: Hover above the "Market Center" (cluster of agents)
        const targetX = centerX;
        const targetZ = centerZ;
        
        // Lerp position for smooth movement
        groupRef.current.position.x += (targetX - groupRef.current.position.x) * 0.05;
        groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.05;
        
        // Hover height based on market health (High = Good)
        const targetY = 5 + avgSentiment * 2; 
        groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;

        // Color: Green (Bull) vs Red (Bear)
        if (materialRef.current) {
            const targetColor = new THREE.Color().setHSL(avgSentiment > 0 ? 0.3 : 0.0, 1.0, 0.5); // Green or Red
            materialRef.current.color.lerp(targetColor, 0.05);
            materialRef.current.emissive.lerp(targetColor, 0.05);
            materialRef.current.emissiveIntensity = 0.5 + Math.sin(t * 2) * 0.2;
        }

        // Rotation: "Grasping" or "Open"
        // If sentiment is bad, hand points down or shakes?
        // Let's just slowly rotate for mysterious effect
        groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
        groupRef.current.rotation.z = Math.cos(t * 0.3) * 0.1 + (avgSentiment < -0.5 ? Math.PI : 0); // Flip if crash
    });

    // Primitive construction of a "Hand"
    return (
        <group ref={groupRef} position={[0, 5, 0]}>
            <mesh castShadow>
                {/* Palm */}
                <boxGeometry args={[2, 0.5, 2]} />
                <meshStandardMaterial ref={materialRef} transparent opacity={0.6} roughness={0.2} metalness={0.8} />
            </mesh>
            
            {/* Fingers (Static for now, could animate joints) */}
            {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
                <mesh key={i} position={[x, 0, -1.2]}>
                    <boxGeometry args={[0.3, 0.3, 1.5]} />
                    <meshStandardMaterial color="white" transparent opacity={0.4} wireframe />
                </mesh>
            ))}
            {/* Thumb */}
            <mesh position={[1.2, 0, 0.5]} rotation={[0, -0.5, 0]}>
                <boxGeometry args={[0.4, 0.4, 1.2]} />
                 <meshStandardMaterial color="white" transparent opacity={0.4} wireframe />
            </mesh>
            
            {/* "Strings" attached to the void */}
            <mesh position={[0, 5, 0]}>
                 <cylinderGeometry args={[0.05, 0.05, 10]} />
                 <meshBasicMaterial color="#ffffff" opacity={0.1} transparent />
            </mesh>
        </group>
    );
};