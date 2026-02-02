// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState } from 'react';
import { wordlessDictionary, WordlessToken } from '../services/WordlessDictionary';

export const TokenizedText: React.FC<{ text: string, onNavigate: (id: string) => void }> = ({ text, onNavigate }) => {
    const parts = wordlessDictionary.parse(text);

    return (
        <>
            {parts.map((part, i) => {
                if (typeof part === 'string') return <span key={i} className="opacity-50">{part}</span>;
                return <TokenChip key={i} token={part} onNavigate={onNavigate} />;
            })}
        </>
    );
};

const TokenChip: React.FC<{ token: WordlessToken, onNavigate: (id: string) => void }> = ({ token, onNavigate }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Style based on token type
    let colorClass = "text-neutral-400 border-neutral-700 bg-neutral-900";
    let label = token.type;

    if (token.type === 'ILI') {
        colorClass = "text-cyan-400 border-cyan-900/50 bg-cyan-950/30 hover:bg-cyan-900/50 cursor-pointer";
        label = token.comment || token.definitionId || 'CONCEPT';
    } else if (token.type.startsWith('VR')) {
        colorClass = "text-green-400 border-green-900/50 bg-green-950/30";
    } else if (['HPO_HPR', 'MER_HOL', 'BI', '→', '⊂'].includes(token.type)) {
        colorClass = "text-pink-400 border-pink-900/50 bg-pink-950/30 font-bold";
    } else if (['DAT', 'UTF-8'].includes(token.type)) {
        colorClass = "text-yellow-400 border-yellow-900/50 bg-yellow-950/30";
    } else if (token.type.startsWith('N')) {
        colorClass = "text-blue-400 border-blue-900/50 bg-blue-950/30";
    }

    const definition = wordlessDictionary.getTokenDefinition(token.type);

    return (
        <span 
            className={`inline-block mx-0.5 px-1.5 py-0.5 rounded border text-[10px] align-middle relative group select-none transition-all ${colorClass}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
                if (token.type === 'ILI' && token.definitionId) {
                    e.stopPropagation();
                    onNavigate(`ILI§${token.definitionId}`);
                }
            }}
        >
            {label}
            
            {/* Tooltip */}
            {isHovered && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black border border-white/20 rounded p-2 z-50 shadow-xl flex flex-col gap-1 pointer-events-none">
                    <span className="flex items-center justify-between text-[9px] font-bold text-white border-b border-white/10 pb-1">
                        <span>{token.type}</span>
                        {token.definitionId && <span className="font-mono opacity-50">#{token.definitionId}</span>}
                    </span>
                    <span className="text-[9px] text-neutral-300 leading-tight">
                        {token.type === 'ILI' ? (token.comment || 'Concept Link') : definition}
                    </span>
                    {token.comment && token.type !== 'ILI' && (
                        <span className="text-[9px] text-cyan-400 italic">"{token.comment}"</span>
                    )}
                </span>
            )}
        </span>
    );
};