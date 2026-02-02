// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect } from 'react';
import { testRegistry } from '../../../../services/TestRegistry';
import { fileSystem } from '../../../../services/FileSystem';
import { TestSuite, BenchmarkTestResult } from '../../../../types/testing';
import { VirtualFile } from '../../../../types/filesystem';
import { registerFileSystemTests } from '../../../../services/tests/FileSystemTests';
import { registerNodeGraphTests } from '../../../../services/tests/NodeGraphTests';
import { registerSimulationTests } from '../../../../services/tests/SimulationTests';
import { registerGraphSchemaTests } from '../../../../services/tests/GraphSchemaTests';
import { registerRecursionTests } from '../../../../services/tests/RecursionTests';
import { registerVisualizerTests } from '../../../../services/tests/VisualizerTests';
import { registerRPGTests } from '../../../../services/tests/RPGTests';
import { registerProtocolTests } from '../../../../services/tests/ProtocolTests';
import { registerTriggerTests } from '../../../../services/tests/TriggerTests';
import { Play, CheckCircle, XCircle, Loader2, Activity, Terminal, Layers, FileCode, AlertTriangle, Copy, Trash2 } from 'lucide-react';

interface SlopData {
    slop_score: number;
    score_breakdown: {
        typeSafety: number;
        complexity: number;
        codeSmells: number;
        reactQuality: number;
        unusedCode?: number;
        dangerousPatterns?: number;
    };
    meta: {
        file_counts_by_extension: Record<string, number>;
        total_lines: number;
    };
    file_size: {
        top_5: { file: string, lines: number }[];
        penalty_applied?: boolean;
        max?: number;
    };
    typescript: {
        top_error_codes: Record<string, number>;
    };
    eslint?: {
        total_problems: number;
        errors: number;
        warnings: number;
        top_rules: Record<string, number>;
    };
}

