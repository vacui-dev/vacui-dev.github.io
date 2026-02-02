
// Copyright (c) 2025 vacui.dev, all rights reserved

import { AudioData } from '../types/audio';
import { NodeGraph, NodeType, GeometrySignal } from '../types/nodes';
import { Vector3, Entity, MembraneMapping } from '../types/simulation';
import { runtimeIntegration } from './RuntimeIntegration';
import { SHAPE_FUNCTIONS, PROJECTION_FUNCTIONS } from './node/NodeMath';
import { midiAudio } from './MidiAudioEngine';
import { protocolRegistry } from './ProtocolRegistry';

export interface AudioTrigger {
    instrument: string;
    index: number;
    pitch: number;
    gain: number;
}

export interface LogicResult {
    impulse: Vector3 | null;
    isLocal: boolean;
    audioTriggers: AudioTrigger[];
    properties?: Record<string, any>;
}

// Context for recursion
interface ExecutionScope {
    graph: NodeGraph;
    inputs: Record<string, any>;
    entityId: string;
}

export class SignalEngine {
    
    private nodeState: Map<string, any> = new Map();
    public warnedViolations: Set<string> = new Set();

    public resetState() {
        this.nodeState.clear();
        this.warnedViolations.clear();
    }

    // --- PUBLIC STATE API ---
    
    /**
     * Retrieve the persistent value of a stateful node (STAT, INVENTORY).
     * Key format: `${entityId}:${nodeId}`
     */
    public getNodeState(key: string): any {
        return this.nodeState.get(key);
    }

    /**
     * Forcefully override a node's state. Useful for debugging or God Mode tools.
     */
    public setNodeState(key: string, value: any) {
        this.nodeState.set(key, value);
    }

    public getAllState(): Record<string, any> {
        return Object.fromEntries(this.nodeState);
    }

    /**
     * Dynamic Interaction Evaluation
     * Wires Source outputs to Target inputs based on a Protocol, then evaluates the Target.
     * Performs "Type Checking" by validating schemas against the Protocol definition.
     */
    public evaluateInteraction(
        sourceEntity: Entity,
        targetEntity: Entity,
        protocolId: string,
        time: number,
        audioData: AudioData
    ): { success: boolean, result?: any } {
        
        const protocol = protocolRegistry.get(protocolId);
        if (!protocol) {
            // If protocol not loaded, we can't validate. Fail safe.
            return { success: false };
        }

        // 1. Type Check: Does Target implement Protocol?
        if (!targetEntity.implements || !targetEntity.implements.includes(protocolId)) {
            return { success: false };
        }

        // 2. Validate Target Structure
        // Fallback to logicParams.nodeGraph if internalGraph is missing (Legacy Support)
        const targetGraph = targetEntity.internalGraph || targetEntity.logicParams?.nodeGraph;
        
        if (!targetGraph || !targetEntity.portMappings || !targetEntity.exposedPorts) {
            this.logOnce(`invalid_struct_${targetEntity.id}`, `[SignalEngine] Target '${targetEntity.id}' claims protocol '${protocolId}' but lacks internal structure.`);
            return { success: false };
        }

        // 3. Interface Compliance Check (Runtime Type Check)
        // Ensure target exposes all required inputs defined in the protocol
        for (const reqInput of protocol.inputs) {
            const hasPort = targetEntity.exposedPorts.find(p => p.id === reqInput.id && p.type === reqInput.type && p.direction === 'input');
            if (!hasPort) {
                this.logOnce(`violation_${targetEntity.id}_${protocolId}`, `[SignalEngine] Type Error: Target '${targetEntity.id}' violates protocol '${protocolId}'. Missing input '${reqInput.id}'.`);
                return { success: false };
            }
        }

        // 4. Resolve Connection
        const primaryInputDef = protocol.inputs[0];
        if (!primaryInputDef) return { success: false };

        const targetMapping = targetEntity.portMappings.find(m => m.externalPortId === primaryInputDef.id);
        if (!targetMapping) return { success: false };

        // 5. Resolve Source Output
        // Source doesn't strictly need to implement the protocol, but must provide a compatible output.
        const sourceGraph = sourceEntity.internalGraph || sourceEntity.logicParams?.nodeGraph;
        if (!sourceGraph || !sourceEntity.exposedPorts || !sourceEntity.portMappings) {
             return { success: false };
        }

        const sourcePort = sourceEntity.exposedPorts.find(p => p.direction === 'output' && p.type === primaryInputDef.type);
        if (!sourcePort) {
            return { success: false };
        }

        const sourceMapping = sourceEntity.portMappings.find(m => m.externalPortId === sourcePort.id);
        if (!sourceMapping) return { success: false };

        // 6. Execute Transfer
        const sourceScope: ExecutionScope = { 
            graph: sourceGraph, 
            inputs: {}, 
            entityId: sourceEntity.id 
        };
        
        const payload = this.evaluateNode(sourceScope, sourceMapping.internalNodeId, time, audioData);
        
        // Inject into Target
        const targetScope: ExecutionScope = { 
            graph: targetGraph, 
            inputs: {}, 
            entityId: targetEntity.id 
        };

        const targetInternalNode = targetGraph.nodes.find(n => n.id === targetMapping.internalNodeId);
        
        if (targetInternalNode && targetInternalNode.type === NodeType.GRAPH_INPUT) {
            targetScope.inputs[targetInternalNode.data.name] = payload;
            
            // Update State
            const stateNodes = targetGraph.nodes.filter(n => n.type === NodeType.STAT || n.type === NodeType.INVENTORY);
            for (const node of stateNodes) {
                this.evaluateNode(targetScope, node.id, time, audioData);
            }
            
            return { success: true, result: payload };
        }

        return { success: false };
    }

