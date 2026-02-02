
// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { useHingeConstraint, useSpring, useDistanceConstraint, useLockConstraint } from '@react-three/cannon';
import { Constraint, Vector3 } from '../../types/simulation';
import * as THREE from 'three';
import { Muscle, Rope } from '../biology/Muscle';
import { ChemicalBond } from '../chemistry/MoleculeRenderer';

const VecToTuple = (v: Vector3): [number, number, number] => [v.x, v.y, v.z];

interface ConstraintsSystemProps {
    constraints: Constraint[];
    getRef: (id: string) => { ref: THREE.Object3D, api: any } | null;
}

export const ConstraintsSystem: React.FC<ConstraintsSystemProps> = ({ constraints, getRef }) => {
    return (
        <>
            {constraints.map(c => <SingleConstraint key={c.id} config={c} getRef={getRef} />)}
        </>
    );
};

const SingleConstraint: React.FC<{ config: Constraint, getRef: (id: string) => any }> = ({ config, getRef }) => {
    const { bodyA, bodyB, type, pivotA, pivotB, axisA, axisB, renderAs, ...rest } = config;
    const objA = getRef(bodyA);
    const objB = getRef(bodyB);
    const opts = {
        pivotA: pivotA ? VecToTuple(pivotA) : undefined,
        pivotB: pivotB ? VecToTuple(pivotB) : undefined,
        axisA: axisA ? VecToTuple(axisA) : undefined,
        axisB: axisB ? VecToTuple(axisB) : undefined,
        ...rest
    };
    if (!objA || !objB) return null;
    
    // Render specific visualizers if requested
    if (renderAs === 'muscle') return <Muscle config={config} refA={objA.ref} refB={objB.ref} />;
    if (renderAs === 'rope') return <Rope config={config} refA={objA.ref} refB={objB.ref} />;
    if (renderAs === 'bond') return <ChemicalBond config={config} refA={objA.ref} refB={objB.ref} />;
    
    // Physics Constraints
    if (type === 'Hinge') return <HingeConstraint objA={objA} objB={objB} opts={opts} />;
    if (type === 'Spring') return <SpringConstraint objA={objA} objB={objB} opts={opts} />;
    if (type === 'Distance') return <DistanceConstraint objA={objA} objB={objB} opts={opts} />;
    if (type === 'Lock') return <LockConstraint objA={objA} objB={objB} opts={opts} />;
    
    return null;
}

const HingeConstraint = ({ objA, objB, opts }: any) => { useHingeConstraint(objA.ref, objB.ref, opts); return null; }
const SpringConstraint = ({ objA, objB, opts }: any) => { useSpring(objA.ref, objB.ref, opts); return null; }
const DistanceConstraint = ({ objA, objB, opts }: any) => { useDistanceConstraint(objA.ref, objB.ref, opts); return null; }
const LockConstraint = ({ objA, objB, opts }: any) => { useLockConstraint(objA.ref, objB.ref, opts); return null; }
