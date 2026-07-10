export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
}

export type ReasoningState = 'off' | 'default' | 'on';

export type CostEstimateStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface ImageTask {
  id: string;
  name: string;
  dataUrl: string;
  response: string;
  loading: boolean;
}

export type WorkMode = 'sheet' | 'image';

export type BatchStatus = 'idle' | 'running' | 'stopping' | 'stopped' | 'completed';

export interface BatchRequestSnapshot {
  model: string;
  prompt: string;
  temperature: number | null;
  maxTokens: number | null;
  topP: number | null;
  topK: number | null;
  frequencyPenalty: number | null;
  presencePenalty: number | null;
  reasoningState: ReasoningState;
}
