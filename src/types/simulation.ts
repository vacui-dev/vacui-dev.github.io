// Types for the simulation engine — stubs for missing definitions
// These will be fleshed out as the OS evolves

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsRule {
  id: string;
  name: string;
  type: string;
  script: string;
  active: boolean;
}

export interface GeometryParams {
  dimensions?: number;
  vertices?: number[][];
  edges?: number[][];
  rotationSpeed?: number[];
}

export interface HarmonicParams {
  nodeGraph?: any;
  layers?: any[];
  projection?: string;
  speed?: number;
  trailLength?: number;
  scale?: number;
  resolution?: number;
}

export interface ChemicalParams {
  element?: string;
  atomicNumber?: number;
  valency?: number;
  isReactive?: boolean;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  position: Vec3;
  rotation: Vec3;
  args: number[];
  mass: number;
  color: string;
  roughness?: number;
  geometryParams?: GeometryParams;
  harmonicParams?: HarmonicParams;
  chemicalParams?: ChemicalParams;
  [key: string]: any;
}

export interface Constraint {
  id: string;
  type: string;
  bodyA: string;
  bodyB: string;
  [key: string]: any;
}

export interface WorldConfig {
  gravity: Vec3;
  environment: string;
  description: string;
  physicsRules: PhysicsRule[];
  entities: Entity[];
  constraints: Constraint[];
  [key: string]: any;
}
