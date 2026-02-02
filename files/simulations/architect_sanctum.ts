// Copyright (c) 2025 vacui.dev, all rights reserved

import { WorldConfig } from "../../types/simulation";

export default {
    "gravity": { "x": 0, "y": 0, "z": 0 },
    "environment": "night",
    "description": "Architect's Sanctum: A visualization of the Kernel's idle state. Order rotating within the void.",
    "cameraConfig": {
        "mode": "manual",
        "offset": { "x": 0, "y": 5, "z": 20 }
    },
    "entities": [
        // --- THE CORE (The Kernel) ---
        {
            "id": "kernel_tesseract",
            "name": "System Kernel",
            "type": "HyperShape",
            "position": { "x": 0, "y": 2, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [1],
            "mass": 0,
            "color": "#ff8800",
            "geometryParams": {
                "dimensions": 4,
                "vertices": [], // Auto-generated
                "edges": [],
                "rotationSpeed": [0.2, 0.1, 0.05] // Slow, deliberate rotation
            }
        },
        // Inner Glow
        {
            "id": "kernel_glow",
            "name": "Core Glow",
            "type": "Sphere",
            "position": { "x": 0, "y": 2, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.8],
            "mass": 0,
            "color": "#ff4400",
            "emissive": "#ff4400",
            "emissiveIntensity": 2.0,
            "opacity": 0.5
        },

        // --- THE BUS (Data Flow) ---
        {
            "id": "system_bus",
            "name": "Data Bus",
            "type": "Harmonic",
            "position": { "x": 0, "y": -5, "z": 0 },
            "rotation": { "x": Math.PI / 2, "y": 0, "z": 0 }, // Flat on "floor"
            "args": [1],
            "mass": 0,
            "color": "#00aaff",
            "harmonicParams": {
                "layers": [
                    { "id": "l1", "pattern": "Waveforms.pulse", "intensity": 0.5, "phase": 0, "blendMode": "add" },
                    { "id": "l2", "pattern": "Basic Shapes.spiral", "intensity": 0.3, "phase": 0, "blendMode": "add" }
                ],
                "projection": "polar",
                "speed": 0.01,
                "trailLength": 400,
                "scale": 15,
                "resolution": 2
            }
        },

        // --- ORBITALS (Processes) ---
        // Ring 1
        ...Array.from({ length: 8 }).map((_, i) => ({
            id: `proc_a_${i}`,
            name: `Daemon ${i}`,
            type: "Sphere" as const,
            position: { "x": 0, "y": 0, "z": 0 }, // Will be overridden by Orbit
            rotation: { "x": 0, "y": 0, "z": 0 },
            args: [0.2],
            mass: 0,
            color: "#00ffff",
            "orbitParams": {
                "radius": 6,
                "eccentricity": 0,
                "inclination": 0,
                "speed": 2.0,
                "epochOffset": (i / 8) * (Math.PI * 2),
                "parentBodyId": "kernel_tesseract"
            }
        })),

        // Ring 2 (Inclined)
        ...Array.from({ length: 5 }).map((_, i) => ({
            id: `proc_b_${i}`,
            name: `Worker ${i}`,
            type: "Box" as const,
            position: { "x": 0, "y": 0, "z": 0 },
            rotation: { "x": 0, "y": 0, "z": 0 },
            args: [0.3, 0.3, 0.3],
            mass: 0,
            color: "#ff00ff",
            "orbitParams": {
                "radius": 9,
                "eccentricity": 0,
                "inclination": 45,
                "speed": 1.5,
                "epochOffset": (i / 5) * (Math.PI * 2),
                "parentBodyId": "kernel_tesseract"
            }
        })),

        // --- MONOLITHS (Memory Banks) ---
        {
            "id": "mono_1",
            "name": "Memory Bank A",
            "type": "Box",
            "position": { "x": -15, "y": 0, "z": -15 },
            "rotation": { "x": 0, "y": 0.5, "z": 0 },
            "args": [4, 20, 4],
            "mass": 0,
            "color": "#111111",
            "roughness": 0.1,
            "metalness": 0.9
        },
        {
            "id": "mono_2",
            "name": "Memory Bank B",
            "type": "Box",
            "position": { "x": 15, "y": -5, "z": -10 },
            "rotation": { "x": 0, "y": -0.2, "z": 0 },
            "args": [3, 15, 3],
            "mass": 0,
            "color": "#111111",
            "roughness": 0.1,
            "metalness": 0.9
        }
    ],
    "constraints": []
} as WorldConfig;