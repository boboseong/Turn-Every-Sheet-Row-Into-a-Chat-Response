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
