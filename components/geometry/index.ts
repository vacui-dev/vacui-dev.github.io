
// Copyright (c) 2025 vacui.dev, all rights reserved

import { registerEntity } from '../Simulation/EntityRegistry';
import { HyperRenderer } from './HyperRenderer';
import { ManifoldRenderer } from './ManifoldRenderer';
import { PathRenderer } from './PathRenderer';

export const registerGeometry = () => {
    registerEntity('HyperShape', HyperRenderer);
    registerEntity('Manifold', ManifoldRenderer);
    registerEntity('Path', PathRenderer);
};
