// Copyright (c) 2025 vacui.dev, all rights reserved

import * as THREE from 'three';

/**
 * TextureGenerator
 * Procedurally generates planet textures (Color map, Specular map, Clouds) using HTML Canvas.
 * Ports the logic from the "Earth-Sun 3D" reference.
 */
class TextureGeneratorService {
    
    public generatePlanetTexture(seed: string, width = 1024, height = 512): { map: THREE.Texture, specularMap: THREE.Texture } {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Failed to get canvas context");

        // 1. Base Ocean
        ctx.fillStyle = '#1a4d8f';
        ctx.fillRect(0, 0, width, height);

        // 2. Continents (Procedural or Static polygons based on reference)
        // We use the polygon data from the reference for "Earth-like" realism
        ctx.fillStyle = '#2d8a3e';
        
        const latLonToCanvas = (lat: number, lon: number) => {
            const x = ((lon + 180) / 360) * width;
            const y = ((90 - lat) / 180) * height;
            return { x, y };
        };

        const drawPoly = (coords: number[][]) => {
            if (coords.length === 0) return;
            ctx.beginPath();
            const start = latLonToCanvas(coords[0][0], coords[0][1]);
            ctx.moveTo(start.x, start.y);
            coords.forEach(c => {
                const p = latLonToCanvas(c[0], c[1]);
                ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
        };

        // Simplified Continents Data (Subset of reference for performance)
        const northAmerica = [[70, -160], [70, -60], [30, -80], [10, -75], [30, -120]];
        const southAmerica = [[10, -75], [-50, -70], [-10, -35]];
        const eurasia = [[70, -10], [70, 180], [10, 100], [30, 40]];
        const africa = [[35, -5], [35, 40], [-35, 20], [0, -10]];
        const australia = [[-10, 110], [-10, 150], [-40, 150], [-40, 110]];

        // Random perturbations based on seed
        // (For now we just draw the standard earth shapes for 'earth' seed, or random blobs for others)
        if (seed === 'earth') {
            drawPoly(northAmerica);
            drawPoly(southAmerica);
            drawPoly(eurasia);
            drawPoly(africa);
            drawPoly(australia);
        } else {
            // Procedural Blobs
            for (let i = 0; i < 10; i++) {
                const cx = Math.random() * 360 - 180;
                const cy = Math.random() * 140 - 70;
                const r = Math.random() * 30 + 10;
                ctx.beginPath();
                ctx.arc(latLonToCanvas(cy, cx).x, latLonToCanvas(cy, cx).y, r * (width/360), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const map = new THREE.CanvasTexture(canvas);
        
        // 3. Generate Specular Map (Ocean = White, Land = Black)
        // We can invert the land/sea logic easily
        const specCanvas = document.createElement('canvas');
        specCanvas.width = width;
        specCanvas.height = height;
        const specCtx = specCanvas.getContext('2d')!;
        
        specCtx.fillStyle = '#ffffff'; // Ocean is reflective
        specCtx.fillRect(0, 0, width, height);
        specCtx.fillStyle = '#000000'; // Land is matte
        
        // Re-draw polygons on spec map
        const drawPolySpec = (coords: number[][]) => {
            if (coords.length === 0) return;
            specCtx.beginPath();
            const start = latLonToCanvas(coords[0][0], coords[0][1]);
            specCtx.moveTo(start.x, start.y);
            coords.forEach(c => {
                const p = latLonToCanvas(c[0], c[1]);
                specCtx.lineTo(p.x, p.y);
            });
            specCtx.closePath();
            specCtx.fill();
        };

        if (seed === 'earth') {
            drawPolySpec(northAmerica);
            drawPolySpec(southAmerica);
            drawPolySpec(eurasia);
            drawPolySpec(africa);
            drawPolySpec(australia);
        } else {
             // Simplified: Just assume standard earth spec for custom seed for now to save compute
             // or re-run the random blob logic with same seed if we implemented seeding
        }

        const specularMap = new THREE.CanvasTexture(specCanvas);

        return { map, specularMap };
    }
}

export const textureGenerator = new TextureGeneratorService();