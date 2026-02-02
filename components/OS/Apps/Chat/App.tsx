// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect, useRef } from 'react';
import { VirtualFile } from '../../../../types/filesystem';
import { fileSystem } from '../../../../services/FileSystem';
import { runtimeIntegration } from '../../../../services/RuntimeIntegration';
import { ConversationEntry, ConversationMessage, FunctionCallRequest, FunctionCallResponse, LlmConfig, toOpenAIMessages } from '../../../../services/LlmStructs';
import { MessageCircle, User, Terminal, Send, AlertCircle, Brain, Zap, Loader2, Save, FilePlus, Settings } from 'lucide-react';
import { MenuBar } from '../../MenuBar';
import { FilePicker } from '../../FilePicker';

interface ChatAppProps {
    file: VirtualFile;
}

// --- TOOL DEFINITIONS ---
const tools = [
    {
        type: "function",
        function: {
            name: "list_files",
            description: "List all folders and their file contents in the virtual file system.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "read_file",
            description: "Read the content of a specific file.",
            parameters: {
                type: "object",
                properties: {
                    folderId: { type: "string", description: "The ID of the folder (e.g., 'home', 'sims')." },
                    fileId: { type: "string", description: "The ID of the file." }
                },
                required: ["folderId", "fileId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "write_file",
            description: "Write or overwrite content to a file.",
            parameters: {
                type: "object",
                properties: {
                    folderId: { type: "string", description: "The ID of the folder." },
                    fileId: { type: "string", description: "The ID of the file." },
                    content: { type: "string", description: "The new content for the file." }
                },
                required: ["folderId", "fileId", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "connect_ganglion",
            description: "Connect to the local python runtime environment via WebSocket.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The WebSocket URL, defaults to 'ws://localhost:8080'." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_telemetry",
            description: "Get the latest telemetry packet from the simulation, including FPS and ganglion stats.",
            parameters: { type: "object", properties: {} }
        }
    }
];

// Default Configuration
const DEFAULT_CONFIG: LlmConfig = {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '', // User must provide or we use env if available
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2000
};

export const ChatApp: React.FC<ChatAppProps> = ({ file: initialFile }) => {
    const [currentFile, setCurrentFile] = useState<VirtualFile | undefined>(initialFile);
    const [history, setHistory] = useState<ConversationEntry[]>([]);
    const [input, setInput] = useState('');
    const [config, setConfig] = useState<LlmConfig>(DEFAULT_CONFIG);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Changed default to false, controlled by file load
    const [showConfig, setShowConfig] = useState(false);
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('You are now remotely connected to your personal Laptop Computer\n\nYou might want to check your journal');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- INITIALIZATION ---
    useEffect(() => {
        const loadChat = async () => {
            if (!currentFile) {
                setHistory([]);
                return;
            }

            setIsLoading(true);
            try {
                let content = currentFile.content;
                
                // Lazy load if needed
                if (!content || (typeof content === 'string' && content.length === 0)) {
                    content = await fileSystem.readFile(currentFile);
                }

                if (typeof content === 'string') {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) setHistory(parsed);
                } else if (Array.isArray(content)) {
                    setHistory(content);
                }

                // Load config from local storage if exists
                const savedConfig = localStorage.getItem('genesis_llm_config');
                if (savedConfig) setConfig(JSON.parse(savedConfig));
                
            } catch (e) {
                console.error("Failed to load chat", e);
                setHistory([{ role: 'system', text: 'Error loading conversation history: ' + e, timeline: { created: Date.now() } }]);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadChat();
    }, [currentFile]); // Re-run when currentFile changes

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isStreaming, isLoading]);

    // --- TOOL EXECUTION ---
    const executeTool = async (call: FunctionCallRequest): Promise<FunctionCallResponse> => {
        let result = {};
        let success = true;

        try {
            const args = JSON.parse(call.args);
            switch (call.name) {
                case 'list_files':
                    result = fileSystem.getFolders().map(f => ({ folder: f.name, files: f.files.map(file => ({ name: file.name, id: file.id, type: file.type })) }));
                    break;
                case 'read_file':
                    const f = fileSystem.getFile(args.folderId, args.fileId);
                    if (f) result = await fileSystem.readFile(f);
                    else throw new Error("File not found");
                    break;
                case 'write_file':
                    await fileSystem.saveFile(args.folderId, args.fileId, args.content);
                    result = { status: 'success' };
                    break;
                case 'connect_ganglion':
                    runtimeIntegration.connect(args.url);
                    result = { status: 'connection initiated' };
                    break;
                case 'get_telemetry':
                    result = runtimeIntegration.getGanglionStats() || { status: 'no data' };
                    break;
                default:
                    throw new Error(`Unknown tool: ${call.name}`);
            }
        } catch (e: any) {
            result = { error: e.message };
            success = false;
        }

        return {
            role: 'tool',
            name: call.name,
            request_id: call.id,
            result: JSON.stringify(result, null, 2),
            success,
            timeline: { created: Date.now() }
        };
    };

    // --- ACTIONS ---

    const autoSave = (newHistory: ConversationEntry[]) => {
        // Only auto-save if we are working on an existing file
        if (currentFile && !currentFile.readOnly) {
            const json = JSON.stringify(newHistory, null, 2);
            fileSystem.saveFile('conversations', currentFile.id, json);
        }
        setHistory(newHistory);
    };

    const handleNewChat = () => {
        setCurrentFile(undefined);
        setHistory([]);
        setSystemPrompt('You are a helpful AI assistant connected to the Genesis OS.');
    };

    const handleSave = () => {
        if (currentFile) {
            autoSave(history);
            alert(`Saved to ${currentFile.name}`);
        } else {
            handleSaveAs();
        }
    };

    const handleSaveAs = () => {
        const name = prompt("Enter filename for conversation:", `chat_${Date.now()}.json`);
        if (name) {
            const json = JSON.stringify(history, null, 2);
            // Defaulting to 'home' or specific 'conversations' folder if it exists
            // We'll put it in 'home' for visibility or check for 'conversations'
            const targetFolder = fileSystem.getFolders().find(f => f.name === 'conversations')?.id || 'home';
            const newFile = fileSystem.createFile(targetFolder, name.endsWith('.json') ? name : `${name}.json`, 'chat', json);
            if (newFile) {
                setCurrentFile(newFile);
            }
        }
    };

    const handleOpenFile = (file: VirtualFile) => {
        setCurrentFile(file);
        setShowFilePicker(false);
    };

    const updateConfig = (key: keyof LlmConfig, val: any) => {
        const newConfig = { ...config, [key]: val };
        setConfig(newConfig);
        localStorage.setItem('genesis_llm_config', JSON.stringify(newConfig));
    };

    const applyPreset = (preset: 'openai' | 'local') => {
        if (preset === 'openai') {
            updateConfig('endpoint', 'https://api.openai.com/v1/chat/completions');
            updateConfig('model', 'gpt-4-turbo');
        } else {
            // Standard local endpoint for vllm / llama.cpp / ollama
            updateConfig('endpoint', 'http://localhost:8000/v1/chat/completions');
            updateConfig('apiKey', 'not-needed');
            updateConfig('model', 'model'); // Generic model name
        }
    };

    const handleSendMessage = async (messageContent?: string) => {
        const currentInput = typeof messageContent === 'string' ? messageContent : input;
        if (!currentInput.trim() && !isStreaming) return;
        
        if (currentInput.startsWith('/')) {
            handleCommand(currentInput);
            setInput('');
            return;
        }

        const userMsg: ConversationMessage = {
            role: 'user',
            text: currentInput,
            name: fileSystem.getCurrentUser(),
            timeline: { created: Date.now() }
        };

        const newHistory = [...history, userMsg];
        autoSave(newHistory);
        setInput('');
        
        await runAgenticLoop(newHistory);
    };

    const handleCommand = (cmdRaw: string) => {
        const [cmd, ...args] = cmdRaw.slice(1).split(' ');
        const newHistory = [...history];

        switch(cmd) {
            case 'clear':
                setHistory([]);
                break;
            case 'save':
                handleSave();
                break;
            case 'system':
                const newPrompt = args.join(' ');
                if (newPrompt) {
                    setSystemPrompt(newPrompt);
                    newHistory.push({ role: 'system', text: `System prompt updated.`, timeline: { created: Date.now() }});
                    setHistory(newHistory);
                }
                break;
            default:
                newHistory.push({ role: 'system', text: `Unknown command: ${cmd}`, timeline: { created: Date.now() }});
                setHistory(newHistory);
                break;
        }
    };

    // --- AGENTIC LOOP ---
    const runAgenticLoop = async (currentHistory: ConversationEntry[]) => {
        setIsStreaming(true);
        try {
            const assistantResponse = await streamResponse(currentHistory);
            let newHistory = [...currentHistory, assistantResponse];

            if (assistantResponse.function_calls && assistantResponse.function_calls.length > 0) {
                const toolResponses = await Promise.all(
                    assistantResponse.function_calls.map(call => executeTool(call))
                );
                newHistory = [...newHistory, ...toolResponses];
                autoSave(newHistory);
                // Recursive call to let the model process tool output
                await runAgenticLoop(newHistory);
            } else {
                autoSave(newHistory);
            }

        } catch (e: any) {
            const errMsg: ConversationMessage = {
                role: 'system', text: `Connection Error: ${e.message}`, timeline: { created: Date.now() }
            };
            autoSave([...currentHistory, errMsg]);
        } finally {
            setIsStreaming(false);
        }
    };

    // --- API INTERACTION ---
    const streamResponse = async (currentHistory: ConversationEntry[]): Promise<ConversationMessage> => {
        let messages = toOpenAIMessages(currentHistory);
        if (messages.length === 0 || messages[0].role !== 'system') {
            messages.unshift({ role: 'system', content: systemPrompt, name: 'system' } as any);
        }
        
        const assistantMsg: ConversationMessage = {
            role: 'assistant', text: '', name: config.model, timeline: { created: Date.now() }, function_calls: []
        };
        setHistory(prev => [...prev, assistantMsg]);

        try {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                body: JSON.stringify({
                    model: config.model, messages: messages, stream: true, temperature: config.temperature, max_tokens: config.maxTokens, tools: tools, tool_choice: "auto"
                })
            });

            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            // Buffers for streaming data
            let fullText = '';
            let toolCallsBuffer: { id?: string, name?: string, args?: string }[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') break;
                        try {
                            const json = JSON.parse(dataStr);
                            const delta = json.choices[0]?.delta;
                            
                            if (delta?.content) {
                                fullText += delta.content;
                            }

                            if (delta?.tool_calls) {
                                delta.tool_calls.forEach((tc: any) => {
                                    if (toolCallsBuffer.length <= tc.index) {
                                        toolCallsBuffer.push({});
                                    }
                                    if (tc.id) toolCallsBuffer[tc.index].id = tc.id;
                                    if (tc.function?.name) toolCallsBuffer[tc.index].name = (toolCallsBuffer[tc.index].name || '') + tc.function.name;
                                    if (tc.function?.arguments) toolCallsBuffer[tc.index].args = (toolCallsBuffer[tc.index].args || '') + tc.function.arguments;
                                });
                            }

                            setHistory(prev => {
                                const last = { ...prev[prev.length - 1] } as ConversationMessage;
                                last.text = fullText;
                                last.function_calls = toolCallsBuffer.map(tc => ({ id: tc.id || '', name: tc.name || '', args: tc.args || '' }));
                                return [...prev.slice(0, -1), last];
                            });

                        } catch {}
                    }
                }
            }
            
            const finalResponse: ConversationMessage = {
                ...assistantMsg, text: fullText, function_calls: toolCallsBuffer.filter(tc => tc.name).map(tc => tc as FunctionCallRequest)
            };
            
            setHistory(prev => [...prev.slice(0, -1), finalResponse]);
            return finalResponse;
        } catch (e: any) {
            // Clean up the empty assistant message if request failed instantly
            setHistory(prev => prev.slice(0, -1));
            throw e;
        }
    };

    // --- RENDERERS ---
    const MessageItem: React.FC<{ entry: ConversationEntry }> = ({ entry }) => {
        const isUser = entry.role === 'user';
        const isSystem = entry.role === 'system';
        const isTool = entry.role === 'tool';
        const msg = entry as ConversationMessage;

        if (isSystem) return (
            <div className="flex items-center gap-2 my-2 text-xs text-neutral-500 font-mono">
                <div className="w-6 h-px bg-neutral-700" />
                <Terminal className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate">{msg.text}</span>
                <div className="w-6 h-px bg-neutral-700" />
            </div>
        );
        if (isTool) {
            const tool = entry as FunctionCallResponse;
            return (
                <div className="flex flex-col gap-1 my-4 pl-12 pr-4 opacity-80">
                    <div className="flex items-center gap-2 text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                        <Zap className="w-3 h-3" />
                        <span>Tool Output: {tool.name}</span>
                    </div>
                    <pre className="bg-[#111] border border-white/10 rounded p-2 font-mono text-xs text-neutral-400 overflow-x-auto max-h-40">
                        <code>{tool.result.substring(0, 500) + (tool.result.length > 500 ? '...' : '')}</code>
                    </pre>
                </div>
            );
        }

        return (
            <div className={`flex gap-4 group ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border text-xs font-bold shadow-lg ${isUser ? 'bg-neutral-800 border-white/10 text-white' : 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400'}`}>
                    {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                </div>
                <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{msg.name || entry.role}</span>
                        {msg.timeline && <span className="text-[9px] text-neutral-700">{new Date(msg.timeline.created).toLocaleTimeString()}</span>}
                    </div>

                    {msg.function_calls && msg.function_calls.length > 0 && (
                        <div className="mb-2 max-w-full">
                            <div className="p-3 bg-black/30 border-l-2 border-purple-700 text-neutral-400 text-xs font-mono italic leading-relaxed whitespace-pre-wrap rounded-r-md">
                                {msg.function_calls.map((fc, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Zap className="w-3 h-3 text-purple-400" />
                                        <span>Calling: <span className="text-purple-300">{fc.name}</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {msg.text && (
                        <div className={`p-3.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap shadow-md transition-all ${isUser ? 'bg-[#222] text-neutral-200 border border-white/5 rounded-tr-none' : 'bg-[#16161a] text-gray-300 border border-cyan-900/20 rounded-tl-none'}`}>
                            {msg.text}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const menuData = [
        {
            label: 'File',
            items: [
                { label: 'New Conversation', action: handleNewChat, icon: <FilePlus className="w-3 h-3"/> },
                { label: 'Open JSON...', action: () => setShowFilePicker(true) },
                { label: 'Save', action: handleSave, icon: <Save className="w-3 h-3"/>, shortcut: 'Ctrl+S' },
                { label: 'Save As...', action: handleSaveAs },
                { divider: true },
                { label: 'Close', action: () => {} }
            ]
        },
        {
            label: 'Options',
            items: [
                { label: 'Connection Settings', action: () => setShowConfig(true), icon: <Settings className="w-3 h-3"/> }
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-300 font-sans">
            <MenuBar menus={menuData} />
            
            <FilePicker 
                isOpen={showFilePicker} 
                onCancel={() => setShowFilePicker(false)} 
                onSelect={handleOpenFile}
                extensions={['chat', 'text', 'json']}
                title="Open Conversation"
                allowImport
            />

            <div className="h-12 border-b border-white/10 bg-[#111] flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-cyan-500" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{currentFile ? currentFile.name.replace('.chat', '').replace('.json', '') : 'Untitled'}</span>
                        <span className="text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'}`} />
                            {isStreaming ? 'Thinking...' : config.model}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowConfig(!showConfig)} className={`p-2 rounded hover:bg-white/10 ${showConfig ? 'text-cyan-400' : 'text-neutral-400'}`}><Settings className="w-4 h-4" /></button>
                </div>
            </div>

            {showConfig && (
                <div className="p-4 border-b border-white/10 bg-[#080808] space-y-4 font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex gap-2 border-b border-white/10 pb-2 mb-2">
                        <button onClick={() => applyPreset('openai')} className="px-3 py-1 bg-green-900/30 text-green-400 rounded hover:bg-green-900/50 border border-green-500/30">Preset: OpenAI</button>
                        <button onClick={() => applyPreset('local')} className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded hover:bg-purple-900/50 border border-purple-500/30">Preset: Localhost (vLLM/Llama)</button>
                    </div>
                    
                    <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                        <label>Endpoint</label>
                        <input type="text" value={config.endpoint} onChange={e => updateConfig('endpoint', e.target.value)} className="bg-black/50 border border-white/10 rounded px-2 py-1" />
                        <label>API Key</label>
                        <input type="password" value={config.apiKey} onChange={e => updateConfig('apiKey', e.target.value)} className="bg-black/50 border border-white/10 rounded px-2 py-1" placeholder="sk-..." />
                        <label>Model</label>
                        <input type="text" value={config.model} onChange={e => updateConfig('model', e.target.value)} className="bg-black/50 border border-white/10 rounded px-2 py-1" />
                        <label>Temperature</label>
                        <input type="range" min="0" max="1" step="0.1" value={config.temperature} onChange={e => updateConfig('temperature', parseFloat(e.target.value))} />
                    </div>
                    <div className="p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-yellow-200 text-[10px] flex gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        API Key is stored in your browser's local storage. Do not use in production.
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    </div>
                ) : (
                    <>
                        {history.length === 0 && !currentFile && (
                            <div className="flex h-full flex-col items-center justify-center text-neutral-600 gap-4">
                                <Brain className="w-12 h-12 opacity-20" />
                                <div className="text-sm">Start a new conversation</div>
                                <div className="flex gap-2">
                                    <button onClick={handleNewChat} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-neutral-400">New Chat</button>
                                    <button onClick={() => setShowConfig(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-neutral-400">Configure Endpoint</button>
                                </div>
                            </div>
                        )}
                        {history.map((entry, i) => (
                            <MessageItem key={i} entry={entry} />
                        ))}
                        {isStreaming && history[history.length-1]?.role === 'assistant' && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 border text-xs font-bold shadow-lg bg-cyan-900/20 border-cyan-500/30 text-cyan-400">
                                     <Brain className="w-4 h-4 animate-pulse" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="p-4 bg-[#111] border-t border-white/10">
                <div className="relative flex items-end gap-2 bg-[#080808] border border-white/10 rounded-xl p-2 focus-within:border-cyan-500/50 transition-colors">
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} placeholder="Send a message or /command..." className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none resize-none max-h-32 py-2 font-mono" rows={1} style={{ minHeight: '2.5rem' }}/>
                    <button onClick={() => handleSendMessage()} disabled={!input.trim() || isStreaming} className={`p-2 rounded-lg transition-all mb-0.5 ${input.trim() && !isStreaming ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-white/5 text-neutral-600 cursor-not-allowed'}`}><Send className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};