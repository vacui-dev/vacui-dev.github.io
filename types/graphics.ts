// Copyright (c) 2025 vacui.dev, all rights reserved

export type BlendMode = 'add' | 'subtract' | 'multiply' | 'divide' | 'screen' | 'source-over';

export interface VisualComponentConfig {
    id: string;
    name: string;
    isVisible: boolean;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    renderMethod: 'sphere' | 'raster' | 'vector';
    sphereMode?: 'size-frequency' | 'size-amplitude' | 'eye-sauron' | 'cute-anime' | 'geometric';
    geometricDimension?: '2d' | '3d';
    geometricSymmetry?: number;
    geometricTwist?: number;
    geometricMirror?: boolean;
    geometricTrailMode?: 'history' | 'future' | 'both';
    geometricTrailLength?: number;
    geometricSpeed?: number;
    blendMode: BlendMode;
    primaryColor: string;
    secondaryColor: string;
    assets?: {
        id: string;
        url: string;
        threshold: number;
        easing?: [number, number, number, number];
    }[];
    volume?: number;
}