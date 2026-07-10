import { create } from 'zustand';
import {
  BatchRequestSnapshot,
  BatchStatus,
  CostEstimateStatus,
  CsvData,
  ImageTask,
  ReasoningState,
  WorkMode,
} from '@/types';
import { idbGet, idbSet, idbClear, idbRemove } from '@/utils/indexedDB';

const DEFAULT_CONCURRENCY_LIMIT = 5;
const DEFAULT_BATCH_STATUSES: Record<WorkMode, BatchStatus> = { sheet: 'idle', image: 'idle' };
const DEFAULT_BATCH_SNAPSHOTS: Record<WorkMode, BatchRequestSnapshot | null> = { sheet: null, image: null };

const clampConcurrencyLimit = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_CONCURRENCY_LIMIT;
  return Math.min(20, Math.max(1, Math.round(value)));
};

const deriveRestoredBatchStatus = (totalCount: number, completedCount: number): BatchStatus => {
  if (totalCount === 0 || completedCount === 0) return 'idle';
  return completedCount >= totalCount ? 'completed' : 'stopped';
};

const persistSheetResults = async (csvData: CsvData, results: Record<string, string>[]) => {
  const updatedRows = csvData.rows.map((row, index) => ({
    ...row,
    Result: results[index]?.api_response || '',
  }));

  await Promise.all([
    idbSet('processedResults', results),
    idbSet('uploadedCsv', { ...csvData, rows: updatedRows }),
  ]);
};

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
  costEstimateStatus: CostEstimateStatus;
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
  workMode: WorkMode;
  imageTasks: ImageTask[];
  imagePrompt: string;
  concurrencyLimit: number;
  batchStatuses: Record<WorkMode, BatchStatus>;
  batchSnapshots: Record<WorkMode, BatchRequestSnapshot | null>;
  activeBatchMode: WorkMode | null;
  setCsvData: (data: CsvData) => Promise<void>;
  setSelectedRowIndex: (index: number | null) => void;
  setPromptTemplate: (template: string) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setApiResponse: (response: string) => void;
  setApiLoading: (loading: boolean) => void;
  setLastApiCost: (cost: number | null) => void;
  setEstimatedTotalCost: (cost: { min: number; max: number } | null) => void;
  setCostEstimateStatus: (status: CostEstimateStatus) => void;
  setIsProcessingAllRows: (processing: boolean) => void;
  setProcessedResults: (results: Record<string, string>[]) => void;
  setProcessedResultAt: (rowIndex: number, result: Record<string, string>) => void;
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
  setWorkMode: (mode: WorkMode) => void;
  addImageTasks: (tasks: ImageTask[]) => void;
  removeImageTask: (id: string) => void;
  setImagePrompt: (prompt: string) => void;
  setImageTaskLoading: (id: string, loading: boolean) => void;
  setImageTaskResponse: (id: string, response: string) => void;
  resetImageTaskResponses: () => void;
  setConcurrencyLimit: (limit: number) => void;
  setBatchStatus: (mode: WorkMode, status: BatchStatus) => void;
  setBatchSnapshot: (mode: WorkMode, snapshot: BatchRequestSnapshot | null) => void;
  loadInitialData: () => void;
  clearSheetData: () => Promise<void>;
  clearAllData: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  csvData: { headers: [], rows: [] },
  selectedRowIndex: null,
  promptTemplate: '',
  apiKey: '',
  model: 'google/gemini-2.5-flash-lite',
  apiResponse: '',
  apiLoading: false,
  lastApiCost: null,
  estimatedTotalCost: null,
  costEstimateStatus: 'idle',
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
  workMode: 'sheet',
  imageTasks: [],
  imagePrompt: '',
  concurrencyLimit: DEFAULT_CONCURRENCY_LIMIT,
  batchStatuses: { ...DEFAULT_BATCH_STATUSES },
  batchSnapshots: { ...DEFAULT_BATCH_SNAPSHOTS },
  activeBatchMode: null,
  setCsvData: async (data) => {
    set((state) => ({
      csvData: data,
      selectedRowIndex: data.rows.length > 0 ? 0 : null,
      apiResponse: '',
      apiLoading: false,
      lastApiCost: null,
      estimatedTotalCost: null,
      costEstimateStatus: 'idle',
      isProcessingAllRows: false,
      processedResults: [],
      processedRowCount: 0,
      individualResponses: {},
      batchStatuses: { ...state.batchStatuses, sheet: 'idle' },
      batchSnapshots: { ...state.batchSnapshots, sheet: null },
      activeBatchMode: state.activeBatchMode === 'sheet' ? null : state.activeBatchMode,
    }));
    await Promise.all([
      idbSet('uploadedCsv', data),
      idbSet('processedResults', []),
      idbSet('batchStatuses', get().batchStatuses),
      idbSet('batchSnapshots', get().batchSnapshots),
      idbRemove('lastApiResponse'),
      idbRemove('lastGenerationData'),
    ]);
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
  setCostEstimateStatus: (status) => set({ costEstimateStatus: status }),
  setIsProcessingAllRows: (processing) => set({ isProcessingAllRows: processing }),
  setProcessedResults: (results) => {
    const newIndividualResponses: Record<number, string> = {};
    results.forEach((result, index) => {
      if (result.api_response) {
        newIndividualResponses[index] = result.api_response;
      }
    });

    set((state) => {
      void persistSheetResults(state.csvData, results);
      return {
        processedResults: results,
        individualResponses: newIndividualResponses,
      };
    });
  },
  setProcessedResultAt: (rowIndex, result) => {
    set((state) => {
      const processedResults = state.processedResults.length === state.csvData.rows.length
        ? [...state.processedResults]
        : state.csvData.rows.map((row) => ({ ...row, api_response: '' }));
      processedResults[rowIndex] = result;

      const individualResponses = {
        ...state.individualResponses,
        [rowIndex]: result.api_response || '',
      };

      void persistSheetResults(state.csvData, processedResults);
      return { processedResults, individualResponses };
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
  setIsTemperatureEnabled: (enabled) => {
    set({ isTemperatureEnabled: enabled });
    idbSet('isTemperatureEnabled', enabled);
  },
  setIsMaxTokensEnabled: (enabled) => {
    set({ isMaxTokensEnabled: enabled });
    idbSet('isMaxTokensEnabled', enabled);
  },
  setIsTopPEnabled: (enabled) => {
    set({ isTopPEnabled: enabled });
    idbSet('isTopPEnabled', enabled);
  },
  setIsTopKEnabled: (enabled) => {
    set({ isTopKEnabled: enabled });
    idbSet('isTopKEnabled', enabled);
  },
  setIsFrequencyPenaltyEnabled: (enabled) => {
    set({ isFrequencyPenaltyEnabled: enabled });
    idbSet('isFrequencyPenaltyEnabled', enabled);
  },
  setIsPresencePenaltyEnabled: (enabled) => {
    set({ isPresencePenaltyEnabled: enabled });
    idbSet('isPresencePenaltyEnabled', enabled);
  },
  setReasoningState: (state) => {
    set({ reasoningState: state });
    idbSet('reasoningState', state);
  },
  setIsAdvancedSettingsOpen: (isOpen) => {
    set({ isAdvancedSettingsOpen: isOpen });
    idbSet('isAdvancedSettingsOpen', isOpen);
  },
  setWorkMode: (mode) => {
    set({ workMode: mode });
    idbSet('workMode', mode);
  },
  addImageTasks: (tasks) => set((state) => {
    const imageTasks = [...state.imageTasks, ...tasks];
    const completedCount = imageTasks.filter((task) => Boolean(task.response)).length;
    const imageStatus = deriveRestoredBatchStatus(imageTasks.length, completedCount);
    const batchStatuses = { ...state.batchStatuses, image: imageStatus };
    idbSet('imageTasks', imageTasks);
    idbSet('batchStatuses', batchStatuses);
    return { imageTasks, batchStatuses };
  }),
  removeImageTask: (id) => set((state) => {
    const imageTasks = state.imageTasks.filter((task) => task.id !== id);
    const completedCount = imageTasks.filter((task) => Boolean(task.response)).length;
    const imageStatus = deriveRestoredBatchStatus(imageTasks.length, completedCount);
    const batchStatuses = { ...state.batchStatuses, image: imageStatus };
    const batchSnapshots = imageTasks.length === 0
      ? { ...state.batchSnapshots, image: null }
      : state.batchSnapshots;
    idbSet('imageTasks', imageTasks);
    idbSet('batchStatuses', batchStatuses);
    if (imageTasks.length === 0) idbSet('batchSnapshots', batchSnapshots);
    return { imageTasks, batchStatuses, batchSnapshots };
  }),
  setImagePrompt: (prompt) => {
    set({ imagePrompt: prompt });
    idbSet('imagePrompt', prompt);
  },
  setImageTaskLoading: (id, loading) => set((state) => {
    const imageTasks = state.imageTasks.map((task) => task.id === id ? { ...task, loading } : task);
    idbSet('imageTasks', imageTasks);
    return { imageTasks };
  }),
  setImageTaskResponse: (id, response) => set((state) => {
    const imageTasks = state.imageTasks.map((task) => task.id === id ? { ...task, response } : task);
    idbSet('imageTasks', imageTasks);
    return { imageTasks };
  }),
  resetImageTaskResponses: () => set((state) => {
    const imageTasks = state.imageTasks.map((task) => ({ ...task, response: '', loading: false }));
    idbSet('imageTasks', imageTasks);
    return { imageTasks };
  }),
  setConcurrencyLimit: (limit) => {
    const concurrencyLimit = clampConcurrencyLimit(limit);
    set({ concurrencyLimit });
    idbSet('concurrencyLimit', concurrencyLimit);
  },
  setBatchStatus: (mode, status) => set((state) => {
    const batchStatuses = { ...state.batchStatuses, [mode]: status };
    const isActiveStatus = status === 'running' || status === 'stopping';
    const activeBatchMode = isActiveStatus
      ? mode
      : state.activeBatchMode === mode
        ? null
        : state.activeBatchMode;

    idbSet('batchStatuses', batchStatuses);
    return {
      batchStatuses,
      activeBatchMode,
      ...(mode === 'sheet' && { isProcessingAllRows: isActiveStatus }),
    };
  }),
  setBatchSnapshot: (mode, snapshot) => set((state) => {
    const batchSnapshots = { ...state.batchSnapshots, [mode]: snapshot };
    idbSet('batchSnapshots', batchSnapshots);
    return { batchSnapshots };
  }),
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
    const storedResultsValue = await idbGet('processedResults');
    const storedResults: Record<string, string>[] = Array.isArray(storedResultsValue)
      ? storedResultsValue
      : [];
    if (storedResults.length > 0) {
      set({ processedResults: storedResults });
    }
    const individualResponses: Record<number, string> = {};
    if (storedResults.length > 0) {
      storedResults.forEach((result, index) => {
        if (result.api_response) individualResponses[index] = result.api_response;
      });
    } else if (storedCsv) {
      storedCsv.rows.forEach((row: Record<string, string>, index: number) => {
        if (row.Result) {
          individualResponses[index] = row.Result;
        }
      });
    }
    set({ individualResponses });
    const storedTemperature = await idbGet('temperature');
    if (typeof storedTemperature === 'number') {
      set({ temperature: storedTemperature });
    }
    const storedMaxTokens = await idbGet('maxTokens');
    if (typeof storedMaxTokens === 'number') {
      set({ maxTokens: storedMaxTokens });
    }
    const storedTopP = await idbGet('topP');
    if (typeof storedTopP === 'number') {
      set({ topP: storedTopP });
    }
    const storedTopK = await idbGet('topK');
    if (typeof storedTopK === 'number') {
      set({ topK: storedTopK });
    }
    const storedFrequencyPenalty = await idbGet('frequencyPenalty');
    if (typeof storedFrequencyPenalty === 'number') {
      set({ frequencyPenalty: storedFrequencyPenalty });
    }
    const storedPresencePenalty = await idbGet('presencePenalty');
    if (typeof storedPresencePenalty === 'number') {
      set({ presencePenalty: storedPresencePenalty });
    }
    const advancedToggleKeys = [
      'isTemperatureEnabled',
      'isMaxTokensEnabled',
      'isTopPEnabled',
      'isTopKEnabled',
      'isFrequencyPenaltyEnabled',
      'isPresencePenaltyEnabled',
    ] as const;
    const advancedToggleValues = await Promise.all(advancedToggleKeys.map((key) => idbGet(key)));
    const restoredToggles = advancedToggleKeys.reduce<Partial<AppState>>((result, key, index) => {
      const value = advancedToggleValues[index];
      if (typeof value === 'boolean') result[key] = value;
      return result;
    }, {});
    set(restoredToggles);
    const storedReasoningState = await idbGet('reasoningState');
    if (storedReasoningState) {
      set({ reasoningState: storedReasoningState });
    }
    const storedConcurrencyLimit = await idbGet('concurrencyLimit');
    const concurrencyLimit = typeof storedConcurrencyLimit === 'number'
      ? clampConcurrencyLimit(storedConcurrencyLimit)
      : DEFAULT_CONCURRENCY_LIMIT;
    set({ concurrencyLimit });
    const storedIsAdvancedSettingsOpen = await idbGet('isAdvancedSettingsOpen');
    if (storedIsAdvancedSettingsOpen) {
      set({ isAdvancedSettingsOpen: storedIsAdvancedSettingsOpen });
    }
    const storedWorkMode = await idbGet('workMode');
    if (storedWorkMode) {
      set({ workMode: storedWorkMode });
    }
    const storedImagePrompt = await idbGet('imagePrompt');
    if (typeof storedImagePrompt === 'string') {
      set({ imagePrompt: storedImagePrompt });
    }
    const storedImageTasks = await idbGet('imageTasks');
    let restoredImageTasks: ImageTask[] = [];
    if (Array.isArray(storedImageTasks)) {
      type StoredImageTask = ImageTask & { prompt?: string };
      restoredImageTasks = storedImageTasks.map(({ prompt: _prompt, ...task }: StoredImageTask) => ({
        ...task,
        loading: false,
      }));
      set({ imageTasks: restoredImageTasks });
      await idbSet('imageTasks', restoredImageTasks);

      const legacyPrompt = storedImageTasks.find((task: StoredImageTask) => task.prompt?.trim())?.prompt;
      if (!(typeof storedImagePrompt === 'string' && storedImagePrompt.trim()) && legacyPrompt) {
        set({ imagePrompt: legacyPrompt });
        await idbSet('imagePrompt', legacyPrompt);
      }
    }

    const storedSnapshots = await idbGet('batchSnapshots');
    const batchSnapshots: Record<WorkMode, BatchRequestSnapshot | null> = {
      sheet: storedSnapshots?.sheet ?? null,
      image: storedSnapshots?.image ?? null,
    };
    const sheetCompletedCount = storedResults.filter((result) => Boolean(result.api_response)).length;
    const imageCompletedCount = restoredImageTasks.filter((task) => Boolean(task.response)).length;
    const batchStatuses: Record<WorkMode, BatchStatus> = {
      sheet: deriveRestoredBatchStatus(storedCsv?.rows?.length ?? 0, sheetCompletedCount),
      image: deriveRestoredBatchStatus(restoredImageTasks.length, imageCompletedCount),
    };

    set({
      batchStatuses,
      batchSnapshots,
      activeBatchMode: null,
      isProcessingAllRows: false,
      processedRowCount: sheetCompletedCount,
    });
    await Promise.all([
      idbSet('concurrencyLimit', concurrencyLimit),
      idbSet('batchStatuses', batchStatuses),
      idbSet('batchSnapshots', batchSnapshots),
    ]);
  },
  clearSheetData: async () => {
    set((state) => ({
      csvData: { headers: [], rows: [] },
      selectedRowIndex: null,
      apiResponse: '',
      apiLoading: false,
      lastApiCost: null,
      estimatedTotalCost: null,
      costEstimateStatus: 'idle',
      isProcessingAllRows: false,
      processedResults: [],
      processedRowCount: 0,
      individualResponses: {},
      batchStatuses: { ...state.batchStatuses, sheet: 'idle' },
      batchSnapshots: { ...state.batchSnapshots, sheet: null },
      activeBatchMode: state.activeBatchMode === 'sheet' ? null : state.activeBatchMode,
    }));
    await Promise.all([
      idbRemove('uploadedCsv'),
      idbSet('processedResults', []),
      idbSet('batchStatuses', get().batchStatuses),
      idbSet('batchSnapshots', get().batchSnapshots),
      idbRemove('lastApiResponse'),
      idbRemove('lastGenerationData'),
    ]);
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
      costEstimateStatus: 'idle',
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
      workMode: 'sheet',
      imageTasks: [],
      imagePrompt: '',
      concurrencyLimit: DEFAULT_CONCURRENCY_LIMIT,
      batchStatuses: { ...DEFAULT_BATCH_STATUSES },
      batchSnapshots: { ...DEFAULT_BATCH_SNAPSHOTS },
      activeBatchMode: null,
    });
  },
}));
