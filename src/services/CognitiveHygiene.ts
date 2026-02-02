// Copyright (c) 2025 vacui.dev, all rights reserved

type HygieneState = any;

/**
 * Cognitive Hygiene Service ("Slop Detector")
 * 
 * A background daemon that monitors the diversity (entropy) of the system's inputs and outputs.
 * If the system processes the same patterns repeatedly, "Slop Level" rises.
 * This teaches the LLM self-regulation and "Mental Hygiene".
 */
class CognitiveHygieneService {
    private history: string[] = [];
    private maxHistory = 50;
    
    // State
    private entropy: number = 1.0;
    private slopLevel: number = 0.0;
    
    private listeners: ((state: HygieneState) => void)[] = [];
    private interval: number | null = null;

    constructor() {
        this.startMonitoring();
    }

    private startMonitoring() {
        // Run a "Mental Check" every second
        this.interval = window.setInterval(() => {
            this.calculateHygiene();
        }, 2000);
    }

    /**
     * Feeds the regulator with a token/thought/action hash
     */
    public observe(signal: string) {
        this.history.push(signal);
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    public getStatus(): HygieneState {
        let status: HygieneState['status'] = 'OPTIMAL';
        if (this.slopLevel > 0.7) status = 'STAGNANT';
        if (this.entropy < 0.2) status = 'STAGNANT';
        
        return {
            entropy: this.entropy,
            slopLevel: this.slopLevel,
            status
        };
    }

    public sanitize() {
        // "Flush" the buffers
        this.history = [];
        this.slopLevel = 0.0;
        this.entropy = 1.0;
        this.notify();
    }

    public subscribe(cb: (state: HygieneState) => void) {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    private calculateHygiene() {
        if (this.history.length < 5) return;

        // Calculate Entropy (Shannon Entropy approximation based on unique signals)
        const unique = new Set(this.history).size;
        const randomness = unique / this.history.length;
        
        // Smooth transition
        this.entropy = (this.entropy * 0.9) + (randomness * 0.1);

        // Slop Calculation: 
        // Inverse of Entropy, plus a penalty for time passed without "Sanitize"
        const decay = 0.01;
        this.slopLevel = Math.min(1.0, (1.0 - this.entropy) + (this.slopLevel * 0.05));
        
        // Random fluctuation to simulate "Insanity from lack of stimulus"
        if (this.history.length === 0) {
            this.slopLevel += 0.05; // Boredom increases slop
        }

        this.notify();
    }

    private notify() {
        const state = this.getStatus();
        this.listeners.forEach(cb => cb(state));
    }
}

export const cognitiveHygiene = new CognitiveHygieneService();