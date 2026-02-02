// Copyright (c) 2025 vacui.dev, all rights reserved

import { Vector3, Entity } from "../types/simulation";

export interface Boundary {
    x: number;
    y: number;
    z: number;
    w: number; // half-width
    h: number; // half-height
    d: number; // half-depth
}

export class Octree {
    private boundary: Boundary;
    private capacity: number;
    private entities: Entity[] = [];
    private divided: boolean = false;
    
    // Children
    private children: Octree[] = [];

    constructor(boundary: Boundary, capacity: number = 4) {
        this.boundary = boundary;
        this.capacity = capacity;
    }

    public clear() {
        this.entities = [];
        this.divided = false;
        this.children = [];
    }

    public insert(entity: Entity): boolean {
        if (!this.contains(this.boundary, entity.position)) {
            return false;
        }

        if (this.entities.length < this.capacity) {
            this.entities.push(entity);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        for (const child of this.children) {
            if (child.insert(entity)) return true;
        }

        return false;
    }

    public query(range: Boundary, found: Entity[] = []): Entity[] {
        if (!this.intersects(this.boundary, range)) {
            return found;
        }

        for (const entity of this.entities) {
            if (this.contains(range, entity.position)) {
                found.push(entity);
            }
        }

        if (this.divided) {
            for (const child of this.children) {
                child.query(range, found);
            }
        }

        return found;
    }

    // --- MATH HELPERS ---

    private subdivide() {
        const { x, y, z, w, h, d } = this.boundary;
        const newW = w / 2;
        const newH = h / 2;
        const newD = d / 2;

        const sectors = [
            { x: x - newW, y: y + newH, z: z - newD }, // Top Left Front
            { x: x + newW, y: y + newH, z: z - newD }, // Top Right Front
            { x: x - newW, y: y - newH, z: z - newD }, // Bot Left Front
            { x: x + newW, y: y - newH, z: z - newD }, // Bot Right Front
            { x: x - newW, y: y + newH, z: z + newD }, // Top Left Back
            { x: x + newW, y: y + newH, z: z + newD }, // Top Right Back
            { x: x - newW, y: y - newH, z: z + newD }, // Bot Left Back
            { x: x + newW, y: y - newH, z: z + newD }  // Bot Right Back
        ];

        this.children = sectors.map(s => new Octree({ ...s, w: newW, h: newH, d: newD }, this.capacity));
        this.divided = true;
    }

    private contains(b: Boundary, p: Vector3): boolean {
        return (
            p.x >= b.x - b.w && p.x <= b.x + b.w &&
            p.y >= b.y - b.h && p.y <= b.y + b.h &&
            p.z >= b.z - b.d && p.z <= b.z + b.d
        );
    }

    private intersects(a: Boundary, b: Boundary): boolean {
        return (
            Math.abs(a.x - b.x) < (a.w + b.w) &&
            Math.abs(a.y - b.y) < (a.h + b.h) &&
            Math.abs(a.z - b.z) < (a.d + b.d)
        );
    }
}