// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useEffect, useRef, useState } from 'react';
import { fileSystem } from '../../../../services/FileSystem';
import { imageProcessing, RGBHistogram } from '../../../../services/ImageProcessingService';
import { VirtualFile } from '../../../../types/filesystem';
import { Activity, Wand2, Save, ZoomIn, ZoomOut, ScanLine, AlertTriangle } from 'lucide-react';
import { MenuBar } from '../../MenuBar';
import { FilePicker } from '../../FilePicker';

interface ImageEditorProps {
    file?: VirtualFile;
    onOpenWindow: (type: any, file?: VirtualFile, folderId?: string) => void;
}

export const ImageEditorApp: React.FC<ImageEditorProps> = ({ file: initialFile, onOpenWindow }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentFile, setCurrentFile] = useState<VirtualFile | undefined>(initialFile);
    const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
    const [histogram, setHistogram] = useState<RGBHistogram | null>(null);
    const [materialType, setMaterialType] = useState<string>('Idle');
    const [scale, setScale] = useState(1);
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [showFilePicker, setShowFilePicker] = useState(false);

    useEffect(() => {
        if (!currentFile) return;

        const load = async () => {
            setMaterialType('Loading...');
            try {
                let blob: Blob;
                if (currentFile.isBinary && currentFile.content instanceof ArrayBuffer) {
                    blob = new Blob([currentFile.content], { type: 'image/png' });
                } else if (currentFile.type === 'image' && typeof currentFile.content === 'string') {
                    // Base64 or DataURL
                    const res = await fetch(currentFile.content);
                    blob = await res.blob();
                } else {
                    // Fallback fetch from URL if lazy
                    const data = await fileSystem.readFile(currentFile);
                    blob = new Blob([data], { type: 'image/png' });
                }

                const bmp = await createImageBitmap(blob);
                setImageBitmap(bmp);
                // Reset analysis when new image loads
                setHistogram(null);
            } catch (e) {
                console.error("Failed to load image", e);
                setMaterialType('Error Loading Image');
            }
        };
        load();
    }, [currentFile]);

    useEffect(() => {
        if (imageBitmap && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            // Resize canvas to match image
            canvasRef.current.width = imageBitmap.width;
            canvasRef.current.height = imageBitmap.height;
            
            ctx.drawImage(imageBitmap, 0, 0);
            const data = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
            setImageData(data);
            analyze(data);
        }
    }, [imageBitmap]);

    const analyze = (data: ImageData) => {
        const hist = imageProcessing.getHistogram(data);
        setHistogram(hist);
        const type = imageProcessing.getMaterialType(hist);
        setMaterialType(type);
    };

    const applyContrast = () => {
        if (!imageData || !canvasRef.current) return;
        // Generate curve based on Luma
        const lumaValues = [];
        for(let i=0; i<imageData.data.length; i+=4) {
            lumaValues.push(imageData.data[i]*0.21 + imageData.data[i+1]*0.71 + imageData.data[i+2]*0.07);
        }
        const curve = imageProcessing.generateWeightedContrastCurve(lumaValues);
        const newData = imageProcessing.applyCurve(imageData, curve);
        
        const ctx = canvasRef.current.getContext('2d');
        ctx?.putImageData(newData, 0, 0);
        setImageData(newData);
        analyze(newData);
    };

    const applySobel = () => {
        if (!imageData || !canvasRef.current) return;
        const edgeData = imageProcessing.applySobel(imageData);
        // Auto-apply levels to make edges pop (High gamma)
        const leveledData = imageProcessing.applyLevels(edgeData, 0, 0.1, 1.0);
        
        const ctx = canvasRef.current.getContext('2d');
        ctx?.putImageData(leveledData, 0, 0);
        setImageData(leveledData);
        analyze(leveledData);
    };

    const handleFileOpen = (file: VirtualFile) => {
        setCurrentFile(file);
        setShowFilePicker(false);
    };

    const handleClear = () => {
        setCurrentFile(undefined);
        setImageBitmap(null);
        setHistogram(null);
        setImageData(null);
        setMaterialType('Idle');
    };

    const menuData = [
        {
            label: 'File',
            items: [
                { label: 'Open Image...', action: () => setShowFilePicker(true), shortcut: 'Ctrl+O' },
                { label: 'Clear Workspace', action: handleClear, disabled: !currentFile },
                { divider: true },
                { label: 'Exit', action: () => {} } // Window handles exit
            ]
        },
        {
            label: 'Tools',
            items: [
                { label: 'Auto Contrast', action: applyContrast, disabled: !imageBitmap },
                { label: 'Edge Detection', action: applySobel, disabled: !imageBitmap },
            ]
        },
        {
            label: 'Help',
            items: [
                { label: 'Documentation', action: () => onOpenWindow('help') },
                { label: 'About Texture Analyzer', action: () => alert('Texture Analyzer v2.0\nAnalyzes and processes texture maps for PBR workflows.') }
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full bg-[#111] text-white font-mono text-xs">
            <MenuBar menus={menuData} />
            
            <FilePicker 
                isOpen={showFilePicker} 
                onCancel={() => setShowFilePicker(false)} 
                onSelect={handleFileOpen}
                extensions={['image']}
                title="Open Texture"
                allowImport
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Toolbar */}
                <div className="w-12 border-r border-white/10 flex flex-col items-center py-4 gap-4 bg-[#161616] shrink-0">
                    <button className="p-2 rounded hover:bg-white/10 text-cyan-400" title="Auto-Contrast" onClick={applyContrast} disabled={!imageBitmap}>
                        <Wand2 className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded hover:bg-white/10 text-purple-400" title="UV Edge Detect" onClick={applySobel} disabled={!imageBitmap}>
                        <ScanLine className="w-5 h-5" />
                    </button>
                    <div className="w-8 h-px bg-white/10" />
                    <button className="p-2 rounded hover:bg-white/10" title="Zoom In" onClick={() => setScale(s => s * 1.2)} disabled={!imageBitmap}>
                        <ZoomIn className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded hover:bg-white/10" title="Zoom Out" onClick={() => setScale(s => s / 1.2)} disabled={!imageBitmap}>
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                    <button className="p-2 rounded hover:bg-white/10 text-green-400" disabled={!imageBitmap}>
                        <Save className="w-5 h-5" />
                    </button>
                </div>

                {/* Viewport */}
                <div className="flex-1 overflow-auto flex items-center justify-center bg-[#080808] relative">
                    {imageBitmap ? (
                        <div className="border border-white/10 shadow-2xl" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                            <canvas ref={canvasRef} />
                        </div>
                    ) : (
                        <div className="text-neutral-600 flex flex-col items-center gap-2">
                            <AlertTriangle className="w-10 h-10 opacity-20" />
                            <div>No Image Loaded</div>
                            <button onClick={() => setShowFilePicker(true)} className="text-cyan-500 hover:underline mt-2">Open File...</button>
                        </div>
                    )}
                    
                    {imageBitmap && (
                        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-neutral-400">
                            {imageBitmap.width} x {imageBitmap.height} px | {(scale * 100).toFixed(0)}%
                        </div>
                    )}
                </div>

                {/* Sidebar: Analysis */}
                <div className="w-64 border-l border-white/10 bg-[#161616] flex flex-col shrink-0">
                    <div className="p-3 border-b border-white/10 font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-500" />
                        <span>ANALYSIS</span>
                    </div>
                    
                    <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                        <div className="bg-white/5 p-3 rounded border border-white/5">
                            <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wider">Detected Type</div>
                            <div className="font-bold text-yellow-400 text-sm">{materialType}</div>
                        </div>

                        {histogram && (
                            <>
                                <HistogramChannel label="RED" color="#ff5555" stat={histogram.r} />
                                <HistogramChannel label="GREEN" color="#55ff55" stat={histogram.g} />
                                <HistogramChannel label="BLUE" color="#5555ff" stat={histogram.b} />
                                <HistogramChannel label="LUMA" color="#ffffff" stat={histogram.luma} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const HistogramChannel: React.FC<{ label: string, color: string, stat: { mean: number, stdDev: number } }> = ({ label, color, stat }) => (
    <div>
        <div className="flex justify-between text-[10px] mb-1">
            <span style={{ color }}>{label}</span>
            <span className="opacity-50">μ: {stat.mean.toFixed(1)} σ: {stat.stdDev.toFixed(1)}</span>
        </div>
        <div className="h-8 bg-black rounded flex items-end border border-white/5 overflow-hidden relative">
            <div 
                className="absolute bottom-0 h-full opacity-30" 
                style={{ 
                    left: `${Math.max(0, (stat.mean - stat.stdDev) / 2.55)}%`, 
                    width: `${(stat.stdDev * 2) / 2.55}%`,
                    backgroundColor: color 
                }} 
            />
            <div 
                className="absolute bottom-0 h-full w-0.5 bg-white opacity-80"
                style={{ left: `${stat.mean / 2.55}%` }}
            />
        </div>
    </div>
);