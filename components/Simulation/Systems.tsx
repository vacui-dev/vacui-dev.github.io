
// Copyright (c) 2025 vacui.dev, all rights reserved

import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { WorldConfig } from '../../types/simulation';
import { runtimeIntegration } from '../../services/RuntimeIntegration';
import { dataIngestion } from '../../services/DataIngestion';
import { chemistryKernel } from '../../services/ChemistryKernel';
import * as THREE from 'three';

// Exporting logic systems that were previously in SimulationScene.tsx

export const RelationSystem = ({ config, registry }: { config: WorldConfig, registry: any }) => {
    useFrame(() => {
        if (!config.constraints) return;
        config.constraints.forEach(c => {
            if (c.type === 'Relation' && c.relationParams) {
                const source = registry[c.bodyA];
                const target = registry[c.bodyB];
                if (source && target && source.ref && target.api) {
                    const { sourceProp, targetProp, multiplier, offset } = c.relationParams;
                    const getValue = (obj: any, path: string) => path.split('.').reduce((o, k) => (o || {})[k], obj);
                    const val = getValue(source.ref, sourceProp);
                    if (typeof val === 'number') {
                        const enforcedValue = val * multiplier + offset;
                        if (targetProp === 'position.x') target.api.position.set(enforcedValue, target.ref.position.y, target.ref.position.z);
                        if (targetProp === 'position.y') target.api.position.set(target.ref.position.x, enforcedValue, target.ref.position.z);
                        if (targetProp === 'position.z') target.api.position.set(target.ref.position.x, target.ref.position.y, enforcedValue);
                        if (targetProp === 'rotation.x') target.api.rotation.set(enforcedValue, target.ref.rotation.y, target.ref.rotation.z);
                        if (targetProp === 'rotation.y') target.api.rotation.set(target.ref.rotation.x, enforcedValue, target.ref.rotation.z);
                        if (targetProp === 'rotation.z') target.api.rotation.set(target.ref.rotation.x, target.ref.rotation.y, enforcedValue);
                    }
                }
            }
        });
    });
    return null;
};

export const PhysicsRuleSystem = ({ config, registry }: { config: WorldConfig, registry: any }) => {
    useFrame(() => {
        if (!config.physicsRules) return;
        config.physicsRules.forEach(rule => {
            if (!rule.active) return;
            if (rule.id === 'vortex_center') {
                config.entities.forEach(e => {
                    const reg = registry[e.id];
                    if (reg && reg.api) {
                        const pos = reg.ref.position;
                        const dist = Math.sqrt(pos.x**2 + pos.z**2);
                        if (dist < 10 && dist > 1) {
                            const force = 5 / dist;
                            reg.api.applyForce([-pos.z * force, 0, pos.x * force], [0,0,0]);
                        }
                    }
                });
            }
        });
    });
    return null;
};

export const ChemistrySystem = ({ config, addConstraint }: { config: WorldConfig, addConstraint: (c: any) => void }) => {
    useFrame((state) => {
        if (state.clock.getElapsedTime() % 0.5 < 0.02) {
            const { newConstraints } = chemistryKernel.solveReactions(config.entities, config.constraints);
            if (newConstraints.length > 0) {
                newConstraints.forEach(c => {
                    addConstraint(c);
                    config.constraints.push(c); 
                });
            }
        }
    });
    return null;
};

export const DataMappingSystem = ({ config, registry }: { config: WorldConfig, registry: any }) => {
    useEffect(() => {
        if (!config.dataStreams) return;
        config.dataStreams.forEach(stream => {
            dataIngestion.startStream(stream.id, stream.source, stream.updateFrequency);
        });
        return () => dataIngestion.stopAll();
    }, [config.dataStreams]);

    useFrame(() => {
        if (!config.dataStreams) return;
        config.dataStreams.forEach(stream => {
            const rawValue = dataIngestion.getValue(stream.id);
            stream.mapping.forEach((map: any) => {
                const entity = config.entities.find(e => e.id === map.targetEntityId);
                const reg = registry[map.targetEntityId];
                if (!entity || !reg) return;
                const normalized = (rawValue - map.minRange) / (map.maxRange - map.minRange);
                const clamped = Math.max(0, Math.min(1, normalized));
                const targetVal = map.targetMin + clamped * (map.targetMax - map.targetMin);
                if (map.targetProperty === 'position.y') {
                     reg.api.position.set(entity.position.x, targetVal, entity.position.z);
                } else if (map.targetProperty === 'fireParams.temperature') {
                     if (entity.fireParams) entity.fireParams.temperature = targetVal;
                } else if (map.targetProperty === 'wind.x') {
                     if (config.wind) config.wind.x = targetVal;
                }
            });
        });
    });
    return null;
}

