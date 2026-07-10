import { BatchRequestSnapshot, CostEstimateStatus, CsvData, ImageTask, ReasoningState } from '@/types';
import { idbSet } from '@/utils/indexedDB';
import { applyPromptTemplate } from '@/utils/promptTemplate';
import { runTaskPool, waitForRetryDelay } from '@/utils/taskPool';

const getReasoningParams = (reasoningState: ReasoningState) => {
    switch (reasoningState) {
        case 'on':
            return { reasoning: { enabled: true } };
        case 'off':
            return { reasoning: { enabled: false } };
        case 'default':
        default:
            return {};
    }
};

export interface BatchApiSettings {
    apiKey: string;
    model: string;
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
}

export const createBatchRequestSnapshot = (
    prompt: string,
    settings: BatchApiSettings,
): BatchRequestSnapshot => ({
    model: settings.model,
    prompt,
    temperature: settings.isTemperatureEnabled ? settings.temperature : null,
    maxTokens: settings.isMaxTokensEnabled ? settings.maxTokens : null,
    topP: settings.isTopPEnabled ? settings.topP : null,
    topK: settings.isTopKEnabled ? settings.topK : null,
    frequencyPenalty: settings.isFrequencyPenaltyEnabled ? settings.frequencyPenalty : null,
    presencePenalty: settings.isPresencePenaltyEnabled ? settings.presencePenalty : null,
    reasoningState: settings.reasoningState,
});

export const batchSnapshotsEqual = (
    first: BatchRequestSnapshot | null,
    second: BatchRequestSnapshot,
) => Boolean(first) && JSON.stringify(first) === JSON.stringify(second);

const RETRYABLE_STATUS_CODES = new Set([408, 429, 502, 503]);
const MAX_BATCH_ATTEMPTS = 3;

class OpenRouterRequestError extends Error {
    constructor(
        message: string,
        readonly status?: number,
        readonly retryAfterMilliseconds?: number,
    ) {
        super(message);
        this.name = 'OpenRouterRequestError';
    }
}

const parseRetryAfterMilliseconds = (value: string | null): number | undefined => {
    if (!value) return undefined;

    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

    const retryDate = Date.parse(value);
    if (Number.isNaN(retryDate)) return undefined;
    return Math.max(0, retryDate - Date.now());
};

const parseResponseData = async (response: Response): Promise<any> => {
    try {
        return await response.json();
    } catch {
        return {};
    }
};

const buildBatchRequestBody = (content: unknown, settings: BatchApiSettings) => ({
    model: settings.model,
    messages: [{ role: 'user', content }],
    ...(settings.isTemperatureEnabled && { temperature: settings.temperature }),
    ...(settings.isMaxTokensEnabled && { max_tokens: settings.maxTokens }),
    ...(settings.isTopPEnabled && { top_p: settings.topP }),
    ...(settings.isTopKEnabled && { top_k: settings.topK }),
    ...(settings.isFrequencyPenaltyEnabled && { frequency_penalty: settings.frequencyPenalty }),
    ...(settings.isPresencePenaltyEnabled && { presence_penalty: settings.presencePenalty }),
    ...getReasoningParams(settings.reasoningState),
});

const requestBatchCompletion = async (
    content: unknown,
    settings: BatchApiSettings,
    stopSignal: AbortSignal,
): Promise<string> => {
    for (let attempt = 0; attempt < MAX_BATCH_ATTEMPTS; attempt += 1) {
        let response: Response;

        try {
            response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${settings.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Turn Every Sheet Row Into a Chat Response',
                },
                body: JSON.stringify(buildBatchRequestBody(content, settings)),
            });
        } catch (error) {
            const networkError = error instanceof Error ? error : new Error('A network error occurred.');
            if (attempt === MAX_BATCH_ATTEMPTS - 1 || stopSignal.aborted) throw networkError;

            const shouldContinue = await waitForRetryDelay(1000 * (2 ** attempt), stopSignal);
            if (!shouldContinue) throw networkError;
            continue;
        }

        const data = await parseResponseData(response);
        if (response.ok) {
            return data.choices?.[0]?.message?.content || 'No content returned from API.';
        }

        const requestError = new OpenRouterRequestError(
            data.error?.message || `API request failed with status ${response.status}`,
            response.status,
            parseRetryAfterMilliseconds(response.headers.get('Retry-After')),
        );
        const canRetry = RETRYABLE_STATUS_CODES.has(response.status)
            && attempt < MAX_BATCH_ATTEMPTS - 1
            && !stopSignal.aborted;

        if (!canRetry) throw requestError;

        const delay = (response.status === 429 || response.status === 503)
            ? requestError.retryAfterMilliseconds ?? 1000 * (2 ** attempt)
            : 1000 * (2 ** attempt);
        const shouldContinue = await waitForRetryDelay(delay, stopSignal);
        if (!shouldContinue) throw requestError;
    }

    throw new Error('The API request did not produce a result.');
};

