// Copyright (c) 2025 vacui.dev, all rights reserved

import { WorldConfig, Entity, Constraint } from "../../types/simulation";
import { WordlessAssociation } from "../../types/legacy";

// --- HELPER FUNCTIONS FOR MODULAR CONSTRUCTION ---

const createGlassWall = (id: string, pos: [number, number, number], size: [number, number, number], rot: [number, number, number] = [0, 0, 0], bind?: { associationId: string, moduleId: string }): Entity => ({
    id,
    name: "Glass Wall",
    type: "Box",
    position: { x: pos[0], y: pos[1], z: pos[2] },
    rotation: { x: rot[0], y: rot[1], z: rot[2] },
    args: size,
    mass: 0, // Static
    color: "#aaddff",
    opacity: 0.2,
    roughness: 0.0,
    metalness: 0.9,
    architecturalBind: bind
});

const createDataParticle = (i: number, x: number, y: number, bind?: { associationId: string, moduleId: string }): Entity => ({
    id: `datum_${i}`,
    name: "Knowledge Drop",
    type: "Sphere",
    position: { x: x + (Math.random() - 0.5), y: y + (Math.random() * 2), z: (Math.random() - 0.5) },
    rotation: { x: 0, y: 0, z: 0 },
    args: [0.15],
    mass: 0.5,
    color: "#00ffff",
    roughness: 0.2,
    metalness: 0.8,
    architecturalBind: bind
    // Viscosity / Learning Rate simulation
    // Higher damping = Lower Learning Rate (Thick fluid)
    // Lower damping = High Learning Rate (Runny fluid, overshoots minima)
    // We default to a "Momentum" style config
});

// --- SCENE CONSTRUCTION ---

const entities: Entity[] = [];
const constraints: Constraint[] = [];

const ASSOC_ID = "hydro_neural_v1";

// 1. THE INPUT RESERVOIR (Batch Buffer)
// Binds to the concept of "Holding/Container" and "Input"
const inputBind = { associationId: ASSOC_ID, moduleId: "input_reservoir" };

entities.push(
    createGlassWall("res_left", [-2, 12, 0], [0.2, 4, 2], [0, 0, -0.2], inputBind),
    createGlassWall("res_right", [2, 12, 0], [0.2, 4, 2], [0, 0, 0.2], inputBind),
    createGlassWall("res_front", [0, 12, 1], [4, 4, 0.2], [0,0,0], inputBind),
    createGlassWall("res_back", [0, 12, -1], [4, 4, 0.2], [0,0,0], inputBind)
);

