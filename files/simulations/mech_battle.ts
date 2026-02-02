
// Copyright (c) 2025 vacui.dev, all rights reserved

import { NodeType } from "../../types/nodes";
import { WorldConfig } from "../../types/simulation";

// MECH BATTLE: Human vs AI
// Implements "Tank Controls" via Logic Graphs using Local Impulse.

const BLUE_MECH_GRAPH = {
    "nodes": [
        // --- FORWARD (W) ---
        { "id": "in_fwd", "type": NodeType.INPUT_RECEIVER, "x": 0, "y": 0, "inputs": [], "outputs": [{"id": "out", "name": "Out", "type": "value"}], "data": { "inputId": "mech_fwd" } },
        { "id": "th_fwd", "type": NodeType.THRESHOLD, "x": 150, "y": 0, "inputs": [{"id": "th-in", "name": "In", "type": "value"}], "outputs": [{"id": "trig", "name": "Trig", "type": "trigger"}], "data": { "level": 0.5 } },
        { "id": "imp_fwd", "type": NodeType.IMPULSE, "x": 300, "y": 0, "inputs": [{"id": "imp-trigger", "name": "Trig", "type": "trigger"}], "outputs": [], "data": { "force": [0, 0, -15], "local": true } },

        // --- ROTATE LEFT (A) ---
        { "id": "in_left", "type": NodeType.INPUT_RECEIVER, "x": 0, "y": 100, "inputs": [], "outputs": [{"id": "out", "name": "Out", "type": "value"}], "data": { "inputId": "mech_left" } },
        { "id": "th_left", "type": NodeType.THRESHOLD, "x": 150, "y": 100, "inputs": [{"id": "th-in", "name": "In", "type": "value"}], "outputs": [{"id": "trig", "name": "Trig", "type": "trigger"}], "data": { "level": 0.5 } },
        { "id": "imp_left", "type": NodeType.IMPULSE, "x": 300, "y": 100, "inputs": [{"id": "imp-trigger", "name": "Trig", "type": "trigger"}], "outputs": [], "data": { "force": [0, 5, 0], "local": true } },
        
        // --- DAMAGE PROTOCOL ---
        { id: 'dmg_in', type: NodeType.GRAPH_INPUT, x: 400, y: 0, inputs: [], outputs: [{id:'v',name:'V',type:'value'}], data: { name: 'damage_in' } },
        { id: 'neg', type: NodeType.MATH_MULT, x: 500, y: 0, inputs: [{id:'a',name:'A',type:'value'}], outputs: [{id:'o',name:'O',type:'value'}], data: { value: -1 } },
        { id: 'hp', type: NodeType.STAT, x: 600, y: 0, inputs: [{id:'modify',name:'M',type:'value'}], outputs: [{id:'v',name:'V',type:'value'}], data: { initialValue: 100 } }
    ],
    "edges": [
        { "id": "e1", "sourceNodeId": "in_fwd", "sourceSocketId": "out", "targetNodeId": "th_fwd", "targetSocketId": "th-in" },
        { "id": "e2", "sourceNodeId": "th_fwd", "sourceSocketId": "trig", "targetNodeId": "imp_fwd", "targetSocketId": "imp-trigger" },
        
        { "id": "e3", "sourceNodeId": "in_left", "sourceSocketId": "out", "targetNodeId": "th_left", "targetSocketId": "th-in" },
        { "id": "e4", "sourceNodeId": "th_left", "sourceSocketId": "trig", "targetNodeId": "imp_left", "targetSocketId": "imp-trigger" },
        
        { "id": "e5", "sourceNodeId": "dmg_in", "sourceSocketId": "v", "targetNodeId": "neg", "targetSocketId": "a" },
        { "id": "e6", "sourceNodeId": "neg", "sourceSocketId": "o", "targetNodeId": "hp", "targetSocketId": "modify" }
    ]
};

