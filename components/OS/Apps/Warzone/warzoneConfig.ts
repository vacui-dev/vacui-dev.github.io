
// Copyright (c) 2025 vacui.dev, all rights reserved

import { NodeType } from "../../../../types/nodes";
import { WorldConfig, Entity } from "../../../../types/simulation";

const FACTIONS = [
    { id: 'red', color: '#ff0000', startPos: { x: -10, y: 2, z: -10 } },
    { id: 'blue', color: '#0088ff', startPos: { x: 10, y: 2, z: 10 } },
    { id: 'green', color: '#00ff00', startPos: { x: -10, y: 2, z: 10 } },
    { id: 'yellow', color: '#ffff00', startPos: { x: 10, y: 2, z: -10 } },
];

const createBotGraph = (id: string): any => ({
    id: `${id}_brain`,
    nodes: [
        // --- MOVEMENT ---
        // Time -> Sin/Cos -> Impulse (Circle/Wander)
        { id: 't', type: NodeType.TIME, x: 0, y: 0, inputs: [], outputs: [{id:'o', name:'O', type:'value'}], data: {} },
        { id: 'speed', type: NodeType.MATH_MULT, x: 100, y: 0, inputs: [{id:'a', name:'A', type:'value'}], outputs: [{id:'o', name:'O', type:'value'}], data: { value: 0.5 } },
        { id: 'sin', type: NodeType.MATH_SIN, x: 200, y: 0, inputs: [{id:'in', name:'I', type:'value'}], outputs: [{id:'o', name:'O', type:'value'}], data: {} },
        { id: 'cos', type: NodeType.MATH_COS, x: 200, y: 100, inputs: [{id:'in', name:'I', type:'value'}], outputs: [{id:'o', name:'O', type:'value'}], data: {} },
        // Randomize direction per bot slightly
        { id: 'imp', type: NodeType.IMPULSE, x: 400, y: 50, inputs: [{id:'imp-trigger', name:'T', type:'value'}], outputs: [], data: { force: [2, 0, 2], local: true } },
        
        // --- SHOOTING ---
        // Sequencer -> Trigger Event
        { id: 'seq', type: NodeType.STEP_SEQUENCER, x: 0, y: 200, inputs: [], outputs: [{id:'trig', name:'T', type:'value'}], data: { bpm: 240, pattern: "x.......x......." } },
        { id: 'evt', type: NodeType.TRIGGER_EVENT, x: 200, y: 200, inputs: [{id:'trigger', name:'T', type:'value'}], outputs: [], data: { eventType: 'SHOOT' } },
        
        // --- HEALTH (Damageable Protocol) ---
        // Damage In -> Negate -> Stat
        { id: 'dmg_in', type: NodeType.GRAPH_INPUT, x: 0, y: 300, inputs: [], outputs: [{id:'v',name:'V',type:'value'}], data: { name: 'damage_in' } },
        { id: 'neg', type: NodeType.MATH_MULT, x: 100, y: 300, inputs: [{id:'a',name:'A',type:'value'}], outputs: [{id:'o',name:'O',type:'value'}], data: { value: -1 } },
        { id: 'hp', type: NodeType.STAT, x: 200, y: 300, inputs: [{id:'modify',name:'M',type:'value'}], outputs: [{id:'v',name:'V',type:'value'}], data: { initialValue: 100 } }
    ],
    edges: [
        { id: 'e1', sourceNodeId: 't', sourceSocketId: 'o', targetNodeId: 'speed', targetSocketId: 'a' },
        { id: 'e2', sourceNodeId: 'speed', sourceSocketId: 'o', targetNodeId: 'sin', targetSocketId: 'in' },
        { id: 'e3', sourceNodeId: 't', sourceSocketId: 'o', targetNodeId: 'cos', targetSocketId: 'in' },
        { id: 'e4', sourceNodeId: 'sin', sourceSocketId: 'o', targetNodeId: 'imp', targetSocketId: 'imp-trigger' },
        
        { id: 'e5', sourceNodeId: 'seq', sourceSocketId: 'trig', targetNodeId: 'evt', targetSocketId: 'trigger' },
        
        { id: 'e6', sourceNodeId: 'dmg_in', sourceSocketId: 'v', targetNodeId: 'neg', targetSocketId: 'a' },
        { id: 'e7', sourceNodeId: 'neg', sourceSocketId: 'o', targetNodeId: 'hp', targetSocketId: 'modify' }
    ]
});

const createEntities = (): Entity[] => {
    const entities: Entity[] = [
        {
            id: 'arena', name: 'Arena Floor', type: 'Box', position: {x:0, y:-2, z:0}, rotation: {x:0,y:0,z:0}, args: [40, 1, 40], mass: 0, color: '#222'
        }
    ];

    FACTIONS.forEach(f => {
        entities.push({
            id: `bot_${f.id}`,
            name: `${f.id.toUpperCase()} Unit`,
            type: 'Sphere',
            position: f.startPos,
            rotation: {x:0,y:0,z:0},
            args: [1],
            mass: 1,
            color: f.color,
            emissive: f.color,
            emissiveIntensity: 0.5,
            internalGraph: createBotGraph(`bot_${f.id}`),
            exposedPorts: [
                { id: 'damage_in', name: 'Damage', type: 'value', direction: 'input' }
            ],
            portMappings: [
                { externalPortId: 'damage_in', internalNodeId: 'dmg_in', internalSocketId: 'v' }
            ],
            implements: ['damageable']
        });
    });

    return entities;
};

export const warzoneConfig: WorldConfig = {
    gravity: { x: 0, y: -9.81, z: 0 },
    environment: 'city',
    description: "Warzone: 4-Way Battle Royale. Last Orb Standing Wins.",
    entities: createEntities(),
    constraints: []
};
