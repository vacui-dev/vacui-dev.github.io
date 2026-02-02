
// Copyright (c) 2025 vacui.dev, all rights reserved

import { testRegistry } from '../TestRegistry';
import { BenchmarkTestResult, Breadcrumb } from '../../types/testing';
import { Entity } from '../../types/simulation';
import { NodeType, NodeGraph } from '../../types/nodes';

export const registerGraphSchemaTests = () => {
    testRegistry.registerSuite({
        id: 'holon_schema',
        name: 'Holon Architecture Schema',
        tests: [
            {
                id: 'schema_compound_node',
                name: 'Schema: Compound Node Structure',
                run: async (): Promise<BenchmarkTestResult> => {
                    const id = 'schema_compound_node';
                    const name = 'Schema: Compound Node Structure';
                    let logs = "Constructing Mock Holon (Math Adder)...\n";
                    const breadcrumbs: Breadcrumb[] = [{ category: 'TEST', file: 'GraphSchemaTests.ts', relevantFunctions: ['validateStructure'], description: 'Verifies Entity-Graph recursion.' }];

                    // Mock Internal Graph
                    const internalGraph: NodeGraph = {
                        id: 'math_adder_logic',
                        nodes: [
                            { id: 'in_a', type: NodeType.VALUE, x: 0, y: 0, inputs: [], outputs: [{ id: 'val', name: 'Value', type: 'value' }], data: { value: 0 } }, // Placeholder for input
                            { id: 'in_b', type: NodeType.VALUE, x: 0, y: 100, inputs: [], outputs: [{ id: 'val', name: 'Value', type: 'value' }], data: { value: 0 } },
                            { id: 'add', type: NodeType.MATH_ADD, x: 100, y: 50, inputs: [{ id: 'a', name: 'A', type: 'value' }, { id: 'b', name: 'B', type: 'value' }], outputs: [{ id: 'out', name: 'Out', type: 'value' }], data: {} }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'in_a', sourceSocketId: 'val', targetNodeId: 'add', targetSocketId: 'a' },
                            { id: 'e2', sourceNodeId: 'in_b', sourceSocketId: 'val', targetNodeId: 'add', targetSocketId: 'b' }
                        ]
                    };

                    // Mock Entity behaving as a Node
                    const holon: Entity = {
                        id: 'holon_adder',
                        name: 'Math Adder Unit',
                        type: 'Box',
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        args: [1],
                        mass: 1,
                        color: '#fff',
                        
                        // The New Bits
                        internalGraph: internalGraph,
                        exposedPorts: [
                            { id: 'port_in_a', name: 'Input A', type: 'value', direction: 'input' },
                            { id: 'port_in_b', name: 'Input B', type: 'value', direction: 'input' },
                            { id: 'port_out', name: 'Result', type: 'value', direction: 'output' }
                        ],
                        portMappings: [
                            { externalPortId: 'port_in_a', internalNodeId: 'in_a', internalSocketId: 'val' }, // Logic engine will write to 'in_a'.data.value
                            { externalPortId: 'port_in_b', internalNodeId: 'in_b', internalSocketId: 'val' },
                            { externalPortId: 'port_out', internalNodeId: 'add', internalSocketId: 'out' }
                        ]
                    };

                    logs += "Validating Membrane Integrity...\n";
                    
                    // Check 1: Do mappings point to valid internal nodes?
                    if (!holon.internalGraph) throw new Error("Internal Graph is missing");
                    if (!holon.portMappings) throw new Error("Port Mappings are missing");

                    holon.portMappings.forEach(mapping => {
                        const node = holon.internalGraph!.nodes.find(n => n.id === mapping.internalNodeId);
                        if (!node) throw new Error(`Mapping points to non-existent node: ${mapping.internalNodeId}`);
                        logs += `[OK] Port ${mapping.externalPortId} -> Node ${node.id} (${node.type})\n`;
                    });

                    logs += "✅ Schema Validated.";
                    return { id, name, status: 'PASS', logs, breadcrumbs };
                }
            }
        ]
    });
};
