
// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { WorldConfig, Entity, Vector3, Constraint } from '../../types/simulation';
import * as THREE from 'three';
import { timelineService } from '../../services/TimelineService';

// Systems
import { CollisionSystem } from '../systems/CollisionSystem';
import { OrbitalSystem } from '../systems/OrbitalSystem';
import { AnimationSystem } from '../systems/AnimationSystem';
import { LogicSystem } from '../systems/LogicSystem';
import { 
    RelationSystem, PhysicsRuleSystem, ChemistrySystem, 
    DataMappingSystem, WindSystem, MemeticFieldSystem, TelemetrySystem 
} from './Systems';
import { ConstraintsSystem } from './Constraints';

// Registry Import
import { getEntityComponent } from './EntityRegistry';
import { registerPrimitives } from './Primitives';
import { registerBiology } from '../biology';
import { registerVisuals } from '../visuals';
import { registerSocial } from '../social';
import { registerChemistry } from '../chemistry';
import { registerGeometry } from '../geometry';
import { registerInputs } from '../inputs';

const VecToTuple = (v: Vector3): [number, number, number] => [v.x, v.y, v.z];

// Perform registrations once
let registered = false;
const ensureRegistration = () => {
    if (registered) return;
    registerPrimitives();
    registerBiology();
    registerVisuals();
    registerSocial();
    registerChemistry();
    registerGeometry();
    registerInputs();
    registered = true;
};

// --- SCENE OBJECT WRAPPER ---
interface SceneObjectProps {
    entity: Entity;
    registerRef: (id: string, ref: THREE.Object3D, api: any) => void;
    registry: Record<string, { ref: THREE.Object3D, api: any }>;
    allEntities: Entity[];
    onSelect?: (id: string) => void;
}

const SceneObject: React.FC<SceneObjectProps> = ({ entity, registerRef, registry, allEntities, onSelect }) => {
    const { type, args, position, rotation, mass, color, opacity = 1, roughness = 0.5, metalness = 0.5, shaderParams, fireParams, socialParams, chemicalParams, geometryParams, manifoldParams, pathParams, harmonicParams, planetParams, ganglionParams } = entity;
    
    const isAgent = type === 'Agent';
    
    const Component = getEntityComponent(type);

    if (!Component) {
        console.warn(`No component registered for type: ${type}`);
        return null;
    }

    const bind = {
        onClick: (e: any) => {
            e.stopPropagation();
            if(onSelect) onSelect(entity.id);
        }
    };
    
    const config = { 
        id: entity.id, 
        name: entity.name, 
        mass, 
        position: VecToTuple(position), 
        rotation: VecToTuple(rotation), 
        args: args as any,
        angularDamping: isAgent ? 0.99 : 0.0, 
        linearDamping: isAgent ? 0.1 : 0.0,
        fixedRotation: isAgent 
    };

    const display = { 
        color, opacity, roughness, metalness, args, 
        shaderParams, fireParams, socialParams, chemicalParams, 
        geometryParams, manifoldParams, pathParams, harmonicParams, 
        planetParams, ganglionParams 
    };

    return (
        <Component 
            config={config}
            display={display}
            onRef={(ref: THREE.Object3D, api: any) => registerRef(entity.id, ref, api)}
            registry={registry}
            allEntities={allEntities}
            bind={bind}
            entity={entity}
        />
    );
};

// --- SIMULATION CONTENT ---
const SimulationContent = ({ config, onObjectSelect }: { config: WorldConfig, onObjectSelect?: (id: string) => void }) => {
    const registry = useRef<Record<string, { ref: THREE.Object3D, api: any }>>({});
    const [ready, setReady] = useState(false);
    const [dynamicConstraints, setDynamicConstraints] = useState<Constraint[]>([]);

    const registerRef = (id: string, ref: THREE.Object3D, api: any) => {
        registry.current[id] = { ref, api };
    };

    useEffect(() => {
        setReady(false);
        setDynamicConstraints([]);
        timelineService.clear();
        if (config.tracks) {
            timelineService.loadTracks(config.tracks);
        }
        const t = setTimeout(() => setReady(true), 100);
        return () => clearTimeout(t);
    }, [config]);

    const addConstraint = (c: Constraint) => {
        setDynamicConstraints(prev => [...prev, c]);
    };

    return (
        <>
            <CollisionSystem config={config} />
            <OrbitalSystem config={config} registry={registry.current} />
            <AnimationSystem registry={registry.current} />
            <LogicSystem config={config} registry={registry.current} />
            
            <PhysicsRuleSystem config={config} registry={registry.current} />
            <ChemistrySystem config={config} addConstraint={addConstraint} />
            <DataMappingSystem config={config} registry={registry.current} />
            <WindSystem config={config} registry={registry.current} />
            <MemeticFieldSystem config={config} registry={registry.current} />
            <RelationSystem config={config} registry={registry.current} />
            <TelemetrySystem config={config} registry={registry.current} />
            
            {config.entities.map(entity => (
                <SceneObject 
                    key={entity.id} 
                    entity={entity} 
                    registerRef={registerRef} 
                    registry={registry.current}
                    allEntities={config.entities}
                    onSelect={onObjectSelect}
                />
            ))}
            
            {ready && (
                <ConstraintsSystem 
                    constraints={[...config.constraints, ...dynamicConstraints]} 
                    getRef={(id) => registry.current[id] || null} 
                />
            )}
        </>
    );
};

// --- MAIN EXPORT ---
interface SimulationSceneProps {
    config: WorldConfig | null;
    simulationKey?: number;
    onObjectSelect?: (id: string | null) => void;
}

export const SimulationScene: React.FC<SimulationSceneProps> = ({ config, simulationKey = 0, onObjectSelect }) => {
    ensureRegistration();

    if (!config) return null;

    return (
        <Canvas 
            key={simulationKey} 
            shadows 
            camera={{ position: [10, 10, 10], fov: 50 }} 
            dpr={[1, 2]} 
            gl={{ preserveDrawingBuffer: true }}
            onPointerMissed={() => onObjectSelect && onObjectSelect(null)}
        >
            <color attach="background" args={['#050505']} />
            <fog attach="fog" args={['#050505', 50, 200]} />
            
            <ambientLight intensity={0.1} />
            <pointLight position={[0, 0, 0]} intensity={3} decay={2} distance={100} castShadow />

            <Physics gravity={VecToTuple(config.gravity)} iterations={20} tolerance={0.0001}>
                <SimulationContent config={config} onObjectSelect={onObjectSelect} />
            </Physics>

            <EffectComposer enableNormalPass={false}>
                <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.6} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>

            <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />
            <OrbitControls makeDefault />
            <Environment preset={(config.environment as any) || 'city'} />
            <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </Canvas>
    );
};