// 2. THE RECTIFIED LINEAR UNIT (ReLU Valve)
// A physical gate that only opens downwards.
// Conceptually bounds to "Rectification" and "Gate".
entities.push({
    id: "relu_gate",
    name: "ReLU Activation",
    type: "Box",
    position: { x: 0, y: 9.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    args: [1.8, 0.1, 1.8],
    mass: 1,
    color: "#ff0055",
    architecturalBind: { associationId: ASSOC_ID, moduleId: "relu_activation" }
});

// Pin the gate on one side so it acts like a trapdoor
constraints.push({
    id: "relu_hinge",
    type: "Hinge",
    bodyA: "res_left", // Anchor to the wall
    bodyB: "relu_gate",
    pivotA: { x: 0, y: -2, z: 0 },
    pivotB: { x: -0.9, y: 0, z: 0 },
    axisA: { x: 0, y: 0, z: 1 },
    axisB: { x: 0, y: 0, z: 1 },
    // Limits: Only open down (0 to -PI/2)
});

// 3. THE HIDDEN LAYER (Processing Pipes)
// Funnels the data into two distinct paths (Features)
const hiddenBind = { associationId: ASSOC_ID, moduleId: "hidden_layer" };
entities.push(
    createGlassWall("pipe_split", [0, 7, 0], [0.2, 2, 2], [0,0,0], hiddenBind), // Divider
    createGlassWall("pipe_outer_l", [-3, 6, 0], [0.2, 4, 2], [0, 0, -0.5], hiddenBind),
    createGlassWall("pipe_outer_r", [3, 6, 0], [0.2, 4, 2], [0, 0, 0.5], hiddenBind)
);

// 4. THE LOSS LANDSCAPE (Gradient Descent Terrain)
// Instead of a flat floor, we build a non-convex optimization surface.
// Data needs to settle in the global minimum (center), but might get stuck in local minima (sides).
const lossBind = { associationId: ASSOC_ID, moduleId: "loss_landscape" };

// Local Minimum (Left Trap)
entities.push({
    id: "loss_local_min",
    name: "Local Minimum",
    type: "Box",
    position: { x: -4, y: 1, z: 0 },
    rotation: { x: 0, y: 0, z: -0.2 },
    args: [4, 0.5, 4],
    mass: 0,
    color: "#444444",
    architecturalBind: lossBind
});

// Global Minimum (The Goal)
entities.push({
    id: "loss_global_min_l",
    name: "Gradient Slope L",
    type: "Box",
    position: { x: -1.5, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: -0.5 },
    args: [3, 0.5, 4],
    mass: 0,
    color: "#222222",
    architecturalBind: lossBind
});
entities.push({
    id: "loss_global_min_r",
    name: "Gradient Slope R",
    type: "Box",
    position: { x: 1.5, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0.5 },
    args: [3, 0.5, 4],
    mass: 0,
    color: "#222222",
    architecturalBind: lossBind
});

// 5. VISUALIZATION MANIFOLD (The Mathematical Ideal)
// Floating above the physical simulation is the mathematical representation of the loss function.
entities.push({
    id: "loss_manifold",
    name: "Loss Function Visualizer",
    type: "Manifold",
    position: { x: 0, y: 5, z: -5 },
    rotation: { x: 0, y: 0, z: 0 },
    args: [1],
    mass: 0,
    color: "#ff00ff",
    manifoldParams: {
        iterations: 6,
        scaleFactor: 0.85,
        rotationalVelocity: { x: 0.02, y: 0.05, z: 0.01 },
        divergenceColor: "#00ffff"
    },
    architecturalBind: lossBind
});

// 6. THE DATA (Fluid)
// Spawn a batch of "knowledge"
const dataBind = { associationId: ASSOC_ID, moduleId: "data_batch" };
for (let i = 0; i < 60; i++) {
    entities.push(createDataParticle(i, 0, 14, dataBind));
}

// --- WORDLESS ASSOCIATION DEFINITION ---

const wordlessAssociation: WordlessAssociation = {
    id: ASSOC_ID,
    label: "Hydro-Neural Interface v1",
    paradigm: "FLUID_DYNAMICS",
    strategy: "GRADIENT_DESCENT",
    modules: [
        {
            id: "input_reservoir",
            label: "Batch Buffer",
            role: "INPUT",
            principle: "Data accumulation allows for batch processing, stabilizing the gradient.",
            mechanism: "A high-walled glass reservoir that builds up hydrostatic pressure.",
            conceptId: "ILI§70215", // Container/Reservoir
            io: {
                input: ["Raw Training Data"],
                output: ["Pressurized Batch"]
            }
        },
        {
            id: "relu_activation",
            label: "ReLU Gate",
            role: "GATE",
            principle: "Non-linearity is required to segment the solution space. Negative signals must be rectified.",
            mechanism: "A hinged valve that only opens under positive downward pressure.",
            conceptId: "ILI§35661", // Entry/Gate/Admission
            io: {
                input: ["Pressurized Batch"],
                output: ["Rectified Flow"]
            }
        },
        {
            id: "hidden_layer",
            label: "Feature Channels",
            role: "TRANSFORM",
            principle: "Data must be projected into higher dimensions to become linearly separable.",
            mechanism: "Diverging pipes that split the flow based on position (feature extraction).",
            conceptId: "ILI§69097", // Direction/Channel
            io: {
                input: ["Rectified Flow"],
                output: ["Feature Map"]
            }
        },
        {
            id: "loss_landscape",
            label: "Optimization Surface",
            role: "LOSS",
            principle: "Learning is the minimization of error. The system seeks the lowest energy state.",
            mechanism: "Gravity acts as the optimizer. The geometry of the floor represents the Loss Function.",
            conceptId: "ILI§113417", // Danger/Risk/Loss (Metaphorical)
            io: {
                input: ["Feature Map"],
                output: ["Minimized State"]
            }
        },
        {
            id: "data_batch",
            label: "Knowledge Drops",
            role: "MEMORY",
            principle: "Information is discrete but flows continuously.",
            mechanism: "Individual spheres representing data points. Their collective behavior mimics fluid dynamics.",
            conceptId: "ILI§35567", // Substance/Matter/Data
            io: {
                input: ["Entropy"],
                output: ["Structure"]
            }
        }
    ],
    associations: [
        { fromModuleId: "input_reservoir", toModuleId: "relu_activation", relation: "→", label: "Pressure" },
        { fromModuleId: "relu_activation", toModuleId: "hidden_layer", relation: "⸫", label: "Implication" },
        { fromModuleId: "hidden_layer", toModuleId: "loss_landscape", relation: "⚡", label: "Causality" },
        { fromModuleId: "data_batch", toModuleId: "input_reservoir", relation: "⊂", label: "Contained In" }
    ]
};

export default { 
    "gravity": { "x": 0, "y": -9.81, "z": 0 }, 
    "environment": "warehouse", 
    "description": "Neural Hydraulics: A physical metaphor for Gradient Descent. Data (fluid) flows through the Architecture (pipes), passes Activation Functions (valves), and settles into the Loss Landscape.", 
    "entities": entities, 
    "constraints": constraints,
    "wordlessAssociation": wordlessAssociation
} as WorldConfig;