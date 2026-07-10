import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/state/store';
import ToggleSwitch from '../ToggleSwitch';
import { ReasoningState } from '@/types';

const AdvancedSettingsModal: React.FC = () => {
    const { t } = useTranslation();
    const {
        temperature,
        setTemperature,
        maxTokens,
        setMaxTokens,
        topP,
        setTopP,
        topK,
        setTopK,
        frequencyPenalty,
        setFrequencyPenalty,
        presencePenalty,
        setPresencePenalty,
        isTemperatureEnabled,
        setIsTemperatureEnabled,
        isMaxTokensEnabled,
        setIsMaxTokensEnabled,
        isTopPEnabled,
        setIsTopPEnabled,
        isTopKEnabled,
        setIsTopKEnabled,
        isFrequencyPenaltyEnabled,
        setIsFrequencyPenaltyEnabled,
        isPresencePenaltyEnabled,
        setIsPresencePenaltyEnabled,
        reasoningState,
        setReasoningState,
        isAdvancedSettingsOpen,
        setIsAdvancedSettingsOpen,
        concurrencyLimit,
        setConcurrencyLimit,
        activeBatchMode,
    } = useStore();
    const inputStyles = "w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none text-gray-200 placeholder-gray-500";

    if (!isAdvancedSettingsOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-gray-800 shadow-2xl">
                <div className="flex shrink-0 justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-teal-400">{t('advanced_settings')}</h3>
                    <button onClick={() => setIsAdvancedSettingsOpen(false)} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <fieldset disabled={activeBatchMode !== null} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 disabled:opacity-60">
                    <div>
                        <label htmlFor="concurrencyLimit" className="block text-sm font-medium text-gray-300">
                            {t('concurrency_limit')} (1-20)
                        </label>
                        <input
                            type="number"
                            id="concurrencyLimit"
                            value={concurrencyLimit}
                            onChange={(event) => setConcurrencyLimit(Number(event.target.value))}
                            className={`${inputStyles} mt-2`}
                            min="1"
                            max="20"
                            step="1"
                        />
                        <p className="mt-1 text-xs text-gray-400">{t('concurrency_help')}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="temperature" className="block text-sm font-medium text-gray-300">
                            {t('temperature')} (0-2)
                        </label>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-400 mr-2">{t('default')}</span>
                            <ToggleSwitch enabled={isTemperatureEnabled} onChange={setIsTemperatureEnabled} />
                            <span className="text-sm text-gray-400 ml-2">{t('custom')}</span>
                        </div>
                    </div>
                    <input
                        type="number"
                        id="temperature"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className={`${inputStyles} ${!isTemperatureEnabled && 'opacity-50'}`}
                        min="0" max="2" step="0.1" placeholder="e.g., 0.7"
                        disabled={!isTemperatureEnabled}
                    />

                    <div className="flex items-center justify-between pt-2">
                        <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-300">
                            {t('max_tokens')}
                        </label>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-400 mr-2">{t('default')}</span>
                            <ToggleSwitch enabled={isMaxTokensEnabled} onChange={setIsMaxTokensEnabled} />
                            <span className="text-sm text-gray-400 ml-2">{t('custom')}</span>
                        </div>
                    </div>
                    <input
                        type="number"
                        id="maxTokens"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                        className={`${inputStyles} ${!isMaxTokensEnabled && 'opacity-50'}`}
                        min="1" step="1" placeholder="e.g., 8096"
                        disabled={!isMaxTokensEnabled}
                    />

                    <div className="flex items-center justify-between pt-2">
                        <label htmlFor="topP" className="block text-sm font-medium text-gray-300">{t('top_p')} (0-1)</label>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-400 mr-2">{t('default')}</span>
                            <ToggleSwitch enabled={isTopPEnabled} onChange={setIsTopPEnabled} />
                            <span className="text-sm text-gray-400 ml-2">{t('custom')}</span>
                        </div>
                    </div>
                    <input type="number" id="topP" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className={`${inputStyles} ${!isTopPEnabled && 'opacity-50'}`} min="0" max="1" step="0.1" disabled={!isTopPEnabled} />

                    <div className="flex items-center justify-between pt-2">
                        <label htmlFor="topK" className="block text-sm font-medium text-gray-300">{t('top_k')}</label>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-400 mr-2">{t('default')}</span>
                            <ToggleSwitch enabled={isTopKEnabled} onChange={setIsTopKEnabled} />
                            <span className="text-sm text-gray-400 ml-2">{t('custom')}</span>
                        </div>
                    </div>
                    <input type="number" id="topK" value={topK} onChange={(e) => setTopK(parseInt(e.target.value, 10))} className={`${inputStyles} ${!isTopKEnabled && 'opacity-50'}`} min="0" step="1" disabled={!isTopKEnabled} />

                    <div className="flex items-center justify-between pt-2">
                        <label htmlFor="frequencyPenalty" className="block text-sm font-medium text-gray-300">{t('frequency_penalty')} (-2 to 2)</label>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-400 mr-2">{t('default')}</span>
                            <ToggleSwitch enabled={isFrequencyPenaltyEnabled} onChange={setIsFrequencyPenaltyEnabled} />
                            <span className="text-sm text-gray-400 ml-2">{t('custom')}</span>
                        </div>
                    </div>
                    <input type="number" id="frequencyPenalty" value={frequencyPenalty} onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))} className={`${inputStyles} ${!isFrequencyPenaltyEnabled && 'opacity-50'}`} min="-2" max="2" step="0.1" disabled={!isFrequencyPenaltyEnabled} />

                    <div className="flex items-center justify-between pt-2">
                        <label htmlFor="presencePenalty" className="block text-sm font-medium text-gray-300">{t('presence_penalty')} (-2 to 2)</label>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-400 mr-2">{t('default')}</span>
                            <ToggleSwitch enabled={isPresencePenaltyEnabled} onChange={setIsPresencePenaltyEnabled} />
                            <span className="text-sm text-gray-400 ml-2">{t('custom')}</span>
                        </div>
                    </div>
                    <input type="number" id="presencePenalty" value={presencePenalty} onChange={(e) => setPresencePenalty(parseFloat(e.target.value))} className={`${inputStyles} ${!isPresencePenaltyEnabled && 'opacity-50'}`} min="-2" max="2" step="0.1" disabled={!isPresencePenaltyEnabled} />

                    <div className="flex items-center justify-between pt-2">
                        <label htmlFor="reasoning" className="block text-sm font-medium text-gray-300">
                            {t('reasoning')}
                        </label>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min="0"
                            max="2"
                            value={{ off: 0, default: 1, on: 2 }[reasoningState]}
                            onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                const newState: ReasoningState = value === 0 ? 'off' : value === 1 ? 'default' : 'on';
                                setReasoningState(newState);
                            }}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-400 px-1">
                            <span>{t('off')}</span>
                            <span>{t('default')}</span>
                            <span>{t('on')}</span>
                        </div>
                    </div>
                </fieldset>
                <div className="flex shrink-0 justify-end p-4 border-t border-gray-700">
                    <button onClick={() => setIsAdvancedSettingsOpen(false)} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdvancedSettingsModal;