    private logOnce(key: string, message: string) {
        if (!this.warnedViolations.has(key)) {
            console.warn(message);
            this.warnedViolations.add(key);
        }
    }

    public evaluateGraph(
        graph: NodeGraph, 
        time: number, 
        audioData: AudioData, 
        entityId: string,
        tracer?: (msg: string) => void
    ): Vector3 {
        const scope: ExecutionScope = { graph, inputs: {}, entityId };
        const outputNode = graph.nodes.find(n => n.type === NodeType.VISUAL_OUTPUT);
        if (outputNode) {
            const geoSignal = this.resolveInput(scope, outputNode.id, 'geometry', time, audioData, tracer);
            return this.mapSignalToVector(geoSignal);
        }
        return { x: 0, y: 0, z: 0 };
    }

    public evaluateProperties(
        graph: NodeGraph, 
        time: number, 
        audioData: AudioData, 
        entityId: string
    ): Record<string, any> {
        const scope: ExecutionScope = { graph, inputs: {}, entityId };
        const props: Record<string, any> = {};
        const propNodes = graph.nodes.filter(n => n.type === NodeType.PROPERTY_OUTPUT);
        
        for (const node of propNodes) {
            const val = this.resolveInput(scope, node.id, 'value', time, audioData);
            const key = node.data.property || 'misc';
            props[key] = val;
        }
        return props;
    }

