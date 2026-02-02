// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { wordlessDictionary, ConceptEntry } from '../../../../services/WordlessDictionary';
import { fileSystem } from '../../../../services/FileSystem';
import { VirtualFolder } from '../../../../types/filesystem';
import { TokenizedText } from '../../../TokenRenderer';
import { ArrowLeft, Search, BookOpen, Link as LinkIcon, Loader2, Globe, ExternalLink } from 'lucide-react';

interface WordlessDictionaryAppProps {
    initialConceptId?: string;
}

export const WordlessDictionaryApp: React.FC<WordlessDictionaryAppProps> = ({ initialConceptId }) => {
    const [history, setHistory] = useState<string[]>([]);
    const [currentId, setCurrentId] = useState<string>('');
    const [searchVal, setSearchVal] = useState('');
    const [searchResults, setSearchResults] = useState<ConceptEntry[]>([]);
    const [activeConcept, setActiveConcept] = useState<ConceptEntry | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Dynamic Filesystem Mounting
    useEffect(() => {
        // Mount a virtual dictionary folder
        const concepts = wordlessDictionary.lookup('');
        const folder: VirtualFolder = {
            id: 'dictionary',
            name: 'Dictionary',
            files: concepts.map(c => ({
                id: c.id,
                name: `${c.label.replace(/[\s/]/g, '_')}.concept`,
                type: 'text',
                content: JSON.stringify(c, null, 2),
                loaded: true,
                updatedAt: Date.now(),
                readOnly: true
            }))
        };
        
        fileSystem.mountFolder(folder);

        return () => {
            fileSystem.unmountFolder('dictionary');
        };
    }, []); // Run once on mount

    // Loader Logic
    const loadConcept = async (id: string) => {
        setIsLoading(true);
        try {
            const concept = await wordlessDictionary.getConcept(id);
            if (concept) {
                setActiveConcept(concept);
                setCurrentId(concept.id);
            }
        } catch (e) {
            console.error("Failed to load concept", id, e);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        const init = async () => {
            if (initialConceptId) {
                // Try to find by ID first
                let concept = await wordlessDictionary.getConcept(initialConceptId);
                
                if (!concept) {
                    // Fallback: try to search by the ID string as a term
                    const res = wordlessDictionary.lookup(initialConceptId);
                    if (res.length > 0) {
                        concept = res[0];
                    }
                }

                if (concept) {
                    setActiveConcept(concept);
                    setCurrentId(concept.id);
                } else {
                    await loadConcept('ILI§78945'); // Orange Juice Default
                }
            } else {
                await loadConcept('ILI§78945');
            }
            setSearchResults(wordlessDictionary.lookup(''));
        };
        init();
    }, [initialConceptId]);

    useEffect(() => {
        if (!searchVal.trim()) {
            setSearchResults(wordlessDictionary.lookup(''));
            return;
        }
        setSearchResults(wordlessDictionary.lookup(searchVal));
    }, [searchVal]);

    const handleNavigate = async (id: string) => {
        if (activeConcept) setHistory(prev => [...prev, activeConcept.id]);
        setSearchVal('');
        await loadConcept(id);
    };

    const handleBack = async () => {
        if (history.length === 0) return;
        const prevId = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        await loadConcept(prevId);
    };

    const getCiliLink = (id: string) => {
        // Extract number from ILI§12345
        const num = id.replace(/[^0-9]/g, '');
        return `https://globalwordnet.github.io/cili/i${num}`;
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-cyan-900 selection:text-white">
            {/* Header */}
            <div className="h-14 flex items-center px-4 border-b border-white/10 bg-[#111] shrink-0 gap-3">
                <button 
                    onClick={handleBack} 
                    disabled={history.length === 0}
                    className={`p-2 rounded-full hover:bg-white/10 transition-colors ${history.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex-1 relative group">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        placeholder="Search Concepts..."
                        className="w-full bg-black border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-xs font-mono focus:border-cyan-500/50 focus:outline-none transition-all"
                    />
                </div>
                
                <div className="w-8 h-8 border border-cyan-900/50 bg-cyan-900/10 rounded flex items-center justify-center text-cyan-400">
                    <BookOpen className="w-4 h-4" />
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Results */}
                {searchVal && (
                    <div className="w-64 border-r border-white/10 bg-[#0f0f0f] overflow-y-auto">
                        <div className="p-2">
                            <div className="text-[10px] font-bold opacity-50 px-2 mb-2 uppercase tracking-wider">Results</div>
                            {searchResults.map(c => (
                                <button 
                                    key={c.id} 
                                    onClick={() => handleNavigate(c.id)}
                                    className={`w-full text-left px-3 py-2 rounded text-xs font-mono mb-1 transition-colors ${activeConcept?.id === c.id ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/50' : 'hover:bg-white/5 text-neutral-400'}`}
                                >
                                    <div className="font-bold truncate">{c.label}</div>
                                    <div className="text-[9px] opacity-50 truncate">{c.id}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-8 relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                        </div>
                    )}

                    {activeConcept ? (
                        <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
                            
                            {/* Concept Header */}
                            <div className="mb-8 border-b border-white/10 pb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl font-bold text-white tracking-tight">{activeConcept.label}</h1>
                                    {activeConcept.pos && (
                                        <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-neutral-400 italic">{activeConcept.pos}</span>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="font-mono text-xs text-cyan-600">{activeConcept.id}</div>
                                    
                                    {/* ILI Integration */}
                                    <a 
                                        href={getCiliLink(activeConcept.id)}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-cyan-400 transition-colors border border-white/5 rounded px-2 py-0.5 hover:border-cyan-500/30 bg-white/5 group"
                                        title="View in Global WordNet Interlingual Index"
                                    >
                                        <Globe className="w-3 h-3 group-hover:text-cyan-300" /> 
                                        <span className="font-mono">CILI</span>
                                        <ExternalLink className="w-2 h-2 opacity-50 group-hover:opacity-100" />
                                    </a>
                                </div>

                                <p className="text-lg text-neutral-300 font-serif leading-relaxed">
                                    {activeConcept.definition}
                                </p>
                            </div>

                            {/* Wordless Representation */}
                            {activeConcept.wordlessString && (
                                <div className="mb-8 bg-[#151515] border border-white/5 rounded-xl p-6">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <LinkIcon className="w-3 h-3" /> Semantic Graph
                                    </div>
                                    <div className="text-base leading-loose font-mono break-words whitespace-pre-wrap">
                                        <TokenizedText text={activeConcept.wordlessString} onNavigate={handleNavigate} />
                                    </div>
                                </div>
                            )}

                            {/* Examples */}
                            {activeConcept.examples && activeConcept.examples.length > 0 && (
                                <div className="space-y-4">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Usage Examples</div>
                                    {activeConcept.examples.map((ex, i) => (
                                        <div key={i} className="bg-black/40 border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors">
                                            <div className="text-sm text-neutral-400 mb-3 font-serif italic">"{ex.text}"</div>
                                            <div className="text-xs font-mono text-cyan-200/80 leading-relaxed border-t border-white/5 pt-3 whitespace-pre-wrap">
                                                <TokenizedText text={ex.wordless} onNavigate={handleNavigate} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                            <BookOpen className="w-12 h-12 opacity-20 mb-4" />
                            <div className="text-sm font-mono">Select a concept to visualize semantics.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};