// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { timelineService } from '../../../../services/TimelineService';
import { timeEngine } from '../../../../services/TimeEngine';
import { Keyframe } from '../../../../types/simulation';
import { Calendar } from 'lucide-react';

export const CalendarApp: React.FC = () => {
    const [events, setEvents] = useState<Keyframe[]>([]);
    const [currentDate, setCurrentDate] = useState(timeEngine.getSimulationTime());
    const [jd, setJd] = useState(timeEngine.getJulianDate());

    useEffect(() => {
        const update = () => {
            setEvents(timelineService.getCalendarEvents());
            setCurrentDate(timeEngine.getSimulationTime());
            setJd(timeEngine.getJulianDate());
        };
        // Polling for now, or ideally subscribe to time engine ticks
        const interval = setInterval(update, 100);
        return () => clearInterval(interval);
    }, []);

    const formatJD = (val: number) => val.toFixed(2);

    // Split events
    const pastEvents = events.filter(e => e.time < jd);
    const futureEvents = events.filter(e => e.time >= jd);

    // Sort: Past (Newest first), Future (Soonest first)
    pastEvents.sort((a, b) => b.time - a.time);
    futureEvents.sort((a, b) => a.time - b.time);

    return (
        <div className="flex flex-col h-full bg-[#0d1117] text-[#e0e0e0] font-mono">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-[#161b22] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <div>
                        <div className="font-bold text-sm">CHRONOS TIMELINE</div>
                        <div className="text-[10px] text-neutral-500">JD: {formatJD(jd)}</div>
                    </div>
                </div>
                <div className="text-xs bg-black/30 px-3 py-1 rounded border border-white/10">
                    {currentDate.toLocaleDateString()} {currentDate.toLocaleTimeString()}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10 z-0" />

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 z-10 space-y-8">
                    
                    {/* FUTURE */}
                    <div className="space-y-4">
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-8">Upcoming (Planned)</div>
                        {futureEvents.map((ev, i) => (
                            <EventRow key={i} event={ev} isPast={false} />
                        ))}
                        {futureEvents.length === 0 && <div className="pl-8 text-xs text-neutral-600 italic">No future events scheduled.</div>}
                    </div>

                    {/* NOW MARKER */}
                    <div className="flex items-center gap-2 relative">
                        <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-[#0d1117] shadow-[0_0_10px_rgba(168,85,247,0.8)] z-20 ml-[18px]" />
                        <div className="h-px flex-1 bg-purple-500/50" />
                        <span className="text-[10px] text-purple-400 font-bold pr-2">NOW</span>
                    </div>

                    {/* PAST */}
                    <div className="space-y-4">
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-8">History (Finished)</div>
                        {pastEvents.map((ev, i) => (
                            <EventRow key={i} event={ev} isPast={true} />
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

const EventRow: React.FC<{ event: Keyframe, isPast: boolean }> = ({ event, isPast }) => {
    const timeStr = event.time.toFixed(2);
    
    return (
        <div className={`flex gap-4 group ${isPast ? 'opacity-60' : ''}`}>
            {/* Dot */}
            <div className="w-12 flex justify-center pt-1 shrink-0">
                <div className={`w-2 h-2 rounded-full border transition-colors ${isPast ? 'bg-neutral-700 border-neutral-600' : 'bg-cyan-500 border-cyan-300 group-hover:scale-125'}`} />
            </div>
            
            {/* Card */}
            <div className={`flex-1 p-3 rounded border transition-all ${isPast ? 'bg-[#161b22] border-white/5' : 'bg-[#1a202c] border-white/10 group-hover:border-cyan-500/30'}`}>
                <div className="flex justify-between items-start mb-1">
                    <div className={`text-xs font-bold ${isPast ? 'text-neutral-400' : 'text-white'}`}>{event.meta?.label || 'Unknown Event'}</div>
                    <div className="text-[9px] font-mono opacity-50">JD {timeStr}</div>
                </div>
                <div className="text-[10px] text-neutral-400 leading-relaxed">
                    {event.meta?.description || 'System Event'}
                </div>
                <div className="mt-2 flex gap-2">
                    {event.meta?.tags?.map(tag => (
                        <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-500 border border-white/5">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};