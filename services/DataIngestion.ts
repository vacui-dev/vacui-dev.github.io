// Copyright (c) 2025 vacui.dev, all rights reserved

import { DataSourceType } from "../types/legacy";

/**
 * DataIngestion Service
 * 
 * Simulates high-volume external data feeds (Data Center).
 * This data is "Raw Ore" that needs to be refined by the Physics Engine
 * before being consumed by the LLM.
 */

interface DataPoint {
    source: DataSourceType;
    value: number;
    timestamp: number;
    meta?: any;
}

class DataIngestionService {
    private streams: Map<string, number> = new Map();
    private intervals: Map<string, number> = new Map();

    constructor() {
        // Initialize baselines
        this.streams.set('SPY', 4500);
        this.streams.set('BTC', 65000);
        this.streams.set('VIX', 15); // Volatility
        this.streams.set('GLOBAL_TEMP', 14.5);
    }

    public startStream(id: string, source: DataSourceType, freq: number = 100) {
        if (this.intervals.has(id)) return;

        // Simulate Live Feed
        const interval = window.setInterval(() => {
            this.updateStream(id, source);
        }, freq);

        this.intervals.set(id, interval);
    }

    public stopAll() {
        this.intervals.forEach(i => clearInterval(i));
        this.intervals.clear();
    }

    public getValue(id: string): number {
        return this.streams.get(id) || 0;
    }

    private updateStream(id: string, source: DataSourceType) {
        let current = this.streams.get(id) || 0;
        
        // Simulation Logic based on source type
        switch (source) {
            case 'CRYPTO_VOLATILITY':
            case 'MOCK_STOCK_MARKET':
                // Random Walk with drift
                const volatility = source === 'CRYPTO_VOLATILITY' ? 0.02 : 0.002;
                const change = current * volatility * (Math.random() - 0.48); // Slight upward drift
                current += change;
                break;
            case 'GLOBAL_WEATHER':
                // Slow sine wave (Seasonality) + Noise
                const time = Date.now() / 10000;
                current = 15 + Math.sin(time) * 10 + (Math.random() - 0.5);
                break;
            case 'SOCIAL_SENTIMENT':
                // Erratic jumps (Viral moments)
                if (Math.random() > 0.98) {
                    current = Math.random(); // Reset sentiment
                } else {
                    current += (Math.random() - 0.5) * 0.1;
                    current = Math.max(0, Math.min(1, current));
                }
                break;
        }

        this.streams.set(id, current);
    }
}

export const dataIngestion = new DataIngestionService();