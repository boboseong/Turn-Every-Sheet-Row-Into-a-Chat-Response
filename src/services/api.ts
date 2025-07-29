import { CsvData, ReasoningState } from '@/types';
import { idbSet } from '@/utils/indexedDB';
import React from 'react';

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
    setEstimatedTotalCost: (cost: { min: number; max: number } | null) => void
) => {
    const isInstructional = generatedPrompt.startsWith('To get started') || generatedPrompt.startsWith('Now, please enter');
    if (!apiKey || !model || !generatedPrompt || isInstructional) {
        alert("Please provide an API Key, model, and generate a valid prompt first.");
        return;
    }

    await idbSet('apiKey', apiKey);
    await idbSet('model', model);
    await idbSet('promptTemplate', promptTemplate);
    await idbSet('lastApiRequest', generatedPrompt);

    setApiLoading(true);
    setApiResponse('');
    setLastApiCost(null);
    setEstimatedTotalCost(null);

    try {
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
                messages: [{ role: "user", content: generatedPrompt }],
                ...(isTemperatureEnabled && { temperature: temperature }),
                ...(isMaxTokensEnabled && { max_tokens: maxTokens }),
                ...(isTopPEnabled && { top_p: topP }),
                ...(isTopKEnabled && { top_k: topK }),
                ...(isFrequencyPenaltyEnabled && { frequency_penalty: frequencyPenalty }),
                ...(isPresencePenaltyEnabled && { presence_penalty: presencePenalty }),
                ...getReasoningParams(reasoningState),
            })
        });

        const costHeader = response.headers.get('x-openrouter-cost');
        if (costHeader) {
            const cost = parseFloat(costHeader);
            setLastApiCost(cost);
            if (csvData.rows.length > 0) {
                setEstimatedTotalCost({
                    min: cost * 0.8 * csvData.rows.length,
                    max: cost * 2 * csvData.rows.length,
                });
            }
        }

        const data = await response.json();
        await idbSet('lastApiResponse', data);

        if (!response.ok) {
            throw new Error(data.error?.message || `API request failed with status ${response.status}`);
        }

        const content = data.choices[0]?.message?.content || "No content returned from API.";
        setApiResponse(content);

    } catch (error) {
        if (error instanceof Error) {
            setApiResponse(`Error: ${error.message}`);
        } else {
            setApiResponse("An unknown error occurred.");
        }
    } finally {
        setApiLoading(false);
    }
};

export const processRowWithRetry = async (
    row: Record<string, string>,
    promptTemplate: string,
    headers: string[],
    apiKey: string,
    model: string,
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
    setProcessedRowCount: (count: number | ((prev: number) => number)) => void,
    retries = 2
): Promise<Record<string, string>> => {
    let prompt = promptTemplate;
    headers.forEach(header => {
        const regex = new RegExp(`{{${header}}}`, 'g');
        const value = row[header] !== undefined && row[header] !== null ? row[header] : '';
        prompt = prompt.replace(regex, value);
    });

    for (let i = 0; i <= retries; i++) {
        try {
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
                    messages: [{ role: "user", content: prompt }],
                    ...(isTemperatureEnabled && { temperature: temperature }),
                    ...(isMaxTokensEnabled && { max_tokens: maxTokens }),
                    ...(isTopPEnabled && { top_p: topP }),
                    ...(isTopKEnabled && { top_k: topK }),
                    ...(isFrequencyPenaltyEnabled && { frequency_penalty: frequencyPenalty }),
                    ...(isPresencePenaltyEnabled && { presence_penalty: presencePenalty }),
                    ...getReasoningParams(reasoningState),
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API request failed for a row.`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || "No content returned.";

            setProcessedRowCount(prev => prev + 1);
            return { ...row, 'api_response': content };

        } catch (error) {
            if (i === retries) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                setProcessedRowCount(prev => prev + 1);
                return { ...row, 'api_response': `Error: ${errorMessage}` };
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second wait
        }
    }
    // This part should not be reachable
    setProcessedRowCount(prev => prev + 1);
    return { ...row, 'api_response': 'Error: Max retries reached, but no result was returned.' };
};

export const handleProcessAllRows = async (
    apiKey: string,
    model: string,
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
    setProcessedRowCount: (count: number | ((prev: number) => number)) => void,
    setIsProcessingAllRows: (processing: boolean) => void,
    setProcessedResults: (results: Record<string, string>[]) => void
) => {
    if (!apiKey || !model || !promptTemplate) {
        alert("Please provide an API Key, model, and a prompt template first.");
        return;
    }

    setIsProcessingAllRows(true);
    setProcessedResults([]);
    await idbSet('processedResults', []); // Clear previous results

    const promises = csvData.rows.map(row =>
        processRowWithRetry(row, promptTemplate, csvData.headers, apiKey, model, temperature, maxTokens, topP, topK, frequencyPenalty, presencePenalty, isTemperatureEnabled, isMaxTokensEnabled, isTopPEnabled, isTopKEnabled, isFrequencyPenaltyEnabled, isPresencePenaltyEnabled, reasoningState, setProcessedRowCount)
    );

    try {
        const results = await Promise.all(promises);
        setProcessedResults(results);
        await idbSet('processedResults', results);
    } catch (error) {
        console.error("An error occurred during parallel processing:", error);
    } finally {
        setIsProcessingAllRows(false);
    }
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
