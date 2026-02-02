// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import '@react-three/fiber';
import { OrbitControls, Sphere, Box as BoxDrei, Stage } from '@react-three/drei';
import { VirtualFile } from '../../../../types/filesystem';
import { fileSystem } from '../../../../services/FileSystem';
import { Save, Box, Circle, Layers, Code, Image as ImageIcon, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import * as THREE from 'three';
import { MenuBar } from '../../MenuBar';
import { FilePicker } from '../../FilePicker';
import { CodeEditor } from '../../CodeEditor';

type MaterialConfig = any;

interface MaterialEditorProps {
    file?: VirtualFile;
    onOpenWindow: (type: any, file?: VirtualFile, folderId?: string) => void;
}

const DEFAULT_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DEFAULT_FRAGMENT_SHADER = `
varying vec2 vUv;
uniform float time;
void main() {
    vec2 p = vUv * 2.0 - 1.0;
    gl_FragColor = vec4(0.5 + 0.5 * cos(time + p.xyx + vec3(0,2,4)), 1.0);
}
`;

// Helper to validate shader code before applying to Three.js
const validateShader = (fragmentSource: string): { valid: boolean; error?: string } => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { valid: true }; // Can't validate, assume ok

    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!shader) return { valid: false, error: "Failed to create shader" };

    // Add headers to mimic Three.js environment for validation
    const header = `
        precision mediump float;
    `;
    gl.shaderSource(shader, header + fragmentSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        return { valid: false, error: log || "Unknown compile error" };
    }
    return { valid: true };
};

// --- 3D PREVIEW COMPONENTS ---

const PreviewScene: React.FC<{ config: MaterialConfig, shape: 'sphere' | 'cube', customShader?: string }> = ({ config, shape, customShader }) => {
    const [material, setMaterial] = useState<THREE.Material>(new THREE.MeshStandardMaterial());
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (materialRef.current && materialRef.current.uniforms && materialRef.current.uniforms.time) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    useEffect(() => {
        // Rebuild material when config changes
        const rebuild = async () => {
            if (config.type === 'Standard') {
                const mat = new THREE.MeshStandardMaterial({
                    color: config.color,
                    roughness: config.roughness,
                    metalness: config.metalness,
                    emissive: config.emissive || '#000000',
                    emissiveIntensity: config.emissiveIntensity || 0
                });

                // Load Textures if IDs exist
                if (config.mapId) {
                    const texFile = fileSystem.getFolders().flatMap(f => f.files).find(f => f.id === config.mapId);
                    if (texFile) {
                        try {
                            const blob = await fileSystem.readFile(texFile);
                            if (blob) {
                                const url = URL.createObjectURL(new Blob([blob]));
                                const tex = new THREE.TextureLoader().load(url);
                                mat.map = tex;
                                mat.needsUpdate = true;
                            }
                        } catch {}
                    }
                }
                setMaterial(mat);
            } else if (config.type === 'Shader') {
                const mat = new THREE.ShaderMaterial({
                    uniforms: { time: { value: 0 } },
                    vertexShader: DEFAULT_VERTEX_SHADER,
                    fragmentShader: customShader || DEFAULT_FRAGMENT_SHADER
                });
                setMaterial(mat);
            }
        };
        rebuild();
    }, [config, customShader]);

    return (
        <Stage intensity={0.5} environment="city" adjustCamera={false}>
            {shape === 'sphere' ? (
                <Sphere args={[1, 64, 64]}>
                    <primitive object={material} attach="material" ref={materialRef} />
                </Sphere>
            ) : (
                <BoxDrei args={[1.5, 1.5, 1.5]}>
                    <primitive object={material} attach="material" ref={materialRef} />
                </BoxDrei>
            )}
        </Stage>
    );
};

