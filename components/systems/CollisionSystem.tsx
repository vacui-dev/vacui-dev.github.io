
// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { useFrame } from '@react-three/fiber';
import { WorldConfig } from '../../types/simulation';
import { collisionSystem } from '../../services/CollisionSystem';

export const CollisionSystem: React.FC<{ config: WorldConfig }> = ({ config }) => {
    useFrame((state) => {
        collisionSystem.step(config.entities, state.clock.elapsedTime);
    });
    return null;
};
