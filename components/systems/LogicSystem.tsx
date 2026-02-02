
// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { WorldConfig } from '../../types/simulation';
import { signalEngine } from '../../services/SignalEngine';
import { midiAudio } from '../../services/MidiAudioEngine';
import { samplerEngine } from '../../services/SamplerEngine';
import { runtimeIntegration } from '../../services/RuntimeIntegration';
import { NodeType } from '../../types/nodes';
import * as THREE from 'three';

interface LogicSystemProps {
    config: WorldConfig;
    registry: Record<string, { ref: THREE.Object3D, api: any }>;
}

export const LogicSystem: React.FC<LogicSystemProps> = ({ config, registry }) => {
    
    const triggerState = useRef<Record<string, boolean>>({});

    useEffect(() => {
        samplerEngine.initialize().catch(console.error);
    }, []);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const audioData = midiAudio.getAudioData();

        config.entities.forEach(entity => {
            if (entity.logicParams && entity.logicParams.nodeGraph) {
                const reg = registry[entity.id];
                
                // Evaluate Logic Graph
                const result = signalEngine.evaluateLogic(entity.logicParams.nodeGraph, time, audioData, entity.id);

                // 1. Apply Physical Effects
                if (result.impulse && reg && reg.api) {
                    const imp = result.impulse;
                    if (result.isLocal) {
                        reg.api.applyLocalImpulse([imp.x, imp.y, imp.z], [0, 0, 0]); 
                    } else {
                        reg.api.applyImpulse([imp.x, imp.y, imp.z], [0, 0, 0]);
                    }
                }

                // 2. Apply Audio Triggers
                if (result.audioTriggers.length > 0) {
                    result.audioTriggers.forEach((trigger, index) => {
                        const triggerKey = `${entity.id}_sampler_${index}`;
                        const wasActive = triggerState.current[triggerKey] || false;
                        
                        if (!wasActive) {
                            samplerEngine.play(trigger.instrument, trigger.index, trigger.pitch, trigger.gain);
                            triggerState.current[triggerKey] = true;
                        }
                    });
                }

                // 3. Apply Game Events (Trigger Nodes)
                const eventNodes = entity.logicParams.nodeGraph.nodes.filter(n => n.type === NodeType.TRIGGER_EVENT);
                eventNodes.forEach(node => {
                    // We can resolve inputs here directly or rely on signalEngine's previous pass if it cached state.
                    // SignalEngine `evaluateLogic` doesn't currently return TRIGGER_EVENT status directly.
                    // Let's evaluate the input socket for this node.
                    const val = signalEngine['resolveInput']({ graph: entity.logicParams!.nodeGraph, inputs: {}, entityId: entity.id }, node.id, 'trigger', time, audioData);
                    
                    if (val > 0.5) {
                        const key = `${entity.id}_evt_${node.id}`;
                        const wasActive = triggerState.current[key];
                        if (!wasActive) {
                            runtimeIntegration.emitGameEvent({ 
                                type: node.data.eventType || 'GENERIC',
                                payload: { entityId: entity.id, value: val }
                            });
                            triggerState.current[key] = true;
                        }
                    } else {
                        triggerState.current[`${entity.id}_evt_${node.id}`] = false;
                    }
                });

                // Cleanup inactive audio triggers (simple heuristic)
                Object.keys(triggerState.current).forEach(key => {
                    if (key.includes('_sampler_') && key.startsWith(entity.id)) {
                        const stillActive = result.audioTriggers.some((t, i) => `${entity.id}_sampler_${i}` === key);
                        if (!stillActive) triggerState.current[key] = false;
                    }
                });
            }
        });
    });

    return null;
};
