
// Copyright (c) 2025 vacui.dev, all rights reserved

import { testRegistry } from '../TestRegistry';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';
import { NodeType, NodeGraph } from '../../types/nodes';
import { signalEngine } from '../SignalEngine';

export const registerVisualizerTests = () => {
    testRegistry.registerSuite({
        id: 'visualizer_logic',
        name: 'High-Freq Visualizer Logic',
        tests: [
            {
                id: 'audio_mapping_test',
                name: 'Audio -> Map -> Geometry',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'audio_mapping_test';
                    const name = 'Audio -> Map -> Geometry';
                    let logs = "Initializing Visualizer Graph...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'VisualizerTests.ts', relevantFunctions: ['evaluateGraph'], description: 'Verifies Audio Amplitude Mapping.' }];

                    // Graph: Audio Amp (0.5) -> Math Map (0-1 -> 10-20) -> Polar Radius
                    // Expected Output: 15 (Midpoint of 10-20)
                    
                    const graph: NodeGraph = {
                        id: 'vis_test',
                        nodes: [
                            { id: 'analyze', type: NodeType.AUDIO_ANALYZE, x: 0, y: 0, inputs: [], outputs: [{ id: 'amplitude', name: 'Amplitude', type: 'value' }], data: {} },
                            { id: 'map', type: NodeType.MATH_MAP, x: 100, y: 0, inputs: [{ id: 'in', name: 'In', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { inMin: 0, inMax: 1, outMin: 10, outMax: 20 } },
                            { id: 'polar', type: NodeType.CONVERT_POLAR, x: 200, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }], outputs: [{ id: 'pt', name: 'Pt', type: 'geometry' }], data: {} },
                            { id: 'out', type: NodeType.VISUAL_OUTPUT, x: 300, y: 0, inputs: [{ id: 'geometry', name: 'Geo', type: 'geometry' }], outputs: [], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'analyze', sourceSocketId: 'amplitude', targetNodeId: 'map', targetSocketId: 'in' },
                            { id: 'e2', sourceNodeId: 'map', sourceSocketId: 'out', targetNodeId: 'polar', targetSocketId: 'radius' },
                            { id: 'e3', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'out', targetSocketId: 'geometry' }
                        ]
                    };

                    // Mock Audio Data
                    const mockAudio = { 
                        amplitude: 0.5, 
                        frequency: 440, 
                        pitchDelta: 0, 
                        effectiveBpm: 120, 
                        currentPhoneme: '', 
                        stats: {} 
                    };

                    logs += "Evaluating with Amplitude 0.5...\n";
                    const result = signalEngine.evaluateGraph(graph, 0, mockAudio, 'test_vis');
                    
                    // In Polar conversion with angle 0 (default), X = Radius * cos(0) = Radius.
                    // Expected Radius: Map(0.5, 0, 1, 10, 20) = 15.
                    
                    logs += `Result X (Radius): ${result.x.toFixed(2)}\n`;
                    
                    if (Math.abs(result.x - 15) < 0.01) {
                        logs += "✅ PASS: Audio Signal mapped correctly.";
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
