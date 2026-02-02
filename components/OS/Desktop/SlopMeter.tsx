// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { fileSystem } from '../../../services/FileSystem';
import { VirtualFile } from '../../../types/filesystem';
import { AlertTriangle } from 'lucide-react';

interface SlopMeterProps {
    onOpenWindow: (type: any, file?: VirtualFile, folderId?: string) => void;
}

export const SlopMeter: React.FC<SlopMeterProps> = ({ onOpenWindow }) => {
    const [slopScore, setSlopScore] = useState<number | null>(null);

    useEffect(() => {
        const fetchSlop = async () => {
            const osFolder = fileSystem.getFolders().find(f => f.id === 'os');
            const slopFile = osFolder?.files.find(f => f.name === 'slop_score.json');
            if (slopFile) {
                try {
                    const content = await fileSystem.readFile(slopFile);
                    const data = typeof content === 'string' ? JSON.parse(content) : content;
                    if (data && typeof data.slop_score === 'number') {
                        setSlopScore(data.slop_score);
                    }
                } catch {}
            }
        };
        fetchSlop();
        return fileSystem.subscribe(fetchSlop);
    }, []);

    if (slopScore === null) return null;

    // New Thresholds: <25 Green, <50 Yellow, <80 Orange, >=80 Red
    const getSlopColor = (score: number) => {
        if (score < 25) return 'bg-green-500';
        if (score < 50) return 'bg-yellow-500';
        if (score < 80) return 'bg-orange-500';
        return 'bg-red-600 animate-pulse';
    };

    const getTextColor = (score: number) => {
        if (score < 25) return 'text-green-400';
        if (score < 50) return 'text-yellow-400';
        if (score < 80) return 'text-orange-400';
        return 'text-red-500 font-black';
    };

    const getSlopWidth = (score: number) => Math.min(100, Math.max(5, score));

    return (
        <button
            onClick={() => {
                 const osFolder = fileSystem.getFolders().find(f => f.id === 'os');
                 const slopFile = osFolder?.files.find(f => f.name === 'slop_score.json');
                 if (slopFile) onOpenWindow('test_suite', slopFile, 'os');
                 else onOpenWindow('test_suite', { id: 'slop_report', name: 'Slop Report', type: 'system' } as VirtualFile);
            }}
            className="flex items-center gap-2 h-8 px-3 mx-1 rounded hover:bg-white/10 transition-colors border border-transparent hover:border-white/5 group"
            title={`Codebase Slop Level: ${slopScore}%\n>500 lines: Yellow\n>750 lines: Orange\n>1000 lines: Red`}
        >
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                    {slopScore >= 25 && <AlertTriangle className={`w-3 h-3 ${getTextColor(slopScore)}`} />}
                    <span className={`text-xs font-bold font-mono ${getTextColor(slopScore)}`}>
                        SLOP: {slopScore}%
                    </span>
                </div>
                
                <div className="w-24 h-1 bg-neutral-800/50 rounded-full overflow-hidden mt-0.5">
                    <div 
                        className={`h-full transition-all duration-500 ${getSlopColor(slopScore)}`} 
                        style={{ width: `${getSlopWidth(slopScore)}%` }} 
                    />
                </div>
            </div>
        </button>
    );
};