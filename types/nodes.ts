
// Copyright (c) 2025 vacui.dev, all rights reserved

export enum NodeType {
    // --- INPUTS ---
    TIME = 'TIME',
    VALUE = 'VALUE',
    AUDIO_SOURCE = 'AUDIO_SOURCE',
    MIDI_SOURCE = 'MIDI_SOURCE',
    INPUT_RECEIVER = 'INPUT_RECEIVER', // Reads from InputTerminal or OS Input
    
    // --- ANALYSIS ---
    AUDIO_ANALYZE = 'AUDIO_ANALYZE', // FFT, Amplitude
    MIDI_ANALYZE = 'MIDI_ANALYZE', // Note data
    
    // --- MATH ---
    MATH_ADD = 'MATH_ADD',
    MATH_SUB = 'MATH_SUB',
    MATH_MULT = 'MATH_MULT',
    MATH_DIV = 'MATH_DIV',
    MATH_MOD = 'MATH_MOD',
    MATH_SIN = 'MATH_SIN',
    MATH_COS = 'MATH_COS',
    MATH_ABS = 'MATH_ABS',
    MATH_MAP = 'MATH_MAP',     // Map range
    MATH_CLAMP = 'MATH_CLAMP', // Clamp value
    THRESHOLD = 'THRESHOLD',
    
    // --- LOGIC ---
    LOGIC_AND = 'LOGIC_AND',
    LOGIC_OR = 'LOGIC_OR',
    LOGIC_NOT = 'LOGIC_NOT',
    LOGIC_GREATER = 'LOGIC_GREATER',

    // --- DATA & STATE (RPG) ---
    STAT = 'STAT',           // Persistent Number (Health, Mana)
    INVENTORY = 'INVENTORY', // Persistent Item List
    ITEM = 'ITEM',           // Item Data Definition

    // --- SEQUENCING ---
    STEP_SEQUENCER = 'STEP_SEQUENCER', // Pattern string -> Trigger

    // --- SHAPES (Generators) ---
    SHAPE_CIRCLE = 'SHAPE_CIRCLE',
    SHAPE_SQUARE = 'SHAPE_SQUARE',
    SHAPE_TRIANGLE = 'SHAPE_TRIANGLE',
    SHAPE_STAR = 'SHAPE_STAR',
    SHAPE_FLOWER = 'SHAPE_FLOWER',
    SHAPE_SPIRAL_PATTERN = 'SHAPE_SPIRAL_PATTERN',
    SHAPE_NOISE = 'SHAPE_NOISE',
    SHAPE_HEARTBEAT = 'SHAPE_HEARTBEAT',
    SHAPE_SAWTOOTH = 'SHAPE_SAWTOOTH',
    
    // --- CONVERTERS ---
    CONVERT_POLAR = 'CONVERT_POLAR', // (r, theta) -> Point
    
    // --- PROJECTIONS (Point Transformations) ---
    PROJ_STATIC = 'PROJ_STATIC',
    PROJ_ROTATING = 'PROJ_ROTATING',
    PROJ_SPIRAL = 'PROJ_SPIRAL',
    PROJ_SPEW = 'PROJ_SPEW', // Particle spew effect
    PROJ_CYLINDER = 'PROJ_CYLINDER', // Wrap around cylinder
    PROJ_KALEIDOSCOPE = 'PROJ_KALEIDOSCOPE', 

    // --- STRUCTURAL (Holon) ---
    SUB_GRAPH = 'SUB_GRAPH',
    GRAPH_INPUT = 'GRAPH_INPUT',
    GRAPH_OUTPUT = 'GRAPH_OUTPUT',

    // --- OUTPUTS ---
    VISUAL_OUTPUT = 'VISUAL_OUTPUT', // Renders geometry/particles
    AUDIO_OUTPUT = 'AUDIO_OUTPUT',   // Emits sound
    PROPERTY_OUTPUT = 'PROPERTY_OUTPUT', // Drives Entity Props (Pos, Rot, Color)
    IMPULSE = 'IMPULSE',             // Physics Force
    SAMPLER = 'SAMPLER',             // Plays audio sample
    TRIGGER_EVENT = 'TRIGGER_EVENT'  // Game Logic Event
}

export interface GraphSocket {
    id: string;
    name: string;
    type: 'value' | 'point' | 'audio' | 'vector' | 'trigger' | 'geometry' | 'item';
}

export interface GraphNode {
    id: string;
    type: NodeType;
    x: number;
    y: number;
    inputs: GraphSocket[];
    outputs: GraphSocket[];
    data: Record<string, any>;
}

export interface GraphEdge {
    id: string;
    sourceNodeId: string;
    sourceSocketId: string;
    targetNodeId: string;
    targetSocketId: string;
}

export interface NodeGraph {
    id: string;
    name?: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface GeometrySignal {
    x?: number;
    y?: number;
    z?: number;
    radius: number;
    angle: number;
    zoom: number;
    lineWidth: number;
    projectionMode?: string;
}

// --- HOLON ARCHITECTURE ---

export type PortType = 'signal' | 'value' | 'geometry' | 'audio' | 'item' | 'data' | 'protocol';

export interface PortDefinition {
    id: string;
    name: string;
    type: PortType;
    direction: 'input' | 'output';
}
