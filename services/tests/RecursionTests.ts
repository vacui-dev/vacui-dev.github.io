
// Copyright (c) 2025 vacui.dev, all rights reserved

import { testRegistry } from '../TestRegistry';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';
import { NodeType, NodeGraph } from '../../types/nodes';
import { signalEngine } from '../SignalEngine';

export const registerRecursionTests = () => {
    testRegistry.registerSuite({
        id: 'engine_recursion',
        name: 'Recursive Graph Evaluation',
        tests: [
            {
                id: 'recursion_math_simple',
                name: 'Recursion: Simple Math Subgraph',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'recursion_math_simple';
                    const name = 'Recursion: Simple Math Subgraph';
                    let logs = "Initializing Recursion Test...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'RecursionTests.ts', relevantFunctions: ['evaluateGraph'], description: 'Verifies nested graph evaluation.' }];

                    // 1. Define Subgraph (Input + 5)
                    const subGraph: NodeGraph = {
                        id: 'sub_add_5',
                        nodes: [
                            { id: 'in_a', type: NodeType.GRAPH_INPUT, x: 0, y: 0, inputs: [], outputs: [{ id: 'val', name: 'Val', type: 'value' }], data: { name: 'A' } },
                            { id: 'const_5', type: NodeType.VALUE, x: 0, y: 100, inputs: [], outputs: [{ id: 'val', name: 'Val', type: 'value' }], data: { value: 5 } },
                            { id: 'add', type: NodeType.MATH_ADD, x: 100, y: 50, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: {} },
                            { id: 'out', type: NodeType.GRAPH_OUTPUT, x: 200, y: 50, inputs: [{ id: 'in', name: 'In', type: 'value' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'in_a', sourceSocketId: 'val', targetNodeId: 'add', targetSocketId: 'a' },
                            { id: 'e2', sourceNodeId: 'const_5', sourceSocketId: 'val', targetNodeId: 'add', targetSocketId: 'b' },
                            { id: 'e3', sourceNodeId: 'add', sourceSocketId: 'out', targetNodeId: 'out', targetSocketId: 'in' }
                        ]
                    };

                    // 2. Define Parent Graph (Value 10 -> Subgraph -> Output)
                    const parentGraph: NodeGraph = {
                        id: 'parent_graph',
                        nodes: [
                            { id: 'val_10', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 10 } },
                            { 
                                id: 'sub_node', 
                                type: NodeType.SUB_GRAPH, 
                                x: 100, y: 0, 
                                inputs: [{ id: 'in_a', name: 'A', type: 'value' }], 
                                outputs: [{ id: 'out', name: 'Out', type: 'value' }], 
                                data: { graph: subGraph } 
                            },
                            // Map scalar result to vector for visual output validation
                            { id: 'polar', type: NodeType.CONVERT_POLAR, x: 200, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }], outputs: [{ id: 'pt', name: 'Pt', type: 'geometry' }], data: {} },
                            { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 300, y: 0, inputs: [{ id: 'geometry', name: 'Geo', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'val_10', sourceSocketId: 'out', targetNodeId: 'sub_node', targetSocketId: 'in_a' },
                            { id: 'e2', sourceNodeId: 'sub_node', sourceSocketId: 'out', targetNodeId: 'polar', targetSocketId: 'radius' },
                            { id: 'e3', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'vis', targetSocketId: 'geometry' }
                        ]
                    };

                    logs += "Evaluating Graph...\n";
                    const result = signalEngine.evaluateGraph(parentGraph, 0, { amplitude: 0, frequency: 0, pitchDelta: 0, effectiveBpm: 0, currentPhoneme: '', stats: {} }, 'test');
                    
                    logs += `Result X (Radius): ${result.x.toFixed(2)}\n`;
                    
                    // Expected: 10 + 5 = 15. Polar projection with angle 0 puts X at 15.
                    if (Math.abs(result.x - 15) < 0.01) {
                        logs += "✅ PASS: 10 + 5 = 15.";
                        return { id, name, status: 'PASS', logs, breadcrumbs };
                    } else {
                        logs += `❌ FAIL: Expected 15, got ${result.x}`;
                        return { id, name, status: 'FAIL', logs, breadcrumbs };
                    }
                }
            }
        ]
    });
};