const INPUT_GRAPH_BLUE = {
    nodes: [
        // Forward
        { id: 'in_w', type: NodeType.INPUT_RECEIVER, x: 0, y: 0, inputs: [], outputs: [{id:'o', name:'O', type:'value'}], data: { inputId: 'mech_fwd' } },
        { id: 'th_w', type: NodeType.THRESHOLD, x: 100, y: 0, inputs: [{id:'th-in', name:'I', type:'value'}], outputs: [{id:'t', name:'T', type:'trigger'}], data: { level: 0.5 } },
        { id: 'act_w', type: NodeType.IMPULSE, x: 200, y: 0, inputs: [{id:'imp-trigger', name:'T', type:'trigger'}], outputs: [], data: { force: [0, 0, -2], local: true } },

        // Back
        { id: 'in_s', type: NodeType.INPUT_RECEIVER, x: 0, y: 100, inputs: [], outputs: [{id:'o', name:'O', type:'value'}], data: { inputId: 'mech_back' } },
        { id: 'th_s', type: NodeType.THRESHOLD, x: 100, y: 100, inputs: [{id:'th-in', name:'I', type:'value'}], outputs: [{id:'t', name:'T', type:'trigger'}], data: { level: 0.5 } },
        { id: 'act_s', type: NodeType.IMPULSE, x: 200, y: 100, inputs: [{id:'imp-trigger', name:'T', type:'trigger'}], outputs: [], data: { force: [0, 0, 2], local: true } },

        // Left (Strafe)
        { id: 'in_a', type: NodeType.INPUT_RECEIVER, x: 0, y: 200, inputs: [], outputs: [{id:'o', name:'O', type:'value'}], data: { inputId: 'mech_left' } },
        { id: 'th_a', type: NodeType.THRESHOLD, x: 100, y: 200, inputs: [{id:'th-in', name:'I', type:'value'}], outputs: [{id:'t', name:'T', type:'trigger'}], data: { level: 0.5 } },
        { id: 'act_a', type: NodeType.IMPULSE, x: 200, y: 200, inputs: [{id:'imp-trigger', name:'T', type:'trigger'}], outputs: [], data: { force: [-2, 0, 0], local: true } }, 

        // Right (Strafe)
        { id: 'in_d', type: NodeType.INPUT_RECEIVER, x: 0, y: 300, inputs: [], outputs: [{id:'o', name:'O', type:'value'}], data: { inputId: 'mech_right' } },
        { id: 'th_d', type: NodeType.THRESHOLD, x: 100, y: 300, inputs: [{id:'th-in', name:'I', type:'value'}], outputs: [{id:'t', name:'T', type:'trigger'}], data: { level: 0.5 } },
        { id: 'act_d', type: NodeType.IMPULSE, x: 200, y: 300, inputs: [{id:'imp-trigger', name:'T', type:'trigger'}], outputs: [], data: { force: [2, 0, 0], local: true } },
        
        // Attack (Ram/Boost)
        { id: 'in_k', type: NodeType.INPUT_RECEIVER, x: 0, y: 400, inputs: [], outputs: [{id:'o', name:'O', type:'value'}], data: { inputId: 'mech_atk' } },
        { id: 'th_k', type: NodeType.THRESHOLD, x: 100, y: 400, inputs: [{id:'th-in', name:'I', type:'value'}], outputs: [{id:'t', name:'T', type:'trigger'}], data: { level: 0.5 } },
        { id: 'act_k', type: NodeType.IMPULSE, x: 200, y: 400, inputs: [{id:'imp-trigger', name:'T', type:'trigger'}], outputs: [], data: { force: [0, 5, -10], local: true } },

        // Damage Protocol
        { id: 'dmg_in', type: NodeType.GRAPH_INPUT, x: 400, y: 0, inputs: [], outputs: [{id:'v',name:'V',type:'value'}], data: { name: 'damage_in' } },
        { id: 'neg', type: NodeType.MATH_MULT, x: 500, y: 0, inputs: [{id:'a',name:'A',type:'value'}], outputs: [{id:'o',name:'O',type:'value'}], data: { value: -1 } },
        { id: 'hp', type: NodeType.STAT, x: 600, y: 0, inputs: [{id:'modify',name:'M',type:'value'}], outputs: [{id:'v',name:'V',type:'value'}], data: { initialValue: 100 } }
    ],
    edges: [
        { id: 'e1', sourceNodeId: 'in_w', sourceSocketId: 'o', targetNodeId: 'th_w', targetSocketId: 'th-in' },
        { id: 'e2', sourceNodeId: 'th_w', sourceSocketId: 't', targetNodeId: 'act_w', targetSocketId: 'imp-trigger' },
        { id: 'e3', sourceNodeId: 'in_s', sourceSocketId: 'o', targetNodeId: 'th_s', targetSocketId: 'th-in' },
        { id: 'e4', sourceNodeId: 'th_s', sourceSocketId: 't', targetNodeId: 'act_s', targetSocketId: 'imp-trigger' },
        { id: 'e5', sourceNodeId: 'in_a', sourceSocketId: 'o', targetNodeId: 'th_a', targetSocketId: 'th-in' },
        { id: 'e6', sourceNodeId: 'th_a', sourceSocketId: 't', targetNodeId: 'act_a', targetSocketId: 'imp-trigger' },
        { id: 'e7', sourceNodeId: 'in_d', sourceSocketId: 'o', targetNodeId: 'th_d', targetSocketId: 'th-in' },
        { id: 'e8', sourceNodeId: 'th_d', sourceSocketId: 't', targetNodeId: 'act_d', targetSocketId: 'imp-trigger' },
        { id: 'e9', sourceNodeId: 'in_k', sourceSocketId: 'o', targetNodeId: 'th_k', targetSocketId: 'th-in' },
        { id: 'e10', sourceNodeId: 'th_k', sourceSocketId: 't', targetNodeId: 'act_k', targetSocketId: 'imp-trigger' },
        
        { id: 'e11', sourceNodeId: 'dmg_in', sourceSocketId: 'v', targetNodeId: 'neg', targetSocketId: 'a' },
        { id: 'e12', sourceNodeId: 'neg', sourceSocketId: 'o', targetNodeId: 'hp', targetSocketId: 'modify' }
    ]
};

