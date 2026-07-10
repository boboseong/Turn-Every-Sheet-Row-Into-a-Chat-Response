import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Panel from '@/components/Panel';
import { PlayIcon, SpinnerIcon } from '@/components/icons';
import {
  batchSnapshotsEqual,
  BatchApiSettings,
  createBatchRequestSnapshot,
  handleProcessAllImages,
} from '@/services/api';
import { useStore } from '@/state/store';

const ImageActionPanel: React.FC = () => {
  const { t } = useTranslation();
  const batchControllerRef = useRef<AbortController | null>(null);
  const {
    imageTasks,
    imagePrompt,
    apiKey,
    apiLoading,
    model,
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
    concurrencyLimit,
    batchStatuses,
    batchSnapshots,
    activeBatchMode,
    setBatchStatus,
    setBatchSnapshot,
    resetImageTaskResponses,
    setImageTaskLoading,
    setImageTaskResponse,
  } = useStore();

  const settings: BatchApiSettings = {
    apiKey,
    model,
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
  };
  const currentSnapshot = createBatchRequestSnapshot(imagePrompt, settings);
  const batchStatus = batchStatuses.image;
  const isBatchActive = batchStatus === 'running' || batchStatus === 'stopping';
  const isStopping = batchStatus === 'stopping';
  const completedCount = imageTasks.filter((task) => Boolean(task.response)).length;
  const progress = imageTasks.length > 0 ? (completedCount / imageTasks.length) * 100 : 0;
  const canResume = batchStatus === 'stopped'
    && batchSnapshotsEqual(batchSnapshots.image, currentSnapshot);
  const disabled = useMemo(
    () => apiLoading || !apiKey || !model || !imagePrompt.trim() || imageTasks.length === 0 || activeBatchMode !== null,
    [activeBatchMode, apiKey, apiLoading, imagePrompt, imageTasks.length, model],
  );

  const runBatch = async (resume: boolean) => {
    if (batchControllerRef.current || isBatchActive || activeBatchMode !== null || disabled || (resume && !canResume)) return;

    const controller = new AbortController();
    batchControllerRef.current = controller;
    if (!resume) {
      resetImageTaskResponses();
      setBatchSnapshot('image', currentSnapshot);
    }
    setBatchStatus('image', 'running');

    try {
      await handleProcessAllImages({
        tasks: imageTasks,
        prompt: imagePrompt,
        settings,
        concurrencyLimit,
        stopSignal: controller.signal,
        resume,
        setImageTaskLoading,
        setImageTaskResponse,
      });
      const hasPendingTasks = useStore.getState().imageTasks.some((task) => !task.response);
      setBatchStatus('image', controller.signal.aborted && hasPendingTasks ? 'stopped' : 'completed');
    } catch (error) {
      console.error('An error occurred during image batch processing:', error);
      const hasPendingTasks = useStore.getState().imageTasks.some((task) => !task.response);
      setBatchStatus('image', hasPendingTasks ? 'stopped' : 'completed');
    } finally {
      batchControllerRef.current = null;
    }
  };

  const stopBatch = () => {
    if (batchStatus !== 'running') return;
    setBatchStatus('image', 'stopping');
    batchControllerRef.current?.abort();
  };

  return (
    <Panel title={t('batch_processing')}>
      <div className="space-y-4 p-4 text-center">
        <p className="text-gray-400">{t('image_batch_summary', { count: imageTasks.length })}</p>
        {(isBatchActive || batchStatus === 'stopped') && (
          <div>
            <div className="w-full rounded-full bg-gray-700">
              <div className="h-5 rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-sm text-gray-300">
              {completedCount} / {imageTasks.length} {t('processed')}
            </p>
          </div>
        )}
        {batchStatus === 'stopped' && !canResume && (
          <p role="status" className="text-sm text-amber-300">{t('resume_settings_changed')}</p>
        )}
        <div className="flex flex-wrap justify-center gap-4">
          {batchStatus === 'running' && (
            <button
              onClick={stopBatch}
              aria-busy="true"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-6 py-2 text-white hover:bg-red-700"
            >
              {t('stop_processing')}
            </button>
          )}
          {isStopping && (
            <button disabled aria-busy="true" className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-600 px-6 py-2 text-white cursor-not-allowed">
              <SpinnerIcon className="h-5 w-5 animate-spin" />
              {t('stopping_processing')}
            </button>
          )}
          {batchStatus === 'stopped' && (
            <>
              <button
                onClick={() => void runBatch(true)}
                disabled={!canResume}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <PlayIcon className="h-5 w-5" />
                {t('resume_processing')}
              </button>
              <button
                onClick={() => void runBatch(false)}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <PlayIcon className="h-5 w-5" />
                {t('restart_all_processing')}
              </button>
            </>
          )}
          {(batchStatus === 'idle' || batchStatus === 'completed') && (
            <button
              onClick={() => void runBatch(false)}
              disabled={disabled}
              aria-busy="false"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-5 w-5" />
              {t('start_processing')}
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
};

export default ImageActionPanel;
