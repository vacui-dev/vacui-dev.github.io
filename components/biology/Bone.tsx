// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useEffect } from 'react';
import '@react-three/fiber';
import { useCylinder } from '@react-three/cannon';
import * as THREE from 'three';

interface BoneProps {
    config: any;
    display: any;
    onRef: (ref: THREE.Object3D, api: any) => void;
}

export const Bone: React.FC<BoneProps> = ({ config, display, onRef }) => {
    // Bones are cylinders physically
    const [ref, api] = useCylinder(() => ({ ...config, args: display.args }));
    
    useEffect(() => { 
        if(ref.current) onRef(ref.current, api);
    }, [ref, api, onRef]);

    return (
        <mesh ref={ref as any} castShadow receiveShadow>
            <cylinderGeometry args={display.args} />
            {/* Bone Material: Slightly rough, off-white/ivory */}
            <meshStandardMaterial 
                color="#e3dac9" 
                roughness={0.6} 
                metalness={0.1}
            />
            {/* Epiphysis (End caps) visual simulation */}
            <mesh position={[0, display.args[2]/2, 0]}>
                <sphereGeometry args={[display.args[0] * 1.2, 16, 16]} />
                <meshStandardMaterial color="#e3dac9" roughness={0.7} />
            </mesh>
            <mesh position={[0, -display.args[2]/2, 0]}>
                <sphereGeometry args={[display.args[1] * 1.2, 16, 16]} />
                <meshStandardMaterial color="#e3dac9" roughness={0.7} />
            </mesh>
        </mesh>
    );
};