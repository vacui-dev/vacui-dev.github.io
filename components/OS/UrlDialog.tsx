// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState } from 'react';
import { Globe, X, Download, Loader2, AlertTriangle } from 'lucide-react';

interface UrlDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: (url: string) => Promise<void>;
    title?: string;
}

export const UrlDialog: React.FC<UrlDialogProps> = ({ isOpen, onClose, onDownload, title = "Download from Web" }) => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        
        setLoading(true);
        setError(null);
        try {
            await onDownload(url);
            onClose();
            setUrl('');
        } catch (err: any) {
            setError(err.message || "Failed to download");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
            <div className="bg-[#1a1a1a] border border-white/20 rounded-lg shadow-2xl w-96 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#222]">
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        {title}
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">Asset URL</label>
                        <input 
                            autoFocus
                            type="url" 
                            value={url} 
                            onChange={e => setUrl(e.target.value)} 
                            placeholder="https://example.com/asset.png" 
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-cyan-500/50 focus:outline-none font-mono"
                        />
                    </div>
                    
                    {error && (
                        <div className="text-[10px] text-red-300 bg-red-900/30 p-2 rounded border border-red-500/30 flex gap-2 items-start">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="leading-tight">{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-xs hover:bg-white/10 text-neutral-300">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={loading || !url}
                            className={`px-4 py-1.5 rounded text-xs font-bold bg-cyan-700 text-white flex items-center gap-2 ${loading ? 'opacity-50 cursor-wait' : 'hover:bg-cyan-600'}`}
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            Download
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
