import { create } from 'zustand';
import { CsvData, ReasoningState } from '@/types';
import { idbGet, idbSet, idbClear } from '@/utils/indexedDB';

interface AppState {
  csvData: CsvData;
  selectedRowIndex: number | null;
  promptTemplate: string;
  apiKey: string;
  model: string;
  apiResponse: string;
  apiLoading: boolean;
  lastApiCost: number | null;
  estimatedTotalCost: { min: number; max: number } | null;
  isProcessingAllRows: boolean;
  processedResults: Record<string, string>[];
  processedRowCount: number;
  individualResponses: Record<number, string>;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  isTemperatureEnabled: boolean;
  isMaxTokensEnabled: boolean;
  isTopPEnabled: boolean;
  isTopKEnabled: boolean;
  isFrequencyPenaltyEnabled: boolean;
  isPresencePenaltyEnabled: boolean;
  reasoningState: ReasoningState;
  isAdvancedSettingsOpen: boolean;
  setCsvData: (data: CsvData) => void;
  setSelectedRowIndex: (index: number | null) => void;
  setPromptTemplate: (template: string) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setApiResponse: (response: string) => void;
  setApiLoading: (loading: boolean) => void;
  setLastApiCost: (cost: number | null) => void;
  setEstimatedTotalCost: (cost: { min: number; max: number } | null) => void;
  setIsProcessingAllRows: (processing: boolean) => void;
  setProcessedResults: (results: Record<string, string>[]) => void;
  setProcessedRowCount: (count: number | ((prev: number) => number)) => void;
  setIndividualResponse: (rowIndex: number, response: string) => void;
  setTemperature: (temperature: number) => void;
  setMaxTokens: (maxTokens: number) => void;
  setTopP: (topP: number) => void;
  setTopK: (topK: number) => void;
  setFrequencyPenalty: (frequencyPenalty: number) => void;
  setPresencePenalty: (presencePenalty: number) => void;
  setIsTemperatureEnabled: (enabled: boolean) => void;
  setIsMaxTokensEnabled: (enabled: boolean) => void;
  setIsTopPEnabled: (enabled: boolean) => void;
  setIsTopKEnabled: (enabled: boolean) => void;
  setIsFrequencyPenaltyEnabled: (enabled: boolean) => void;
  setIsPresencePenaltyEnabled: (enabled: boolean) => void;
  setReasoningState: (state: ReasoningState) => void;
  setIsAdvancedSettingsOpen: (isOpen: boolean) => void;
  loadInitialData: () => void;
  clearAllData: () => void;
}

