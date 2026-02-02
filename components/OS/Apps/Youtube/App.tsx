// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { fileSystem } from '../../../../services/FileSystem';
import { Youtube, Play } from 'lucide-react';
import { INITIAL_VIDEOS } from './videos';

interface VideoItem {
    title: string;
    url: string;
    id: string;
    type: 'video';
}

export const YoutubeApp: React.FC = () => {
    const [videos, setVideos] = useState<VideoItem[]>(INITIAL_VIDEOS as VideoItem[]);
    const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

    useEffect(() => {
        // Check for updates in OS folder
        const loadVideos = async () => {
            const osFolder = fileSystem.getFolders().find(f => f.id === 'os');
            const videoFile = osFolder?.files.find(f => f.name === 'videos.json');
            if (videoFile) {
                try {
                    let parsed = [];
                    if (typeof videoFile.content === 'string') {
                        parsed = JSON.parse(videoFile.content);
                    } else if (Array.isArray(videoFile.content)) {
                        parsed = videoFile.content;
                    } else if (videoFile.content) {
                        parsed = videoFile.content;
                    } else {
                        const raw = await fileSystem.readFile(videoFile);
                        parsed = JSON.parse(raw);
                    }
                    setVideos(parsed);
                } catch (e) {
                    console.error("Failed to parse videos.json", e);
                }
            }
        };

        loadVideos();
        const unsub = fileSystem.subscribe(loadVideos);
        return unsub;
    }, []);

    // Helper to extract Video ID from various youtube URL formats
    const getEmbedUrl = (url: string) => {
        let videoId = '';
        if (url.includes('shorts/')) {
            videoId = url.split('shorts/')[1].split('?')[0];
        } else if (url.includes('watch?v=')) {
            videoId = url.split('watch?v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else {
            // assume ID is passed directly if none match (fallback)
            videoId = url; 
        }
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    };

    return (
        <div className="flex h-full bg-black text-white font-sans">
            {/* Sidebar List */}
            <div className="w-64 border-r border-white/10 bg-[#111] flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-600" />
                    <span className="font-bold tracking-tight">YouTube</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {videos.map((video, i) => (
                        <button 
                            key={i}
                            onClick={() => setActiveVideo(video)}
                            className={`w-full text-left p-3 rounded text-xs flex items-center gap-3 transition-colors ${activeVideo === video ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5'}`}
                        >
                            <div className="w-6 h-6 rounded bg-red-900/20 flex items-center justify-center shrink-0">
                                <Play className="w-3 h-3 text-red-500" fill="currentColor" />
                            </div>
                            <span className="truncate font-medium">{video.title}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-black relative flex flex-col">
                {activeVideo ? (
                    <div className="flex-1 flex flex-col">
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            <iframe 
                                width="100%" 
                                height="100%" 
                                src={getEmbedUrl(activeVideo.url)} 
                                title={activeVideo.title} 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen
                                className="w-full h-full"
                            />
                        </div>
                        <div className="p-4 bg-[#111] border-t border-white/10">
                            <h2 className="font-bold text-lg mb-1">{activeVideo.title}</h2>
                            <p className="text-xs text-neutral-500 font-mono">{activeVideo.url}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 gap-4">
                        <Youtube className="w-16 h-16 opacity-20" />
                        <div className="text-sm">Select a video to play</div>
                    </div>
                )}
            </div>
        </div>
    );
};