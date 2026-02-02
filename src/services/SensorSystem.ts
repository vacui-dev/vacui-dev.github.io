// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import { TimeFrame } from "../types/legacy";

type SemanticData = any;

/**
 * SensorSystem Architecture
 * 
 * Layer 1: Hardware Abstraction (WebAudio, MediaStream)
 * Layer 2: Raw Data Buffering (Int16Array, RGBA Buffers)
 * Layer 3: Feature Extraction (Phoneme Analysis, Face Embedding) - *Scaffolded*
 * Layer 4: Temporal Storage (Timeline)
 */

export class SensorSystem {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private analyser: AnalyserNode | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private canvasContext: CanvasRenderingContext2D | null = null;
    
    // Timeline
    private timeline: TimeFrame[] = [];
    private maxFrames = 300; // Keep last ~10 seconds at 30fps
    private isRecording = false;
    private useMockData = false;
    private listeners: ((data: TimeFrame) => void)[] = [];

    constructor() {
        // Initialize hidden video element for frame capture
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        this.canvasContext = canvas.getContext('2d', { willReadFrequently: true });
    }

    public async initialize() {
        // If already running (either real or mock), do nothing
        if (this.mediaStream || (this.useMockData && this.isRecording)) return;

        try {
            const nav = navigator as unknown as Navigator;
            
            // Check if environment supports media devices
            if (!nav.mediaDevices || !nav.mediaDevices.getUserMedia) {
                 throw new Error("MediaDevices API not supported");
            }
            
            this.mediaStream = await nav.mediaDevices.getUserMedia({ 
                audio: true, 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });

            // Audio Setup
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass();
            
            if (this.audioContext) {
                const source = this.audioContext.createMediaStreamSource(this.mediaStream);
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                source.connect(this.analyser);
            }

            // Video Setup
            if (this.videoElement) {
                this.videoElement.srcObject = this.mediaStream;
            }

            this.useMockData = false;
            console.log("Sensor System: HARDWARE_LINK_ESTABLISHED");
        } catch (e) {
            console.warn("Sensor System: Hardware access failed or denied. Switching to SIMULATED MOCK MODE.", e);
            this.useMockData = true;
        }

        // Always start the loop, whether real or mock
        this.isRecording = true;
        this.startLoop();
    }

    public disconnect() {
        this.isRecording = false;
        this.useMockData = false;
        this.mediaStream?.getTracks().forEach(t => t.stop());
        this.audioContext?.close();
        this.mediaStream = null;
        this.audioContext = null;
        this.analyser = null;
    }

    public subscribe(callback: (frame: TimeFrame) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    public getVideoElement() {
        return this.videoElement;
    }

    private startLoop() {
        const loop = () => {
            if (!this.isRecording) return;

            const frame = this.captureFrame();
            
            // Update Timeline
            this.timeline.push(frame);
            if (this.timeline.length > this.maxFrames) {
                this.timeline.shift();
            }

            // Notify Subscribers (UI)
            this.listeners.forEach(l => l(frame));

            requestAnimationFrame(loop);
        };
        loop();
    }

    /**
     * The Core "Perception" Function
     * Converts raw signals into the World Model's data format
     */
    private captureFrame(): TimeFrame {
        const now = Date.now();
        
        if (this.useMockData) {
            return this.generateMockFrame(now);
        }
        
        // 1. Audio Feature Extraction
        let audioFeatures = { volume: 0, pitch: 0, spectralCentroid: 0 };
        let rawAudioData = new Uint8Array(0);

        if (this.analyser) {
            const bufferLength = this.analyser.frequencyBinCount;
            rawAudioData = new Uint8Array(bufferLength);
            this.analyser.getByteFrequencyData(rawAudioData);
            
            // Calculate simplistic volume (RMS approximation)
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) sum += rawAudioData[i];
            audioFeatures.volume = sum / bufferLength;
        }

        // 2. Visual Feature Extraction (Scaffold)
        // Mock Semantic Data derived from real audio volume
        const semantic: SemanticData = {
            timestamp: now,
            audioFeatures,
            phonemes: {
                'Ah': audioFeatures.volume > 20 ? 0.8 : 0.1,
                'Ee': audioFeatures.volume > 20 ? 0.2 : 0.0,
                'Mm': audioFeatures.volume < 10 && audioFeatures.volume > 2 ? 0.5 : 0.0
            },
            facialVector: [Math.random(), Math.random(), Math.random()],
            expression: audioFeatures.volume > 30 ? 'SURPRISE' : 'NEUTRAL' 
        };

        return {
            id: now,
            timestamp: now,
            rawAudio: new Float32Array(rawAudioData), 
            semantic
        };
    }

    private generateMockFrame(now: number): TimeFrame {
        // Generate a simulated sine wave for the oscilloscope
        const length = 128;
        const rawAudio = new Float32Array(length);
        const t = now / 1000;
        
        for (let i = 0; i < length; i++) {
            // Complex wave: Main sine + jitter
            rawAudio[i] = (Math.sin(t * 10 + i * 0.2) * 0.5 + 0.5) * 100 + (Math.random() * 20);
        }

        // Simulated semantics moving over time
        const intensity = (Math.sin(t * 2) + 1) / 2; // 0 to 1

        return {
            id: now,
            timestamp: now,
            rawAudio: rawAudio,
            semantic: {
                timestamp: now,
                audioFeatures: {
                    volume: intensity * 50,
                    pitch: 440 + Math.sin(t) * 100,
                    spectralCentroid: 1000
                },
                phonemes: {
                    'Ah': intensity > 0.7 ? 0.8 : 0.1,
                    'Ee': intensity > 0.7 ? 0.2 : 0.0,
                    'Mm': intensity < 0.3 ? 0.5 : 0.0
                },
                facialVector: [Math.random(), Math.random(), Math.random()],
                expression: intensity > 0.8 ? 'SIMULATED' : 'IDLE'
            }
        };
    }
}

// Singleton Instance
export const sensorSystem = new SensorSystem();