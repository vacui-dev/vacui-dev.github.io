
// Copyright (c) 2025 vacui.dev, all rights reserved

import { testRegistry } from '../TestRegistry';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';
import { NodeType, NodeGraph } from '../../types/nodes';
import { Entity } from '../../types/simulation';
import { signalEngine } from '../SignalEngine';
import { protocolRegistry } from '../ProtocolRegistry';

export const registerProtocolTests = () => {
    testRegistry.registerSuite({
        id: 'interaction_protocols',
        name: 'Protocol Interactions',
        tests: [
            {
                id: 'proto_damage',
                name: 'Protocol: Damageable (Attacker -> Target)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'proto_damage';
                    const name = 'Protocol: Damageable (Attacker -> Target)';
                    let logs = "Initializing Interaction Test...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'ProtocolTests.ts', relevantFunctions: ['evaluateInteraction'], description: 'Verifies Damage transfer.' }];

                    // Wait for registry
                    await protocolRegistry.ensureLoaded();
                    if (!protocolRegistry.get('damageable')) throw new Error("Damageable protocol not found in registry");

                    signalEngine.resetState();

                    // 1. Construct Target Entity (Has Health)
                    const targetGraph: NodeGraph = {
                        id: 'target_brain',
                        nodes: [
                            { id: 'in_dmg', type: NodeType.GRAPH_INPUT, x: 0, y: 0, inputs: [], outputs: [{ id: 'val', name: 'V', type: 'value' }], data: { name: 'damage_in' } },
                            { id: 'negate', type: NodeType.MATH_MULT, x: 100, y: 0, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: -1 } },
                            { id: 'health', type: NodeType.STAT, x: 200, y: 0, inputs: [{ id: 'modify', name: 'Mod', type: 'value' }], outputs: [{ id: 'val', name: 'HP', type: 'value' }], data: { initialValue: 100 } }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'in_dmg', sourceSocketId: 'val', targetNodeId: 'negate', targetSocketId: 'a' },
                            { id: 'e2', sourceNodeId: 'negate', sourceSocketId: 'out', targetNodeId: 'health', targetSocketId: 'modify' }
                        ]
                    };

                    const target: Entity = {
                        id: 'target_dummy',
                        name: 'Target Dummy',
                        type: 'Box',
                        position: { x: 5, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        args: [1],
                        mass: 1,
                        color: '#fff',
                        internalGraph: targetGraph,
                        exposedPorts: [
                            { id: 'damage_in', name: 'Damage Input', type: 'value', direction: 'input' }
                        ],
                        portMappings: [
                            { externalPortId: 'damage_in', internalNodeId: 'in_dmg', internalSocketId: 'val' }
                        ],
                        implements: ['damageable']
                    };

                    // 2. Construct Source Entity (Attacker)
                    const sourceGraph: NodeGraph = {
                        id: 'attacker_brain',
                        nodes: [
                            { id: 'base_str', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'val', name: 'V', type: 'value' }], data: { value: 5 } },
                            { id: 'multiplier', type: NodeType.MATH_MULT, x: 100, y: 0, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 2 } },
                            { id: 'out_dmg', type: NodeType.GRAPH_OUTPUT, x: 200, y: 0, inputs: [{ id: 'in', name: 'In', type: 'value' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'base_str', sourceSocketId: 'val', targetNodeId: 'multiplier', targetSocketId: 'a' },
                            { id: 'e2', sourceNodeId: 'multiplier', sourceSocketId: 'out', targetNodeId: 'out_dmg', targetSocketId: 'in' }
                        ]
                    };

                    const source: Entity = {
                        id: 'attacker_unit',
                        name: 'Attacker',
                        type: 'Sphere',
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        args: [1],
                        mass: 1,
                        color: '#f00',
                        internalGraph: sourceGraph,
                        exposedPorts: [
                            { id: 'damage_out', name: 'Damage Output', type: 'value', direction: 'output' }
                        ],
                        portMappings: [
                            { externalPortId: 'damage_out', internalNodeId: 'out_dmg', internalSocketId: 'in' }
                        ]
                    };

                    const mockAudio = { amplitude: 0, frequency: 0, pitchDelta: 0, effectiveBpm: 0, currentPhoneme: '', stats: {} };

                    logs += "Executing Interaction...\n";
                    const outcome = signalEngine.evaluateInteraction(source, target, 'damageable', 0, mockAudio);
                    
                    if (!outcome.success) {
                        logs += `Warnings: ${Array.from(signalEngine.warnedViolations).join(', ')}\n`;
                        throw new Error("Interaction Failed");
                    }
                    logs += `Interaction Success. Payload: ${outcome.result}\n`;

                    // 4. Verify State Change
                    const readerGraph: NodeGraph = {
                        id: 'read_target_health',
                        nodes: [
                            { id: 'health', type: NodeType.STAT, x: 0, y: 0, inputs: [], outputs: [{ id: 'val', name: 'HP', type: 'value' }], data: { initialValue: 100 } }, 
                            { id: 'polar', type: NodeType.CONVERT_POLAR, x: 100, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }], outputs: [{ id: 'pt', name: 'P', type: 'geometry' }], data: {} },
                            { id: 'out', type: NodeType.VISUAL_OUTPUT, x: 200, y: 0, inputs: [{ id: 'geometry', name: 'G', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'health', sourceSocketId: 'val', targetNodeId: 'polar', targetSocketId: 'radius' },
                            { id: 'e2', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'out', targetSocketId: 'geometry' }
                        ]
                    };

                    const result = signalEngine.evaluateGraph(readerGraph, 0, mockAudio, target.id); 
                    logs += `Target Health: ${result.x}\n`;

                    if (result.x === 90) {
                        logs += "✅ PASS: Health reduced correctly.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } else {
                        logs += `❌ FAIL: Expected 90, got ${result.x}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            },
            {
                id: 'proto_observable',
                name: 'Protocol: Observable (Reading State)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'proto_observable';
                    const name = 'Protocol: Observable';
                    let logs = "Testing Read-Only Interaction...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'ProtocolTests.ts', relevantFunctions: ['evaluateInteraction'], description: 'Reads value via observable.' }];

                    await protocolRegistry.ensureLoaded();
                    
                    // Source: A 'Scanner'
                    const source: Entity = {
                        id: 'scanner', name: 'Scanner', type: 'Box', position: {x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, args:[1], mass:1, color:'#fff',
                        internalGraph: {
                            id: 'obj_graph',
                            nodes: [{id:'val', type:NodeType.VALUE, x:0,y:0,inputs:[],outputs:[{id:'v',name:'V',type:'value'}],data:{value:42}}, {id:'out', type:NodeType.GRAPH_OUTPUT, x:100,y:0,inputs:[{id:'in',name:'I',type:'value'}],outputs:[],data:{}}],
                            edges: [{id:'e1', sourceNodeId:'val', sourceSocketId:'v', targetNodeId:'out', targetSocketId:'in'}]
                        },
                        exposedPorts: [{id:'val_out', name:'Val', type:'value', direction:'output'}],
                        portMappings: [{externalPortId:'val_out', internalNodeId:'out', internalSocketId:'in'}]
                    };

                    // Target: The Observer
                    const target: Entity = {
                        id: 'observer', name: 'Observer', type: 'Sphere', position: {x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, args:[1], mass:1, color:'#fff',
                        internalGraph: {
                            id: 'obs_graph',
                            nodes: [
                                {id:'in', type:NodeType.GRAPH_INPUT, x:0,y:0,inputs:[],outputs:[{id:'v',name:'V',type:'value'}],data:{name:'val_in'}},
                                {id:'mem', type:NodeType.STAT, x:100,y:0,inputs:[{id:'set',name:'S',type:'value'}],outputs:[],data:{initialValue:0}}
                            ],
                            edges: [{id:'e1', sourceNodeId:'in', sourceSocketId:'v', targetNodeId:'mem', targetSocketId:'set'}]
                        },
                        exposedPorts: [{id:'val_in', name:'Val In', type:'value', direction:'input'}],
                        portMappings: [{externalPortId:'val_in', internalNodeId:'in', internalSocketId:'v'}],
                        implements: ['telemetry_push']
                    };
                    
                    protocolRegistry.register({
                        id: 'telemetry_push', name: 'Telemetry', description: 'Push Data',
                        inputs: [{id:'val_in', name:'In', type:'value', direction:'input'}],
                        outputs: [{id:'val_out', name:'Out', type:'value', direction:'output'}]
                    });
                    
                    const mockAudio = { amplitude: 0, frequency: 0, pitchDelta: 0, effectiveBpm: 0, currentPhoneme: '', stats: {} };
                    const outcome = signalEngine.evaluateInteraction(source, target, 'telemetry_push', 0, mockAudio);

                    if (outcome.success && outcome.result === 42) {
                        logs += "✅ PASS: Value 42 pushed to observer.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } else {
                        logs += `❌ FAIL: Result ${outcome.result}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            }
        ]
    });
};
