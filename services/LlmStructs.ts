// Copyright (c) 2025 vacui.dev, all rights reserved

/**
 * Ported Data Structures from 'communication.py'
 * Defines the schema for the Universal Neural Uplink.
 */

export type Role = "system" | "assistant" | "user" | "tool";

export interface FunctionCallRequest {
    id?: string;
    name: string;
    args: string; // JSON string
}

export interface FunctionCallResponse {
    role: "tool";
    name: string;
    result: string; // JSON string
    msg_id?: string;
    request_id?: string;
    success?: boolean;
    attachments?: string[];
    timeline?: { created: number };
}

export interface ConversationMessage {
    role: Role;
    text?: string;
    attachments?: string[];
    platform_metadata?: Record<string, any>;
    name?: string;
    timeline?: { created: number };
    function_calls?: FunctionCallRequest[];
    id?: string;
    thoughts?: string; // Internal reasoning
}

export type ConversationEntry = ConversationMessage | FunctionCallResponse;

export interface LlmResponse {
    msg?: ConversationMessage;
    alternatives?: Record<string, ConversationMessage>;
    finish_reason?: "success" | "trimmed" | "canceled" | "error" | "length" | "tool_calls";
    cost?: any;
    is_partial_continuation?: boolean;
}

export interface LlmConfig {
    endpoint: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
}

// Helper to convert our rich structure to standard OpenAI format for the wire
export const toOpenAIMessages = (history: ConversationEntry[]) => {
    return history.map(entry => {
        if (entry.role === 'tool') {
            const toolMsg = entry as FunctionCallResponse;
            return {
                role: 'tool',
                tool_call_id: toolMsg.request_id || 'unknown',
                content: toolMsg.result,
                name: toolMsg.name
            };
        } else {
            const msg = entry as ConversationMessage;
            if (msg.function_calls && msg.function_calls.length > 0) {
                return {
                    role: 'assistant',
                    content: msg.text || null,
                    tool_calls: msg.function_calls.map(fc => ({
                        id: fc.id,
                        type: 'function',
                        function: {
                            name: fc.name,
                            arguments: fc.args,
                        }
                    }))
                };
            }
            return {
                role: msg.role,
                content: msg.text || '',
                name: msg.name
            };
        }
    });
};