    public evaluateLogic(graph: NodeGraph, time: number, audioData: AudioData, entityId: string = 'global'): LogicResult {
        const scope: ExecutionScope = { graph, inputs: {}, entityId };
        
        const impulseNodes = graph.nodes.filter(n => n.type === NodeType.IMPULSE);
        let finalImpulse: Vector3 | null = null;
        let isLocal = false;

        for (const node of impulseNodes) {
            const trigger = this.resolveInput(scope, node.id, 'imp-trigger', time, audioData);
            if (trigger && Number(trigger) > 0.5) {
                const force = node.data.force || [0, 1, 0];
                if (!finalImpulse) finalImpulse = { x: 0, y: 0, z: 0 };
                finalImpulse.x += force[0];
                finalImpulse.y += force[1];
                finalImpulse.z += force[2];
                if (node.data.local) isLocal = true;
            }
        }

        const samplerNodes = graph.nodes.filter(n => n.type === NodeType.SAMPLER);
        const audioTriggers: AudioTrigger[] = [];

        for (const node of samplerNodes) {
            const trigger = this.resolveInput(scope, node.id, 'trigger', time, audioData);
            if (trigger > 0.5) {
                audioTriggers.push({
                    instrument: node.data.instrument || 'bd',
                    index: node.data.index ?? 0,
                    pitch: Number(this.resolveInput(scope, node.id, 'pitch', time, audioData)) || node.data.pitch || 1.0,
                    gain: Number(this.resolveInput(scope, node.id, 'gain', time, audioData)) || node.data.gain || 1.0
                });
            }
        }

        const stateNodes = graph.nodes.filter(n => n.type === NodeType.STAT || n.type === NodeType.INVENTORY);
        for (const node of stateNodes) {
            this.evaluateNode(scope, node.id, time, audioData);
        }

        return { impulse: finalImpulse, isLocal, audioTriggers };
    }

    public resolveInput(
        scope: ExecutionScope, 
        nodeId: string, 
        socketIdOrName: string, 
        time: number, 
        audioData: AudioData,
        tracer?: (msg: string) => void
    ): any {
        const node = scope.graph.nodes.find(n => n.id === nodeId);
        if (!node) return 0;

        const socket = node.inputs.find(i => i.id === socketIdOrName || i.id.includes(socketIdOrName) || i.name.toLowerCase().includes(socketIdOrName.toLowerCase()));
        if (!socket) return 0;

        const edge = scope.graph.edges.find(e => e.targetNodeId === nodeId && e.targetSocketId === socket.id);
        if (!edge) {
            if (socket.name === 'B' && node.data.value !== undefined) return node.data.value;
            return 0;
        }

        const rawValue = this.evaluateNode(scope, edge.sourceNodeId, time, audioData, tracer);

        if (rawValue && typeof rawValue === 'object') {
            const socketId = edge.sourceSocketId;
            if (socketId in rawValue) {
                return rawValue[socketId];
            }
            const aliases: Record<string, string> = { 'freq': 'frequency', 'amp': 'amplitude' };
            for(const key in aliases) {
                if (socketId.toLowerCase().includes(key) && aliases[key] in rawValue) {
                    return rawValue[aliases[key]];
                }
            }
        }

        return rawValue;
    }

