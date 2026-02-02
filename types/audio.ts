// Copyright (c) 2025 vacui.dev, all rights reserved

export interface AudioData {
    amplitude: number;
    frequency: number;
    pitchDelta: number;
    effectiveBpm: number;
    currentPhoneme: string;
    stats: Record<string, string>;
}