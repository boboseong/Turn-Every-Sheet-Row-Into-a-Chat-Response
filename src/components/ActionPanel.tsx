import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/state/store';
import { PlayIcon, DownloadIcon, SpinnerIcon } from '@/components/icons';
import { handleProcessAllRows } from '@/services/api';
import * as XLSX from 'xlsx';

const ActionPanel: React.FC = () => {
    const { t } = useTranslation();
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);
    const {
            apiKey,
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
            setProcessedRowCount,
            setIsProcessingAllRows,
            setProcessedResults,
            processedRowCount,
            processedResults,
            isProcessingAllRows,
    } = useStore();
    const csvRowCount = csvData.rows.length;
    const isDownloadReady = processedResults.length > 0;
    const progress = csvRowCount > 0 ? (processedRowCount / csvRowCount) * 100 : 0;

    const onProcessAllClick = () => {
        setProcessedRowCount(0)
        handleProcessAllRows(
            apiKey,
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
            setProcessedRowCount,
            setIsProcessingAllRows,
            setProcessedResults
        );

    };

    const handleDownload = (format: 'csv' | 'xlsx') => {
        if (processedResults.length === 0) {
            alert("No results to download.");
            return;
        }
        const resultsToDownload = processedResults;
        const headers = [...csvData.headers, 'api_response'];
        const data = resultsToDownload.map((row: Record<string, string>) => {
            const newRow: Record<string, any> = {};
            headers.forEach(header => {
                newRow[header] = row[header] || '';
            });
            return newRow;
        });

        if (format === 'csv') {
            const csvContent = [
                headers.join(','),
                ...data.map(row =>
                    headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
                )
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "processed_results.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
            const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([xlsxBuffer], { type: 'application/octet-stream' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "processed_results.xlsx");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
        setIsDownloadOpen(false);
    };

    const disabled = useMemo(() => {
        return !apiKey || !model || !promptTemplate || csvData.rows.length === 0;
    }, [apiKey, model, promptTemplate, csvData.rows.length]);

    return (
        <div className="bg-gray-800 rounded-lg shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-teal-400">{t('batch_processing')}</h2>
            </div>
            <div className="p-4 space-y-4 text-center">
                <p className="text-gray-400">
                    {t('processing_all_rows')} <strong>{csvRowCount}</strong> {t('total_rows')}.
                </p>
                {isProcessingAllRows && (
                    <div>
                        <div className="w-full bg-gray-700 rounded-full">
                            <div className="bg-teal-500 h-5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{processedRowCount} / {csvRowCount} {t('processed')}</p>
                    </div>
                )}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onProcessAllClick}
                        disabled={disabled || isProcessingAllRows}
                        className="inline-flex items-center gap-2 justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
                    >
                        {isProcessingAllRows ? (
                            <>
                                <SpinnerIcon className="w-5 h-5 animate-spin" />
                                <span>{t('processing_all_rows')}</span>
                            </>
                        ) : (
                            <>
                                <PlayIcon className="w-5 h-5" />
                                <span>{t('start_processing')}</span>
                            </>
                        )}
                    </button>
                    <div className="relative inline-block text-left">
                        <button
                            onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                            disabled={!isDownloadReady || isProcessingAllRows}
                            className="inline-flex items-center gap-2 justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            <span>{t('download_results')}</span>
                        </button>
                        {isDownloadOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5">
                                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                    <button
                                        onClick={() => handleDownload('csv')}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                                        role="menuitem"
                                    >
                                        {t('download_results')} as CSV
                                    </button>
                                    <button
                                        onClick={() => handleDownload('xlsx')}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                                        role="menuitem"
                                    >
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
