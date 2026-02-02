// Copyright (c) 2025 vacui.dev, all rights reserved

import { NodeType, GeometrySignal } from '../../types/nodes';

// --- SHAPE FUNCTIONS (Theta -> Radius) ---
export const SHAPE_FUNCTIONS: Partial<Record<NodeType, (theta: number) => number>> = {
    [NodeType.SHAPE_CIRCLE]: () => 1.0,
    [NodeType.SHAPE_SQUARE]: (theta) => {
        const angle = theta % (Math.PI * 2);
        return 1.0 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    },
    [NodeType.SHAPE_TRIANGLE]: (theta) => {
        const normalizedAngle = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const segment = Math.floor(normalizedAngle / (Math.PI * 2 / 3));
        const angleInSegment = normalizedAngle - segment * (Math.PI * 2 / 3);
        return 1.0 / Math.cos(angleInSegment - Math.PI / 3);
    },
    [NodeType.SHAPE_STAR]: (theta) => {
        const points = 5;
        const angle = (theta % (Math.PI * 2 / points)) * points;
        return 0.5 + 0.5 * Math.cos(angle * 5);
    },
    [NodeType.SHAPE_FLOWER]: (theta) => 0.6 + 0.4 * Math.abs(Math.sin(theta * 4)),
    [NodeType.SHAPE_SPIRAL_PATTERN]: (theta) => ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) + 0.2,
    [NodeType.SHAPE_SAWTOOTH]: (theta) => ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2),
    [NodeType.SHAPE_HEARTBEAT]: (theta) => {
        const t = ((theta * 5) % (Math.PI * 2)) / (Math.PI * 2);
        const g = (c: number, w: number, h: number) => h * Math.exp(-Math.pow((t - c) / w, 2));
        return 1.0 + g(0.16, 0.015, 0.1) + g(0.25, 0.008, -0.25) + g(0.30, 0.005, 1.0) + g(0.35, 0.010, -0.35);
    },
    [NodeType.SHAPE_NOISE]: () => 0.8 + 0.4 * Math.random()
};

// --- PROJECTION FUNCTIONS (Point + Time -> Transformed Point) ---
export const PROJECTION_FUNCTIONS: Partial<Record<NodeType, (pt: GeometrySignal, time: number) => GeometrySignal>> = {
    [NodeType.PROJ_STATIC]: (pt, time) => {
        const r = pt.radius * (pt.zoom || 1);
        return {
            ...pt,
            x: Math.cos(pt.angle) * r,
            y: Math.sin(pt.angle) * r,
            z: 0
        };
    },
    [NodeType.PROJ_ROTATING]: (pt, time) => {
        const r = pt.radius * (pt.zoom || 1);
        const finalAngle = pt.angle + time;
        return {
            ...pt,
            x: Math.cos(finalAngle) * r,
            y: Math.sin(finalAngle) * r,
            z: 0
        };
    },
    [NodeType.PROJ_CYLINDER]: (pt, time) => {
        // Map x (angle) and y (height) to cylinder
        const r = 5 * (pt.zoom || 1);
        return {
            ...pt,
            x: Math.cos(pt.angle) * r,
            y: pt.radius * 5, // Treat input radius as height for this projection
            z: Math.sin(pt.angle) * r
        };
    },
    [NodeType.PROJ_SPIRAL]: (pt, time) => {
        const r = pt.radius * (pt.zoom || 1);
        const z = time * 2; 
        return {
            ...pt,
            x: Math.cos(pt.angle) * r,
            y: Math.sin(pt.angle) * r,
            z: z
        };
    }
};