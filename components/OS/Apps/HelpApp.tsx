// Copyright (c) 2025 vacui.dev, all rights reserved

import React from 'react';
import { Folder, Brain, Terminal } from 'lucide-react';

export const HelpApp: React.FC = () => {
    return (
        <div className="p-8 h-full overflow-y-auto font-mono text-sm text-gray-300 bg-[#0a0a0a]">
            <h1 className="text-2xl font-bold text-cyan-400 mb-6 border-b border-white/10 pb-2">Genesis OS Manual</h1>
            
            <div className="space-y-8">
                <section>
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <Folder className="w-4 h-4" /> Filesystem & Navigation
                    </h2>
                    <p className="opacity-80 leading-relaxed mb-2">
                        The Genesis OS uses a virtual filesystem stored in local state. It persists across sessions via the 'System Kernel' simulation.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 opacity-70">
                        <li><strong>Home:</strong> Your personal files and journals.</li>
                        <li><strong>Simulations:</strong> Physics configurations (.sim).</li>
                        <li><strong>Libraries:</strong> External data mounts (Parquet/JSON).</li>
                        <li><strong>Materials:</strong> PBR configs and Shader code.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4" /> HyperSpace (Memory Palace)
                    </h2>
                    <p className="opacity-80 leading-relaxed">
                        A visualization of the RAG (Retrieval Augmented Generation) embeddings. 
                        Points represent memory vectors projected from high-dimensional space into 2D.
                        Double-click to navigate related concepts.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> The Kernel
                    </h2>
                    <p className="opacity-80 leading-relaxed">
                        The interface to the underlying "Wise Mind" architecture. 
                        Shows the python code responsible for emotional resonance and decision making.
                    </p>
                </section>
            </div>
        </div>
    );
};