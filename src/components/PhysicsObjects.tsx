// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useMemo, useRef } from 'react';
import { ThreeElements } from '@react-three/fiber'; 
import { useBox, useSphere, useCylinder, usePlane, useHingeConstraint, useSpring, useDistanceConstraint, useLockConstraint } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { Entity, Constraint, Vector3 } from '../types/simulation';
import * as THREE from 'three';
import { InputTerminal } from './inputs/InputTerminal';

const vecToTuple = (v: Vector3): [number, number, number] => [v.x, v.y, v.z];

export const EntityRenderer: React.FC<{ entity: Entity }> = React.memo(({ entity }) => {
  const { type, position, rotation, args, mass, color, opacity = 1, roughness = 0.5, metalness = 0.5 } = entity;
  
  const config = useMemo(() => ({
    mass,
    position: vecToTuple(position),
    rotation: vecToTuple(rotation),
    args: args as any,
  }), [mass, position, rotation, args]);

  switch (type) {
    case 'Box': return <BoxEntity config={config} color={color} opacity={opacity} roughness={roughness} metalness={metalness} args={args} />;
    case 'Sphere': return <SphereEntity config={config} color={color} opacity={opacity} roughness={roughness} metalness={metalness} args={args} />;
    case 'Cylinder': return <CylinderEntity config={config} color={color} opacity={opacity} roughness={roughness} metalness={metalness} args={args} />;
    case 'Plane': return <PlaneEntity config={config} color={color} opacity={opacity} roughness={roughness} metalness={metalness} args={args} />;
    case 'Ganglion': return <GanglionEntity config={config} color={color} args={args} />;
    case 'InputTerminal': return <InputTerminal config={config} display={{ args }} onRef={()=>{}} />; // Handled by SceneObject wrapper mostly, but if direct render needed
    default: return null;
  }
});

const MaterialMesh: React.FC<ThreeElements['meshStandardMaterial']> = (props) => (
    <meshStandardMaterial 
        {...props} 
        transparent={props.opacity !== undefined && (props.opacity as number) < 1} 
    />
);

const BoxEntity: React.FC<any> = ({ config, color, opacity, roughness, metalness, args }) => {
  const [ref] = useBox(() => ({ ...config, args }));
  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <boxGeometry args={args as [number, number, number]} />
      <MaterialMesh color={color} opacity={opacity} roughness={roughness} metalness={metalness} />
    </mesh>
  );
};

const SphereEntity: React.FC<any> = ({ config, color, opacity, roughness, metalness, args }) => {
  // FIX: useSphere args must be an array [radius]
  const [ref] = useSphere(() => ({ ...config, args: [args[0]] }));
  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <sphereGeometry args={[args[0], 32, 32]} />
      <MaterialMesh color={color} opacity={opacity} roughness={roughness} metalness={metalness} />
    </mesh>
  );
};

const CylinderEntity: React.FC<any> = ({ config, color, opacity, roughness, metalness, args }) => {
  const [ref] = useCylinder(() => ({ ...config, args }));
  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <cylinderGeometry args={args as [number, number, number, number]} />
      <MaterialMesh color={color} opacity={opacity} roughness={roughness} metalness={metalness} />
    </mesh>
  );
};

const PlaneEntity: React.FC<any> = ({ config, color, opacity, roughness, metalness, args }) => {
  const [ref] = usePlane(() => ({ ...config }));
  return (
    <mesh ref={ref as any} receiveShadow>
      <planeGeometry args={args as [number, number]} />
      <MaterialMesh color={color} opacity={opacity} roughness={roughness} metalness={metalness} />
    </mesh>
  );
};

// --- Special Renderers ---

const GanglionEntity: React.FC<any> = ({ config, color, args }) => {
  // Ganglions are static sensors
  const [ref] = useSphere(() => ({ ...config, args: [args[0]], type: 'Static' }));
  const outerRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
      if (outerRef.current) {
          const s = 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
          outerRef.current.scale.set(s, s, s);
          outerRef.current.rotation.y += 0.01;
      }
  });

  return (
    <group ref={ref as any}>
        {/* Core Node */}
        <mesh castShadow>
          <sphereGeometry args={[args[0], 32, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
        {/* Pulsating Field */}
        <mesh ref={outerRef}>
          <sphereGeometry args={[args[0], 16, 16]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.2} />
        </mesh>
    </group>
  );
};

// --- Constraint Renderer ---

export const ConstraintsManager: React.FC<{ 
    constraints: Constraint[], 
    refs: React.MutableRefObject<Record<string, THREE.Object3D | null>> 
}> = ({ constraints, refs }) => {
    return (
        <>
            {constraints.map(c => (
                <SingleConstraint key={c.id} data={c} refs={refs} />
            ))}
        </>
    );
};

const SingleConstraint: React.FC<{ 
    data: Constraint, 
    refs: React.MutableRefObject<Record<string, THREE.Object3D | null>> 
}> = ({ data, refs }) => {
    const { bodyA, bodyB, pivotA, pivotB, axisA, axisB, ...opts } = data;
    const refA = refs.current[bodyA];
    const refB = refs.current[bodyB];

    if (!refA || !refB) return null;

    if (data.type === 'Hinge') {
        const hingeOpts = {
            pivotA: pivotA ? vecToTuple(pivotA) : undefined,
            pivotB: pivotB ? vecToTuple(pivotB) : undefined,
            axisA: axisA ? vecToTuple(axisA) : undefined,
            axisB: axisB ? vecToTuple(axisB) : undefined,
        };
        useHingeConstraint(refA as any, refB as any, hingeOpts);
    } else if (data.type === 'Spring') {
        const springOpts = {
            stiffness: opts.stiffness,
            damping: opts.damping,
            restLength: opts.restLength,
            localAnchorA: pivotA ? vecToTuple(pivotA) : undefined,
            localAnchorB: pivotB ? vecToTuple(pivotB) : undefined,
        };
        useSpring(refA as any, refB as any, springOpts);
    } else if (data.type === 'Distance') {
        const distanceOpts = {
             distance: opts.restLength,
        };
        useDistanceConstraint(refA as any, refB as any, distanceOpts);
    } else if (data.type === 'Lock') {
        useLockConstraint(refA as any, refB as any, {});
    }

    return null;
}