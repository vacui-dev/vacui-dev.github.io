
// Copyright (c) 2025 vacui.dev, all rights reserved

import { testRegistry } from '../TestRegistry';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';
import { NodeType, NodeGraph } from '../../types/nodes';
import { signalEngine } from '../SignalEngine';

export const registerRPGTests = () => {
    testRegistry.registerSuite({
        id: 'rpg_mechanics',
        name: 'RPG Mechanics',
        tests: [
            {
                id: 'stat_persistence',
                name: 'Stat: Persistence and Modification',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'stat_persistence';
                    const name = 'Stat: Persistence and Modification';
                    let logs = "Initializing Stat Test...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'RPGTests.ts', relevantFunctions: ['evaluateLogic'], description: 'Verifies STAT node persistence.' }];

                    const entityId = 'player_1';
                    
                    // Reset engine state
                    signalEngine.resetState();

                    // Graph: Input(Damage) -> Math.Sub -> Stat(Health).
                    // We'll manually simulate the input signal being active then inactive.
                    
                    const graph: NodeGraph = {
                        id: 'health_system',
                        nodes: [
                            { id: 'damage_val', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'val', name: 'V', type: 'value' }], data: { value: -10 } },
                            { id: 'health', type: NodeType.STAT, x: 100, y: 0, inputs: [{ id: 'modify', name: 'Mod', type: 'value' }], outputs: [{ id: 'val', name: 'HP', type: 'value' }], data: { initialValue: 100 } }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'damage_val', sourceSocketId: 'val', targetNodeId: 'health', targetSocketId: 'modify' }
                        ]
                    };

                    const mockAudio = { amplitude: 0, frequency: 0, pitchDelta: 0, effectiveBpm: 0, currentPhoneme: '', stats: {} };

                    // Frame 1: Damage Applied (-10)
                    logs += "Frame 1: Applying -10 Damage...\n";
                    signalEngine.evaluateLogic(graph, 0, mockAudio, entityId);
                    
                    // Check internal state (We can't easily read return value of logic graph directly unless we inspect state map or use a VisualOutput)
                    // HACK: Evaluate just the STAT node or inspect the engine's private map? 
                    // Better: Use `evaluateGraph` with a Visual Output connected to Health to "read" it.
                    
                    const readGraph: NodeGraph = {
                        id: 'read_health',
                        nodes: [
                            { id: 'health', type: NodeType.STAT, x: 0, y: 0, inputs: [], outputs: [{ id: 'val', name: 'HP', type: 'value' }], data: { initialValue: 100 } }, // ID matches previous graph so it shares state
                            { id: 'polar', type: NodeType.CONVERT_POLAR, x: 100, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }], outputs: [{ id: 'pt', name: 'P', type: 'geometry' }], data: {} },
                            { id: 'out', type: NodeType.VISUAL_OUTPUT, x: 200, y: 0, inputs: [{ id: 'geometry', name: 'G', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'health', sourceSocketId: 'val', targetNodeId: 'polar', targetSocketId: 'radius' },
                            { id: 'e2', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'out', targetSocketId: 'geometry' }
                        ]
                    };

                    const res1 = signalEngine.evaluateGraph(readGraph, 0, mockAudio, entityId);
                    logs += `Health after Frame 1: ${res1.x}\n`; // Should be 90

                    // Frame 2: Apply Damage Again
                    logs += "Frame 2: Applying -10 Damage...\n";
                    signalEngine.evaluateLogic(graph, 1, mockAudio, entityId);
                    
                    const res2 = signalEngine.evaluateGraph(readGraph, 1, mockAudio, entityId);
                    logs += `Health after Frame 2: ${res2.x}\n`; // Should be 80

                    if (res1.x === 90 && res2.x === 80) {
                        logs += "✅ PASS: Health persisted and decremented correctly.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } else {
                        logs += `❌ FAIL: Expected 90 -> 80.`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            }
        ]
    });
};
