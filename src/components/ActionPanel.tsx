import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { useStore } from '@/state/store';
import { DownloadIcon, PlayIcon, SpinnerIcon } from '@/components/icons';
import {
  batchSnapshotsEqual,
  BatchApiSettings,
  createBatchRequestSnapshot,
  handleProcessAllRows,
} from '@/services/api';

const ActionPanel: React.FC = () => {
  const { t } = useTranslation();
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const batchControllerRef = useRef<AbortController | null>(null);
  const {
    apiKey,
    apiLoading,
    model,
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
    concurrencyLimit,
    batchStatuses,
    batchSnapshots,
    activeBatchMode,
    setBatchStatus,
    setBatchSnapshot,
    setProcessedRowCount,
    setProcessedResults,
    setProcessedResultAt,
    processedRowCount,
    processedResults,
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
  const currentSnapshot = createBatchRequestSnapshot(promptTemplate, settings);
  const batchStatus = batchStatuses.sheet;
  const isBatchActive = batchStatus === 'running' || batchStatus === 'stopping';
  const isStopping = batchStatus === 'stopping';
  const canResume = batchStatus === 'stopped'
    && batchSnapshotsEqual(batchSnapshots.sheet, currentSnapshot);
  const csvRowCount = csvData.rows.length;
  const isDownloadReady = processedResults.some((result) => Boolean(result.api_response));
  const progress = csvRowCount > 0 ? (processedRowCount / csvRowCount) * 100 : 0;

  const disabled = useMemo(
    () => apiLoading || !apiKey || !model || !promptTemplate || csvData.rows.length === 0 || activeBatchMode !== null,
    [activeBatchMode, apiKey, apiLoading, csvData.rows.length, model, promptTemplate],
  );

  const runBatch = async (resume: boolean) => {
    if (batchControllerRef.current || isBatchActive || activeBatchMode !== null || disabled || (resume && !canResume)) return;

    const controller = new AbortController();
    batchControllerRef.current = controller;
    if (!resume) setBatchSnapshot('sheet', currentSnapshot);
    setBatchStatus('sheet', 'running');

    try {
      const result = await handleProcessAllRows({
        csvData,
        promptTemplate,
        settings,
        concurrencyLimit,
        stopSignal: controller.signal,
        resume,
        existingResults: processedResults,
        setProcessedRowCount,
        setProcessedResults,
        setProcessedResultAt,
      });
      setBatchStatus('sheet', result.stopped ? 'stopped' : 'completed');
    } catch (error) {
      console.error('An error occurred during sheet batch processing:', error);
      const hasPendingRows = useStore.getState().processedResults.some((result) => !result.api_response);
      setBatchStatus('sheet', hasPendingRows ? 'stopped' : 'completed');
    } finally {
      batchControllerRef.current = null;
    }
  };

  const stopBatch = () => {
    if (batchStatus !== 'running') return;
    setBatchStatus('sheet', 'stopping');
    batchControllerRef.current?.abort();
  };

  const handleDownload = (format: 'csv' | 'xlsx') => {
    if (!isDownloadReady) {
      alert('No results to download.');
      return;
    }
    const headers = [...csvData.headers, 'api_response'];
    const data = processedResults.map((row) => {
      const newRow: Record<string, string> = {};
      headers.forEach((header) => {
        newRow[header] = row[header] ?? '';
      });
      return newRow;
    });

    if (format === 'csv') {
      const csvContent = [
        headers.join(','),
        ...data.map((row) => headers.map((header) => `"${(row[header] ?? '').toString().replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'processed_results.csv';
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
      const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([xlsxBuffer], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'processed_results.xlsx';
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    setIsDownloadOpen(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-2xl">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-teal-400">{t('batch_processing')}</h2>
      </div>
      <div className="p-4 space-y-4 text-center">
        <p className="text-gray-400">
          {t('processing_all_rows')} <strong>{csvRowCount}</strong> {t('total_rows')}.
        </p>
        {(isBatchActive || batchStatus === 'stopped') && (
          <div>
            <div className="w-full bg-gray-700 rounded-full">
              <div className="bg-teal-500 h-5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-gray-300 mt-1">{processedRowCount} / {csvRowCount} {t('processed')}</p>
          </div>
        )}
        {batchStatus === 'stopped' && !canResume && (
          <p role="status" className="text-sm text-amber-300">{t('resume_settings_changed')}</p>
        )}
        <div className="flex flex-wrap justify-center gap-4">
          {batchStatus === 'running' && (
            <button
              onClick={stopBatch}
              className="inline-flex items-center gap-2 justify-center px-6 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              {t('stop_processing')}
            </button>
          )}
          {isStopping && (
            <button disabled className="inline-flex items-center gap-2 justify-center px-6 py-2 rounded-md bg-gray-600 text-white cursor-not-allowed">
              <SpinnerIcon className="w-5 h-5 animate-spin" />
              {t('stopping_processing')}
            </button>
          )}
          {batchStatus === 'stopped' && (
            <>
              <button
                onClick={() => void runBatch(true)}
                disabled={!canResume}
                className="inline-flex items-center gap-2 justify-center px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-5 h-5" />
                {t('resume_processing')}
              </button>
              <button
                onClick={() => void runBatch(false)}
                disabled={disabled}
                className="inline-flex items-center gap-2 justify-center px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-5 h-5" />
                {t('restart_all_processing')}
              </button>
            </>
          )}
          {(batchStatus === 'idle' || batchStatus === 'completed') && (
            <button
              onClick={() => void runBatch(false)}
              disabled={disabled}
              className="inline-flex items-center gap-2 justify-center px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <PlayIcon className="w-5 h-5" />
              {t('start_processing')}
            </button>
          )}
          <div className="relative inline-block text-left">
            <button
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              disabled={!isDownloadReady || isBatchActive}
              className="inline-flex items-center gap-2 justify-center px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="w-5 h-5" />
              {t('download_results')}
            </button>
            {isDownloadOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5">
                <div className="py-1" role="menu">
                  <button onClick={() => handleDownload('csv')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600" role="menuitem">
                    {t('download_results')} as CSV
                  </button>
                  <button onClick={() => handleDownload('xlsx')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600" role="menuitem">
                    {t('download_results')} as XLSX
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
