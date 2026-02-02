// Copyright (c) 2025 vacui.dev, all rights reserved

/**
 * Image Processing Service
 * Ports the python-based histogram analysis and material detection logic
 * to TypeScript using the HTML5 Canvas API.
 */

export interface HistogramStat {
    mean: number;
    stdDev: number;
    median: number;
    min: number;
    max: number;
    pixelCount: number;
}

export interface RGBHistogram {
    r: HistogramStat;
    g: HistogramStat;
    b: HistogramStat;
    luma: HistogramStat;
}

class ImageProcessingService {

    /**
     * Calculates detailed statistics for image channels (R, G, B, Luminance).
     * Equivalent to `pdb.gimp_drawable_histogram`.
     */
    public getHistogram(imageData: ImageData): RGBHistogram {
        const data = imageData.data;
        const count = data.length / 4;
        
        const rVals: number[] = [];
        const gVals: number[] = [];
        const bVals: number[] = [];
        const lVals: number[] = [];

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // const a = data[i + 3]; 

            rVals.push(r);
            gVals.push(g);
            bVals.push(b);
            
            // Rec. 709 Luminance
            lVals.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
        }

        return {
            r: this.calculateStats(rVals),
            g: this.calculateStats(gVals),
            b: this.calculateStats(bVals),
            luma: this.calculateStats(lVals)
        };
    }

    private calculateStats(values: number[]): HistogramStat {
        if (values.length === 0) return { mean: 0, stdDev: 0, median: 0, min: 0, max: 0, pixelCount: 0 };

        let sum = 0;
        let min = 255;
        let max = 0;

        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            sum += v;
            if (v < min) min = v;
            if (v > max) max = v;
        }

        const mean = sum / values.length;

        let varianceSum = 0;
        for (let i = 0; i < values.length; i++) {
            varianceSum += Math.pow(values[i] - mean, 2);
        }
        const stdDev = Math.sqrt(varianceSum / values.length);

        // Sort for median (expensive but necessary for parity)
        // Optimization: We could bin them into 256 buckets for approx median to speed up
        const buckets = new Array(256).fill(0);
        for (let i = 0; i < values.length; i++) {
            buckets[Math.floor(values[i])]++;
        }
        
        let median = 0;
        let count = 0;
        const half = values.length / 2;
        for (let i = 0; i < 256; i++) {
            count += buckets[i];
            if (count >= half) {
                median = i;
                break;
            }
        }

        return {
            mean,
            stdDev,
            median,
            min,
            max,
            pixelCount: values.length
        };
    }

    private isSimilar(x: number, y: number, epsilon: number): boolean {
        return Math.abs(x - y) <= epsilon;
    }

    /**
     * Ported from `IsNormalMap` python function.
     * Checks if image looks like a tangent space normal map.
     */
    public isNormalMap(hist: RGBHistogram): boolean {
        const { r, g, b } = hist;

        // Normal maps usually have R/G around 128 (0 vector in tangent space) and B around 255 (Z up)
        if (!this.isSimilar(r.mean, 127, 20) || 
            !this.isSimilar(g.mean, 127, 20) || 
            !this.isSimilar(b.mean, 255, 60)) { // Relaxed tolerances for compression artifacts
            return false;
        }

        // Variance check: Flat normal maps have very low std dev
        if (!this.isSimilar(r.median, 127, 10) || 
            !this.isSimilar(g.median, 127, 10) || 
            !this.isSimilar(b.median, 255, 20)) {
            return false;
        }

        return true;
    }

    /**
     * Ported from `IsDiffuseMap`
     */
    public isDiffuseMap(hist: RGBHistogram): boolean {
        const { r, g, b } = hist;

        // If all channels are similar, it's greyscale (likely Height/Roughness/AO)
        if (this.isSimilar(r.mean, g.mean, 5) && 
            this.isSimilar(r.mean, b.mean, 5) && 
            this.isSimilar(r.stdDev, g.stdDev, 5)) {
            return false; 
        }

        // "If not allow_flat": Check complexity
        if (r.stdDev < 20 && g.stdDev < 20 && b.stdDev < 20) {
            return false; 
        }

        return true;
    }

    public getMaterialType(hist: RGBHistogram): string {
        if (this.isNormalMap(hist)) return 'MATERIAL_NORMALS';
        if (this.isDiffuseMap(hist)) return 'MATERIAL_DIFFUSE';

        const l = hist.luma;
        if (l.mean > 200) return 'MATERIAL_SPECULAR'; 
        if (l.stdDev < 10) return 'MATERIAL_UNIFORM';
        if (l.stdDev > 40) return 'MATERIAL_ROUGHNESS';

        return 'MATERIAL_UNKNOWN';
    }

    /**
     * Ported `weighted_contrast`.
     * Applies a curve to increase contrast based on frequency.
     */
    public generateWeightedContrastCurve(histValues: number[]): number[] {
        const buckets = new Array(256).fill(0);
        histValues.forEach(v => buckets[Math.floor(v)]++);
        
        const total = histValues.length;
        let runningPercentile = 0;
        const curve: number[] = [];
        
        for (let i = 0; i < 256; i++) {
            const count = buckets[i];
            const percentile = count / total;
            runningPercentile += percentile;
            
            const newVal = Math.floor(255 * runningPercentile);
            curve[i] = Math.max(0, Math.min(255, newVal));
        }
        return curve;
    }

    public applyCurve(imageData: ImageData, curve: number[]): ImageData {
        const newData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        const data = newData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = curve[data[i]];     // R
            data[i+1] = curve[data[i+1]]; // G
            data[i+2] = curve[data[i+2]]; // B
            // Alpha unchanged
        }
        return newData;
    }

    /**
     * Ported from `EdgeDetect` (Sobel Filter).
     * Used for `HighlightUvEdges`.
     */
    public applySobel(imageData: ImageData): ImageData {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const output = new ImageData(width, height);
        const outData = output.data;

        const kernelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        const kernelY = [
            [-1, -2, -1],
            [ 0,  0,  0],
            [ 1,  2,  1]
        ];

        const getPixelGrey = (x: number, y: number) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return 0;
            const i = (y * width + x) * 4;
            // Simple Greyscale
            return 0.3 * data[i] + 0.59 * data[i+1] + 0.11 * data[i+2];
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let pixelX = 0;
                let pixelY = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const val = getPixelGrey(x + kx, y + ky);
                        pixelX += val * kernelX[ky + 1][kx + 1];
                        pixelY += val * kernelY[ky + 1][kx + 1];
                    }
                }

                const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
                // Invert so edges are white? Python script logic: "EdgeDetect... keep_sign=True". 
                // Sobel usually produces white edges on black background.
                
                const idx = (y * width + x) * 4;
                const val = Math.min(255, magnitude);
                outData[idx] = val;
                outData[idx + 1] = val;
                outData[idx + 2] = val;
                outData[idx + 3] = 255;
            }
        }
        return output;
    }

    /**
     * Ported from `SimpleLevels`.
     * Applies Gamma and Input levels.
     */
    public applyLevels(imageData: ImageData, lowInput: number, highInput: number, gamma: number): ImageData {
        const newData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        const data = newData.data;
        const invGamma = 1.0 / gamma;

        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; j++) { // RGB
                let val = data[i + j] / 255.0;
                // Input levels
                val = (val - lowInput) / (highInput - lowInput);
                val = Math.max(0, Math.min(1, val));
                // Gamma
                val = Math.pow(val, invGamma);
                data[i + j] = val * 255;
            }
        }
        return newData;
    }
}

export const imageProcessing = new ImageProcessingService();