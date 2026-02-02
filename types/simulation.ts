// Copyright (c) 2025 vacui.dev, all rights reserved

import { NodeGraph, PortDefinition } from './nodes';

// --- CORE GEOMETRY ---
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type ShapeType = 'Box' | 'Sphere' | 'Cylinder' | 'Plane' | 'Cone' | 'Bone' | 'Atmosphere' | 'Fire' | 'Agent' | 'MarketHand' | 'Ganglion' | 'Molecule' | 'HyperShape' | 'Manifold' | 'Path' | 'Harmonic' | 'Planet' | 'InputTerminal' | 'ReactiveMesh';
export type ConstraintType = 'Hinge' | 'Spring' | 'Distance' | 'Lock' | 'Relation';

// --- ENTITIES & WORLD ---

export interface LogicParams {
    nodeGraph: NodeGraph;
}

export interface MembraneMapping {
    externalPortId: string;
    internalNodeId: string;
    internalSocketId: string;
}

export interface Entity {
  id: string;
  name: string;
  type: ShapeType;
  position: Vector3;
  rotation: Vector3;
  args: (number | string)[];
  mass: number;
  color: string;
  opacity?: number;
  roughness?: number;
  metalness?: number;
  velocity?: Vector3;
  emissive?: string;
  emissiveIntensity?: number;
  
  conceptId?: string; 
  materialId?: string;

  // Component Bags
  logicParams?: LogicParams;
  
  // Holon Architecture
  internalGraph?: NodeGraph;
  exposedPorts?: PortDefinition[];
  portMappings?: MembraneMapping[];
  implements?: string[]; // List of Protocol IDs this entity adheres to
  
  // Interaction / Trigger
  triggerParams?: {
      active: boolean;
      radius: number;
      protocolId?: string; // The protocol to invoke on overlap (e.g. 'damageable')
      targetId?: string;   // For direct "Psychic" reference
  };
  
  // Legacy specific params
  shaderParams?: any;
  fireParams?: any;
  socialParams?: any;
  ganglionParams?: any;
  chemicalParams?: any;
  geometryParams?: any;
  manifoldParams?: any;
  pathParams?: any;
  harmonicParams?: any;
  orbitParams?: any;
  planetParams?: any;
  architecturalBind?: {
      associationId: string;
      moduleId: string;
  };
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  bodyA: string;
  bodyB: string;
  pivotA?: Vector3;
  pivotB?: Vector3;
  axisA?: Vector3;
  axisB?: Vector3;
  stiffness?: number;
  damping?: number;
  restLength?: number;
  renderAs?: 'line' | 'muscle' | 'rope' | 'bond';
  relationParams?: {
      sourceProp: string;
      targetProp: string;
      multiplier: number;
      offset: number;
  };
}

export interface WorldConfig {
  gravity: Vector3;
  wind?: Vector3;
  windField?: any;
  physicsRules?: any[];
  entities: Entity[];
  constraints: Constraint[];
  dataStreams?: any[];
  tracks?: Track[];
  wordlessAssociation?: any;
  cameraConfig?: any;
  environment: string;
  description: string;
}

// --- TIMELINE ---
export interface Keyframe<T = any> {
    id: string;
    time: number;
    value: T;
    interpolation: 'linear' | 'step' | 'bezier';
    easing?: [number, number, number, number];
    meta?: any;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    ticks?: number;
}

export interface Track<T = any> {
    id: string;
    targetId: string;
    property: string;
    keyframes: Keyframe<T>[];
    loop?: boolean;
    duration?: number;
}
