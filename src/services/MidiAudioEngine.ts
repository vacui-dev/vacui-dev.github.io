// Copyright (c) 2025 vacui.dev, all rights reserved

import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { AudioData } from '../types/audio';

/**
 * MidiAudioEngine
 * Handles loading, parsing, and playback of MIDI files using Tone.js
 */
export class MidiAudioEngine {
    private midi: Midi | null = null;
    private synths: Tone.PolySynth[] = [];
    private parts: Tone.Part[] = [];
    private isPlaying: boolean = false;
    
    // Master Analysis
    private analyzer: Tone.Analyser;
    private meter: Tone.Meter;

    // Per-Track Analysis
    private trackAnalyzers: Tone.Analyser[] = [];
    private trackMeters: Tone.Meter[] = [];

    constructor() {
        this.analyzer = new Tone.Analyser("fft", 64);
        this.meter = new Tone.Meter();
    }

    public async initialize() {
        await Tone.start();
        if (Tone.context.state !== 'running') {
            await Tone.context.resume();
        }
        console.log("Audio Context Started");
    }

    public async loadArrayBuffer(buffer: ArrayBuffer | Uint8Array) {
        try {
            if (!buffer || buffer.byteLength === 0) throw new Error("Buffer empty");

            const view = buffer instanceof Uint8Array 
                ? new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength) 
                : new DataView(buffer as ArrayBuffer);

            const header = view.getUint32(0, false);
            if (header !== 0x4D546864) console.warn("Invalid MIDI Header");

            this.midi = new Midi(buffer);
            console.log(`MIDI Loaded: ${this.midi.name}, Tracks: ${this.midi.tracks.length}`);
            return this.midi;
        } catch (e: any) {
            console.error("MidiAudioEngine Error", e);
            throw e;
        }
    }

    public stop() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        
        this.synths.forEach(s => s.dispose());
        this.parts.forEach(p => p.dispose());
        this.trackAnalyzers.forEach(a => a.dispose());
        this.trackMeters.forEach(m => m.dispose());
        
        this.synths = [];
        this.parts = [];
        this.trackAnalyzers = [];
        this.trackMeters = [];
        
        this.isPlaying = false;
    }

    private getDuration(): number {
        if (!this.midi) return 1.0;
        let d = this.midi.duration;
        if (typeof d === 'number' && Number.isFinite(d) && d > 0) return d;
        
        let maxTime = 0;
        this.midi.tracks.forEach(t => {
            t.notes.forEach(n => {
                if (n.time + n.duration > maxTime) maxTime = n.time + n.duration;
            });
        });
        return maxTime > 0 ? maxTime : 1.0;
    }

    public async play() {
        if (!this.midi) return;
        await this.initialize();
        this.stop();

        // Create synths and analyzers for each track
        this.midi.tracks.forEach(track => {
            if (track.notes.length === 0) {
                // Push null placeholders to keep indices aligned
                this.synths.push(null as any);
                this.trackAnalyzers.push(null as any);
                this.trackMeters.push(null as any);
                return;
            };

            // Instrument
            const synth = new Tone.PolySynth(Tone.Synth, {
                envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
                oscillator: { type: "triangle" } 
            });

            // Per-Track Analysis
            const tAnalyzer = new Tone.Analyser("fft", 32);
            const tMeter = new Tone.Meter();
            synth.connect(tAnalyzer);
            synth.connect(tMeter);
            
            // Master Connection
            synth.connect(this.analyzer);
            synth.connect(this.meter);
            synth.toDestination(); // Output to speakers

            this.synths.push(synth);
            this.trackAnalyzers.push(tAnalyzer);
            this.trackMeters.push(tMeter);

            // Schedule
            const events = track.notes.map(note => ({
                time: note.time,
                note: note.name,
                duration: note.duration,
                velocity: note.velocity
            }));

            const part = new Tone.Part((time, value) => {
                synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
            }, events).start(0);

            this.parts.push(part);
        });

        Tone.Transport.loop = true;
        Tone.Transport.loopEnd = this.getDuration();
        Tone.Transport.start();
        this.isPlaying = true;
    }

    public getAnalyzer() {
        return this.analyzer;
    }

    public getAudioData(): AudioData {
        return this.analyzeNode(this.meter, this.analyzer);
    }

    public getTrackAudioData(trackIndex: number): AudioData {
        if (trackIndex < 0 || trackIndex >= this.trackMeters.length || !this.trackMeters[trackIndex]) {
            return { amplitude: 0, frequency: 0, pitchDelta: 0, effectiveBpm: 0, currentPhoneme: '', stats: {} };
        }
        return this.analyzeNode(this.trackMeters[trackIndex], this.trackAnalyzers[trackIndex]);
    }

    private analyzeNode(meter: Tone.Meter, analyzer: Tone.Analyser): AudioData {
        const db = meter.getValue();
        const rawDb = typeof db === 'number' ? db : db[0];
        let amplitude = (Math.max(-60, rawDb) + 60) / 60;
        amplitude = Math.max(0, Math.min(1, amplitude));
        if (!Number.isFinite(amplitude)) amplitude = 0;

        const fftValues = analyzer.getValue();
        let maxVal = -Infinity; 
        let maxIndex = -1;
        
        if (fftValues && fftValues.length > 0) {
            for (let i = 0; i < fftValues.length; i++) {
                const val = fftValues[i] as number;
                if (val > maxVal) { maxVal = val; maxIndex = i; }
            }
        }
        
        const nyquist = Tone.context.sampleRate / 2;
        let frequency = 0;
        if (fftValues.length > 0 && maxIndex >= 0) {
            frequency = (maxIndex / fftValues.length) * nyquist;
        }
        
        return {
            amplitude,
            frequency,
            pitchDelta: 0,
            effectiveBpm: Tone.Transport.bpm.value,
            currentPhoneme: 'silence',
            stats: { 'Vol': amplitude.toFixed(2), 'Freq': frequency.toFixed(0) }
        };
    }

    public getTrackCount(): number {
        return this.midi ? this.midi.tracks.length : 0;
    }

    public getCurrentNotes() {
        if (!this.midi || !this.isPlaying) return [];
        const duration = this.getDuration();
        const t = Tone.Transport.seconds % duration;
        
        const activeNotes: any[] = [];
        this.midi.tracks.forEach((track, i) => {
            track.notes.forEach(note => {
                if (t >= note.time && t < note.time + note.duration) {
                    activeNotes.push({ ...note, trackIndex: i });
                }
            });
        });
        return activeNotes;
    }
}

export const midiAudio = new MidiAudioEngine();