// AI Graph (Identical structure, listening to ai_* inputs)
const INPUT_GRAPH_RED = JSON.parse(JSON.stringify(INPUT_GRAPH_BLUE));
INPUT_GRAPH_RED.nodes.forEach((n: any) => {
    if (n.data.inputId) n.data.inputId = n.data.inputId.replace('mech_', 'ai_');
});

export default {
    "gravity": { "x": 0, "y": -15, "z": 0 }, 
    "environment": "sunset",
    "description": "MECH BATTLE: Arena Combat. Knock the opponent off the platform.\nControls: W/S (Fwd/Back), A/D (Strafe), SPACE (Ram/Attack).",
    "cameraConfig": {
        "mode": "fit",
        "targetIds": ["mech_blue", "mech_red"],
        "offset": { "x": 0, "y": 10, "z": 10 }
    },
    "entities": [
        // --- ARENA ---
        {
            "id": "arena_floor",
            "name": "Platform",
            "type": "Box",
            "position": { "x": 0, "y": -2, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [20, 1, 20],
            "mass": 0,
            "color": "#333333",
            "roughness": 0.8
        },
        {
            "id": "pillar_1",
            "name": "Cover",
            "type": "Box",
            "position": { "x": -5, "y": 0, "z": -5 },
            "rotation": { "x": 0, "y": 0.7, "z": 0 },
            "args": [2, 4, 2],
            "mass": 10,
            "color": "#555555"
        },
        {
            "id": "pillar_2",
            "name": "Cover",
            "type": "Box",
            "position": { "x": 5, "y": 0, "z": 5 },
            "rotation": { "x": 0, "y": 0.3, "z": 0 },
            "args": [2, 4, 2],
            "mass": 10,
            "color": "#555555"
        },

        // --- BLUE MECH (PLAYER) ---
        {
            "id": "mech_blue",
            "name": "Jaeger Alpha",
            "type": "Box",
            "position": { "x": 0, "y": 2, "z": 8 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [1.5, 2, 1.5],
            "mass": 5,
            "color": "#0088ff",
            "roughness": 0.2,
            "metalness": 0.8,
            "logicParams": {
                "nodeGraph": INPUT_GRAPH_BLUE
            },
            "implements": ["damageable"],
            "exposedPorts": [
                { "id": "damage_in", "name": "Damage", "type": "value", "direction": "input" }
            ],
            "portMappings": [
                { "externalPortId": "damage_in", "internalNodeId": "dmg_in", "internalSocketId": "v" }
            ]
        },
        {
            "id": "mech_blue_head",
            "name": "Head",
            "type": "Sphere",
            "position": { "x": 0, "y": 3.5, "z": 8 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.5],
            "mass": 0.5,
            "color": "#00ffff",
            "emissive": "#00ffff",
            "emissiveIntensity": 0.5
        },

        // --- RED MECH (AI) ---
        {
            "id": "mech_red",
            "name": "Kaiju Unit",
            "type": "Box",
            "position": { "x": 0, "y": 2, "z": -8 },
            "rotation": { "x": 0, "y": Math.PI, "z": 0 },
            "args": [1.5, 2, 1.5],
            "mass": 5,
            "color": "#ff2200",
            "roughness": 0.2,
            "metalness": 0.8,
            "logicParams": {
                "nodeGraph": INPUT_GRAPH_RED
            },
            "socialParams": {
                "role": "racer",
                "emotionalState": "hostile",
                "personalityMatrix": [1.0, 0.0, 0.0]
            },
            "implements": ["damageable"],
            "exposedPorts": [
                { "id": "damage_in", "name": "Damage", "type": "value", "direction": "input" }
            ],
            "portMappings": [
                { "externalPortId": "damage_in", "internalNodeId": "dmg_in", "internalSocketId": "v" }
            ]
        },
        {
            "id": "mech_red_head",
            "name": "Head",
            "type": "Sphere",
            "position": { "x": 0, "y": 3.5, "z": -8 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.5],
            "mass": 0.5,
            "color": "#ffaa00",
            "emissive": "#ff0000",
            "emissiveIntensity": 0.8
        },
        // AI SENSOR
        {
            "id": "ai_ganglion",
            "name": "Targeting System",
            "type": "Ganglion",
            "position": { "x": 0, "y": 4.5, "z": -8 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.2],
            "mass": 0.1,
            "color": "#ff0000",
            "ganglionParams": { "range": 20.0, "bandwidth": 1.0 }
        },

        // --- CONTROLS ---
        {
            "id": "btn_atk",
            "name": "ATTACK",
            "type": "InputTerminal",
            "position": { "x": 8, "y": 0, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": ["mech_atk"],
            "mass": 0,
            "color": "#ffff00"
        }
    ],
    "constraints": [
        {
            "id": "joint_blue",
            "type": "Lock",
            "bodyA": "mech_blue",
            "bodyB": "mech_blue_head"
        },
        {
            "id": "joint_red",
            "type": "Lock",
            "bodyA": "mech_red",
            "bodyB": "mech_red_head"
        },
        {
            "id": "mount_sensor",
            "type": "Lock",
            "bodyA": "mech_red_head",
            "bodyB": "ai_ganglion"
        }
    ]
} as WorldConfig;
