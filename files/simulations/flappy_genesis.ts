
// Copyright (c) 2025 vacui.dev, all rights reserved

import { NodeType } from "../../types/nodes";
import { WorldConfig, Entity } from "../../types/simulation";

// Flappy Genesis: Multiplayer Edition (Human vs AI)
// Featuring Progressive Difficulty Logic ported from Verse

// --- DIFFICULTY LOGIC (Ported from Verse) ---

interface LevelConfig {
    openingSize: { min: number, max: number };
    deltaZ: { min: number, max: number };
    neighborDistance: { min: number, max: number };
}

const getLevelConfig = (level: number): LevelConfig => {
    // Scale factors to convert Verse Units -> Genesis Meters
    // Verse 100 units ~ 1 Genesis Meter
    const S = 0.01; 
    const H_SCALE = 0.005; // Vertical scaling for gap (Verse gap 1500 is huge, we need ~5-8m)

    switch (level) {
        case 1: return { // Gentle
            openingSize: { min: 1500 * H_SCALE, max: 2000 * H_SCALE },
            deltaZ: { min: 100 * S, max: 100 * S },
            neighborDistance: { min: 640 * S, max: 640 * S }
        };
        case 5: return { // Formidable
            openingSize: { min: 860 * H_SCALE, max: 860 * H_SCALE },
            deltaZ: { min: 0, max: 400 * S },
            neighborDistance: { min: 800 * S, max: 800 * S }
        };
        case 10: return { // Taxing
            openingSize: { min: 500 * H_SCALE, max: 670 * H_SCALE },
            deltaZ: { min: 200 * S, max: 400 * S },
            neighborDistance: { min: 640 * S, max: 900 * S }
        };
        case 16: return { // Impossible
            openingSize: { min: 400 * H_SCALE, max: 1000 * H_SCALE },
            deltaZ: { min: 0, max: 200 * S },
            neighborDistance: { min: 35 * S, max: 35 * S } // Dense pipes!
        };
        default: return { // Mild (Default)
            openingSize: { min: 1000 * H_SCALE, max: 1500 * H_SCALE },
            deltaZ: { min: 100 * S, max: 100 * S },
            neighborDistance: { min: 640 * S, max: 640 * S }
        };
    }
};