export const handleTestApi = async (
    apiKey: string,
    model: string,
    generatedPrompt: string,
    promptTemplate: string,
    csvData: CsvData,
    temperature: number,
    maxTokens: number,
    topP: number,
    topK: number,
    frequencyPenalty: number,
    presencePenalty: number,
    isTemperatureEnabled: boolean,
    isMaxTokensEnabled: boolean,
    isTopPEnabled: boolean,
    isTopKEnabled: boolean,
    isFrequencyPenaltyEnabled: boolean,
    isPresencePenaltyEnabled: boolean,
    reasoningState: ReasoningState,
    setApiLoading: (loading: boolean) => void,
    setApiResponse: (response: string) => void,
    setLastApiCost: (cost: number | null) => void,
    setEstimatedTotalCost: (cost: { min: number; max: number } | null) => void,
    setCostEstimateStatus: (status: CostEstimateStatus) => void,
    imageDataUrl?: string,
    totalItemCount?: number,
) => {
    const isInstructional = generatedPrompt.startsWith('To get started') || generatedPrompt.startsWith('Now, please enter');
    if (!apiKey || !model || !generatedPrompt || isInstructional) {
        alert("Please provide an API Key, model, and generate a valid prompt first.");
        return;
    }

    await idbSet('apiKey', apiKey);
    await idbSet('model', model);
    if (!imageDataUrl) {
        await idbSet('promptTemplate', promptTemplate);
    }
    await idbSet('lastApiRequest', generatedPrompt);

    setApiLoading(true);
    setApiResponse('');
    setLastApiCost(null);
    setEstimatedTotalCost(null);
    setCostEstimateStatus('loading');

    try {
        const messageContent = imageDataUrl
            ? [
                { type: 'text', text: generatedPrompt },
                { type: 'image_url', image_url: { url: imageDataUrl } },
            ]
            : generatedPrompt;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.href,
                "X-Title": "Turn Every Sheet Row Into a Chat Response"
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: messageContent }],
                ...(isTemperatureEnabled && { temperature: temperature }),
                ...(isMaxTokensEnabled && { max_tokens: maxTokens }),
                ...(isTopPEnabled && { top_p: topP }),
                ...(isTopKEnabled && { top_k: topK }),
                ...(isFrequencyPenaltyEnabled && { frequency_penalty: frequencyPenalty }),
                ...(isPresencePenaltyEnabled && { presence_penalty: presencePenalty }),
                ...getReasoningParams(reasoningState),
            })
        });

        const data = await response.json();
        await idbSet('lastApiResponse', data);

        if (!response.ok) {
            throw new Error(data.error?.message || `API request failed with status ${response.status}`);
        }

        const cost = data.usage?.cost;
        if (typeof cost === 'number' && Number.isFinite(cost) && cost >= 0) {
            setLastApiCost(cost);
            const itemCount = totalItemCount ?? csvData.rows.length;
            setEstimatedTotalCost(itemCount > 0 ? {
                min: cost * 0.8 * itemCount,
                max: cost * 3 * itemCount,
            } : null);
            setCostEstimateStatus('ready');
        } else {
            setCostEstimateStatus('unavailable');
        }

        const content = data.choices[0]?.message?.content || "No content returned from API.";
        setApiResponse(content);

    } catch (error) {
        setLastApiCost(null);
        setEstimatedTotalCost(null);
        setCostEstimateStatus('unavailable');
        if (error instanceof Error) {
            setApiResponse(`Error: ${error.message}`);
        } else {
            setApiResponse("An unknown error occurred.");
        }
    } finally {
        setApiLoading(false);
    }
};

interface ProcessRowParams {
    row: Record<string, string>;
    promptTemplate: string;
    headers: string[];
    settings: BatchApiSettings;
    stopSignal: AbortSignal;
}

export const processRowWithRetry = async ({
    row,
    promptTemplate,
    headers,
    settings,
    stopSignal,
}: ProcessRowParams): Promise<Record<string, string>> => {
    const prompt = applyPromptTemplate(promptTemplate, row, headers);

    try {
        const content = await requestBatchCompletion(prompt, settings, stopSignal);
        return { ...row, api_response: content };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { ...row, api_response: `Error: ${errorMessage}` };
    }
};

