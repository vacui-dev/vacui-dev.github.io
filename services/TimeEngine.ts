// Copyright (c) 2025 vacui.dev, all rights reserved

/**
 * TimeEngine Service
 * 
 * Handles astronomical time calculations (Julian Date) and time scaling.
 * Provides the fundamental "Clock" for the simulation, separating Physics Time (dt) from World Time (JD).
 */
class TimeEngineService {
    private baseDate: Date;
    private timeMultiplier: number = 1.0;
    private _isPaused: boolean = false;
    private startTime: number;
    private accumulatedTime: number = 0;

    constructor() {
        this.baseDate = new Date();
        this.startTime = Date.now();
    }

    public setSpeed(multiplier: number) {
        this.timeMultiplier = multiplier;
    }

    public setPaused(paused: boolean) {
        this._isPaused = paused;
    }

    /**
     * Returns the current Julian Date (JD).
     * Julian Date is a continuous count of days since the beginning of the Julian Period (4713 BC).
     * It is the standard time format for astronomy.
     */
    public getJulianDate(): number {
        // Calculate elapsed real time in days, scaled by multiplier
        // 1 real second = 1 simulation second * multiplier
        const now = Date.now();
        if (!this._isPaused) {
            const dt = (now - this.startTime) / 1000; // seconds
            this.accumulatedTime += dt * this.timeMultiplier;
            this.startTime = now;
        } else {
            this.startTime = now;
        }

        // Effective Date
        const effectiveDate = new Date(this.baseDate.getTime() + (this.accumulatedTime * 1000));
        
        return this.toJulianDate(effectiveDate);
    }

    public getSimulationTime(): Date {
        return new Date(this.baseDate.getTime() + (this.accumulatedTime * 1000));
    }

    /**
     * Converts a JS Date object to Julian Date float.
     */
    private toJulianDate(date: Date): number {
        const Y = date.getUTCFullYear();
        const M = date.getUTCMonth() + 1;
        const D = date.getUTCDate() + (date.getUTCHours()/24) + (date.getUTCMinutes()/1440) + (date.getUTCSeconds()/86400) + (date.getUTCMilliseconds()/86400000);
        
        let y = Y, m = M;
        if (m <= 2) { y = Y - 1; m = M + 12; }
        
        const A = Math.floor(y / 100);
        const B = 2 - A + Math.floor(A / 4);
        const JD = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
        
        return JD;
    }

    public getSiderealTime(lon: number, jd: number): number {
        // Simplified Local Sidereal Time (LST) calculation
        const d = jd - 2451545.0;
        const GMST = 18.697374558 + 24.06570982441908 * d;
        const LST = (GMST + lon / 15) % 24;
        return LST < 0 ? LST + 24 : LST;
    }
}

export const timeEngine = new TimeEngineService();