export const UnitTestApp: React.FC<{ file?: VirtualFile }> = ({ file }) => {
    const [activeTab, setActiveTab] = useState<'tests' | 'slop'>('tests');
    const [suites, setSuites] = useState<TestSuite[]>([]);
    const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, BenchmarkTestResult>>({});
    const [isRunning, setIsRunning] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    
    const [slopData, setSlopData] = useState<SlopData | null>(null);
    const [loadingSlop, setLoadingSlop] = useState(false);

    useEffect(() => {
        // Switch to Slop tab if opened via specific file/ID shortcut
        if (file && (file.id === 'slop_report' || file.name === 'slop_score.json')) {
            setActiveTab('slop');
        }

        // Ensure tests are registered
        registerFileSystemTests();
        registerNodeGraphTests();
        registerSimulationTests();
        registerGraphSchemaTests();
        registerRecursionTests();
        registerVisualizerTests();
        registerRPGTests();
        registerProtocolTests();
        registerTriggerTests(); // New Suite
        
        const allSuites = testRegistry.getSuites();
        setSuites(allSuites);
        if (allSuites.length > 0) {
            setActiveSuiteId(allSuites[0].id);
            setSelectedTestId(allSuites[0].tests[0]?.id);
        }
    }, [file]);

    useEffect(() => {
        if (activeTab === 'slop' && !slopData) {
            loadSlopData();
        }
    }, [activeTab]);

    const loadSlopData = async () => {
        setLoadingSlop(true);
        try {
            const osFolder = fileSystem.getFolders().find(f => f.id === 'os');
            const slopFile = osFolder?.files.find(f => f.name === 'slop_score.json');
            
            if (slopFile) {
                const content = await fileSystem.readFile(slopFile);
                if (typeof content === 'string') {
                    setSlopData(JSON.parse(content));
                } else if (typeof content === 'object') {
                    setSlopData(content);
                }
            }
        } catch (e) {
            console.error("Failed to load slop data", e);
        } finally {
            setLoadingSlop(false);
        }
    };

    const runTest = async (suiteId: string, testId: string) => {
        const suite = suites.find(s => s.id === suiteId);
        const test = suite?.tests.find(t => t.id === testId);
        if (!test) return;

        setResults(prev => ({ ...prev, [testId]: { id: testId, name: test.name, status: 'RUNNING', logs: 'Initializing...', breadcrumbs: [] } }));
        
        try {
            const result = await test.run() as any;
            if (result && typeof result === 'object' && result.status) {
                setResults(prev => ({ ...prev, [testId]: result }));
            } else {
                setResults(prev => ({ 
                    ...prev, 
                    [testId]: { id: testId, name: test.name, status: 'PASS', logs: 'Legacy Test Passed', breadcrumbs: [] } 
                }));
            }
        } catch (e: any) {
            setResults(prev => ({ 
                ...prev, 
                [testId]: { id: testId, name: test.name, status: 'FAIL', logs: e.message, breadcrumbs: [] } 
            }));
        }
    };

    const runAll = async () => {
        setIsRunning(true);
        for (const suite of suites) {
            for (const test of suite.tests) {
                await runTest(suite.id, test.id);
                await new Promise(r => setTimeout(r, 50));
            }
        }
        setIsRunning(false);
    };

    const copyResults = () => {
        const lines: string[] = [];
        lines.push(`UNIT TEST REPORT [${new Date().toLocaleString()}]`);
        lines.push(`=================================================`);
        
        const allResults = Object.values(results) as BenchmarkTestResult[];
        const passed = allResults.filter(r => r.status === 'PASS');
        const failed = allResults.filter(r => r.status !== 'PASS');

        if (passed.length > 0) {
            lines.push(`\nPASSED (${passed.length}):`);
            passed.forEach(p => lines.push(`✔ ${p.name}`));
        }

        if (failed.length > 0) {
            lines.push(`\nFAILED / WARNINGS (${failed.length}):`);
            failed.forEach(f => {
                lines.push(`\n❌ [${f.status}] ${f.name}`);
                lines.push(`   ID: ${f.id}`);
                lines.push(`   LOGS:`);
                f.logs.split('\n').forEach(l => lines.push(`     ${l}`));
                if (f.breadcrumbs && f.breadcrumbs.length > 0) {
                    lines.push(`   CONTEXT:`);
                    f.breadcrumbs.forEach(b => {
                        lines.push(`     - ${b.category} @ ${b.file} [${b.relevantFunctions.join(', ')}]`);
                        lines.push(`       ${b.description}`);
                    });
                }
                lines.push(`---------------------------------------------------`);
            });
        }

        navigator.clipboard.writeText(lines.join('\n'));
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    };

    const activeSuite = suites.find(s => s.id === activeSuiteId);
    const activeResult = selectedTestId ? results[selectedTestId] : null;

    // --- RENDER SLOP ---
    const renderSlop = () => {
        if (loadingSlop) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;
        if (!slopData) return <div className="flex h-full items-center justify-center text-neutral-500">No Data Found</div>;

        const score = slopData.slop_score;
        
        let color = 'text-green-400';
        let borderColor = 'border-green-500/30';
        let verdict = 'OPTIMAL';
        let bgColor = 'bg-green-900/10';

        if (score >= 80) {
            color = 'text-red-600';
            borderColor = 'border-red-600/50';
            verdict = 'FATAL SLOP';
            bgColor = 'bg-red-900/20';
        } else if (score >= 50) {
            color = 'text-orange-500';
            borderColor = 'border-orange-500/50';
            verdict = 'CRITICAL';
            bgColor = 'bg-orange-900/20';
        } else if (score >= 25) {
            color = 'text-yellow-400';
            borderColor = 'border-yellow-500/30';
            verdict = 'ACCEPTABLE';
            bgColor = 'bg-yellow-900/10';
        }

        return (
            <div className="p-8 space-y-8 overflow-y-auto h-full bg-[#0d1117]">
                
                {/* Hero Score */}
                <div className={`flex items-center gap-8 p-6 rounded-2xl border border-white/5 ${bgColor}`}>
                    <div className={`w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center ${borderColor} bg-[#0d1117] shadow-2xl relative`}>
                        <span className={`text-4xl font-black tracking-tighter ${color}`}>{score}%</span>
                        <span className="text-[9px] text-neutral-500 uppercase tracking-widest mt-1">SLOP INDEX</span>
                        {/* Gauge Indicator */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" style={{ overflow: 'visible' }}>
                            <circle cx="64" cy="64" r="68" fill="none" stroke={score >= 80 ? '#dc2626' : score >= 50 ? '#f97316' : score >= 25 ? '#facc15' : '#4ade80'} strokeWidth="2" strokeDasharray={`${score * 4.27} 427`} opacity="0.5" />
                        </svg>
                    </div>
                    <div>
                        <h2 className={`text-3xl font-black tracking-tight ${color}`}>{verdict}</h2>
                        <p className="text-sm text-neutral-400 mt-2 max-w-md leading-relaxed">
                            Static analysis of {slopData.meta.total_lines.toLocaleString()} lines across {Object.values(slopData.meta.file_counts_by_extension).reduce((a: number, b: number) => a + b, 0)} files.
                        </p>
                        {slopData.file_size.penalty_applied && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-red-900/30 rounded border border-red-500/30 text-[10px] text-red-200 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                <span>SIZE PENALTY ACTIVE (Max File: {slopData.file_size.max} lines)</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Breakdown Grid */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard label="Type Safety" value={slopData.score_breakdown.typeSafety} icon={<AlertTriangle className="w-4 h-4" />} goodLow />
                    <StatCard label="Complexity" value={slopData.score_breakdown.complexity} icon={<Activity className="w-4 h-4" />} goodLow />
                    <StatCard label="Code Smells" value={slopData.score_breakdown.codeSmells} icon={<FileCode className="w-4 h-4" />} goodLow />
                    <StatCard label="React Quality" value={slopData.score_breakdown.reactQuality} icon={<Layers className="w-4 h-4" />} goodLow />
                    {slopData.score_breakdown.unusedCode !== undefined && (
                        <StatCard label="Unused Code" value={slopData.score_breakdown.unusedCode} icon={<Trash2 className="w-4 h-4" />} goodLow />
                    )}
                    {slopData.score_breakdown.dangerousPatterns !== undefined && (
                        <StatCard label="Dangerous Patterns" value={slopData.score_breakdown.dangerousPatterns} icon={<AlertTriangle className="w-4 h-4" />} goodLow />
                    )}
                </div>

                {/* ESLint Stats */}
                {slopData.eslint && (
                    <div className="bg-[#161b22] border border-white/5 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-black/30 border-b border-white/5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            ESLint Hotspots ({slopData.eslint.total_problems})
                        </div>
                        <div className="p-4 flex flex-wrap gap-2">
                            {Object.entries(slopData.eslint.top_rules).map(([rule, count]) => (
                                <div key={rule} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] text-neutral-300 flex items-center gap-2">
                                    <span className="font-mono">{rule}</span>
                                    <span className="bg-red-500/20 text-red-300 px-1.5 rounded-full font-bold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Offenders */}
                <div className="bg-[#161b22] border border-white/5 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-black/30 border-b border-white/5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex justify-between items-center">
                        <span>File Size Leaders</span>
                    </div>
                    <div className="p-4 text-[10px] text-neutral-500 border-b border-white/5 bg-[#0f0f0f]">
                        <div className="flex gap-6">
                            <span className="text-yellow-400 font-bold flex items-center gap-1"><div className="w-2 h-2 bg-yellow-400 rounded-full"/> * 500 lines</span>
                            <span className="text-orange-400 font-bold flex items-center gap-1"><div className="w-2 h-2 bg-orange-400 rounded-full"/> * 750 lines</span>
                            <span className="text-red-500 font-bold flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"/> * 1000 lines</span>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {slopData.file_size.top_5.map((f, i) => {
                            let lineClass = 'text-neutral-500';
                            let icon = null;
                            
                            if (f.lines >= 1000) { lineClass = 'text-red-500 font-black'; icon = <AlertTriangle className="w-3 h-3 text-red-500" />; }
                            else if (f.lines >= 750) { lineClass = 'text-orange-400 font-bold'; icon = <AlertTriangle className="w-3 h-3 text-orange-400" />; }
                            else if (f.lines >= 500) { lineClass = 'text-yellow-400 font-bold'; icon = <AlertTriangle className="w-3 h-3 text-yellow-400" />; }

                            return (
                                <div key={i} className="flex items-center justify-between px-4 py-3 text-xs hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-neutral-600 w-4">{i + 1}.</span>
                                        <span className="font-mono text-cyan-300">{f.file}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {icon}
                                        <span className={`font-mono ${lineClass}`}>{f.lines} lines</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* TypeScript Stats */}
                {Object.keys(slopData.typescript.top_error_codes).length > 0 && (
                    <div className="bg-[#161b22] border border-white/5 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-black/30 border-b border-white/5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            Top TS Violations
                        </div>
                        <div className="flex gap-2 p-4 flex-wrap">
                            {Object.entries(slopData.typescript.top_error_codes).map(([code, count]) => (
                                <div key={code} className="bg-red-900/20 border border-red-500/30 px-2 py-1 rounded text-[10px] text-red-300 flex items-center gap-2">
                                    <span className="font-bold">{code}</span>
                                    <span className="bg-black/30 px-1.5 rounded-full">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full bg-[#0d1117] text-white font-mono text-xs select-none">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 bg-[#161b22] flex flex-col shrink-0">
                <div className="p-4 border-b border-white/10 bg-[#0d1117]">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-green-400" />
                        <div>
                            <h1 className="font-bold text-sm">SYSTEM HEALTH</h1>
                            <div className="text-[10px] text-neutral-500">v2.2.0</div>
                        </div>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex p-1 bg-black/50 rounded border border-white/10">
                        <button 
                            onClick={() => setActiveTab('tests')}
                            className={`flex-1 py-1.5 text-center rounded text-[10px] font-bold transition-colors ${activeTab === 'tests' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white'}`}
                        >
                            UNIT TESTS
                        </button>
                        <button 
                            onClick={() => setActiveTab('slop')}
                            className={`flex-1 py-1.5 text-center rounded text-[10px] font-bold transition-colors ${activeTab === 'slop' ? 'bg-white/10 text-yellow-400' : 'text-neutral-500 hover:text-yellow-200'}`}
                        >
                            SLOP %
                        </button>
                    </div>
                </div>
                
                {activeTab === 'tests' ? (
                    <div className="flex-1 overflow-y-auto p-2 space-y-4">
                        {suites.map(suite => (
                            <div key={suite.id}>
                                <div 
                                    className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest cursor-pointer hover:text-white"
                                    onClick={() => setActiveSuiteId(suite.id)}
                                >
                                    {suite.name}
                                </div>
                                <div className="space-y-1 mt-1">
                                    {suite.tests.map(test => (
                                        <button
                                            key={test.id}
                                            onClick={() => { setActiveSuiteId(suite.id); setSelectedTestId(test.id); }}
                                            className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${selectedTestId === test.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5'}`}
                                        >
                                            <span className="truncate pr-2">{test.name.replace('Math: ', '').replace('FileSystem: ', '').replace('Schema: ', '').replace('Recursion: ', '').replace('Visualizer: ', '').replace('Stat: ', '').replace('Protocol: ', '').replace('Trigger: ', '')}</span>
                                            {results[test.id]?.status === 'PASS' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                            {results[test.id]?.status === 'FAIL' && <XCircle className="w-3 h-3 text-red-500" />}
                                            {results[test.id]?.status === 'RUNNING' && <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 p-4 text-[10px] text-neutral-500 leading-relaxed">
                        The Slop Score measures entropy, type safety, and architectural integrity. 
                        <br/><br/>
                        Penalties enforced for file size violations.
                        <br/><br/>
                        Data provided by <code>scripts/slop_analyzer.ts</code>
                    </div>
                )}

                {activeTab === 'tests' && (
                    <div className="p-4 border-t border-white/10 bg-[#0d1117] flex gap-2">
                        <button 
                            onClick={runAll} 
                            disabled={isRunning}
                            className={`flex-1 py-2 bg-green-700 hover:bg-green-600 text-white font-bold rounded flex items-center justify-center gap-2 transition-all ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            RUN ALL
                        </button>
                        <button
                            onClick={copyResults}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-neutral-300 border border-white/10 transition-colors relative"
                            title="Copy Results to Clipboard"
                        >
                            <Copy className="w-4 h-4" />
                            {copyFeedback && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-green-600 text-white text-[9px] px-2 py-1 rounded animate-in fade-in slide-in-from-bottom-1">Copied!</div>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
                {activeTab === 'slop' ? (
                    renderSlop()
                ) : activeResult ? (
                    <>
                        {/* Test Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[#161b22]">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2">{activeResult.name}</h2>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeResult.status === 'PASS' ? 'bg-green-900/50 text-green-400 border border-green-500/30' : activeResult.status === 'FAIL' ? 'bg-red-900/50 text-red-400 border border-red-500/30' : 'bg-white/5 text-neutral-400'}`}>
                                        {activeResult.status}
                                    </span>
                                    <span className="text-neutral-500 text-[10px]">ID: {activeResult.id}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => activeSuite && runTest(activeSuite.id, activeResult.id)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-neutral-300"
                                title="Run Single"
                            >
                                <Play className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Breadcrumbs */}
                        {activeResult.breadcrumbs && activeResult.breadcrumbs.length > 0 && (
                            <div className="p-4 border-b border-white/10 bg-[#0d1117]">
                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Layers className="w-3 h-3" /> Execution Context
                                </div>
                                <div className="space-y-2">
                                    {activeResult.breadcrumbs.map((crumb, i) => (
                                        <div key={i} className="flex items-start gap-3 text-[11px] opacity-80">
                                            <div className="min-w-[60px] px-1 py-0.5 bg-white/5 rounded text-center text-neutral-400 font-mono text-[9px]">
                                                {crumb.category}
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-cyan-400 font-mono">{crumb.file}</span>
                                                <span className="mx-2 text-neutral-600">::</span>
                                                <span className="text-yellow-400 font-mono">{crumb.relevantFunctions.join(', ')}</span>
                                                <p className="text-neutral-500 mt-0.5">{crumb.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Logs Console */}
                        <div className="flex-1 flex flex-col min-h-0 bg-black">
                            <div className="p-2 bg-[#1a1a1a] border-b border-white/5 flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                <Terminal className="w-3 h-3" /> Execution Logs
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-neutral-300 space-y-1">
                                {activeResult.logs ? (
                                    activeResult.logs.split('\n').map((line, i) => (
                                        <div key={i} className={`${line.includes('PASS') ? 'text-green-400' : line.includes('FAIL') || line.includes('ERROR') ? 'text-red-400' : line.includes('TRACE') ? 'text-neutral-600' : ''}`}>
                                            {line}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-neutral-600 italic">Waiting to run...</span>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-neutral-600">
                        Select a test to view details
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, goodLow?: boolean }> = ({ label, value, icon, goodLow }) => (
    <div className="bg-[#161b22] border border-white/5 rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-400">
            {icon}
            <span className="text-xs">{label}</span>
        </div>
        <span className={`font-mono font-bold ${goodLow ? (value === 0 ? 'text-green-400' : value < 5 ? 'text-yellow-400' : 'text-red-400') : 'text-white'}`}>
            {value}
        </span>
    </div>
);
