
// Copyright (c) 2025 vacui.dev, all rights reserved

import { testRegistry } from '../TestRegistry';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';
import { NodeType, NodeGraph } from '../../types/nodes';
import { Entity } from '../../types/simulation';
import { signalEngine } from '../SignalEngine';
import { collisionSystem } from '../CollisionSystem';
import { protocolRegistry } from '../ProtocolRegistry';

export const registerTriggerTests = () => {
    testRegistry.registerSuite({
        id: 'trigger_mechanics',
        name: 'Trigger & Collision Mechanics',
        tests: [
            {
                id: 'direct_reference',
                name: 'Trigger: Direct Reference (Psychic)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'direct_reference';
                    const name = 'Trigger: Direct Reference (Psychic)';
                    let logs = "Testing Direct Entity-to-Entity Interaction...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'TriggerTests.ts', relevantFunctions: ['evaluateInteraction'], description: 'Simulates Psychic Damage.' }];

                    // Check if protocol is available (loaded by OS bootstrap)
                    if (!protocolRegistry.get('damageable')) {
                        throw new Error("Damageable protocol not found in registry. Ensure 'files/os/protocols/damageable.json' is loaded.");
                    }

                    signalEngine.resetState();

                    // 1. Define Target (Brain)
                    const targetGraph: NodeGraph = {
                        id: 'brain',
                        nodes: [
                            { id: 'in', type: NodeType.GRAPH_INPUT, x: 0, y: 0, inputs: [], outputs: [{ id: 'v', name: 'V', type: 'value' }], data: { name: 'damage_in' } },
                            { id: 'neg', type: NodeType.MATH_MULT, x: 100, y: 0, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: -1 } },
                            { id: 'health', type: NodeType.STAT, x: 200, y: 0, inputs: [{ id: 'modify', name: 'M', type: 'value' }], outputs: [{ id: 'v', name: 'V', type: 'value' }], data: { initialValue: 100 } }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'in', sourceSocketId: 'v', targetNodeId: 'neg', targetSocketId: 'a' },
                            { id: 'e2', sourceNodeId: 'neg', sourceSocketId: 'out', targetNodeId: 'health', targetSocketId: 'modify' }
                        ]
                    };

                    const target: Entity = {
                        id: 'victim', name: 'Victim', type: 'Box', position: {x:10,y:0,z:0}, rotation:{x:0,y:0,z:0}, args:[1], mass:1, color:'#fff',
                        internalGraph: targetGraph,
                        exposedPorts: [{ id: 'damage_in', name: 'Pain', type: 'value', direction: 'input' }],
                        portMappings: [{ externalPortId: 'damage_in', internalNodeId: 'in', internalSocketId: 'v' }],
                        implements: ['damageable']
                    };

                    // 2. Define Source (Psychic)
                    const sourceGraph: NodeGraph = {
                        id: 'psychic_mind',
                        nodes: [
                            { id: 'val', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'v', name: 'V', type: 'value' }], data: { value: 20 } },
                            { id: 'out', type: NodeType.GRAPH_OUTPUT, x: 100, y: 0, inputs: [{ id: 'in', name: 'I', type: 'value' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'val', sourceSocketId: 'v', targetNodeId: 'out', targetSocketId: 'in' }
                        ]
                    };

                    const source: Entity = {
                        id: 'psychic', name: 'Psychic', type: 'Sphere', position: {x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, args:[1], mass:1, color:'#f0f',
                        internalGraph: sourceGraph,
                        exposedPorts: [{ id: 'mind_blast', name: 'Blast', type: 'value', direction: 'output' }],
                        portMappings: [{ externalPortId: 'mind_blast', internalNodeId: 'out', internalSocketId: 'in' }]
                    };

                    // 3. Execute Direct Interaction
                    const audioData = { amplitude: 0, frequency: 0, pitchDelta: 0, effectiveBpm: 0, currentPhoneme: '', stats: {} };
                    const result = signalEngine.evaluateInteraction(source, target, 'damageable', 0, audioData);

                    // 4. Verify State
                    const readGraph: NodeGraph = {
                        id: 'read_health', 
                        nodes: [
                            { id: 'health', type: NodeType.STAT, x: 0, y: 0, inputs: [], outputs: [{ id: 'val', name: 'V', type: 'value' }], data: { initialValue: 100 } },
                            { id: 'pol', type: NodeType.CONVERT_POLAR, x: 100, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }], outputs: [{ id: 'pt', name: 'P', type: 'geometry' }], data: {} },
                            { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 200, y: 0, inputs: [{ id: 'geometry', name: 'G', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'health', sourceSocketId: 'val', targetNodeId: 'pol', targetSocketId: 'radius' },
                            { id: 'e2', sourceNodeId: 'pol', sourceSocketId: 'pt', targetNodeId: 'vis', targetSocketId: 'geometry' }
                        ]
                    };
                    
                    const hVec = signalEngine.evaluateGraph(readGraph, 0, audioData, target.id);
                    logs += `Target Health: ${hVec.x}\n`;

                    if (result.success && hVec.x === 80) {
                        logs += "✅ PASS: Psychic Damage Applied (100 - 20 = 80).";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } else {
                        logs += `❌ FAIL: Health ${hVec.x} (Expected 80), Success: ${result.success}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            },
            {
                id: 'geometric_trigger',
                name: 'Trigger: Geometric Overlap (Fireball)',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'geometric_trigger';
                    const name = 'Trigger: Geometric Overlap (Fireball)';
                    let logs = "Testing Spatial Trigger...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'TriggerTests.ts', relevantFunctions: ['collisionSystem.step'], description: 'Verifies Octree overlap triggering.' }];

                    signalEngine.resetState();

                    // ENTITIES
                    // 1. Player (Receiver)
                    const targetGraph: NodeGraph = {
                        id: 'player_body',
                        nodes: [
                            { id: 'in', type: NodeType.GRAPH_INPUT, x: 0, y: 0, inputs: [], outputs: [{ id: 'v', name: 'V', type: 'value' }], data: { name: 'damage_in' } },
                            { id: 'neg', type: NodeType.MATH_MULT, x: 100, y: 0, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: -1 } },
                            { id: 'health', type: NodeType.STAT, x: 200, y: 0, inputs: [{ id: 'modify', name: 'M', type: 'value' }], outputs: [{ id: 'v', name: 'V', type: 'value' }], data: { initialValue: 100 } }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'in', sourceSocketId: 'v', targetNodeId: 'neg', targetSocketId: 'a' },
                            { id: 'e2', sourceNodeId: 'neg', sourceSocketId: 'out', targetNodeId: 'health', targetSocketId: 'modify' }
                        ]
                    };

                    const target: Entity = {
                        id: 'player', name: 'Player', type: 'Box', position: {x:10,y:0,z:0}, rotation:{x:0,y:0,z:0}, args:[1], mass:1, color:'#fff',
                        internalGraph: targetGraph,
                        exposedPorts: [{ id: 'damage_in', name: 'Pain', type: 'value', direction: 'input' }],
                        portMappings: [{ externalPortId: 'damage_in', internalNodeId: 'in', internalSocketId: 'v' }],
                        implements: ['damageable']
                    };

                    // 2. Fireball (Trigger)
                    const sourceGraph: NodeGraph = {
                        id: 'fireball_core',
                        nodes: [
                            { id: 'val', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'v', name: 'V', type: 'value' }], data: { value: 5 } },
                            { id: 'out', type: NodeType.GRAPH_OUTPUT, x: 100, y: 0, inputs: [{ id: 'in', name: 'I', type: 'value' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'val', sourceSocketId: 'v', targetNodeId: 'out', targetSocketId: 'in' }
                        ]
                    };

                    const source: Entity = {
                        id: 'fireball', name: 'Fireball', type: 'Sphere', position: {x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, args:[1], mass:1, color:'#f00',
                        internalGraph: sourceGraph,
                        exposedPorts: [{ id: 'dmg_out', name: 'Burn', type: 'value', direction: 'output' }],
                        portMappings: [{ externalPortId: 'dmg_out', internalNodeId: 'out', internalSocketId: 'in' }],
                        triggerParams: {
                            active: true,
                            radius: 2.0,
                            protocolId: 'damageable'
                        }
                    };

                    const entities = [target, source];

                    // STEP 1: Far Away
                    logs += "Step 1: Fireball at 0, Player at 10. (Dist 10 > 2)\n";
                    collisionSystem.step(entities, 0);
                    
                    const checkHealth = () => {
                        const g = { id: 'r', nodes: [{id:'health',type:NodeType.STAT,x:0,y:0,inputs:[],outputs:[{id:'v',name:'V',type:'value'}],data:{initialValue:100}}, {id:'p',type:NodeType.CONVERT_POLAR,x:100,y:0,inputs:[{id:'radius',name:'R',type:'value'}],outputs:[{id:'pt',name:'P',type:'geometry'}],data:{}}, {id:'o',type:NodeType.VISUAL_OUTPUT,x:200,y:0,inputs:[{id:'geometry',name:'G',type:'geometry'}],outputs:[],data:{}}], edges:[{id:'e1',sourceNodeId:'health',sourceSocketId:'v',targetNodeId:'p',targetSocketId:'radius'},{id:'e2',sourceNodeId:'p',sourceSocketId:'pt',targetNodeId:'o',targetSocketId:'geometry'}] } as NodeGraph;
                        return signalEngine.evaluateGraph(g, 0, {amplitude:0,frequency:0,pitchDelta:0,effectiveBpm:0,currentPhoneme:'',stats:{}}, target.id).x;
                    };

                    const h1 = checkHealth();
                    logs += `Health: ${h1}\n`;
                    if (h1 !== 100) throw new Error("Health changed prematurely");

                    // STEP 2: Move Close
                    logs += "Step 2: Moving Fireball to 9. (Dist 1 < 2)\n";
                    source.position.x = 9;
                    collisionSystem.step(entities, 1);

                    const h2 = checkHealth();
                    logs += `Health: ${h2}\n`;

                    if (h2 === 95) {
                        logs += "✅ PASS: Fireball caused damage on overlap.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } else {
                        logs += `❌ FAIL: Expected 95, got ${h2}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            }
        ]
    });
};