export const MemeticFieldSystem = ({ config, registry }: { config: WorldConfig, registry: any }) => {
    const TRACK_RADIUS_X = 12;
    const TRACK_RADIUS_Z = 7;
    const ganglia = config.entities.filter(e => e.type === 'Ganglion');
    useFrame((state) => {
        const time = state.clock.elapsedTime;
        config.entities.forEach(entity => {
            if (entity.type !== 'Agent' || !entity.socialParams) return;
            const api = registry[entity.id]?.api;
            const ref = registry[entity.id]?.ref;
            if (!api || !ref) return;
            const pos = ref.position;
            const conformity = entity.socialParams.conformity ?? 0.8; 
            const performative = entity.socialParams.performativeDesire ?? 0.2; 
            const stats = entity.socialParams.raceStats || { speed: 8, stamina: 10, guts: 5 };
            const angle = Math.atan2(pos.z, pos.x);
            const normX = -Math.sin(angle);
            const normZ = Math.cos(angle);
            const currentDist = Math.sqrt(pos.x*pos.x + pos.z*pos.z);
            const idealR = Math.sqrt(Math.pow(TRACK_RADIUS_X * Math.cos(angle), 2) + Math.pow(TRACK_RADIUS_Z * Math.sin(angle), 2));
            const drift = idealR - currentDist;
            const vecNormX = normX * 0.8 + (pos.x / currentDist) * drift * 0.5;
            const vecNormZ = normZ * 0.8 + (pos.z / currentDist) * drift * 0.5;
            let vecPerfX = 0;
            let vecPefZ = 0;
            if (performative > 0 && ganglia.length > 0) {
                ganglia.forEach(g => {
                    const dx = g.position.x - pos.x;
                    const dz = g.position.z - pos.z;
                    const distSq = dx*dx + dz*dz;
                    if (distSq < 100) {
                        vecPerfX += dx / (distSq + 0.1);
                        vecPefZ += dz / (distSq + 0.1);
                    }
                });
            }
            let finalDirX = (vecNormX * conformity) + (vecPerfX * performative);
            let finalDirZ = (vecNormZ * conformity) + (vecPefZ * performative);
            const len = Math.sqrt(finalDirX*finalDirX + finalDirZ*finalDirZ) || 1;
            finalDirX /= len;
            finalDirZ /= len;
            const fatigue = Math.max(0.2, 1.0 - (time * 0.02 / stats.stamina));
            const burst = (stats.guts > 12 && Math.random() > 0.98) ? 1.5 : 1.0; 
            const appliedSpeed = stats.speed * fatigue * burst;
            api.velocity.set(finalDirX * appliedSpeed, -5, finalDirZ * appliedSpeed); 
            api.rotation.set(0, Math.atan2(-finalDirZ, finalDirX), 0);
        });
    });
    return null;
}

export const WindSystem = ({ config, registry }: { config: WorldConfig, registry: Record<string, { ref: THREE.Object3D, api: any }> }) => {
    useFrame(() => {
        if (!config.wind) return;
        const windForce = [config.wind.x, config.wind.y, config.wind.z];
        Object.values(registry).forEach(({ api }) => {
            if (api && api.applyForce) {
                 api.applyForce(windForce, [0, 0, 0]);
            }
        });
    });
    return null;
}

export const TelemetrySystem = ({ config, registry }: { config: WorldConfig, registry: Record<string, { ref: THREE.Object3D, api: any }> }) => {
    const { gl, scene, camera } = useThree();
    useEffect(() => {
        runtimeIntegration.registerVisualProvider(() => {
            gl.render(scene, camera);
            return gl.domElement.toDataURL('image/jpeg', 0.5);
        });
    }, [gl, scene, camera]);
    useFrame(() => {
        runtimeIntegration.streamState(config.entities, config, registry);
    });
    return null;
};