export const MaterialEditorApp: React.FC<MaterialEditorProps> = ({ file: initialFile, onOpenWindow }) => {
    const [currentFile, setCurrentFile] = useState<VirtualFile | undefined>(initialFile);
    const [config, setConfig] = useState<MaterialConfig>({
        type: 'Standard',
        color: '#ffffff',
        roughness: 0.5,
        metalness: 0.5
    });
    
    const [previewShape, setPreviewShape] = useState<'sphere' | 'cube'>('sphere');
    const [activeTab, setActiveTab] = useState<'pbr' | 'shader'>('pbr');
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'open_material' | 'select_texture'>('open_material');
    const [activeTextureSlot, setActiveTextureSlot] = useState<string | null>(null);

    // Shader Editing State
    const [shaderCode, setShaderCode] = useState(DEFAULT_FRAGMENT_SHADER);
    const [previewShader, setPreviewShader] = useState(DEFAULT_FRAGMENT_SHADER);
    const [shaderError, setShaderError] = useState<string | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);

    useEffect(() => {
        if (!currentFile) return;
        const load = async () => {
            try {
                const content = await fileSystem.readFile(currentFile);
                if (content) {
                    // Handle shader plain text
                    if (currentFile.type === 'shader') {
                         setConfig(prev => ({ ...prev, type: 'Shader' })); 
                         setActiveTab('shader');
                         const code = typeof content === 'string' ? content : new TextDecoder().decode(content);
                         setShaderCode(code);
                         setPreviewShader(code);
                         return;
                    }
                    
                    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                    setConfig(parsed);
                    if (parsed.type === 'Shader') setActiveTab('shader');
                }
            } catch (e) {
                console.log("New material file or parse error", e);
            }
        };
        load();
    }, [currentFile]);

    // Shader Auto-Compile Debounce
    useEffect(() => {
        if (activeTab !== 'shader') return;
        
        setIsCompiling(true);
        const timer = setTimeout(() => {
            const { valid, error } = validateShader(shaderCode);
            if (valid) {
                setPreviewShader(shaderCode);
                setShaderError(null);
            } else {
                setShaderError(error || "Syntax Error");
            }
            setIsCompiling(false);
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timer);
    }, [shaderCode, activeTab]);

    const handleSave = () => {
        let content = "";
        if (activeTab === 'shader') {
            content = shaderCode;
        } else {
            content = JSON.stringify(config, null, 2);
        }

        if (currentFile) {
            fileSystem.saveFile(currentFile.parentId === 'shared' ? 'shared' : 'materials', currentFile.id, content);
        } else {
            // "Save As" logic for new files
            const ext = activeTab === 'shader' ? 'glsl' : 'mat';
            const type = activeTab === 'shader' ? 'shader' : 'material';
            const name = `New_Material_${Date.now()}.${ext}`;
            const newFile = fileSystem.createFile('materials', name, type, content);
            if (newFile) setCurrentFile(newFile);
        }
    };

    const handleFileOpen = (file: VirtualFile) => {
        if (pickerMode === 'open_material') {
            setCurrentFile(file);
        } else if (pickerMode === 'select_texture' && activeTextureSlot) {
            updateConfig(activeTextureSlot as any, file.id);
        }
        setShowFilePicker(false);
    };

    const openTexturePicker = (slot: string) => {
        setPickerMode('select_texture');
        setActiveTextureSlot(slot);
        setShowFilePicker(true);
    };

    const openMaterialPicker = () => {
        setPickerMode('open_material');
        setShowFilePicker(true);
    };

    const updateConfig = (key: keyof MaterialConfig, val: any) => {
        setConfig(prev => ({ ...prev, [key]: val }));
    };

    const handleNew = () => {
        setCurrentFile(undefined);
        setConfig({
            type: 'Standard',
            color: '#ffffff',
            roughness: 0.5,
            metalness: 0.5
        });
        setShaderCode(DEFAULT_FRAGMENT_SHADER);
        setPreviewShader(DEFAULT_FRAGMENT_SHADER);
        setActiveTab('pbr');
    };

    const menuData = [
        {
            label: 'File',
            items: [
                { label: 'New Material', action: handleNew },
                { label: 'Open...', action: openMaterialPicker, shortcut: 'Ctrl+O' },
                { label: 'Save', action: handleSave, shortcut: 'Ctrl+S' },
                { divider: true },
                { label: 'Exit', action: () => {} }
            ]
        },
        {
            label: 'View',
            items: [
                { label: 'Preview Sphere', action: () => setPreviewShape('sphere') },
                { label: 'Preview Cube', action: () => setPreviewShape('cube') }
            ]
        },
        {
            label: 'Help',
            items: [
                { label: 'Documentation', action: () => onOpenWindow('help') },
                { label: 'About Material Lab', action: () => alert('Material Lab v1.2\nPhysically Based Rendering Material Editor.') }
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
                extensions={pickerMode === 'open_material' ? ['material', 'shader'] : ['image']}
                title={pickerMode === 'open_material' ? "Open Material" : "Select Texture"}
                allowImport
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Left: 3D Viewport */}
                <div className="flex-1 relative bg-gradient-to-b from-[#222] to-[#000]">
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <button onClick={() => setPreviewShape('sphere')} className={`p-2 rounded bg-black/50 border ${previewShape==='sphere'?'border-cyan-500':'border-white/10'}`}><Circle className="w-4 h-4" /></button>
                        <button onClick={() => setPreviewShape('cube')} className={`p-2 rounded bg-black/50 border ${previewShape==='cube'?'border-cyan-500':'border-white/10'}`}><Box className="w-4 h-4" /></button>
                    </div>
                    {currentFile || config ? (
                        <Canvas camera={{ position: [0, 0, 4] }}>
                            <Suspense fallback={null}>
                                <PreviewScene config={config} shape={previewShape} customShader={previewShader} />
                                <OrbitControls autoRotate autoRotateSpeed={0.5} />
                            </Suspense>
                        </Canvas>
                    ) : (
                        <div className="h-full flex items-center justify-center text-neutral-600">
                            <AlertTriangle className="w-10 h-10 opacity-20" />
                        </div>
                    )}
                </div>

                {/* Right: Inspector */}
                <div className="w-80 border-l border-white/10 bg-[#161616] flex flex-col shrink-0">
                    <div className="flex border-b border-white/10">
                        <button onClick={() => { setActiveTab('pbr'); updateConfig('type', 'Standard'); }} className={`flex-1 py-3 flex justify-center gap-2 ${activeTab==='pbr'?'bg-white/5 text-cyan-400 border-b-2 border-cyan-400':''}`}>
                            <Layers className="w-4 h-4" /> Standard
                        </button>
                        <button onClick={() => { setActiveTab('shader'); updateConfig('type', 'Shader'); }} className={`flex-1 py-3 flex justify-center gap-2 ${activeTab==='shader'?'bg-white/5 text-purple-400 border-b-2 border-purple-400':''}`}>
                            <Code className="w-4 h-4" /> Shader
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {activeTab === 'pbr' ? (
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-neutral-500 uppercase tracking-wider">Properties</h3>
                                        {currentFile && <span className="text-[10px] text-neutral-500 truncate max-w-[100px]">{currentFile.name}</span>}
                                    </div>
                                    
                                    <ControlRow label="Color">
                                        <input type="color" value={config.color} onChange={e => updateConfig('color', e.target.value)} className="bg-transparent border border-white/20 rounded h-6 w-full cursor-pointer" />
                                    </ControlRow>
                                    <ControlRow label="Roughness">
                                        <input type="range" min="0" max="1" step="0.01" value={config.roughness} onChange={e => updateConfig('roughness', parseFloat(e.target.value))} className="w-full" />
                                    </ControlRow>
                                    <ControlRow label="Metalness">
                                        <input type="range" min="0" max="1" step="0.01" value={config.metalness} onChange={e => updateConfig('metalness', parseFloat(e.target.value))} className="w-full" />
                                    </ControlRow>
                                    <ControlRow label="Emissive">
                                        <input type="color" value={config.emissive} onChange={e => updateConfig('emissive', e.target.value)} className="bg-transparent border border-white/20 rounded h-6 w-full cursor-pointer" />
                                    </ControlRow>
                                    
                                    <div className="pt-4 border-t border-white/10">
                                        <h3 className="font-bold text-neutral-500 uppercase tracking-wider mb-4">Textures</h3>
                                        <TextureSlot label="Diffuse Map" value={config.mapId} onPick={() => openTexturePicker('mapId')} />
                                        <TextureSlot label="Normal Map" value={config.normalMapId} onPick={() => openTexturePicker('normalMapId')} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col relative min-h-0">
                                {/* Shader Editor */}
                                <CodeEditor
                                    value={shaderCode}
                                    onChange={setShaderCode}
                                    language="glsl"
                                    className="flex-1"
                                />
                                
                                {/* Validation Status Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-[#161b22] border-t border-white/10 p-2 z-20">
                                    {shaderError ? (
                                        <div className="flex items-start gap-2 text-red-400 bg-red-900/20 p-2 rounded text-[10px]">
                                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <div className="whitespace-pre-wrap font-mono">{shaderError}</div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-400 text-[10px]">
                                            {isCompiling ? (
                                                <>
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                                    <span>Compiling...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span>Shader Compiled Successfully</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/10 bg-[#161616]">
                        <button onClick={handleSave} className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded flex items-center justify-center gap-2 font-bold">
                            <Save className="w-4 h-4" /> Save {activeTab === 'shader' ? 'Shader' : 'Material'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ControlRow: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-[10px] text-neutral-400 mb-1">{label}</label>
        {children}
    </div>
);

const TextureSlot: React.FC<{ label: string, value?: string, onPick: () => void }> = ({ label, value, onPick }) => (
    <div className="mb-3">
        <label className="block text-[10px] text-neutral-400 mb-1">{label}</label>
        <div className="flex gap-2 items-center">
            <button 
                onClick={onPick}
                className="w-8 h-8 bg-black/50 border border-white/10 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
                title="Select Texture"
            >
                {value ? <div className="w-6 h-6 bg-cyan-900/50 rounded-sm" /> : <ImageIcon className="w-4 h-4 text-neutral-700" />}
            </button>
            <div className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-neutral-400 truncate">
                {value || 'None'}
            </div>
        </div>
    </div>
);
