// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useEffect, useRef, useState } from 'react';
import { Disc } from 'lucide-react';

interface DvdScreensaverProps {
    onRegisterExclusionZone?: (id: string, rect: { x: number, y: number, width: number, height: number }) => void;
    onUnregisterExclusionZone?: (id: string) => void;
}

export const DvdScreensaverApp: React.FC<DvdScreensaverProps> = ({ onRegisterExclusionZone, onUnregisterExclusionZone }) => {
    const [pos, setPos] = useState({ x: 100, y: 100 });
    const [velocity, setVelocity] = useState({ x: 3, y: 3 });
    const [color, setColor] = useState('#ff0000');
    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | null>(null);
    
    // Dimensions of the "DVD" logo box
    const WIDTH = 160;
    const HEIGHT = 80;

    useEffect(() => {
        const animate = () => {
            setPos(prev => {
                let nextX = prev.x + velocity.x;
                let nextY = prev.y + velocity.y;
                let nextVx = velocity.x;
                let nextVy = velocity.y;
                let hit = false;

                // Screen Bounds (Adjust for window chrome if needed, but this is "fullscreen" inside the app window)
                const winW = containerRef.current?.parentElement?.clientWidth || 500;
                const winH = containerRef.current?.parentElement?.clientHeight || 400;

                if (nextX <= 0 || nextX + WIDTH >= winW) {
                    nextVx = -nextVx;
                    hit = true;
                }
                if (nextY <= 0 || nextY + HEIGHT >= winH) {
                    nextVy = -nextVy;
                    hit = true;
                }

                if (hit) {
                    setVelocity({ x: nextVx, y: nextVy });
                    setColor(`hsl(${Math.random() * 360}, 100%, 50%)`);
                }
                
                return { x: nextX, y: nextY };
            });
            
            requestRef.current = requestAnimationFrame(animate);
        };
        
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [velocity]);

    // Register Exclusion Zone
    useEffect(() => {
        if (!containerRef.current || !onRegisterExclusionZone) return;

        // Calculate absolute screen coordinates of the logo
        const updateZone = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                // rect.x and rect.y are viewport relative, which matches the desktop coordinate system (mostly)
                onRegisterExclusionZone('dvd_logo', {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                });
            }
        };

        const interval = setInterval(updateZone, 50); // Update shell every 50ms
        return () => {
            clearInterval(interval);
            onUnregisterExclusionZone?.('dvd_logo');
        };
    }, [pos, onRegisterExclusionZone, onUnregisterExclusionZone]);

    return (
        <div className="w-full h-full bg-black relative overflow-hidden">
            <div 
                ref={containerRef}
                className="absolute flex items-center justify-center rounded-lg shadow-[0_0_20px_currentColor] border-2"
                style={{ 
                    left: pos.x, 
                    top: pos.y, 
                    width: WIDTH, 
                    height: HEIGHT, 
                    color: color,
                    borderColor: color,
                    background: 'rgba(0,0,0,0.8)'
                }}
            >
                <div className="flex items-center gap-2 font-black italic text-xl tracking-widest">
                    <Disc className="w-8 h-8 animate-spin-slow" />
                    DVD
                </div>
            </div>
            <div className="absolute bottom-2 left-2 text-[10px] text-white/30 font-mono">
                Exclusion Zone Active
            </div>
        </div>
    );
};