    private evaluateNode(
        scope: ExecutionScope, 
        nodeId: string, 
        time: number, 
        audioData: AudioData,
        tracer?: (msg: string) => void
    ): any {
        const node = scope.graph.nodes.find(n => n.id === nodeId);
        if (!node) return 0;

        if (node.type in SHAPE_FUNCTIONS) {
            const theta = this.resolveInput(scope, nodeId, 'theta', time, audioData, tracer) || (time * 0.5);
            return SHAPE_FUNCTIONS[node.type]!(Number(theta));
        }

        if (node.type in PROJECTION_FUNCTIONS) {
            const pt = this.resolveInput(scope, nodeId, 'point', time, audioData, tracer);
            if (!pt) return { radius: 0, angle: 0, zoom: 1, lineWidth: 1, x: 0, y: 0, z: 0 };
            return PROJECTION_FUNCTIONS[node.type]!(pt, time);
        }

        switch (node.type) {
            case NodeType.TIME: return time;
            case NodeType.VALUE: return node.data.value || 0;
            
            case NodeType.AUDIO_ANALYZE: {
                let sourceData = audioData;
                if (node.data.trackIndex !== undefined) {
                    sourceData = midiAudio.getTrackAudioData(node.data.trackIndex);
                }
                return { 
                    amplitude: sourceData.amplitude, 
                    frequency: sourceData.frequency,
                    amp: sourceData.amplitude,
                    freq: sourceData.frequency
                };
            }
            
            case NodeType.INPUT_RECEIVER:
                return runtimeIntegration.getInputState(node.data.inputId || '') || 0;

            case NodeType.STAT: {
                const stateKey = `${scope.entityId}:${node.id}`;
                let currentVal = this.nodeState.get(stateKey);
                if (currentVal === undefined) {
                    currentVal = node.data.initialValue ?? 100;
                    this.nodeState.set(stateKey, currentVal);
                }
                
                // Prioritize 'set' input (overwrite value) if edge exists
                const setEdge = scope.graph.edges.find(e => e.targetNodeId === nodeId && (e.targetSocketId === 'set' || e.targetSocketId.includes('set')));
                if (setEdge) {
                     const setVal = this.resolveInput(scope, nodeId, 'set', time, audioData, tracer);
                     currentVal = Number(setVal);
                }

                // Then apply modifier
                const modify = Number(this.resolveInput(scope, nodeId, 'modify', time, audioData, tracer)) || 0;
                if (modify !== 0) {
                    currentVal += modify;
                }
                
                if (node.data.min !== undefined) currentVal = Math.max(node.data.min, currentVal);
                if (node.data.max !== undefined) currentVal = Math.min(node.data.max, currentVal);
                this.nodeState.set(stateKey, currentVal);
                return currentVal;
            }

            case NodeType.INVENTORY: {
                const stateKey = `${scope.entityId}:${node.id}`;
                let items: string[] = this.nodeState.get(stateKey);
                if (!items) {
                    items = node.data.initialItems || [];
                    this.nodeState.set(stateKey, items);
                }
                return items;
            }

            case NodeType.SUB_GRAPH: {
                const subGraph = node.data.graph as NodeGraph;
                if (!subGraph) return 0;
                const subInputs: Record<string, any> = {};
                for (const input of node.inputs) {
                    subInputs[input.name] = this.resolveInput(scope, nodeId, input.id, time, audioData, tracer);
                }
                const subScope: ExecutionScope = { graph: subGraph, inputs: subInputs, entityId: scope.entityId };
                const outputNode = subGraph.nodes.find(n => n.type === NodeType.GRAPH_OUTPUT);
                if (!outputNode) return 0;
                return this.resolveInput(subScope, outputNode.id, 'in', time, audioData, tracer);
            }

            case NodeType.GRAPH_INPUT: {
                const name = node.data.name; 
                return scope.inputs[name] || 0;
            }
            
            case NodeType.GRAPH_OUTPUT: {
                return this.resolveInput(scope, nodeId, 'in', time, audioData, tracer);
            }

            case NodeType.MATH_MULT: {
                const a = Number(this.resolveInput(scope, nodeId, 'a', time, audioData, tracer)) || 0;
                let b = this.resolveInput(scope, nodeId, 'b', time, audioData, tracer);
                if (b === 0 && node.data.value !== undefined) b = node.data.value; 
                return a * Number(b);
            }
            
            case NodeType.MATH_ADD: {
                const a = Number(this.resolveInput(scope, nodeId, 'a', time, audioData, tracer)) || 0;
                let b = this.resolveInput(scope, nodeId, 'b', time, audioData, tracer);
                if (b === 0 && node.data.value !== undefined) b = node.data.value; 
                return a + Number(b);
            }

            case NodeType.MATH_SUB: {
                const a = Number(this.resolveInput(scope, nodeId, 'a', time, audioData, tracer)) || 0;
                let b = this.resolveInput(scope, nodeId, 'b', time, audioData, tracer);
                if (b === 0 && node.data.value !== undefined) b = node.data.value; 
                return a - Number(b);
            }

            case NodeType.MATH_MOD: {
                const a = Number(this.resolveInput(scope, nodeId, 'a', time, audioData, tracer)) || 0;
                let b = this.resolveInput(scope, nodeId, 'b', time, audioData, tracer);
                if (b === 0 && node.data.value !== undefined) b = node.data.value; 
                return b === 0 ? 0 : a % Number(b);
            }

            case NodeType.MATH_SIN:
                return Math.sin(Number(this.resolveInput(scope, nodeId, 'in', time, audioData, tracer)) || 0);

            case NodeType.MATH_MAP: {
                const val = Number(this.resolveInput(scope, nodeId, 'in', time, audioData, tracer));
                const inMin = node.data.inMin ?? 0;
                const inMax = node.data.inMax ?? 1;
                const outMin = node.data.outMin ?? 0;
                const outMax = node.data.outMax ?? 1;
                if (Math.abs(inMax - inMin) < 0.00001) return outMin;
                const normalized = (val - inMin) / (inMax - inMin);
                return outMin + normalized * (outMax - outMin);
            }

            case NodeType.MATH_CLAMP: {
                const val = Number(this.resolveInput(scope, nodeId, 'in', time, audioData, tracer));
                const min = node.data.min ?? 0;
                const max = node.data.max ?? 1;
                return Math.max(min, Math.min(max, val));
            }

            case NodeType.LOGIC_AND: {
                const a = this.resolveInput(scope, nodeId, 'a', time, audioData, tracer);
                const b = this.resolveInput(scope, nodeId, 'b', time, audioData, tracer);
                return (a > 0.5 && b > 0.5) ? 1.0 : 0.0;
            }
            case NodeType.LOGIC_OR: {
                const a = this.resolveInput(scope, nodeId, 'a', time, audioData, tracer);
                const b = this.resolveInput(scope, nodeId, 'b', time, audioData, tracer);
                return (a > 0.5 || b > 0.5) ? 1.0 : 0.0;
            }
            case NodeType.LOGIC_NOT: {
                const a = this.resolveInput(scope, nodeId, 'in', time, audioData, tracer);
                return (a > 0.5) ? 0.0 : 1.0;
            }
            case NodeType.LOGIC_GREATER: {
                const a = Number(this.resolveInput(scope, nodeId, 'a', time, audioData, tracer));
                const b = Number(this.resolveInput(scope, nodeId, 'b', time, audioData, tracer));
                return (a > b) ? 1.0 : 0.0;
            }
            case NodeType.THRESHOLD: {
                const input = Number(this.resolveInput(scope, nodeId, 'in', time, audioData, tracer));
                const level = node.data.level || 0.5;
                return input > level ? 1.0 : 0.0;
            }

            case NodeType.STEP_SEQUENCER: {
                const bpm = node.data.bpm || 120;
                const pattern = node.data.pattern || "x...x...x...x...";
                const secondsPerStep = (60 / bpm) / 4;
                const totalSteps = Math.floor(time / secondsPerStep);
                const currentStep = totalSteps % pattern.length;
                const char = pattern[currentStep];
                return (char && char !== '.' && char !== ' ') ? 1.0 : 0.0;
            }

            case NodeType.CONVERT_POLAR: {
                const r = Number(this.resolveInput(scope, nodeId, 'radius', time, audioData, tracer)) || 1;
                const a = Number(this.resolveInput(scope, nodeId, 'angle', time, audioData, tracer)) || 0;
                return { radius: r, angle: a, zoom: 1, lineWidth: 1 } as GeometrySignal;
            }

            default: return 0;
        }
    }

    private mapSignalToVector(geoSignal: any): Vector3 {
        if (geoSignal && typeof geoSignal === 'object') {
            if ('x' in geoSignal && typeof geoSignal.x === 'number') {
                return {
                    x: geoSignal.x || 0,
                    y: geoSignal.y || 0,
                    z: geoSignal.z || 0
                };
            }
            if ('radius' in geoSignal && 'angle' in geoSignal) {
                const r = geoSignal.radius * (geoSignal.zoom || 1);
                return {
                    x: Math.cos(geoSignal.angle) * r,
                    y: Math.sin(geoSignal.angle) * r,
                    z: 0
                };
            }
        }
        return { x: 0, y: 0, z: 0 };
    }
}

export const signalEngine = new SignalEngine();
