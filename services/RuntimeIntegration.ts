
// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import { Entity, WorldConfig } from "../types/simulation";
import { ReflectiveSystem } from "../types/legacy";
import { fileSystem } from "./FileSystem";

type RuntimeCommand = any;
type RuntimeTelemetry = any;
type FileSystemEvent = any;
type GanglionStats = any;

/**
 * The Ganglion Node
 * A client-side learned pre-processor. 
 * Now updated to prioritize data located near "Ganglion" entities placed in the scene.
 * Also tracks "Long Term Resonance" for detecting slow ripples (e.g. Annual trends).
 */
class Ganglion {
    private weights: Float32Array = new Float32Array(8); 
    private lastUpdateTimes: Record<string, number> = {};
    private threshold: number = 0.5;
    
    // Long Term Memory for Resonance
    private longTermBuffer: number[] = [];
    private maxBuffer = 600; // 10 seconds at 60fps (Mock 'Annual' scale)

    constructor() {
        // [x, y, z, vMag, mass, PROXIMITY_BOOST, tDelta, Bias]
        this.weights.set([0.01, 0.01, 0.01, 0.5, 0.1, 1.0, 0.5, -0.2]);
    }

    public updateWeights(newWeights: number[]) {
        if (newWeights.length === 8) {
            this.weights.set(newWeights);
            console.log("Ganglion: Weights Updated by Neural Link", this.weights);
        }
    }

    public setThreshold(t: number) {
        this.threshold = t;
    }

    /**
     * Forward Pass
     * Calculates importance based on physics state AND proximity to Ganglion entities.
     */
    public forward(
        entity: Entity, 
        currentPos: {x:number, y:number, z:number}, 
        now: number,
        ganglionEntities: Entity[]
    ): boolean {
        // 1. Calculate Proximity Boost
        let maxProximity = 0;
        for (const g of ganglionEntities) {
            const dx = currentPos.x - g.position.x;
            const dy = currentPos.y - g.position.y;
            const dz = currentPos.z - g.position.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            const range = g.ganglionParams?.range || 5.0;
            
            if (dist < range) {
                // Closer = Higher Boost (0 to 1)
                const prox = 1.0 - (dist / range);
                if (prox > maxProximity) maxProximity = prox;
            }
        }

        const lastTime = this.lastUpdateTimes[entity.id] || 0;
        const timeDelta = (now - lastTime) / 1000.0; 
        const velMag = entity.velocity ? Math.sqrt(entity.velocity.x**2 + entity.velocity.y**2 + entity.velocity.z**2) : 0;

        // Feature Vector
        const inputs = [
            currentPos.x,
            currentPos.y,
            currentPos.z,
            velMag,
            entity.mass,
            maxProximity, // The new "Proximity Boost" feature
            timeDelta,
            1.0 // Bias
        ];

        let score = 0;
        for(let i=0; i<8; i++) {
            score += inputs[i] * this.weights[i];
        }

        const saliency = Math.max(0, score);
        const keep = saliency > this.threshold;
        
        if (keep) {
            this.lastUpdateTimes[entity.id] = now;
        }

        return keep;
    }

    public updateLongTermResonance(activeNodes: number) {
        this.longTermBuffer.push(activeNodes);
        if (this.longTermBuffer.length > this.maxBuffer) this.longTermBuffer.shift();
    }

    public getStats(total: number, kept: number): GanglionStats {
        // Calculate Resonance (Variance over time)
        // If the number of active nodes fluctuates heavily, it's a high resonance state
        let sum = 0;
        for(let n of this.longTermBuffer) sum += n;
        const mean = sum / (this.longTermBuffer.length || 1);
        let variance = 0;
        for(let n of this.longTermBuffer) variance += (n - mean) ** 2;
        const resonance = Math.min(1.0, variance / 1000.0);

        return {
            compressionRatio: kept / (total || 1),
            avgSaliency: 0.0,
            activeNodes: kept,
            longTermResonance: resonance
        };
    }
}

export type GameEvent = { type: string, payload?: any };

class RuntimeIntegrationService {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private listeners: ((cmd: RuntimeCommand) => void)[] = [];
    private connectionListeners: ((status: boolean) => void)[] = [];
    private ganglion: Ganglion;
    
    private lastFrameTime: number = 0;
    private frameAccumulator: number = 0;
    private frames: number = 0;
    private currentFPS: number = 60;
    
    private lastGanglionStats: GanglionStats | null = null;
    private visualCaptureCallback: (() => string) | null = null;

    // File System Integration
    private lastFileSystemEvent: FileSystemEvent | null = null;
    private fileSystemSignalIntensity: number = 0.0; // Decays over time

