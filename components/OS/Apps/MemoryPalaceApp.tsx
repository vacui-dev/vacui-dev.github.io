// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect, useRef } from 'react';
import { hyperSpace, HyperNote } from '../../../services/HyperSpace';

export const MemoryPalaceApp: React.FC = () => {
    const [notes, setNotes] = useState<HyperNote[]>([]);
    const [selectedNote, setSelectedNote] = useState<HyperNote | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const update = () => setNotes([...hyperSpace.getNotes()]);
        const unsub = hyperSpace.subscribe(update);
        update();
        return unsub;
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#000000'; 
        ctx.fillRect(0, 0, 500, 500);

        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(250, 0); ctx.lineTo(250, 500);
        ctx.moveTo(0, 250); ctx.lineTo(500, 250);
        ctx.stroke();

        notes.forEach(note => {
            if (!note.projected) return;
            const x = 250 + note.projected.x;
            const y = 250 + note.projected.y;

            ctx.fillStyle = selectedNote?.id === note.id ? '#00ff00' : '#888';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#666';
            ctx.font = '10px monospace';
            ctx.fillText(note.title.substring(0,8), x + 6, y + 3);
        });
    }, [notes, selectedNote]);

    return (
        <div className="flex h-full">
            <div className="flex-1 relative bg-black">
                <canvas 
                    ref={canvasRef} 
                    width={500} 
                    height={500} 
                    className="w-full h-full cursor-crosshair"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const cx = e.clientX - rect.left;
                        const cy = e.clientY - rect.top;
                        const scaleX = 500 / rect.width;
                        const scaleY = 500 / rect.height;
                        const rawX = cx * scaleX;
                        const rawY = cy * scaleY;

                        const hit = notes.find(n => {
                            if (!n.projected) return false;
                            const nx = 250 + n.projected.x;
                            const ny = 250 + n.projected.y;
                            const dist = Math.sqrt((nx - rawX)**2 + (ny - rawY)**2);
                            return dist < 10;
                        });
                        setSelectedNote(hit || null);
                    }}
                />
            </div>
            <div className="w-64 border-l p-4 overflow-auto" style={{ borderColor: 'var(--outline-color)', background: 'rgba(0,0,0,0.1)' }}>
                <div className="text-xs font-bold opacity-50 mb-2">NOTE DETAILS</div>
                {selectedNote ? (
                    <div className="space-y-4">
                        <div>
                            <div className="text-[10px] opacity-50">ID</div>
                            <div className="font-mono text-xs break-all" style={{ color: 'var(--primary-color)' }}>{selectedNote.id}</div>
                        </div>
                        <div>
                            <div className="text-[10px] opacity-50">CONTENT</div>
                            <pre className="text-[10px] bg-black/30 p-2 rounded overflow-auto max-h-40 mt-1 opacity-80">
                                {JSON.stringify(selectedNote.content, null, 2)}
                            </pre>
                        </div>
                    </div>
                ) : (
                    <div className="opacity-50 text-center mt-10 text-xs italic">
                        Select a node in HyperSpace.
                    </div>
                )}
            </div>
        </div>
    );
};