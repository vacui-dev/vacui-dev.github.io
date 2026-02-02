// Copyright (c) 2025 vacui.dev, all rights reserved

import { Entity, Vector3 } from "../types/simulation";
import { Octree, Boundary } from "./Octree";
import { signalEngine } from "./SignalEngine";
import { midiAudio } from "./MidiAudioEngine";

class CollisionSystemService {
    private tree: Octree;
    private bounds: Boundary = { x: 0, y: 0, z: 0, w: 500, h: 500, d: 500 }; // World Size

    constructor() {
        this.tree = new Octree(this.bounds);
    }

    /**
     * Step:
     * 1. Rebuild Octree with all entities.
     * 2. Identify "Trigger" entities (those broadcasting a protocol).
     * 3. Query Octree for neighbors.
     * 4. Execute Interactions.
     */
    public step(entities: Entity[], time: number) {
        this.tree.clear();
        
        // 1. Insert
        for (const entity of entities) {
            this.tree.insert(entity);
        }

        // 2. Scan for Triggers
        for (const source of entities) {
            if (source.triggerParams && source.triggerParams.active) {
                const range = source.triggerParams.radius;
                
                // Define Query Box around Trigger
                const queryBox: Boundary = {
                    x: source.position.x,
                    y: source.position.y,
                    z: source.position.z,
                    w: range, h: range, d: range
                };

                const neighbors = this.tree.query(queryBox);

                for (const target of neighbors) {
                    if (source.id === target.id) continue;

                    // Check precise distance (Octree returns box results)
                    const dist = this.distance(source.position, target.position);
                    if (dist <= range) {
                        this.handleOverlap(source, target, time);
                    }
                }
            }
        }
    }

    private handleOverlap(source: Entity, target: Entity, time: number) {
        if (!source.triggerParams) return;

        // If source has a specific protocol to broadcast
        if (source.triggerParams.protocolId) {
            // Execute Interaction
            // Note: In a real engine, we might want to debounce this (OnEnter only)
            // but for now, we apply continuous effect (e.g. standing in fire)
            
            const audioData = midiAudio.getAudioData(); // Or null if offline
            
            const result = signalEngine.evaluateInteraction(
                source, 
                target, 
                source.triggerParams.protocolId, 
                time, 
                audioData
            );

            if (result.success) {
                // console.log(`[Collision] ${source.id} hit ${target.id} via ${source.triggerParams.protocolId}`);
            }
        }
    }

    private distance(a: Vector3, b: Vector3): number {
        return Math.sqrt(
            (a.x - b.x) ** 2 + 
            (a.y - b.y) ** 2 + 
            (a.z - b.z) ** 2
        );
    }
}

export const collisionSystem = new CollisionSystemService();