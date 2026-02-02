// Copyright (c) 2025 vacui.dev, all rights reserved

import { signalEngine } from '../SignalEngine';
import { testRegistry } from '../TestRegistry';
import { NodeType, NodeGraph } from '../../types/nodes';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';

export const registerNodeGraphTests = () => {
    const mockAudio = {
        amplitude: 0.5,
        frequency: 440,
        pitchDelta: 0,
        effectiveBpm: 120,
        currentPhoneme: 'Ah',
        stats: {}
    };

    const executeGraphTest = (
        id: string, 
        name: string, 
        graph: NodeGraph, 
        expectedX: number, 
        logs: string, 
        breadcrumbs: Breadcrumb[],
        time: number = 0
    ): BenchmarkTestResult => {
        
        const tracer = (msg: string) => {
            logs += `[TRACE] ${msg}\n`;
        };

        try {
            const result = signalEngine.evaluateGraph(graph, time, mockAudio, 'test_entity', tracer);
            logs += `\nResult Vector: [${result.x.toFixed(3)}, ${result.y.toFixed(3)}, ${result.z.toFixed(3)}]\n`;
            logs += `Expected X: ${expectedX.toFixed(3)}\n`;

            const tolerance = 0.001;
            if (Math.abs(result.x - expectedX) < tolerance) {
                logs += `✅ PASS: Result matches expected value.\n`;
                return { id, name, status: 'PASS', logs, breadcrumbs };
            } else {
                logs += `❌ FAIL: Result deviation > ${tolerance}.\n`;
                return { id, name, status: 'FAIL', logs, breadcrumbs };
            }
        } catch (e: any) {
            logs += `❌ CRITICAL ERROR: ${e.message}\n`;
            return { id, name, status: 'FAIL', logs, breadcrumbs };
        }
    };

    testRegistry.registerSuite({
        id: 'node_logic',
        name: 'Node Graph Engine',
        tests: [
            {
                id: 'math_add_simple',
                name: 'Math: Simple Addition (5 + 3)',
                run: async () => {
                    const logs = "Initializing Graph: 5 + 3 -> Polar(R) -> Out\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'NodeGraphTests.ts', relevantFunctions: ['math_add_simple'], description: 'Verifies basic addition.' }];

                    const graph: NodeGraph = {
                        id: 'test_add',
                        nodes: [
                            { id: 'v1', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 5 } },
                            { id: 'v2', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 3 } },
                            { id: 'add', type: NodeType.MATH_ADD, x: 0, y: 0, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: {} },
                            { id: 'polar', type: NodeType.CONVERT_POLAR, x: 0, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }, { id: 'angle', name: 'A', type: 'value' }], outputs: [{ id: 'pt', name: 'Pt', type: 'geometry' }], data: {} },
                            { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 0, y: 0, inputs: [{ id: 'geometry', name: 'Geo', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'v1', sourceSocketId: 'out', targetNodeId: 'add', targetSocketId: 'a' },
                            { id: 'e2', sourceNodeId: 'v2', sourceSocketId: 'out', targetNodeId: 'add', targetSocketId: 'b' },
                            { id: 'e3', sourceNodeId: 'add', sourceSocketId: 'out', targetNodeId: 'polar', targetSocketId: 'radius' },
                            { id: 'e4', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'vis', targetSocketId: 'geometry' }
                        ]
                    };

                    return executeGraphTest('math_add_simple', 'Math: Simple Addition', graph, 8, logs, breadcrumbs);
                }
            },
            {
                id: 'math_mult_chain',
                name: 'Math: Composition ((2 * 3) + 4)',
                run: async () => {
                    const logs = "Initializing Graph: (2 * 3) + 4 -> Out\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'NodeGraphTests.ts', relevantFunctions: ['math_mult_chain'], description: 'Verifies order of operations.' }];

                    const graph: NodeGraph = {
                        id: 'test_comp',
                        nodes: [
                            { id: 'v2', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 2 } },
                            { id: 'v3', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 3 } },
                            { id: 'v4', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 4 } },
                            { id: 'mult', type: NodeType.MATH_MULT, x: 0, y: 0, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: {} },
                            { id: 'add', type: NodeType.MATH_ADD, x: 0, y: 0, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: {} },
                            { id: 'polar', type: NodeType.CONVERT_POLAR, x: 0, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }], outputs: [{ id: 'pt', name: 'Pt', type: 'geometry' }], data: {} },
                            { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 0, y: 0, inputs: [{ id: 'geometry', name: 'Geo', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'v2', sourceSocketId: 'out', targetNodeId: 'mult', targetSocketId: 'a' },
                            { id: 'e2', sourceNodeId: 'v3', sourceSocketId: 'out', targetNodeId: 'mult', targetSocketId: 'b' },
                            { id: 'e3', sourceNodeId: 'mult', sourceSocketId: 'out', targetNodeId: 'add', targetSocketId: 'a' },
                            { id: 'e4', sourceNodeId: 'v4', sourceSocketId: 'out', targetNodeId: 'add', targetSocketId: 'b' },
                            { id: 'e5', sourceNodeId: 'add', sourceSocketId: 'out', targetNodeId: 'polar', targetSocketId: 'radius' },
                            { id: 'e6', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'vis', targetSocketId: 'geometry' }
                        ]
                    };

                    return executeGraphTest('math_mult_chain', 'Math: Composition', graph, 10, logs, breadcrumbs);
                }
            },
            {
                id: 'shape_sine_wave',
                name: 'Logic: Sine Wave Evaluation',
                run: async () => {
                    const logs = "Initializing Graph: Time -> Sin(t) -> Out\nEvaluating at t = PI/2 (Should be 1.0)\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'MATH', file: 'NodeGraphTests.ts', relevantFunctions: ['shape_sine_wave'], description: 'Verifies Trigonometry nodes.' }];

                    const graph: NodeGraph = {
                        id: 'test_sin',
                        nodes: [
                            { id: 't', type: NodeType.TIME, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: {} },
                            { id: 'sin', type: NodeType.MATH_SIN, x: 0, y: 0, inputs: [{ id: 'in', name: 'In', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: {} },
                            { id: 'polar', type: NodeType.CONVERT_POLAR, x: 0, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }], outputs: [{ id: 'pt', name: 'Pt', type: 'geometry' }], data: {} },
                            { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 0, y: 0, inputs: [{ id: 'geometry', name: 'Geo', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 't', sourceSocketId: 'out', targetNodeId: 'sin', targetSocketId: 'in' },
                            { id: 'e2', sourceNodeId: 'sin', sourceSocketId: 'out', targetNodeId: 'polar', targetSocketId: 'radius' },
                            { id: 'e3', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'vis', targetSocketId: 'geometry' }
                        ]
                    };

                    return executeGraphTest('shape_sine_wave', 'Logic: Sine Wave', graph, 1.0, logs, breadcrumbs, Math.PI / 2);
                }
            },
            {
                id: 'system_missing',
                name: 'System: Missing Nodes (Robustness)',
                run: async () => {
                    const logs = "Initializing Broken Graph: Value -> [MISSING] -> Out\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'SYSTEM', file: 'NodeGraphTests.ts', relevantFunctions: ['system_missing'], description: 'Verifies robustness against broken edges.' }];

                    const graph: NodeGraph = {
                        id: 'test_broken',
                        nodes: [
                            { id: 'v1', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 5 } },
                            { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 0, y: 0, inputs: [{ id: 'geometry', name: 'Geo', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'v1', sourceSocketId: 'out', targetNodeId: 'vis', targetSocketId: 'geometry' } 
                        ]
                    };

                    return executeGraphTest('system_missing', 'System: Robustness', graph, 0, logs, breadcrumbs);
                }
            }
        ]
    });
};