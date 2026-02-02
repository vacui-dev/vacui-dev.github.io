// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useEffect } from 'react';
import '@react-three/fiber';
import { useCylinder, useSphere } from '@react-three/cannon';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface AgentProps {
    config: any;
    display: any;
    onRef: (ref: THREE.Object3D, api: any) => void;
}

export const Agent: React.FC<AgentProps> = ({ config, display, onRef }) => {
    // Determine physics shape based on arguments provided
    // If args has 1 element, it's a Sphere (Ball Agent). If 3+, it's a Cylinder (Humanoid Agent).
    const isBall = display.args.length === 1;

    if (isBall) {
        return <AgentSphere config={config} display={display} onRef={onRef} />;
    } else {
        return <AgentCylinder config={config} display={display} onRef={onRef} />;
    }
};

const AgentSphere: React.FC<AgentProps> = ({ config, display, onRef }) => {
    // Ball Physics
    const [ref, api] = useSphere(() => ({ ...config, args: [display.args[0]] }));

    useEffect(() => {
        if (ref.current) onRef(ref.current, api);
    }, [ref, api, onRef]);

    const social = display.socialParams || {};
    const emotion = social.emotionalState || 'neutral';
    const embedding = social.personalityMatrix; // The "Embedding Vector"

    const baseColor = getEmotionColor(emotion.toLowerCase(), display.color);

    return (
        <group>
            <mesh ref={ref as any} castShadow receiveShadow>
                <sphereGeometry args={[display.args[0], 32, 32]} />
                <meshStandardMaterial 
                    color={baseColor} 
                    roughness={0.2} 
                    metalness={0.4}
                />
                
                {/* Visualizing the Embedding Vector as a Halo */}
                {embedding && (
                    <mesh scale={[1.2, 1.2, 1.2]}>
                        <sphereGeometry args={[display.args[0], 16, 16]} />
                        <meshBasicMaterial 
                            color={baseColor} 
                            wireframe 
                            transparent 
                            opacity={0.3} 
                        />
                    </mesh>
                )}
            </mesh>

            <SocialUI refObj={ref} name={config.name} social={social} yOffset={display.args[0] + 0.5} />
        </group>
    );
};

const AgentCylinder: React.FC<AgentProps> = ({ config, display, onRef }) => {
    // Cylinder Physics (Humanoid)
    const [ref, api] = useCylinder(() => ({ ...config, args: display.args }));
    
    useEffect(() => { 
        if(ref.current) onRef(ref.current, api);
    }, [ref, api, onRef]);

    const social = display.socialParams || {};
    const emotion = social.emotionalState || 'neutral';
    const baseColor = getEmotionColor(emotion.toLowerCase(), display.color);

    return (
        <group>
            <mesh ref={ref as any} castShadow receiveShadow>
                <cylinderGeometry args={display.args} />
                <meshStandardMaterial 
                    color={baseColor} 
                    roughness={0.3} 
                    metalness={0.1}
                />
                {/* Visual "Head" marker */}
                <mesh position={[0, (display.args[2] || 1.8) / 2 - 0.2, 0.2]}>
                     <boxGeometry args={[0.2, 0.1, 0.1]} />
                     <meshStandardMaterial color="#333" />
                </mesh>
            </mesh>

            <SocialUI refObj={ref} name={config.name} social={social} yOffset={(display.args[2] || 1.8)/2 + 0.5} />
        </group>
    );
};

const SocialUI: React.FC<{refObj: any, name: string, social: any, yOffset: number}> = ({ refObj, name, social, yOffset }) => {
    return (
        refObj.current && (
            <Html position={[0, yOffset, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
                <div className="bg-black/70 backdrop-blur-sm p-2 rounded text-xs text-white border border-white/20 font-mono w-32 pointer-events-none select-none">
                    <div className="font-bold text-[10px] text-cyan-400 mb-1">ID: {name.substring(0,8)}</div>
                    <div className="flex justify-between">
                        <span className="opacity-50">MOOD:</span>
                        <span className="text-[10px]">{social.emotionalState?.toUpperCase().substring(0,10)}</span>
                    </div>
                    {/* Visualize Embedding Vector Length/Norm loosely */}
                    {social.personalityMatrix && (
                         <div className="flex justify-between mt-1">
                            <span className="opacity-50">VEC:</span>
                            <span className="text-[10px] font-mono tracking-tighter opacity-70">
                                [{social.personalityMatrix.slice(0,3).map((n: number) => n.toFixed(1)).join(',')}]
                            </span>
                        </div>
                    )}
                </div>
            </Html>
        )
    );
};

// Helper: Map Emotion to Color
const getEmotionColor = (emo: string, defaultColor: string) => {
    if (emo.includes('ang')) return '#ff2222';
    if (emo.includes('joy') || emo.includes('happy') || emo.includes('euph')) return '#ffff00';
    if (emo.includes('sad') || emo.includes('depress')) return '#2222ff';
    if (emo.includes('anx') || emo.includes('fear')) return '#cc00cc';
    if (emo.includes('bull')) return '#00ff00';
    if (emo.includes('bear')) return '#ff0000';
    return defaultColor || '#cccccc';
};