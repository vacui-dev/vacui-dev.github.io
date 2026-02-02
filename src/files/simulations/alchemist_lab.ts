// Copyright (c) 2025 vacui.dev, all rights reserved

import { WorldConfig } from "../../types/simulation";

export default { 
    "gravity": { "x": 0, "y": 0, "z": 0 }, 
    "environment": "night", 
    "description": "Alchemist Lab", 
    "entities": [
        {
            "id": "philosopher_stone",
            "name": "Philosopher Stone",
            "type": "Sphere",
            "position": { "x": 0, "y": 0, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [1],
            "mass": 1,
            "color": "#ffffff",
            "materialId": "mat_gold" 
        }
    ], 
    "constraints": [] 
} as WorldConfig;