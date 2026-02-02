// Copyright (c) 2025 vacui.dev, all rights reserved

import { BenchmarkTestResult, Breadcrumb } from "../types/testing";
import { NodeGraph, NodeType } from "../types/nodes";
import { signalEngine } from "./SignalEngine";

/**
 * NodeTestService
 * 
 * A robust harness for verifying the First-Principles Logic Engine.
 * Mirrors the 'BenchmarkService' structure for detailed logs and breadcrumbs.
 */
export class NodeTestService {

    public static getTestDefinitions(): BenchmarkTestResult[] {
        return [
            { id: 'math-add', name: 'Math: Simple Addition', status: 'IDLE', logs: '', breadcrumbs: [] },
            { id: 'math-mult', name: 'Math: Multiplication Chain', status: 'IDLE', logs: '', breadcrumbs: [] },
            { id: 'logic-sine', name: 'Logic: Sine Wave Generator', status: 'IDLE', logs: '', breadcrumbs: [] },
            { id: 'shape-polar', name: 'Shape: Polar Projection', status: 'IDLE', logs: '', breadcrumbs: [] },
            { id: 'system-missing', name: 'System: Missing Nodes (Robustness)', status: 'IDLE', logs: '', breadcrumbs: [] }
        ];
    }

    public static async runTestById(id: string): Promise<BenchmarkTestResult> {
        switch(id) {
            case 'math-add': return this.runMathAdd();
            case 'math-mult': return this.runMathMult();
            case 'logic-sine': return this.runSineWave();
            case 'shape-polar': return this.runPolarProjection();
            case 'system-missing': return this.runMissingNode();
            default: return { id, name: 'Unknown', status: 'FAIL', logs: 'Test ID not found', breadcrumbs: [] };
        }
    }

    // --- TEST IMPLEMENTATIONS ---

    private static async runMathAdd(): Promise<BenchmarkTestResult> {
        let logs = "Initializing Graph: 5 + 3 -> Polar(R) -> Out\n";
        const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'NodeTestService.ts', relevantFunctions: ['runMathAdd'], description: 'Verifies MATH_ADD node.' }];
        
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

        return this.executeGraphTest('math-add', 'Math: Simple Addition', graph, 8, logs, breadcrumbs);
    }

    private static async runMathMult(): Promise<BenchmarkTestResult> {
        let logs = "Initializing Graph: (2 * 3) + 4 -> Out\n";
        const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'NodeTestService.ts', relevantFunctions: ['runMathMult'], description: 'Verifies MATH_MULT and composition.' }];

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

        return this.executeGraphTest('math-mult', 'Math: Composition', graph, 10, logs, breadcrumbs);
    }

    private static async runSineWave(): Promise<BenchmarkTestResult> {
        let logs = "Initializing Graph: Time -> Sin(t) -> Out\nEvaluating at t = PI/2 (Should be 1.0)\n";
        const breadcrumbs: Breadcrumb[] = [{ category: 'MATH', file: 'NodeTestService.ts', relevantFunctions: ['runSineWave'], description: 'Verifies Trigonometry nodes.' }];

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

        return this.executeGraphTest('logic-sine', 'Logic: Sine Wave', graph, 1.0, logs, breadcrumbs, Math.PI / 2);
    }

    private static async runPolarProjection(): Promise<BenchmarkTestResult> {
        let logs = "Initializing Graph: Radius=10, Angle=PI -> Polar -> Out\nExpected X ≈ -10 (cos(PI)=-1)\n";
        const breadcrumbs: Breadcrumb[] = [{ category: 'ENGINE', file: 'SignalEngine.ts', relevantFunctions: ['evaluateGraph'], description: 'Verifies Implicit Polar->Cartesian Projection.' }];

        const graph: NodeGraph = {
            id: 'test_polar',
            nodes: [
                { id: 'r', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 10 } },
                { id: 'a', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: Math.PI } },
                { id: 'polar', type: NodeType.CONVERT_POLAR, x: 0, y: 0, inputs: [{ id: 'radius', name: 'R', type: 'value' }, { id: 'angle', name: 'A', type: 'value' }], outputs: [{ id: 'pt', name: 'Pt', type: 'geometry' }], data: {} },
                { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 0, y: 0, inputs: [{ id: 'geometry', name: 'Geo', type: 'geometry' }], outputs: [], data: {} }
            ],
            edges: [
                { id: 'e1', sourceNodeId: 'r', sourceSocketId: 'out', targetNodeId: 'polar', targetSocketId: 'radius' },
                { id: 'e2', sourceNodeId: 'a', sourceSocketId: 'out', targetNodeId: 'polar', targetSocketId: 'angle' },
                { id: 'e3', sourceNodeId: 'polar', sourceSocketId: 'pt', targetNodeId: 'vis', targetSocketId: 'geometry' }
            ]
        };

        return this.executeGraphTest('shape-polar', 'Shape: Polar Projection', graph, -10, logs, breadcrumbs);
    }

    private static async runMissingNode(): Promise<BenchmarkTestResult> {
        let logs = "Initializing Broken Graph: Value -> [MISSING] -> Out\n";
        const breadcrumbs: Breadcrumb[] = [{ category: 'SYSTEM', file: 'SignalEngine.ts', relevantFunctions: ['resolveInput'], description: 'Verifies robustness against broken edges.' }];

        const graph: NodeGraph = {
            id: 'test_broken',
            nodes: [
                { id: 'v1', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: { value: 5 } },
                { id: 'vis', type: NodeType.VISUAL_OUTPUT, x: 0, y: 0, inputs: [{ id: 'geometry', name: 'Geo', type: 'geometry' }], outputs: [], data: {} }
            ],
            edges: [
                { id: 'e1', sourceNodeId: 'v1', sourceSocketId: 'out', targetNodeId: 'vis', targetSocketId: 'geometry' } // Direct value to geometry? Should default to 0 or handle gracefully
            ]
        };

        // Value node returns 5. If plugged into geometry (point), it might be interpreted as radius or fail.
        // SignalEngine logic: resolveInput returns 5.
        // evaluateGraph checks object 'x' or 'radius'. Number 5 is not object.
        // It should return Zero Vector safely.
        return this.executeGraphTest('system-missing', 'System: Robustness', graph, 0, logs, breadcrumbs);
    }

    // --- HELPER ---

    private static executeGraphTest(
        id: string, 
        name: string, 
        graph: NodeGraph, 
        expectedX: number, 
        logs: string, 
        breadcrumbs: Breadcrumb[],
        time: number = 0
    ): BenchmarkTestResult {
        const mockAudio = { amplitude: 0, frequency: 0, pitchDelta: 0, effectiveBpm: 0, currentPhoneme: '', stats: {} };
        
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
    }
}