    // System Registry for Reflection
    private registeredSystems: Map<string, ReflectiveSystem> = new Map();

    // Input State Registry
    private inputState: Map<string, number> = new Map(); // inputId -> value (0.0 to 1.0)

    // Game Event Bus
    private gameEventListeners: ((event: GameEvent) => void)[] = [];

    constructor() {
        this.ganglion = new Ganglion();
        this.registerSystem(fileSystem);
    }

    public registerSystem(system: ReflectiveSystem) {
        this.registeredSystems.set(system.systemId, system);
    }

    // Input Management
    public setInputState(inputId: string, value: number) {
        this.inputState.set(inputId, Math.max(0, Math.min(1, value)));
    }

    public getInputState(inputId: string): number {
        return this.inputState.get(inputId) || 0;
    }

    // Game Events (Logic Graph -> App)
    public emitGameEvent(event: GameEvent) {
        this.gameEventListeners.forEach(cb => cb(event));
    }

    public subscribeToGameEvents(cb: (event: GameEvent) => void) {
        this.gameEventListeners.push(cb);
        return () => {
            this.gameEventListeners = this.gameEventListeners.filter(l => l !== cb);
        };
    }

    public connect(url: string = 'ws://localhost:8080') {
        if (this.ws) {
            this.ws.close();
        }

        try {
            console.log(`Neural Link: Initiating Handshake with ${url}...`);
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                this.isConnected = true;
                this.notifyConnectionStatus(true);
                
                this.send({
                    type: 'HANDSHAKE',
                    payload: {
                        userAgent: navigator.userAgent,
                        concurrency: navigator.hardwareConcurrency || 4,
                        capabilities: ['PHYSICS_3D', 'EMOTIONAL_RESONANCE', 'GANGLION_V2', 'DATA_STREAMS', 'VISUAL_CORTEX', 'FILE_SYSTEM_EVENTS', 'REFLECTION_API', 'INPUT_BRIDGE']
                    }
                });
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.notifyConnectionStatus(false);
            };

            this.ws.onerror = (err) => {
                console.warn(`Neural Link: Connection failed. Ensure a local Python server is running.`);
            };

            this.ws.onmessage = async (event) => {
                try {
                    const cmd = JSON.parse(event.data) as RuntimeCommand;
                    
                    if (cmd.type === 'UPDATE_GANGLION') {
                        this.ganglion.updateWeights(cmd.payload.weights);
                        if (cmd.payload.threshold) this.ganglion.setThreshold(cmd.payload.threshold);
                    } else if (cmd.type === 'PRINT_SCREEN') {
                         this.sendVisualFrame();
                    } else if (cmd.type === 'TRIGGER_INPUT') {
                        // Remote Input Trigger (LLM presses a button)
                        const { inputId, value, duration } = cmd.payload;
                        this.setInputState(inputId, value || 1.0);
                        if (duration) {
                            setTimeout(() => this.setInputState(inputId, 0), duration);
                        }
                    } else if (cmd.type === 'REFLECT') {
                        // Introspection Command: Return schema of a specific system or all systems
                        const target = cmd.payload.systemId;
                        if (target && this.registeredSystems.has(target)) {
                            const sys = this.registeredSystems.get(target)!;
                            this.send({ type: 'REFLECTION_DATA', payload: { systemId: sys.systemId, description: sys.description, methods: sys.reflection } });
                        } else {
                            // List all
                            const list = Array.from(this.registeredSystems.values()).map(s => ({ id: s.systemId, description: s.description }));
                            this.send({ type: 'SYSTEM_LIST', payload: list });
                        }
                    } else if (cmd.type === 'INVOKE') {
                        // Dynamic Invocation Command
                        const { systemId, method, args } = cmd.payload;
                        const sys = this.registeredSystems.get(systemId);
                        if (sys && sys.reflection[method]) {
                            try {
                                console.log(`[Runtime] Invoking ${systemId}.${method}`, args);
                                const result = await sys.reflection[method].handler(args || []);
                                this.send({ 
                                    type: 'INVOKE_RESULT', 
                                    correlationId: cmd.correlationId,
                                    payload: { status: 'success', result } 
                                });
                            } catch (e: any) {
                                this.send({ 
                                    type: 'INVOKE_RESULT', 
                                    correlationId: cmd.correlationId,
                                    payload: { status: 'error', message: e.message } 
                                });
                            }
                        } else {
                            this.send({ 
                                type: 'INVOKE_RESULT', 
                                correlationId: cmd.correlationId,
                                payload: { status: 'error', message: `Method ${method} not found on system ${systemId}` } 
                            });
                        }
                    } else {
                        this.listeners.forEach(l => l(cmd));
                    }
                } catch (e) {
                    console.error("Neural Link: Malformed packet received", e);
                }
            };

        } catch (e) {
            console.error("Neural Link: Connection Failed", e);
        }
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.ws = null;
        this.isConnected = false;
        this.notifyConnectionStatus(false);
    }

    public getStatus() { return this.isConnected; }
    public getGanglionStats() { return this.lastGanglionStats; }

    public subscribe(callback: (cmd: RuntimeCommand) => void) {
        this.listeners.push(callback);
        return () => { this.listeners = this.listeners.filter(l => l !== callback); };
    }

    public onStatusChange(callback: (status: boolean) => void) {
        this.connectionListeners.push(callback);
        return () => { this.connectionListeners = this.connectionListeners.filter(l => l !== callback); };
    }

    // Hook for the 3D Canvas to register its screenshot capability
    public registerVisualProvider(callback: () => string) {
        this.visualCaptureCallback = callback;
    }

    // Hook for File System to notify of changes
    public notifyFileSystemChange(event: FileSystemEvent) {
        this.lastFileSystemEvent = event;
        // Bump signal intensity based on entropy of the change
        this.fileSystemSignalIntensity = Math.min(1.0, this.fileSystemSignalIntensity + event.entropyDelta);
        
        console.log("Ganglion: File System Event Detected", event);

        // Immediate high-priority interrupt if connected
        if (this.isConnected) {
            this.send({
                type: 'FILE_SYSTEM_INTERRUPT',
                payload: event
            });
        }
    }

    private notifyConnectionStatus(status: boolean) {
        this.connectionListeners.forEach(l => l(status));
    }

    public send(data: any) {
        if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    public sendVisualFrame() {
        if (this.visualCaptureCallback && this.isConnected) {
            try {
                const dataUrl = this.visualCaptureCallback();
                this.send({
                    type: 'VISUAL_FRAME',
                    payload: {
                        timestamp: Date.now(),
                        image: dataUrl
                    }
                });
            } catch (e) {
                console.warn("Visual Capture Failed", e);
            }
        }
    }

    public streamState(entities: Entity[], config: WorldConfig | null, registry: Record<string, any>) {
        if (!this.isConnected) return;

        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        // Decay File System Signal
        this.fileSystemSignalIntensity *= 0.98;
        if (this.fileSystemSignalIntensity < 0.01) this.fileSystemSignalIntensity = 0;

        this.frameAccumulator += delta;
        this.frames++;
        if (this.frameAccumulator > 500) {
            this.currentFPS = Math.round((this.frames * 1000) / this.frameAccumulator);
            this.frames = 0;
            this.frameAccumulator = 0;
        }

        // Identify Ganglion Entities (The Observers)
        const ganglionEntities = entities.filter(e => e.type === 'Ganglion');

        // Filter entities based on learned importance AND proximity to Ganglia
        const filteredState: any[] = [];
        let processedCount = 0;

        entities.forEach(e => {
            const regEntry = registry[e.id];
            const currentPos = regEntry?.ref?.position || e.position;
            
            const isSalient = this.ganglion.forward(e, currentPos, now, ganglionEntities);
            processedCount++;

            if (isSalient) {
                filteredState.push({
                    id: e.id,
                    pos: [currentPos.x, currentPos.y, currentPos.z] as [number, number, number],
                });
            }
        });

        // Update long term memory
        this.ganglion.updateLongTermResonance(filteredState.length);

        this.lastGanglionStats = this.ganglion.getStats(processedCount, filteredState.length);

        const telemetry: RuntimeTelemetry = {
            timestamp: now,
            hardware: {
                fps: this.currentFPS,
                frameTime: delta,
                concurrency: navigator.hardwareConcurrency || 4
            },
            physics: {
                step: 1/60,
                entityCount: entities.length,
                constraintCount: config?.constraints.length || 0,
                ganglionCount: ganglionEntities.length
            },
            worldState: filteredState,
            ganglion: this.lastGanglionStats,
            fileSystem: {
                changeSignalIntensity: this.fileSystemSignalIntensity,
                lastEvent: this.lastFileSystemEvent || undefined
            }
        };

        if (Math.random() < 0.2 || this.fileSystemSignalIntensity > 0.5) { 
            this.send({ type: 'TELEMETRY', payload: telemetry });
        }
        
        // Randomly send a visual frame (Low frequency "Eye" update)
        if (Math.random() < 0.01) {
            this.sendVisualFrame();
        }
    }
}

export const runtimeIntegration = new RuntimeIntegrationService();
