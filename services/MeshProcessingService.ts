// Copyright (c) 2025 vacui.dev, all rights reserved

import * as THREE from 'three';

/**
 * MeshProcessingService
 * 
 * Ports the logic from `copy_shape_key.py` and related python scripts.
 * Handles UV-based vertex position transfer between meshes.
 */

export interface TransferParams {
    uvMapName?: string;
    areSourceUVsMirrored: boolean;
    posScoreWeight: number;
    requireMaterialMatch: boolean;
}

interface ReferenceVert {
    uv: THREE.Vector2;
    pos: THREE.Vector3;
    norm: THREE.Vector3;
}

interface ClosestVert {
    golfScore: number;
    vert: ReferenceVert | null;
}

export class MeshProcessingService {

    /**
     * The core algorithm from `FindClosest` / `MoveVertToBestPos`.
     * Transfers vertex positions from source geometry to target geometry based on UV proximity.
     */
    public transferShape(
        sourceGeo: THREE.BufferGeometry,
        targetGeo: THREE.BufferGeometry,
        params: TransferParams
    ): THREE.BufferGeometry {
        console.log("MeshProcessing: Starting Shape Transfer...");
        
        const sourceVerts = this.extractReferenceVerts(sourceGeo);
        const targetPosAttr = targetGeo.attributes.position.clone();
        const targetNormAttr = targetGeo.attributes.normal ? targetGeo.attributes.normal.clone() : null;
        const targetUVAttr = targetGeo.attributes.uv;

        if (!targetUVAttr) {
            console.error("Target mesh has no UVs.");
            return targetGeo;
        }

        const count = targetUVAttr.count;
        const tempPos = new THREE.Vector3();
        const tempUV = new THREE.Vector2();

        // Iterate over all vertices in target
        for (let i = 0; i < count; i++) {
            tempPos.fromBufferAttribute(targetPosAttr, i);
            tempUV.fromBufferAttribute(targetUVAttr as THREE.BufferAttribute, i);

            // Find closest vertices in source
            const bestPos = this.calculateBestPosition(sourceVerts, tempUV, tempPos, params);
            
            // Update Target
            if (bestPos) {
                targetPosAttr.setXYZ(i, bestPos.pos.x, bestPos.pos.y, bestPos.pos.z);
                if (targetNormAttr && bestPos.norm) {
                    targetNormAttr.setXYZ(i, bestPos.norm.x, bestPos.norm.y, bestPos.norm.z);
                }
            }
        }

        const newGeo = targetGeo.clone();
        newGeo.setAttribute('position', targetPosAttr);
        if (targetNormAttr) newGeo.setAttribute('normal', targetNormAttr);
        
        console.log("MeshProcessing: Transfer Complete.");
        return newGeo;
    }

    private extractReferenceVerts(geo: THREE.BufferGeometry): ReferenceVert[] {
        const verts: ReferenceVert[] = [];
        const posAttr = geo.attributes.position;
        const normAttr = geo.attributes.normal;
        const uvAttr = geo.attributes.uv;

        if (!uvAttr) return [];

        for (let i = 0; i < posAttr.count; i++) {
            const pos = new THREE.Vector3().fromBufferAttribute(posAttr, i);
            const norm = normAttr ? new THREE.Vector3().fromBufferAttribute(normAttr, i) : new THREE.Vector3(0, 1, 0);
            const uv = new THREE.Vector2().fromBufferAttribute(uvAttr as THREE.BufferAttribute, i);
            
            verts.push({ pos, norm, uv });
        }
        return verts;
    }

    private calculateBestPosition(
        refVerts: ReferenceVert[], 
        targetUV: THREE.Vector2, 
        targetPos: THREE.Vector3, 
        params: TransferParams
    ): { pos: THREE.Vector3, norm: THREE.Vector3 } | null {
        
        // Find 4 closest verts (Quadrants logic simplified to top 4 for TS port)
        // The Python script uses quadrants to ensure spread, here we do a simple K-nearest for performance 
        // unless we build a spatial index. Given the constraint, we iterate.
        
        // Optimization: Just find the single best if we want speed, or top 4 for blending.
        // Porting the "Golf Score" logic: distFromUv + (distFromPos * weight)
        
        let closestVerts: ClosestVert[] = [
            { golfScore: Infinity, vert: null },
            { golfScore: Infinity, vert: null },
            { golfScore: Infinity, vert: null },
            { golfScore: Infinity, vert: null }
        ];

        const epsilon = 0.001;

        for (const ref of refVerts) {
            // Mirror Check
            if (params.areSourceUVsMirrored) {
                if ((ref.pos.x >= -epsilon) !== (targetPos.x >= -epsilon) &&
                    (ref.pos.x <= epsilon) !== (targetPos.x <= epsilon)) {
                    continue;
                }
            }

            const distFromUv = ref.uv.distanceTo(targetUV);
            const distFromPos = ref.pos.distanceTo(targetPos);
            const golfScore = distFromUv + (distFromPos * params.posScoreWeight);

            // Insert into top 4 if better
            this.insertIfBetter(closestVerts, golfScore, ref);
        }

        // Weighted Average Logic from `MoveVertToBestPos`
        // Python: totalScore = sum(diffs).
        
        const validMatches = closestVerts.filter(c => c.vert !== null);
        if (validMatches.length === 0) return null;

        // Just take the absolute best if only 1 found
        if (validMatches.length === 1) return { pos: validMatches[0].vert!.pos, norm: validMatches[0].vert!.norm };

        const bestScore = validMatches[0].golfScore;
        // Calculate weights based on how close they are to the best score (inverted)
        // Actually the python logic:
        // distSum = sum(scores)
        // totalScore = sum(distSum - score)
        // weight = (distSum - score) / totalScore
        
        // Wait, `FindClosest` in python:
        // distSum = sum([v.uvDistance...])
        // totalScore = sum([distSum - v.uvDistance...])
        // localScore = distSum - v.uvDistance
        // weight = localScore / totalScore
        
        let distSum = 0;
        for (const m of validMatches) distSum += m.golfScore;
        
        let totalScore = 0;
        for (const m of validMatches) totalScore += (distSum - m.golfScore);

        if (totalScore > 0.05) {
            const posSum = new THREE.Vector3();
            const normSum = new THREE.Vector3();
            const invTotal = 1.0 / totalScore;

            for (const m of validMatches) {
                const localScore = distSum - m.golfScore;
                const weight = localScore * invTotal;
                posSum.addScaledVector(m.vert!.pos, weight);
                normSum.addScaledVector(m.vert!.norm, weight);
            }
            return { pos: posSum, norm: normSum };
        } else {
            // Fallback to single best
            return { pos: validMatches[0].vert!.pos, norm: validMatches[0].vert!.norm };
        }
    }

    private insertIfBetter(list: ClosestVert[], score: number, vert: ReferenceVert) {
        // Simple insertion sort for length 4
        if (score < list[3].golfScore) {
            list[3] = { golfScore: score, vert };
            list.sort((a, b) => a.golfScore - b.golfScore);
        }
    }
}

export const meshProcessing = new MeshProcessingService();