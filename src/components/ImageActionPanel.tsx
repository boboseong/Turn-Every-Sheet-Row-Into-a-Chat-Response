import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Panel from '@/components/Panel';
import { PlayIcon, SpinnerIcon } from '@/components/icons';
import { processImagePrompt } from '@/services/api';
import { useStore } from '@/state/store';

const ImageActionPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    imageTasks,
    imagePrompt,
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
    setImageTaskLoading,
    setImageTaskResponse,
  } = useStore();

  const hasRunningTask = imageTasks.some((task) => task.loading);
  const completedCount = imageTasks.filter((task) => !task.loading && task.response).length;
  const progress = imageTasks.length > 0 ? (completedCount / imageTasks.length) * 100 : 0;
  const disabled = useMemo(
    () => !apiKey || !model || !imagePrompt.trim() || imageTasks.length === 0,
    [apiKey, imagePrompt, imageTasks.length, model],
  );

  const processTask = (task: typeof imageTasks[number]) => processImagePrompt({
    task,
    prompt: imagePrompt,
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
    setImageTaskLoading,
    setImageTaskResponse,
  });

  const handleProcessAll = async () => {
    if (disabled || hasRunningTask) return;
    await Promise.all(imageTasks.map((task) => processTask(task)));
  };

  return (
    <Panel title={t('batch_processing')}>
      <div className="space-y-4 p-4 text-center">
        <p className="text-gray-400">{t('image_batch_summary', { count: imageTasks.length })}</p>
        {hasRunningTask && (
          <div>
            <div className="w-full rounded-full bg-gray-700">
              <div className="h-5 rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-sm text-gray-300">
              {completedCount} / {imageTasks.length} {t('processed')}
            </p>
          </div>
        )}
        <button
          onClick={handleProcessAll}
          disabled={disabled || hasRunningTask}
          aria-busy={hasRunningTask}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-blue-600 px-6 py-2 text-base font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          {hasRunningTask ? (
            <>
              <SpinnerIcon className="h-5 w-5 animate-spin" />
              <span>{t('processing_all_images')}</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-5 w-5" />
              <span>{t('start_processing')}</span>
            </>
          )}
        </button>
      </div>
    </Panel>
  );
};

export default ImageActionPanel;
