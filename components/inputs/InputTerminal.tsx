// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { useBox } from '@react-three/cannon';
import * as THREE from 'three';
import { runtimeIntegration } from '../../services/RuntimeIntegration';
import { useFrame } from '@react-three/fiber';
import '@react-three/fiber';

interface InputTerminalProps {
    config: any;
    display: any;
    onRef: (ref: THREE.Object3D, api: any) => void;
}

export const InputTerminal: React.FC<InputTerminalProps> = ({ config, display, onRef }) => {
    const [isPressed, setIsPressed] = useState(false);
    const inputId = display.args[0] || 'generic_input'; // Arg 0 is Input ID
    
    // Physical Button Base
    const [ref, api] = useBox(() => ({ 
        ...config, 
        args: [1, 0.2, 1], // Fixed size base
        type: 'Static' // Terminal doesn't move
    }));

    // Visual Button Cap
    const capRef = useRef<THREE.Group>(null);

    useEffect(() => {
        if (ref.current) onRef(ref.current, api);
    }, [ref, api, onRef]);

    const handleDown = () => {
        setIsPressed(true);
        runtimeIntegration.setInputState(inputId, 1.0);
    };

    const handleUp = () => {
        setIsPressed(false);
        runtimeIntegration.setInputState(inputId, 0.0);
    };

    useFrame(() => {
        if (capRef.current) {
            // Animate button press
            const targetY = isPressed ? -0.1 : 0.1;
            capRef.current.position.y += (targetY - capRef.current.position.y) * 0.2;
            
            // Check if triggered remotely
            const remoteState = runtimeIntegration.getInputState(inputId);
            if (remoteState > 0.5 && !isPressed) setIsPressed(true);
            if (remoteState < 0.5 && isPressed) setIsPressed(false);
        }
    });

    return (
        <group ref={ref as any}>
            {/* Base */}
            <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
                <boxGeometry args={[1.2, 0.2, 1.2]} />
                <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Cap */}
            <group ref={capRef} position={[0, 0.1, 0]}>
                <mesh 
                    castShadow 
                    receiveShadow 
                    onPointerDown={(e) => { e.stopPropagation(); handleDown(); }}
                    onPointerUp={(e) => { e.stopPropagation(); handleUp(); }}
                    onPointerLeave={handleUp}
                >
                    <boxGeometry args={[1, 0.2, 1]} />
                    <meshStandardMaterial 
                        color={isPressed ? '#00ff00' : '#ff0000'} 
                        emissive={isPressed ? '#00ff00' : '#550000'}
                        emissiveIntensity={isPressed ? 1.0 : 0.2}
                        roughness={0.4}
                    />
                </mesh>
                
                {/* Label */}
                {/* (Html overlay could be added here) */}
            </group>
        </group>
    );
};