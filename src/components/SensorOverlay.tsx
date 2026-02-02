// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React, { useEffect, useRef, useState } from 'react';
import { sensorSystem } from '../services/SensorSystem';
import { TimeFrame } from '../types/legacy';
import { Activity, Mic, Cpu, Database } from 'lucide-react';

export const SensorOverlay: React.FC = () => {
    const videoRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [active, setActive] = useState(false);
    const [frameData, setFrameData] = useState<TimeFrame | null>(null);

    useEffect(() => {
        if (!active) {
            sensorSystem.disconnect();
            return;
        }

        const init = async () => {
            try {
                await sensorSystem.initialize();
                
                // Attach video element to DOM
                const vEl = sensorSystem.getVideoElement();
                if (vEl && videoRef.current) {
                    vEl.style.width = '100%';
                    vEl.style.height = '100%';
                    vEl.style.objectFit = 'cover';
                    vEl.style.opacity = '0.6';
                    // clear previous
                    if (videoRef.current.firstChild) videoRef.current.removeChild(videoRef.current.firstChild);
                    videoRef.current.appendChild(vEl);
                }

                // Subscribe to data stream
                const unsub = sensorSystem.subscribe((frame) => {
                    setFrameData(frame);
                    drawOscilloscope(frame);
                });

                return () => {
                    unsub();
                };
            } catch (e) {
                console.error("Sensor init error", e);
                setActive(false);
            }
        };

        init();
        return () => { sensorSystem.disconnect(); };
    }, [active]);

    const drawOscilloscope = (frame: TimeFrame) => {
        const canvas = canvasRef.current;
        if (!canvas || !frame.rawAudio) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const data = frame.rawAudio;

        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00f0ff';
        ctx.beginPath();

        const sliceWidth = width * 1.0 / data.length;
        let x = 0;

        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0; // normalize roughly
            const y = height - (v * height / 2); // Flip for better viz

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }
        ctx.stroke();
    };

    if (!active) {
        // Floating button removed as requested.
        // Activation must be triggered programmatically or via other OS apps (e.g., Ganglion Launcher).
        return null;
    }

    return (
        <div className="fixed top-20 right-6 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden flex flex-col shadow-2xl z-40 font-mono text-xs">
            {/* Header */}
            <div className="bg-white/5 p-3 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2 text-cyan-400">
                    <Activity className="w-4 h-4" />
                    <span className="font-bold tracking-wider">SENSORY_PIPELINE</span>
                </div>
                <button 
                    onClick={() => setActive(false)}
                    className="text-red-500 hover:text-red-400 text-[10px] border border-red-500/50 px-2 py-0.5 rounded"
                >
                    TERMINATE
                </button>
            </div>

            {/* Video Feed Scaffolding */}
            <div className="relative h-48 bg-black border-b border-white/10 group">
                <div ref={videoRef} className="absolute inset-0 w-full h-full mix-blend-screen" />
                <div className="absolute inset-0 bg-cyan-900/20 pointer-events-none" />
                
                {/* Face Mesh Overlay Simulation */}
                <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
                    <rect x="25%" y="20%" width="50%" height="60%" fill="none" stroke="#00f0ff" strokeWidth="1" strokeDasharray="4 2" />
                    <circle cx="40%" cy="40%" r="2" fill="#00f0ff" />
                    <circle cx="60%" cy="40%" r="2" fill="#00f0ff" />
                    <path d="M 35 70 Q 50 85 65 70" stroke="#00f0ff" fill="none" transform="translate(100, 30) scale(0.8)" />
                </svg>

                <div className="absolute top-2 left-2 flex gap-1">
                    <span className="bg-red-600 text-white px-1 rounded text-[9px] animate-pulse">REC</span>
                    <span className="bg-neutral-800 text-neutral-300 px-1 rounded text-[9px]">FACE_TRACK: ACTIVE</span>
                </div>
            </div>

            {/* Data Streams */}
            <div className="p-3 space-y-4">
                
                {/* Audio Processor */}
                <div>
                    <div className="flex items-center gap-2 mb-1 text-neutral-400">
                        <Mic className="w-3 h-3" />
                        <span>AUDIO_FFT_STREAM</span>
                    </div>
                    <canvas ref={canvasRef} width={280} height={40} className="w-full bg-black/50 border border-white/5 rounded" />
                </div>

                {/* Semantic Analysis */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <div className="flex items-center gap-1 text-neutral-500 mb-1">
                            <Cpu className="w-3 h-3" />
                            <span>PHONEMES</span>
                        </div>
                        <div className="space-y-1">
                            {frameData?.semantic.phonemes && Object.entries(frameData.semantic.phonemes).map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center">
                                    <span>{k}</span>
                                    <div className="w-16 h-1 bg-neutral-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyan-500 transition-all duration-75" style={{ width: `${(v as number) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <div className="flex items-center gap-1 text-neutral-500 mb-1">
                            <Database className="w-3 h-3" />
                            <span>TIMELINE</span>
                        </div>
                        <div className="space-y-1 text-neutral-300">
                            <div className="flex justify-between">
                                <span>EXP:</span>
                                <span className="text-cyan-400">{frameData?.semantic.expression || '---'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>VOL:</span>
                                <span>{frameData?.semantic.audioFeatures?.volume.toFixed(1) || '0.0'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>TS:</span>
                                <span className="opacity-50">{frameData ? (frameData.timestamp % 10000) : 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};