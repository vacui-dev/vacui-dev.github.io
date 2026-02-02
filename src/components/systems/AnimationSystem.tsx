// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { useFrame } from '@react-three/fiber';
import { timelineService } from '../../services/TimelineService';
import { timeEngine } from '../../services/TimeEngine';
import * as THREE from 'three';

interface AnimationSystemProps {
    registry: Record<string, { ref: THREE.Object3D, api: any }>;
}

export const AnimationSystem: React.FC<AnimationSystemProps> = ({ registry }) => {
    
    useFrame(() => {
        // 1. Get Current Time
        const jd = timeEngine.getJulianDate();

        // 2. Evaluate Timeline
        const updates = timelineService.evaluate(jd);

        // 3. Apply to Registry
        Object.entries(updates).forEach(([id, props]) => {
            const reg = registry[id];
            if (reg && reg.ref) {
                Object.entries(props).forEach(([prop, value]) => {
                    const val = value as any; // Type cast for dynamic assignment

                    if (prop === 'position') {
                        if (Array.isArray(val) && val.length === 3) {
                            // If physics API exists, use it, otherwise set ref
                            if (reg.api && reg.api.position) {
                                reg.api.position.set(val[0], val[1], val[2]);
                            } else {
                                reg.ref.position.set(val[0], val[1], val[2]);
                            }
                        }
                    } else if (prop === 'rotation') {
                        if (Array.isArray(val) && val.length === 3) {
                            if (reg.api && reg.api.rotation) {
                                reg.api.rotation.set(val[0], val[1], val[2]);
                            } else {
                                reg.ref.rotation.set(val[0], val[1], val[2]);
                            }
                        }
                    } else if (prop.startsWith('rotation.')) {
                        const axis = prop.split('.')[1];
                        if (typeof val === 'number') {
                            // This is tricky with Physics API which usually wants full vectors
                            // Use direct ref for simple animations, physics might fight it
                            if (axis === 'x') reg.ref.rotation.x = val;
                            if (axis === 'y') reg.ref.rotation.y = val;
                            if (axis === 'z') reg.ref.rotation.z = val;
                        }
                    } else if (prop.startsWith('position.')) {
                        const axis = prop.split('.')[1];
                        if (typeof val === 'number') {
                            if (axis === 'x') reg.ref.position.x = val;
                            if (axis === 'y') reg.ref.position.y = val;
                            if (axis === 'z') reg.ref.position.z = val;
                        }
                    } else if (prop === 'visible') {
                        reg.ref.visible = !!val;
                    }
                });
            }
        });
    });

    return null;
};