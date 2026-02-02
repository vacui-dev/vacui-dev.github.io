// Copyright (c) 2025 vacui.dev, all rights reserved

import { Track, Keyframe } from "../types/simulation";
import { timeEngine } from "./TimeEngine";

/**
 * Timeline Service
 * 
 * The Source of Truth for both Animation and Calendar events.
 * interpolates values for the animation system, and lists events for the calendar UI.
 */
class TimelineService {
    private tracks: Track[] = [];
    private listeners: (() => void)[] = [];

    public loadTracks(tracks: Track[]) {
        this.tracks = tracks;
        this.notify();
    }

    public getTracks() {
        return this.tracks;
    }

    public addTrack(track: Track) {
        this.tracks.push(track);
        this.notify();
    }

    public clear() {
        this.tracks = [];
        this.notify();
    }

    /**
     * Evaluate all tracks at a specific Julian Date (time).
     * Returns a map of entityId -> { property: value }
     */
    public evaluate(jd: number): Record<string, Record<string, any>> {
        const result: Record<string, Record<string, any>> = {};

        for (const track of this.tracks) {
            const value = this.interpolateTrack(track, jd);
            if (value !== undefined) {
                if (!result[track.targetId]) result[track.targetId] = {};
                result[track.targetId][track.property] = value;
            }
        }

        return result;
    }

    /**
     * Get all events (Keyframes with metadata) for the Calendar UI.
     * Can filter by date range if needed.
     */
    public getCalendarEvents(): Keyframe[] {
        const events: Keyframe[] = [];
        // If a track loops, we need to project events into the current viewing window?
        // For MVP, we just return the base keyframes.
        // In a real calendar, you'd unroll the loop.
        
        // Let's unroll loops for +/- 1 cycle relative to current time just to show them
        const currentJD = timeEngine.getJulianDate();

        for (const track of this.tracks) {
            if (track.loop && track.duration) {
                // Project future and past occurrences
                // Find cycle index
                const cycleCount = 5; // Show next 5 cycles
                for (let i = -1; i < cycleCount; i++) {
                    const offset = i * track.duration;
                    for (const kf of track.keyframes) {
                        if (kf.meta?.label) {
                            events.push({
                                ...kf,
                                time: kf.time + offset, // Projected time
                                id: `${kf.id}_cycle_${i}`
                            });
                        }
                    }
                }
            } else {
                // Static events
                for (const kf of track.keyframes) {
                    if (kf.meta?.label) {
                        events.push(kf);
                    }
                }
            }
        }
        
        // Sort by time
        return events.sort((a, b) => a.time - b.time);
    }

    private interpolateTrack(track: Track, jd: number): any {
        if (track.keyframes.length === 0) return undefined;

        // Handle Looping
        let time = jd;
        if (track.loop && track.duration) {
            // Normalize time to [0, duration]
            // We assume keyframes start at 0 relative to start? 
            // Or are they absolute JDs? 
            // Let's assume loop tracks are modulo the epoch J2000 (2451545.0).
            const epoch = 2451545.0;
            time = (jd - epoch) % track.duration;
            if (time < 0) time += track.duration;
        }

        // Find surrounding keyframes
        // Keyframes should be sorted by time
        // (We assume they are sorted in the track definition)
        
        let prev: Keyframe | null = null;
        let next: Keyframe | null = null;

        for (let i = 0; i < track.keyframes.length; i++) {
            if (track.keyframes[i].time > time) {
                next = track.keyframes[i];
                prev = track.keyframes[i - 1];
                break;
            }
        }

        // Boundary conditions
        if (!prev && !next) return undefined; // Should not happen if length > 0
        if (!prev) return track.keyframes[0].value; // Before first
        if (!next) return track.keyframes[track.keyframes.length - 1].value; // After last

        // Interpolate
        const t = (time - prev.time) / (next.time - prev.time);
        
        if (prev.interpolation === 'step') return prev.value;
        
        // Linear / Bezier (Simplified to Linear for now)
        if (typeof prev.value === 'number' && typeof next.value === 'number') {
            return prev.value + (next.value - prev.value) * t;
        }
        
        if (Array.isArray(prev.value) && Array.isArray(next.value)) {
            // Vector / Color interpolation
            return prev.value.map((v: number, i: number) => v + (next.value[i] - v) * t);
        }

        return prev.value; // Fallback
    }

    public subscribe(cb: () => void) {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}

export const timelineService = new TimelineService();