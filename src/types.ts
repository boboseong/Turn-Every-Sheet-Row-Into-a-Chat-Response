export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
}

export type ReasoningState = 'off' | 'default' | 'on';
