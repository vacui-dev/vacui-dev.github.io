
// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { Entity } from '../../types/simulation';
import * as THREE from 'three';

export interface EntityComponentProps {
    config: any;
    display: any;
    onRef: (ref: THREE.Object3D, api: any) => void;
    bind?: any;
    registry: Record<string, { ref: THREE.Object3D, api: any }>;
    allEntities: Entity[];
    entity: Entity; // Full entity access
}

type EntityComponent = React.FC<EntityComponentProps>;

const registry = new Map<string, EntityComponent>();

export const registerEntity = (type: string, component: EntityComponent) => {
    registry.set(type, component);
    console.log(`[EntityRegistry] Registered: ${type}`);
};

export const getEntityComponent = (type: string): EntityComponent | undefined => {
    return registry.get(type);
};
