// Copyright (c) 2025 vacui.dev, all rights reserved

/**
 * Sampler Engine
 * 
 * Handles loading and playback of audio samples from the TidalCycles SuperDirt library.
 * Integrated into the Genesis Node System via 'SAMPLER' nodes.
 */

const SAMPLE_BASE_URL = "https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master";

// Mapping common names to SuperDirt sample folder names
const SAMPLE_MANIFEST: Record<string, string[]> = {
  'bd': ['bd/BT0A0DA.wav', 'bd/BT0A0DB.wav', 'bd/BT0A0D0.wav'], 
  'sd': ['sd/rytm-00-hard.wav', 'sd/rytm-01-classic.wav'],
  'hh': ['hh/000_hh3closedhh.wav', 'hh/007_hh3openhh.wav'],
  'cp': ['cp/HANDCLP0.wav', 'cp/HANDCLP1.wav'],
  'amen': [
    'amencutup/000_AMENCUT_001.wav', 'amencutup/001_AMENCUT_002.wav', 'amencutup/002_AMENCUT_003.wav',
    'amencutup/003_AMENCUT_004.wav', 'amencutup/004_AMENCUT_005.wav', 'amencutup/005_AMENCUT_006.wav'
  ],
  'gabber': ['gabba/000_0.wav', 'gabba/001_1.wav', 'gabba/002_2.wav', 'gabba/003_3.wav'],
  'jungbass': ['jungbass/000_deeep_n_low.wav', 'jungbass/001_fat_808_sub.wav', 'jungbass/005_jungasubdown.wav'],
  'rave': ['rave/AREUREADY.wav', 'rave/prodigyloop.wav', 'rave/stabah.wav', 'rave/doh.wav']
};

class SamplerEngineService {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private loadedBanks: Record<string, AudioBuffer[]> = {};
    private isLoading: boolean = false;

    public async initialize() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);
            
            // Lazy load defaults
            this.loadSamples(['bd', 'sd', 'hh', 'amen']);
        }
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    public async loadSamples(banks: string[]) {
        if (!this.ctx) await this.initialize();
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        const promises = banks.map(async (key) => {
            if (this.loadedBanks[key]) return; // Already loaded
            
            const files = SAMPLE_MANIFEST[key];
            if (!files) return;

            const buffers = await Promise.all(files.map(async (file) => {
                try {
                    const res = await fetch(`${SAMPLE_BASE_URL}/${file}`);
                    if (!res.ok) return null;
                    const buf = await res.arrayBuffer();
                    return await this.ctx!.decodeAudioData(buf);
                } catch (e) {
                    console.warn(`Failed to load sample ${file}`);
                    return null;
                }
            }));
            
            const valid = buffers.filter(b => b !== null) as AudioBuffer[];
            if (valid.length > 0) this.loadedBanks[key] = valid;
        });

        await Promise.all(promises);
        this.isLoading = false;
        console.log("SamplerEngine: Samples Loaded", Object.keys(this.loadedBanks));
    }

    /**
     * Triggers a sample playback.
     * @param instrument Name of the bank (e.g., 'bd', 'amen')
     * @param index Index in the bank, or -1 for random
     * @param pitch Playback rate (1.0 = normal)
     * @param gain Volume (0.0 - 1.0)
     */
    public play(instrument: string, index: number = 0, pitch: number = 1.0, gain: number = 1.0) {
        if (!this.ctx || !this.masterGain) return;

        const bank = this.loadedBanks[instrument];
        if (!bank || bank.length === 0) return;

        const bufIndex = index < 0 ? Math.floor(Math.random() * bank.length) : index % bank.length;
        const buffer = bank[bufIndex];

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;

        const nodeGain = this.ctx.createGain();
        nodeGain.gain.value = gain;

        source.connect(nodeGain);
        nodeGain.connect(this.masterGain);
        source.start(0);
    }
}

export const samplerEngine = new SamplerEngineService();
