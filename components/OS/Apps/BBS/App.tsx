// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useState, useEffect, useRef } from 'react';
import { fileSystem } from '../../../../services/FileSystem';
import { UserProfile } from '../../../../types/filesystem';
import { mockNetwork } from '../../../../services/MockNetwork';
import { User, MessageSquare, Send, Shield, Sword, ChevronDown, ChevronRight, AlertTriangle, FileText, MessageCircle, Cpu, Twitch } from 'lucide-react';
import { BBSPost, INITIAL_POSTS } from './posts';

export const BBSApp: React.FC = () => {
    const [posts, setPosts] = useState<BBSPost[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [expandedDeleted, setExpandedDeleted] = useState<Record<string, boolean>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'bbs' | 'twitch'>('bbs');
    const [currentUser, setCurrentUser] = useState('guest');

    useEffect(() => {
        const loadData = async () => {
            setCurrentUser(fileSystem.getCurrentUser());

            // Load Users Async
            try {
                const listRes = await mockNetwork.fetch('/home/index.json');
                const userList: string[] = await listRes.json();
                const loadedUsers: UserProfile[] = [];
                
                for (const uid of userList) {
                    try {
                        const profileRes = await mockNetwork.fetch(`/home/${uid}/config.json`);
                        loadedUsers.push(await profileRes.json());
                    } catch {}
                }
                setUsers(loadedUsers);
            } catch (e) {
                console.error("BBS: Failed to load users", e);
            }

            // Load Posts
            // 1. Check if persists in OS folder (overrides initial)
            const osFolder = fileSystem.getFolders().find(f => f.id === 'os');
            let loadedPosts = [...INITIAL_POSTS];
            
            if (osFolder) {
                const postsFile = osFolder.files.find(f => f.id === 'bbs_posts');
                if (postsFile) {
                    if (!postsFile.loaded) {
                        try {
                            const raw = await fileSystem.readFile(postsFile);
                            loadedPosts = JSON.parse(raw);
                        } catch {}
                    } else if (typeof postsFile.content === 'string') {
                        try {
                            loadedPosts = JSON.parse(postsFile.content);
                        } catch {}
                    }
                }
            }
            
            setPosts(loadedPosts.sort((a, b) => a.timestamp - b.timestamp));
        };

        loadData();
        const unsub = fileSystem.subscribe(loadData);
        return unsub;
    }, []);

    useEffect(() => {
        if (!selectedUser && users.length > 0) {
            setSelectedUser(users[0]);
        }
    }, [users, selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [posts, activeTab]);

    const handlePost = () => {
        if (!newMessage.trim()) return;

        const newPost: BBSPost = {
            id: `post_${Date.now()}`,
            authorId: currentUser,
            content: newMessage,
            timestamp: Date.now(),
            replies: [],
            methodOfEntry: 'ui'
        };

        const updatedPosts = [...posts, newPost];
        setPosts(updatedPosts);
        setNewMessage('');

        // Persist to OS folder
        const osFolder = fileSystem.getFolders().find(f => f.id === 'os');
        if (osFolder) {
            // If file doesn't exist, create it (implicitly via saveFile if supported or manual add)
            // FileSystem.saveFile updates existing. Creating new requires createFile.
            // Check if exists
            const exists = osFolder.files.find(f => f.id === 'bbs_posts');
            if (exists) {
                fileSystem.saveFile('os', 'bbs_posts', JSON.stringify(updatedPosts, null, 2));
            } else {
                fileSystem.createFile('os', 'bbs_posts.json', 'bbs_data', JSON.stringify(updatedPosts, null, 2));
            }
        }
    };

    const toggleDeleted = (id: string) => {
        setExpandedDeleted(prev => ({...prev, [id]: !prev[id]}));
    };

    const getMethodIcon = (method?: string) => {
        if (method === 'human_proxy') return <MessageCircle className="w-3 h-3" />;
        if (method === 'llm_direct') return <Cpu className="w-3 h-3" />;
        return <FileText className="w-3 h-3" />;
    };

    const getMethodTooltip = (method?: string) => {
        if (method === 'human_proxy') return "Dictated by human author to LLM intermediary";
        if (method === 'llm_direct') return "Direct code injection by AI System";
        return "Authored via standard interface";
    };

    return (
        <div className="flex h-full bg-[#0f0f13] text-[#e0e0e0] font-mono">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 flex flex-col p-4 bg-[#141419]">
                <div className="text-xs font-bold text-neutral-500 mb-4 uppercase tracking-widest">Known Users</div>
                <div className="space-y-2 mb-8 overflow-y-auto flex-1">
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            className={`w-full flex items-center gap-3 p-2 rounded border transition-all text-left
                                ${selectedUser?.id === u.id ? 'bg-white/5 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5 text-neutral-400'}
                            `}
                        >
                            <div className="w-8 h-8 rounded bg-black/50 p-1 overflow-hidden flex items-center justify-center text-current" dangerouslySetInnerHTML={{ __html: u.iconSvg }} />
                            <div>
                                <div className={`text-xs font-bold ${u.id === 'vacui' ? 'bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-orange-300 to-white' : ''}`}>{u.name}</div>
                                <div className="text-[9px] opacity-70">{u.role}</div>
                            </div>
                        </button>
                    ))}
                </div>
                {selectedUser && (
                    <div className="p-3 rounded bg-black/30 border border-white/5 text-xs">
                        <div className={`font-bold mb-1 ${selectedUser.id === 'vacui' ? 'text-yellow-400' : 'text-cyan-400'}`}>
                            {selectedUser.name}
                        </div>
                        <p className="text-neutral-400 leading-relaxed text-[10px] italic">
                            "{selectedUser.bio}"
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-14 border-b border-white/10 flex items-center px-4 bg-[#141419] justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTab('bbs')} className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activeTab === 'bbs' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white'}`}>
                            <MessageSquare className={`w-4 h-4 ${activeTab === 'bbs' ? 'text-cyan-500' : ''}`} />
                            <span className="font-bold text-xs tracking-wider">GENESIS BBS</span>
                        </button>
                        <div className="w-px h-4 bg-white/10" />
                        <button onClick={() => setActiveTab('twitch')} className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activeTab === 'twitch' ? 'bg-purple-900/30 text-white' : 'text-neutral-500 hover:text-white'}`}>
                            <Twitch className={`w-4 h-4 ${activeTab === 'twitch' ? 'text-purple-400' : ''}`} />
                            <span className="font-bold text-xs tracking-wider">TWITCH CHAT</span>
                        </button>
                    </div>
                    {activeTab === 'bbs' && (
                        <div className="text-[10px] text-yellow-500/50 border border-yellow-500/20 px-2 py-1 rounded flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            MODERATION ACTIVE
                        </div>
                    )}
                </div>

                {activeTab === 'bbs' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {posts.map(post => {
                                const author = users.find(u => u.id === post.authorId) || { name: 'ANONYMOUS', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>', role: 'guest', id: 'anon' };
                                const isVacui = author.id === 'vacui';
                                const authorClass = isVacui ? "bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-amber-300 to-white font-bold" : (author.role === 'sysop' || author.role === 'architect') ? 'text-cyan-400 font-bold' : 'text-neutral-400 font-bold';

                                if (post.isDeleted && !expandedDeleted[post.id]) {
                                    return (
                                        <div key={post.id} className="flex gap-4 opacity-50">
                                            <div className="w-10 h-10 rounded-full bg-black/20 border border-white/5 flex items-center justify-center">
                                                <Shield className="w-4 h-4 text-red-500/50" />
                                            </div>
                                            <div className="flex-1 flex items-center gap-2 bg-[#1a1a20] p-2 rounded border border-white/5">
                                                <span className="text-xs text-red-400">[MESSAGE DELETED BY {post.deletedBy?.toUpperCase()}]</span>
                                                <button onClick={() => toggleDeleted(post.id)} className="text-[10px] text-neutral-500 hover:text-white flex items-center gap-1">
                                                    <ChevronRight className="w-3 h-3" /> View Original
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={post.id} className={`group flex gap-4 ${post.isDeleted ? 'opacity-50' : ''}`}>
                                        <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 p-1.5 text-neutral-400 shrink-0 overflow-hidden flex items-center justify-center text-current" dangerouslySetInnerHTML={{ __html: author.iconSvg }} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs ${authorClass}`}>{author.name}</span>
                                                {author.id === 'vacui' && <Sword className="w-3 h-3 text-yellow-500" />}
                                                {(author.role === 'sysop' || author.role === 'architect') && author.id !== 'vacui' && <Shield className="w-3 h-3 text-cyan-500" />}
                                                <div className="group/tooltip relative flex items-center">
                                                    <span className="ml-2 text-white/30 cursor-help">
                                                        {getMethodIcon(post.methodOfEntry)}
                                                    </span>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block bg-black/80 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap border border-white/10 z-10">
                                                        {getMethodTooltip(post.methodOfEntry)}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-neutral-600 ml-auto">{new Date(post.timestamp).toLocaleString()}</span>
                                                {post.isDeleted && (
                                                    <button onClick={() => toggleDeleted(post.id)} className="text-[10px] text-neutral-500 hover:text-white flex items-center gap-1 ml-2">
                                                        <ChevronDown className="w-3 h-3" /> Collapse
                                                    </button>
                                                )}
                                            </div>
                                            <div className={`text-sm text-neutral-300 leading-relaxed bg-[#1a1a20] p-3 rounded-r-lg rounded-bl-lg border ${isVacui ? 'border-yellow-500/20 shadow-[0_0_10px_rgba(255,200,0,0.05)]' : 'border-white/5'} shadow-sm whitespace-pre-wrap`}>
                                                {post.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-[#141419] border-t border-white/10 shrink-0">
                            <div className="flex gap-2">
                                <div className="w-10 h-10 rounded bg-black/40 border border-white/10 flex items-center justify-center text-neutral-500 shrink-0 overflow-hidden">
                                    {(() => {
                                        const u = users.find(x => x.id === currentUser);
                                        if (u && u.iconSvg) return <div className="w-full h-full p-1 text-current" dangerouslySetInnerHTML={{ __html: u.iconSvg }} />;
                                        return <User className="w-5 h-5" />;
                                    })()}
                                </div>
                                <div className="flex-1 relative">
                                    <textarea 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={`Post update as ${currentUser.toUpperCase()}...`}
                                        className="w-full h-20 bg-black/30 border border-white/10 rounded p-3 text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); }}}
                                    />
                                    <button onClick={handlePost} className="absolute bottom-2 right-2 p-2 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 rounded transition-colors border border-cyan-500/30">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'twitch' && (
                    <div className="flex-1 bg-[#0f0f13] flex flex-col">
                        <div className="flex-1 relative">
                            <iframe 
                                src={`https://www.twitch.tv/embed/vacui_dev/chat?parent=${window.location.hostname}`}
                                className="w-full h-full border-none"
                                title="Twitch Chat"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[9px] text-neutral-500 text-center p-1 pointer-events-none">
                                Connected to: twitch.tv/vacui_dev
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};