interface ProcessAllRowsParams {
    csvData: CsvData;
    promptTemplate: string;
    settings: BatchApiSettings;
    concurrencyLimit: number;
    stopSignal: AbortSignal;
    resume: boolean;
    existingResults: Record<string, string>[];
    setProcessedRowCount: (count: number | ((prev: number) => number)) => void;
    setProcessedResults: (results: Record<string, string>[]) => void;
    setProcessedResultAt: (rowIndex: number, result: Record<string, string>) => void;
}

export interface BatchProcessingResult {
    stopped: boolean;
}

export const handleProcessAllRows = async ({
    csvData,
    promptTemplate,
    settings,
    concurrencyLimit,
    stopSignal,
    resume,
    existingResults,
    setProcessedRowCount,
    setProcessedResults,
    setProcessedResultAt,
}: ProcessAllRowsParams): Promise<BatchProcessingResult> => {
    const results: Record<string, string>[] = resume && existingResults.length === csvData.rows.length
        ? existingResults.map((result, index) => ({ ...csvData.rows[index], api_response: result.api_response || '' }))
        : csvData.rows.map((row) => ({ ...row, api_response: '' }));
    const pendingItems = results
        .map((result, index) => ({ index, row: csvData.rows[index], completed: Boolean(result.api_response) }))
        .filter((item) => !item.completed);
    const completedCount = results.length - pendingItems.length;

    setProcessedRowCount(completedCount);
    setProcessedResults(results.map((result) => ({ ...result })));

    await runTaskPool({
        items: pendingItems,
        concurrency: concurrencyLimit,
        signal: stopSignal,
        worker: async ({ index, row }) => {
            const result = await processRowWithRetry({
                row,
                promptTemplate,
                headers: csvData.headers,
                settings,
                stopSignal,
            });
            results[index] = result;
            setProcessedResultAt(index, result);
            setProcessedRowCount((previous) => previous + 1);
        },
    });

    setProcessedResults(results.map((result) => ({ ...result })));
    return {
        stopped: stopSignal.aborted && results.some((result) => !result.api_response),
    };
};

interface CallApiParams {
  apiKey: string;
  apiProvider: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}

export const callApi = async ({
  apiKey,
  apiProvider,
  prompt,
  maxTokens,
  temperature,
}: CallApiParams): Promise<string> => {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.href,
      "X-Title": "Turn Every Sheet Row Into a Chat Response"
    },
    body: JSON.stringify({
      model: apiProvider,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No content returned from API.";
};

interface ProcessImagePromptParams {
  task: ImageTask;
  prompt: string;
  settings: BatchApiSettings;
  stopSignal: AbortSignal;
  setImageTaskLoading: (id: string, loading: boolean) => void;
  setImageTaskResponse: (id: string, response: string) => void;
}

export const processImagePrompt = async ({
  task,
  prompt,
  settings,
  stopSignal,
  setImageTaskLoading,
  setImageTaskResponse,
}: ProcessImagePromptParams): Promise<void> => {
  setImageTaskLoading(task.id, true);
  setImageTaskResponse(task.id, '');

  try {
    const content = await requestBatchCompletion([
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: task.dataUrl } },
    ], settings, stopSignal);
    setImageTaskResponse(task.id, content);
  } catch (error) {
    setImageTaskResponse(task.id, `Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
  } finally {
    setImageTaskLoading(task.id, false);
  }
};

interface ProcessAllImagesParams {
  tasks: ImageTask[];
  prompt: string;
  settings: BatchApiSettings;
  concurrencyLimit: number;
  stopSignal: AbortSignal;
  resume: boolean;
  setImageTaskLoading: (id: string, loading: boolean) => void;
  setImageTaskResponse: (id: string, response: string) => void;
}

export const handleProcessAllImages = async ({
  tasks,
  prompt,
  settings,
  concurrencyLimit,
  stopSignal,
  resume,
  setImageTaskLoading,
  setImageTaskResponse,
}: ProcessAllImagesParams): Promise<BatchProcessingResult> => {
  const pendingTasks = resume ? tasks.filter((task) => !task.response) : tasks;

  await runTaskPool({
    items: pendingTasks,
    concurrency: concurrencyLimit,
    signal: stopSignal,
    worker: (task) => processImagePrompt({
      task,
      prompt,
      settings,
      stopSignal,
      setImageTaskLoading,
      setImageTaskResponse,
    }),
  });

  return {
    stopped: stopSignal.aborted && pendingTasks.length > 0,
  };
};
