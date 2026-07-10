
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/state/store';
import { SendIcon, SpinnerIcon, SettingsIcon } from '@/components/icons';
import EstimateCostPanel from '@/components/EstimateCostPanel';
import { handleTestApi } from '@/services/api';
import AdvancedSettingsModal from './ApiPanel/AdvancedSettingsModal';
import { applyPromptTemplate } from '@/utils/promptTemplate';

const ApiPanel: React.FC = () => {
    const { t } = useTranslation();
    const {
        apiKey,
        setApiKey,
        model,
        setModel,
        apiResponse,
        apiLoading,
        csvData,
        workMode,
        imageTasks,
        imagePrompt,
        selectedRowIndex,
        promptTemplate,
        temperature,
        maxTokens,
        topP,
        topK,
        frequencyPenalty,
        presencePenalty,
        isTemperatureEnabled,
        isMaxTokensEnabled,
        isTopPEnabled,
        isTopKEnabled,
        isFrequencyPenaltyEnabled,
        isPresencePenaltyEnabled,
        reasoningState,
        setApiLoading,
        setApiResponse,
        setLastApiCost,
        setEstimatedTotalCost,
        setCostEstimateStatus,
        isAdvancedSettingsOpen,
        setIsAdvancedSettingsOpen,
    } = useStore();
    const inputStyles = "w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none text-gray-200 placeholder-gray-500";

    const generatedPrompt = useMemo(() => {
        if (workMode === 'image') {
            return imagePrompt;
        }
        if (selectedRowIndex === null || !csvData.rows[selectedRowIndex]) {
            return 'To get started, please select a data row from the Sheet Upload Panel.';
        }
        if (!promptTemplate) {
            return 'Now, please enter a prompt template in the PromptTemplatePanel.';
        }

        return applyPromptTemplate(promptTemplate, csvData.rows[selectedRowIndex], csvData.headers);
    }, [workMode, imagePrompt, selectedRowIndex, promptTemplate, csvData]);

    const isTestDisabled = apiLoading
        || !apiKey
        || !model
        || (workMode === 'image' && (!imagePrompt.trim() || imageTasks.length === 0));

    const onTestApiClick = () => {
        handleTestApi(
            apiKey,
            model,
            generatedPrompt,
            promptTemplate,
            csvData,
            temperature,
            maxTokens,
            topP,
            topK,
            frequencyPenalty,
            presencePenalty,
            isTemperatureEnabled,
            isMaxTokensEnabled,
            isTopPEnabled,
            isTopKEnabled,
            isFrequencyPenaltyEnabled,
            isPresencePenaltyEnabled,
            reasoningState,
            setApiLoading,
            setApiResponse,
            setLastApiCost,
            setEstimatedTotalCost,
            setCostEstimateStatus,
            workMode === 'image' ? imageTasks[0]?.dataUrl : undefined,
            workMode === 'image' ? imageTasks.length : csvData.rows.length,
        );
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-teal-400">{t('api_settings')}</h2>
            </div>
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">
                            {t('api_key')}
                        </label>
                        <input
                            type="password"
                            id="apiKey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className={inputStyles}
                            placeholder={t('enter_api_key')}
                        />
                    </div>
                    <div>
                        <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-1">
                            {t('model')}
                        </label>
                        <input
                            type="text"
                            id="model"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className={inputStyles}
                            placeholder={t('enter_model_name')}
                        />
                    </div>
                </div>

                <div className="text-center space-x-2">
                    <button
                        onClick={() => setIsAdvancedSettingsOpen(true)}
                        className="inline-flex items-center gap-2 justify-center px-4 py-2 border border-gray-600 text-base font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 transition-colors"
                    >
                        <SettingsIcon className="w-5 h-5" />
                        <span>{t('advanced_settings')}</span>
                    </button>
                    <button
                        onClick={onTestApiClick}
                        disabled={isTestDisabled}
                        className="inline-flex items-center gap-2 justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 transition-colors"
                    >
                        {apiLoading ? (
                            <>
                                <SpinnerIcon className="w-5 h-5 animate-spin" />
                                <span>{t('processing_all_rows')}</span>
                            </>
                        ) : (
                            <>
                                <SendIcon className="w-5 h-5" />
                                <span>{t('test_prompt')}</span>
                            </>
                        )}
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('api_response')}</label>
                    <div className="p-3 bg-gray-900 border border-gray-700 rounded-md min-h-[120px] text-gray-200">
                        {apiLoading ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <SpinnerIcon className="w-6 h-6 animate-spin mr-2"/>
                                {t('processing_all_rows')}
                            </div>
                        ) : (
                            <pre className="whitespace-pre-wrap break-words font-sans text-base">
                                {apiResponse || <span className="text-gray-500">{t('api_response')}</span>}
                            </pre>
                        )}
                    </div>
                </div>

                <EstimateCostPanel itemCount={workMode === 'image' ? imageTasks.length : csvData.rows.length} />
            </div>
            <AdvancedSettingsModal />
        </div>
    );
};

export default ApiPanel;
