// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const ClockWidget: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-end text-neutral-300 px-3 py-1 hover:bg-white/10 rounded transition-colors cursor-default min-w-[90px] border border-transparent hover:border-white/5">
            <div className="text-xs font-bold font-mono leading-none mb-1 text-cyan-100">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] font-sans opacity-60 leading-none flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </div>
        </div>
    );
};