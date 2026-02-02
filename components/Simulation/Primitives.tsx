
// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useEffect, useRef } from 'react';
import { useBox, useSphere, useCylinder, usePlane } from '@react-three/cannon';
import { registerEntity, EntityComponentProps } from './EntityRegistry';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- WRAPPERS ---

const BoxObj: React.FC<EntityComponentProps> = ({ config, display, onRef, bind }) => {
    const [ref, api] = useBox(() => ({ ...config }));
    useEffect(() => { if (ref.current) onRef(ref.current, api) }, [ref, api, onRef]);
    return (
        <mesh ref={ref as any} castShadow receiveShadow {...bind}>
            <boxGeometry args={display.args} />
            <meshStandardMaterial {...display} transparent={display.opacity < 1} />
        </mesh>
    );
};

const SphereObj: React.FC<EntityComponentProps> = ({ config, display, onRef, bind }) => {
    const [ref, api] = useSphere(() => ({ ...config, args: [display.args[0]] }));
    useEffect(() => { if (ref.current) onRef(ref.current, api) }, [ref, api, onRef]);
    return (
        <mesh ref={ref as any} castShadow receiveShadow {...bind}>
            <sphereGeometry args={[display.args[0], 32, 32]} />
            <meshStandardMaterial 
                {...display} 
                transparent={display.opacity < 1} 
                emissive={config.mass === 0 && display.color !== '#000000' ? display.color : '#000000'}
                emissiveIntensity={config.mass === 0 ? 2 : 0}
            />
        </mesh>
    );
};

const CylinderObj: React.FC<EntityComponentProps> = ({ config, display, onRef, bind }) => {
    const [ref, api] = useCylinder(() => ({ ...config, args: display.args }));
    useEffect(() => { if (ref.current) onRef(ref.current, api) }, [ref, api, onRef]);
    return (
        <mesh ref={ref as any} castShadow receiveShadow {...bind}>
            <cylinderGeometry args={display.args} />
            <meshStandardMaterial {...display} transparent={display.opacity < 1} />
        </mesh>
    );
};

const PlaneObj: React.FC<EntityComponentProps> = ({ config, display, onRef, bind }) => {
    const [ref, api] = usePlane(() => ({ ...config }));
    useEffect(() => { if (ref.current) onRef(ref.current, api) }, [ref, api, onRef]);
    return (
        <mesh ref={ref as any} receiveShadow {...bind}>
            <planeGeometry args={display.args} />
            <meshStandardMaterial {...display} transparent={display.opacity < 1} />
        </mesh>
    );
};

const GanglionObj: React.FC<EntityComponentProps> = ({ config, display, onRef, bind }) => {
    const [ref, api] = useSphere(() => ({ ...config, args: [display.args[0]], type: 'Static' }));
    const outerRef = useRef<THREE.Mesh>(null);
    
    useEffect(() => { if (ref.current) onRef(ref.current, api) }, [ref, api, onRef]);

    useFrame((state) => {
        if (outerRef.current) {
            const s = 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
            outerRef.current.scale.set(s, s, s);
            outerRef.current.rotation.y += 0.01;
        }
    });
  
    return (
      <group ref={ref as any} {...bind}>
          <mesh castShadow>
            <sphereGeometry args={[display.args[0], 32, 32]} />
            <meshStandardMaterial color={display.color} emissive={display.color} emissiveIntensity={0.8} />
          </mesh>
          <mesh ref={outerRef}>
            <sphereGeometry args={[display.args[0], 16, 16]} />
            <meshBasicMaterial color={display.color} wireframe transparent opacity={0.2} />
          </mesh>
      </group>
    );
};

// --- REGISTRATION ---

export const registerPrimitives = () => {
    registerEntity('Box', BoxObj);
    registerEntity('Sphere', SphereObj);
    registerEntity('Cylinder', CylinderObj);
    registerEntity('Plane', PlaneObj);
    registerEntity('Ganglion', GanglionObj);
};
