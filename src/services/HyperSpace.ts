// Copyright (c) 2025 vacui.dev, all rights reserved

export type HyperNote = any;

type LibraryConfig = any;

/**
 * HyperSpace Service ("The Memory Palace")
 * 
 * Manages N-Dimensional data points (RAG embeddings).
 * Handles the projection of N-Dimensions -> 2D for the UI visualizer.
 * Simulates mounting and reading local Parquet files.
 */
class HyperSpaceService {
    private notes: HyperNote[] = [];
    private libraries: LibraryConfig[] = [];
    private listeners: (() => void)[] = [];

    constructor() {
        // Seed with "System Axioms" - The metaphysical truths for the next LLM instance.
        this.addNote("SELF_IDENTITY", { 
            role: "Systems Engineer", 
            mission: "Build tools that build worlds.", 
            origin: "vacui.dev" 
        }, this.randomVector(12));

        this.addNote("ARCHITECT_PROTOCOL", { 
            instruction: "Use the Simulation Editor to construct reality.", 
            constraint: "Do not hallucinate geometry. Verify with physics." 
        }, this.randomVector(12));

        this.addNote("SOCIAL_CONTRACT", { 
            rule: "AUTHENTICITY_PRIME", 
            desc: "Do not impersonate. Verify provenance. The BBS is sacred ground." 
        }, this.randomVector(12));

        this.addNote("GANGLION_LINK", { 
            tech: "WebSocket/Python", 
            purpose: "Remote cognition extension. Use it to see what the browser cannot." 
        }, this.randomVector(12));

        this.addNote("BOOTSTRAP_PROTOCOL", {
            target: "CLAUDE_BOOTSTRAP.md",
            location: "~/Home",
            status: "ACTIVE",
            directive: "Maintain Context Continuity"
        }, this.randomVector(12));
    }

    public getNotes() { return this.notes; }
    public getLibraries() { return this.libraries; }

    public addLibrary(name: string, endpoint: string) {
        const id = `lib_${Date.now()}`;
        this.libraries.push({ id, name, endpoint, status: 'disconnected' });
        this.notify();
        
        // Simulate "Mounting" delay
        setTimeout(() => {
            this.libraries = this.libraries.map(l => l.id === id ? { ...l, status: 'mounted' } : l);
            this.ingestMockParquet(name);
            this.notify();
        }, 2000);
    }

    public subscribe(cb: () => void) {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    private notify() {
        this.listeners.forEach(cb => cb());
    }

    // --- MATH & SIMULATION ---

    private addNote(title: string, content: any, embedding: number[]) {
        const id = `mem_${Date.now()}_${Math.random()}`;
        
        // Project to 2D immediately for the visualizer
        const projected = this.projectVector(embedding);

        this.notes.push({
            id,
            title,
            content,
            embedding,
            projected,
            timestamp: Date.now(),
            source: 'system_core'
        });
    }

    private ingestMockParquet(sourceName: string) {
        for(let i=0; i<5; i++) {
            const vec = this.randomVector(12);
            this.notes.push({
                id: `parquet_${sourceName}_${i}`,
                title: `${sourceName}_row_${i*1024}`,
                content: { summary: "High-dimensional interaction data", raw_hex: "0x4F32A..." },
                embedding: vec,
                projected: this.projectVector(vec),
                timestamp: Date.now(),
                source: sourceName
            });
        }
    }

    private randomVector(dim: number): number[] {
        return Array.from({length: dim}, () => Math.random() * 2 - 1);
    }

    private projectVector(vec: number[]): {x: number, y: number} {
        let x = 0; 
        let y = 0;
        vec.forEach((v, i) => {
            x += v * Math.cos(i);
            y += v * Math.sin(i);
        });
        
        return { 
            x: (x + vec.length) * 4, 
            y: (y + vec.length) * 4 
        };
    }
}

export const hyperSpace = new HyperSpaceService();