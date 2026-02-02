// Copyright (c) 2025 vacui.dev, all rights reserved

export type PatternFunction = (theta: number) => number;

export const patterns: Record<string, Record<string, PatternFunction>> = {
    "Basic Shapes": {
        circle: (theta) => 1.0,
        square: (theta) => {
            const angle = theta % (Math.PI * 2);
            return 1.0 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
        },
        triangle: (theta) => {
            const normalized = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const segment = Math.floor(normalized / (Math.PI * 2 / 3));
            const angleInSegment = normalized - segment * (Math.PI * 2 / 3);
            return 1.0 / Math.cos(angleInSegment - Math.PI / 3);
        },
        star: (theta) => {
            const points = 5;
            const angle = (theta % (Math.PI * 2 / points)) * points;
            return 0.5 + 0.5 * Math.cos(angle * 5);
        },
        flower: (theta) => 0.6 + 0.4 * Math.abs(Math.sin(theta * 4)),
        spiral: (theta) => ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
        pinwheel: (theta) => Math.sin(theta * 2),
    },
    "Trigonometric": {
        sine: (theta) => Math.sin(theta),
        cosine: (theta) => Math.cos(theta),
        tangent: (theta) => Math.tan(theta) / 10,
    },
    "Neural Activations": {
        sigmoid: (theta) => {
            const x = Math.sin(theta * 2);
            return 1 / (1 + Math.exp(-x));
        },
        gelu: (theta) => {
            const x = Math.sin(theta * 2);
            return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
        },
        relu: (theta) => Math.max(0, Math.sin(theta)),
        swish: (theta) => {
            const x = Math.sin(theta * 2);
            return x / (1 + Math.exp(x));
        }
    },
    "Waveforms": {
        sawtooth: (theta) => (theta % (2 * Math.PI)) / (2 * Math.PI) * 2 - 1,
        square_wave: (theta) => Math.sin(theta) >= 0 ? 1 : -1,
        pulse: (theta) => {
            const norm = (theta % (Math.PI * 2));
            return (norm < 0.5) ? 1.0 : 0.0;
        },
        heartbeat: (theta) => {
            const t = ((theta * 5) % (Math.PI * 2)) / (Math.PI * 2);
            const g = (c: number, w: number, h: number) => h * Math.exp(-Math.pow((t - c) / w, 2));
            return g(0.16, 0.015, 0.1) + g(0.25, 0.008, -0.25) + g(0.30, 0.005, 1.0) + g(0.35, 0.010, -0.35);
        }
    },
    "Chaos": {
        logistic_map: (theta) => {
            const x = (Math.sin(theta) + 1) / 2;
            const r = 3.9;
            return r * x * (1 - x);
        },
        noise: (theta) => Math.sin(theta) + Math.sin(theta * 3.1) * 0.5 + Math.sin(theta * 7.2) * 0.2
    }
};

export const resolvePattern = (path: string): PatternFunction => {
    const [group, name] = path.split('.');
    return patterns[group]?.[name] || patterns["Basic Shapes"].circle;
};
