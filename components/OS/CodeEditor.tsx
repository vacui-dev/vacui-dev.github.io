// Copyright (c) 2025 vacui.dev, all rights reserved

import React, { useRef, useEffect } from 'react';

interface CodeEditorProps {
    value: string;
    onChange?: (value: string) => void;
    language?: 'python' | 'glsl' | 'json' | 'typescript';
    readOnly?: boolean;
    className?: string;
}

const GLSL_KEYWORDS = new Set([
    'attribute', 'const', 'uniform', 'varying', 'break', 'continue', 'do', 'for', 'while', 'if', 'else', 
    'in', 'out', 'inout', 'float', 'int', 'void', 'bool', 'true', 'false', 'lowp', 'mediump', 'highp', 
    'precision', 'invariant', 'discard', 'return', 'mat2', 'mat3', 'mat4', 'vec2', 'vec3', 'vec4', 
    'ivec2', 'ivec3', 'ivec4', 'bvec2', 'bvec3', 'bvec4', 'sampler2D', 'samplerCube', 'struct',
    'define', 'undef', 'ifdef', 'ifndef', 'endif'
]);

const GLSL_BUILTINS = new Set([
    'gl_Position', 'gl_FragColor', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'pow', 'exp', 'log', 
    'sqrt', 'abs', 'sign', 'floor', 'ceil', 'fract', 'mod', 'min', 'max', 'clamp', 'mix', 'step', 
    'smoothstep', 'length', 'distance', 'dot', 'cross', 'normalize', 'faceforward', 'reflect', 'refract', 
    'matrixCompMult', 'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual', 'equal', 'notEqual', 
    'any', 'all', 'not', 'texture2D', 'textureCube', 'time', 'resolution', 'mouse', 'uv', 'vUv'
]);

const PYTHON_KEYWORDS = new Set([
    'import', 'from', 'class', 'def', 'return', 'if', 'else', 'elif', 'while', 'for', 'in', 'not', 
    'and', 'or', 'break', 'continue', 'pass', 'try', 'except', 'finally', 'raise', 'with', 'as', 
    'lambda', 'async', 'await', 'print', 'global', 'nonlocal', 'assert', 'del', 'yield', 'True', 'False', 'None'
]);

const colorize = (line: string, lang: string) => {
    // Very basic single-line comment detection
    const commentStart = lang === 'python' ? '#' : '//';
    const commentIdx = line.indexOf(commentStart);
    
    let codePart = line;
    let commentPart = '';

    if (commentIdx !== -1) {
        codePart = line.substring(0, commentIdx);
        commentPart = line.substring(commentIdx);
    }

    // Split by delimiters but keep them
    const parts = codePart.split(/(\s+|[(){}[\]=,.:;+\-*/%&|^<>!?])/);

    return (
        <>
            {parts.map((part, index) => {
                if (!part) return null;
                
                // Whitespace/Delimiters - just render
                if (/^\s+$/.test(part) || /^[(){}[\]=,.:;+\-*/%&|^<>!?]$/.test(part)) {
                    return <span key={index} className="text-neutral-500">{part}</span>;
                }

                if (lang === 'glsl') {
                    if (GLSL_KEYWORDS.has(part)) return <span key={index} className="text-[#ff7b72]">{part}</span>; // Red/Pink
                    if (GLSL_BUILTINS.has(part)) return <span key={index} className="text-[#d2a8ff]">{part}</span>; // Purple
                    if (['vec2','vec3','vec4','float'].includes(part)) return <span key={index} className="text-[#79c0ff]">{part}</span>; // Blue Types
                } else {
                    if (PYTHON_KEYWORDS.has(part)) return <span key={index} className="text-[#ff7b72]">{part}</span>;
                    if (['self', 'torch', 'nn', 'optim', 'np', 'plt'].includes(part)) return <span key={index} className="text-[#79c0ff]">{part}</span>;
                    if (['__init__', 'forward'].includes(part)) return <span key={index} className="text-[#d2a8ff]">{part}</span>;
                }

                // Numbers
                if (!isNaN(parseFloat(part)) && isFinite(Number(part))) return <span key={index} className="text-[#79c0ff]">{part}</span>;
                
                // Strings (very naive, assumes token is a string literal part)
                if (part.startsWith('"') || part.startsWith("'")) return <span key={index} className="text-[#a5d6ff]">{part}</span>;

                return <span key={index} className="text-[#e6edf3]">{part}</span>;
            })}
            {commentPart && <span className="text-neutral-500 italic">{commentPart}</span>}
        </>
    );
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language = 'python', readOnly = false, className = '' }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const lineNumsRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const target = e.currentTarget;
        if (target === textareaRef.current) {
            if (preRef.current) {
                preRef.current.scrollTop = target.scrollTop;
                preRef.current.scrollLeft = target.scrollLeft;
            }
            if (lineNumsRef.current) {
                lineNumsRef.current.scrollTop = target.scrollTop;
            }
        } else if (target === preRef.current) {
             // If readOnly, we scroll the pre block
             if (lineNumsRef.current) {
                lineNumsRef.current.scrollTop = target.scrollTop;
            }
        }
    };

    // Ensure scroll sync on mount/update
    useEffect(() => {
        if (textareaRef.current && lineNumsRef.current && preRef.current) {
            lineNumsRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, [value]);

    const lines = value.split('\n');

    return (
        <div className={`relative flex h-full bg-[#0d1117] font-mono text-xs ${className}`}>
            {/* Line Numbers */}
            <div 
                ref={lineNumsRef}
                className="w-10 shrink-0 bg-[#0d1117] text-neutral-600 text-right pr-3 pt-4 select-none overflow-hidden border-r border-white/5 leading-relaxed"
            >
                {lines.map((_, i) => (
                    <div key={i} className="h-[1.5em]">{i + 1}</div>
                ))}
            </div>

            {/* Editor Container */}
            <div className="relative flex-1 overflow-hidden">
                
                {/* Highlight Layer */}
                <pre 
                    ref={preRef}
                    className={`absolute inset-0 p-4 m-0 whitespace-pre leading-relaxed tab-4 ${readOnly ? 'overflow-auto pointer-events-auto select-text text-[#e6edf3]' : 'overflow-hidden pointer-events-none'}`}
                    onScroll={readOnly ? handleScroll : undefined}
                >
                    {lines.map((line, i) => (
                        <div key={i} className="h-[1.5em]">{colorize(line, language)}</div>
                    ))}
                </pre>

                {/* Input Layer (Only for Editing) */}
                {!readOnly && (
                    <textarea
                        ref={textareaRef}
                        className="absolute inset-0 w-full h-full p-4 bg-transparent border-none resize-none outline-none whitespace-pre leading-relaxed text-transparent caret-white z-10 tab-4"
                        value={value}
                        onChange={e => onChange && onChange(e.target.value)}
                        onScroll={handleScroll}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                    />
                )}
            </div>
        </div>
    );
};
