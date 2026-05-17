import type { ApiResponse, PaginatedResponse, PaginationParams } from "./api";

/** Mirror backend/app/schemas/ai.py */

export type AIProviderName = "openai" | "groq" | "anthropic" | "mock";
export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  content: string;
  provider: AIProviderName;
  model: string;
  usage: TokenUsage;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface AILogRead {
  id: string;
  provider: AIProviderName;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  created_at: string;
}

export interface AILogListParams extends PaginationParams {
  provider?: AIProviderName;
}

export type ChatApiResponse = ApiResponse<ChatResponse>;
export type AILogListResponse = PaginatedResponse<AILogRead>;

/** WebSocket counter payload — mirror backend websocket contract */
export interface CounterMessage {
  count: number;
  timestamp: string;
}