const generatePipes = (count: number): Entity[] => {
    const pipes: Entity[] = [];
    let currentX = 10;
    let currentY = 5; // "Z" in verse is Y in Genesis (Up)
    
    let level = 1;

    for (let i = 0; i < count; i++) {
        // Progressive Difficulty
        if (i > 5) level = 2;
        if (i > 15) level = 5;
        if (i > 30) level = 10;
        if (i > 50) level = 16;

        const cfg = getLevelConfig(level);
        
        // Calc Spacing
        const dist = cfg.neighborDistance.min + Math.random() * (cfg.neighborDistance.max - cfg.neighborDistance.min);
        currentX += dist;

        // Calc Height Delta
        let dY = cfg.deltaZ.min + Math.random() * (cfg.deltaZ.max - cfg.deltaZ.min);
        // Keep in bounds (0 to 15)
        if (currentY + dY > 12) dY = -dY;
        if (currentY + dY < 2) dY = Math.abs(dY);
        // Random flip if safe
        else if (Math.random() > 0.5) dY = -dY;
        
        currentY += dY;

        // Calc Gap
        const gap = cfg.openingSize.min + Math.random() * (cfg.openingSize.max - cfg.openingSize.min);
        
        // Generate Pipe Pair
        pipes.push({
            id: `pipe_${i}_bot`,
            name: `Lvl${level} Pipe Bot`,
            type: "Cylinder",
            position: { x: currentX, y: currentY - 5 - (gap/2), z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            args: [1, 1, 10, 16],
            mass: 0,
            color: level > 10 ? "#ff0000" : "#00ff88", 
            opacity: 0.8
        });

        pipes.push({
            id: `pipe_${i}_top`,
            name: `Lvl${level} Pipe Top`,
            type: "Cylinder",
            position: { x: currentX, y: currentY + 5 + (gap/2), z: 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [1, 1, 10, 16],
            "mass": 0,
            "color": level > 10 ? "#ff0000" : "#00ff88",
            "opacity": 0.8
        });
    }
    return pipes;
};

export default {
    "gravity": { "x": 0, "y": -9.81, "z": 0 },
    "environment": "city",
    "description": "Flappy Genesis: Procedural track scaling from Gentle (Lvl 1) to Impossible (Lvl 16).",
    "wind": { "x": 2, "y": 0, "z": 0 },
    "cameraConfig": {
        "mode": "follow",
        "targetIds": ["player_human", "player_ai"],
        "offset": { "x": 0, "y": 2, "z": 12 }
    },
    "entities": [
        // --- PLAYER 1: HUMAN (Gold) ---
        {
            "id": "player_human",
            "name": "Human Pilot",
            "type": "Sphere",
            "position": { "x": -5, "y": 5, "z": 2 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.5],
            "mass": 1,
            "color": "#ffd700",
            "roughness": 0.2,
            "metalness": 1.0,
            "implements": ["damageable"],
            "exposedPorts": [
                { "id": "damage_in", "name": "Damage", "type": "value", "direction": "input" }
            ],
            "portMappings": [
                { "externalPortId": "damage_in", "internalNodeId": "dmg_in", "internalSocketId": "v" }
            ],
            "logicParams": {
                "nodeGraph": {
                    "nodes": [
                        // Movement Logic
                        { "id": "in", "type": NodeType.INPUT_RECEIVER, "x": 0, "y": 0, "inputs": [], "outputs": [{"id": "sig", "name": "Sig", "type": "value"}], "data": { "inputId": "jump_btn" } },
                        { "id": "th", "type": NodeType.THRESHOLD, "x": 150, "y": 0, "inputs": [{"id": "th-in", "name": "In", "type": "value"}], "outputs": [{"id": "trig", "name": "Trig", "type": "trigger"}], "data": { "level": 0.5 } },
                        { "id": "imp", "type": NodeType.IMPULSE, "x": 300, "y": 0, "inputs": [{"id": "imp-trigger", "name": "Trig", "type": "trigger"}], "outputs": [], "data": { "force": [0, 6, 0] } },
                        
                        // Damage Logic (Protocol Compliance)
                        { "id": "dmg_in", "type": NodeType.GRAPH_INPUT, "x": 0, "y": 200, "inputs": [], "outputs": [{"id": "v", "name": "V", "type": "value"}], "data": { "name": "damage_in" } },
                        { "id": "neg", "type": NodeType.MATH_MULT, "x": 150, "y": 200, "inputs": [{"id": "a", "name": "A", "type": "value"}], "outputs": [{"id": "o", "name": "O", "type": "value"}], "data": { "value": -1 } },
                        { "id": "hp", "type": NodeType.STAT, "x": 300, "y": 200, "inputs": [{"id": "modify", "name": "Mod", "type": "value"}], "outputs": [{"id": "v", "name": "V", "type": "value"}], "data": { "initialValue": 100 } }
                    ],
                    "edges": [
                        { "id": "e1", "sourceNodeId": "in", "sourceSocketId": "sig", "targetNodeId": "th", "targetSocketId": "th-in" },
                        { "id": "e2", "sourceNodeId": "th", "sourceSocketId": "trig", "targetNodeId": "imp", "targetSocketId": "imp-trigger" },
                        
                        { "id": "e3", "sourceNodeId": "dmg_in", "sourceSocketId": "v", "targetNodeId": "neg", "targetSocketId": "a" },
                        { "id": "e4", "sourceNodeId": "neg", "sourceSocketId": "o", "targetNodeId": "hp", "targetSocketId": "modify" }
                    ]
                }
            }
        },

        // --- PLAYER 2: AI AGENT (Cyber) ---
        {
            "id": "player_ai",
            "name": "Neural Network",
            "type": "Sphere",
            "position": { "x": -5, "y": 5, "z": -2 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.5],
            "mass": 1,
            "color": "#ff0055", 
            "emissive": "#ff0055",
            "emissiveIntensity": 0.5,
            "implements": ["damageable"],
            "exposedPorts": [
                { "id": "damage_in", "name": "Damage", "type": "value", "direction": "input" }
            ],
            "portMappings": [
                { "externalPortId": "damage_in", "internalNodeId": "dmg_in", "internalSocketId": "v" }
            ],
            "socialParams": {
                "role": "racer",
                "emotionalState": "competitive",
                "personalityMatrix": [0.9, 0.1, 0.8],
                "memories": ["I calculate a 99% chance of your failure."]
            },
            "logicParams": {
                "nodeGraph": {
                    "nodes": [
                        // Movement
                        { "id": "in", "type": NodeType.INPUT_RECEIVER, "x": 0, "y": 0, "inputs": [], "outputs": [{"id": "sig", "name": "Sig", "type": "value"}], "data": { "inputId": "ai_jump" } },
                        { "id": "th", "type": NodeType.THRESHOLD, "x": 150, "y": 0, "inputs": [{"id": "th-in", "name": "In", "type": "value"}], "outputs": [{"id": "trig", "name": "Trig", "type": "trigger"}], "data": { "level": 0.5 } },
                        { "id": "imp", "type": NodeType.IMPULSE, "x": 300, "y": 0, "inputs": [{"id": "imp-trigger", "name": "Trig", "type": "trigger"}], "outputs": [], "data": { "force": [0, 6, 0] } },
                        
                        // Damage Logic
                        { "id": "dmg_in", "type": NodeType.GRAPH_INPUT, "x": 0, "y": 200, "inputs": [], "outputs": [{"id": "v", "name": "V", "type": "value"}], "data": { "name": "damage_in" } },
                        { "id": "neg", "type": NodeType.MATH_MULT, "x": 150, "y": 200, "inputs": [{"id": "a", "name": "A", "type": "value"}], "outputs": [{"id": "o", "name": "O", "type": "value"}], "data": { "value": -1 } },
                        { "id": "hp", "type": NodeType.STAT, "x": 300, "y": 200, "inputs": [{"id": "modify", "name": "Mod", "type": "value"}], "outputs": [{"id": "v", "name": "V", "type": "value"}], "data": { "initialValue": 100 } }
                    ],
                    "edges": [
                        { "id": "e1", "sourceNodeId": "in", "sourceSocketId": "sig", "targetNodeId": "th", "targetSocketId": "th-in" },
                        { "id": "e2", "sourceNodeId": "th", "sourceSocketId": "trig", "targetNodeId": "imp", "targetSocketId": "imp-trigger" },
                        
                        { "id": "e3", "sourceNodeId": "dmg_in", "sourceSocketId": "v", "targetNodeId": "neg", "targetSocketId": "a" },
                        { "id": "e4", "sourceNodeId": "neg", "sourceSocketId": "o", "targetNodeId": "hp", "targetSocketId": "modify" }
                    ]
                }
            }
        },

        // --- THE EYE (Ganglion Sensor) ---
        {
            "id": "ai_eye",
            "name": "Sensor Array",
            "type": "Ganglion",
            "position": { "x": -5, "y": 6, "z": -2 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.2],
            "mass": 0.1,
            "color": "#00ff00",
            "ganglionParams": { "range": 15.0, "bandwidth": 1.0 }
        },

        // --- ENVIRONMENT ---
        {
            "id": "ground",
            "name": "Ground",
            "type": "Box",
            "position": { "x": 200, "y": -5, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [600, 1, 20],
            "mass": 0,
            "color": "#333333"
        },
        {
            "id": "ceiling",
            "name": "Ceiling",
            "type": "Box",
            "position": { "x": 200, "y": 15, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [600, 1, 20],
            "mass": 0,
            "color": "#333333",
            "opacity": 0.1
        },

        // --- PROCEDURAL PIPES ---
        ...generatePipes(100),

        // --- INPUT TERMINAL ---
        {
            "id": "btn_jump",
            "name": "HUMAN JUMP",
            "type": "InputTerminal",
            "position": { "x": 0, "y": 0, "z": 5 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": ["jump_btn"],
            "mass": 0,
            "color": "#ffd700"
        }
    ],
    "constraints": [
        {
            "id": "eye_mount",
            "type": "Lock",
            "bodyA": "player_ai",
            "bodyB": "ai_eye"
        }
    ]
} as WorldConfig;