export const useStore = create<AppState>((set) => ({
  csvData: { headers: [], rows: [] },
  selectedRowIndex: null,
  promptTemplate: '',
  apiKey: '',
  model: 'google/gemini-2.5-flash-lite',
  apiResponse: '',
  apiLoading: false,
  lastApiCost: null,
  estimatedTotalCost: null,
  isProcessingAllRows: false,
  processedResults: [],
  processedRowCount: 0,
  individualResponses: {},
  temperature: 0.7,
  maxTokens: 1024,
  topP: 1,
  topK: 0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  isTemperatureEnabled: false,
  isMaxTokensEnabled: false,
  isTopPEnabled: false,
  isTopKEnabled: false,
  isFrequencyPenaltyEnabled: false,
  isPresencePenaltyEnabled: false,
  reasoningState: 'default',
  isAdvancedSettingsOpen: false,
  setCsvData: (data) => {
    set({ csvData: data });
    idbSet('uploadedCsv', data);
  },
  setSelectedRowIndex: (index) => set({ selectedRowIndex: index }),
  setPromptTemplate: (template) => {
    set({ promptTemplate: template });
    idbSet('promptTemplate', template);
  },
  setApiKey: (key) => {
    set({ apiKey: key });
    idbSet('apiKey', key);
  },
  setModel: (model) => {
    set({ model: model });
    idbSet('model', model);
  },
  setApiResponse: (response) => set({ apiResponse: response }),
  setApiLoading: (loading) => set({ apiLoading: loading }),
  setLastApiCost: (cost) => set({ lastApiCost: cost }),
  setEstimatedTotalCost: (cost) => set({ estimatedTotalCost: cost }),
  setIsProcessingAllRows: (processing) => set({ isProcessingAllRows: processing }),
  setProcessedResults: (results) => {
    const newIndividualResponses: Record<number, string> = {};
    results.forEach((result, index) => {
      if (result.api_response) {
        newIndividualResponses[index] = result.api_response;
      }
    });

    set({
      processedResults: results,
      individualResponses: newIndividualResponses,
    });

    idbSet('processedResults', results).then(() => {
      idbGet('uploadedCsv').then(csvData => {
        if (csvData) {
          const updatedRows = csvData.rows.map((row, index) => {
            const result = results.find((r, i) => i === index);
            if (result && result.api_response) {
              return { ...row, Result: result.api_response };
            }
            return row;
          });
          idbSet('uploadedCsv', { ...csvData, rows: updatedRows });
        }
      });
    });
  },
  setProcessedRowCount: (updater) =>
    set((state) => ({
      processedRowCount: typeof updater === 'function' ? updater(state.processedRowCount) : updater,
    })),
  setIndividualResponse: (rowIndex, response) => {
    set((state) => ({
      individualResponses: {
        ...state.individualResponses,
        [rowIndex]: response,
      },
    }));

    idbGet('uploadedCsv').then(csvData => {
      if (csvData) {
        const updatedRows = [...csvData.rows];
        updatedRows[rowIndex] = { ...updatedRows[rowIndex], Result: response };
        idbSet('uploadedCsv', { ...csvData, rows: updatedRows });
      }
    });
  },
  setTemperature: (temperature) => {
    set({ temperature });
    idbSet('temperature', temperature);
  },
  setMaxTokens: (maxTokens) => {
    set({ maxTokens });
    idbSet('maxTokens', maxTokens);
  },
  setTopP: (topP) => {
    set({ topP });
    idbSet('topP', topP);
  },
  setTopK: (topK) => {
    set({ topK });
    idbSet('topK', topK);
  },
  setFrequencyPenalty: (frequencyPenalty) => {
    set({ frequencyPenalty });
    idbSet('frequencyPenalty', frequencyPenalty);
  },
  setPresencePenalty: (presencePenalty) => {
    set({ presencePenalty });
    idbSet('presencePenalty', presencePenalty);
  },
  setIsTemperatureEnabled: (enabled) => set({ isTemperatureEnabled: enabled }),
  setIsMaxTokensEnabled: (enabled) => set({ isMaxTokensEnabled: enabled }),
  setIsTopPEnabled: (enabled) => set({ isTopPEnabled: enabled }),
  setIsTopKEnabled: (enabled) => set({ isTopKEnabled: enabled }),
  setIsFrequencyPenaltyEnabled: (enabled) => set({ isFrequencyPenaltyEnabled: enabled }),
  setIsPresencePenaltyEnabled: (enabled) => set({ isPresencePenaltyEnabled: enabled }),
  setReasoningState: (state) => {
    set({ reasoningState: state });
    idbSet('reasoningState', state);
  },
  setIsAdvancedSettingsOpen: (isOpen) => {
    set({ isAdvancedSettingsOpen: isOpen });
    idbSet('isAdvancedSettingsOpen', isOpen);
  },
  loadInitialData: async () => {
    const storedCsv = await idbGet('uploadedCsv');
    if (storedCsv) {
      set({ csvData: storedCsv });
      if (storedCsv.rows.length > 0) {
        set({ selectedRowIndex: 0 });
      }
    }
    const storedApiKey = await idbGet('apiKey');
    if (storedApiKey) {
      set({ apiKey: storedApiKey });
    }
    const storedModel = await idbGet('model');
    if (storedModel) {
      set({ model: storedModel });
    }
    const storedPromptTemplate = await idbGet('promptTemplate');
    if (storedPromptTemplate) {
      set({ promptTemplate: storedPromptTemplate });
    }
    const storedResults = await idbGet('processedResults');
    if (storedResults) {
      set({ processedResults: storedResults });
    }
    const individualResponses: Record<number, string> = {};
    if (storedCsv) {
      storedCsv.rows.forEach((row: Record<string, string>, index: number) => {
        if (row.Result) {
          individualResponses[index] = row.Result;
        }
      });
    }
    set({ individualResponses });
    const storedTemperature = await idbGet('temperature');
    if (storedTemperature) {
      set({ temperature: storedTemperature });
    }
    const storedMaxTokens = await idbGet('maxTokens');
    if (storedMaxTokens) {
      set({ maxTokens: storedMaxTokens });
    }
    const storedTopP = await idbGet('topP');
    if (storedTopP) {
      set({ topP: storedTopP });
    }
    const storedTopK = await idbGet('topK');
    if (storedTopK) {
      set({ topK: storedTopK });
    }
    const storedFrequencyPenalty = await idbGet('frequencyPenalty');
    if (storedFrequencyPenalty) {
      set({ frequencyPenalty: storedFrequencyPenalty });
    }
    const storedPresencePenalty = await idbGet('presencePenalty');
    if (storedPresencePenalty) {
      set({ presencePenalty: storedPresencePenalty });
    }
    const storedReasoningState = await idbGet('reasoningState');
    if (storedReasoningState) {
      set({ reasoningState: storedReasoningState });
    }
    const storedIsAdvancedSettingsOpen = await idbGet('isAdvancedSettingsOpen');
    if (storedIsAdvancedSettingsOpen) {
      set({ isAdvancedSettingsOpen: storedIsAdvancedSettingsOpen });
    }
  },
  clearAllData: async () => {
    await idbClear();
    set({
      csvData: { headers: [], rows: [] },
      selectedRowIndex: null,
      promptTemplate: '',
      apiKey: '',
      model: 'google/gemini-2.5-flash-lite',
      apiResponse: '',
      apiLoading: false,
      lastApiCost: null,
      estimatedTotalCost: null,
      isProcessingAllRows: false,
      processedResults: [],
      processedRowCount: 0,
      individualResponses: {},
      temperature: 0.7,
      maxTokens: 1024,
      topP: 1,
      topK: 0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      isTemperatureEnabled: false,
      isMaxTokensEnabled: false,
      isTopPEnabled: false,
      isTopKEnabled: false,
      isFrequencyPenaltyEnabled: false,
      isPresencePenaltyEnabled: false,
      reasoningState: 'default',
      isAdvancedSettingsOpen: false,
    });
  },
}));