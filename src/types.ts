export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
}

export type ReasoningState = 'off' | 'default' | 'on';


export interface ImageTask {
  id: string;
  name: string;
  dataUrl: string;
  prompt: string;
  response: string;
  loading: boolean;
}

export type WorkMode = 'sheet' | 'image';
