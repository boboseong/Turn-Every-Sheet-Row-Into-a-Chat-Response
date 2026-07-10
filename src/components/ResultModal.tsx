import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/state/store';
import { callApi } from '@/services/api';
import { applyPromptTemplate } from '@/utils/promptTemplate';
import { formatOrdinal } from '@/utils/ordinal';

interface ResultModalProps {
  rowIndex: number;
  onClose: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ rowIndex, onClose }) => {
  const { t, i18n } = useTranslation();
  const {
    csvData,
    promptTemplate,
    apiKey,
    model,
    individualResponses,
    setIndividualResponse,
  } = useStore();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const row = csvData.rows[rowIndex];
  const response = individualResponses[rowIndex] || '';

  useEffect(() => {
    setPrompt(applyPromptTemplate(promptTemplate, row, csvData.headers));
  }, [csvData, promptTemplate, row]);

  const handleGetResponse = async () => {
    setIsLoading(true);
    try {
      const apiResponse = await callApi({
        apiKey,
        apiProvider: model,
        prompt,
        maxTokens: 2048,
        temperature: 0.7,
      });
      setIndividualResponse(rowIndex, apiResponse);
    } catch (error) {
      console.error(error);
      alert(t('request_failed', {
        message: error instanceof Error ? error.message : t('unknown_error'),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="row-result-modal-title"
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 id="row-result-modal-title" className="text-xl font-bold">
            {t('row_modal_title', { ordinal: formatOrdinal(rowIndex + 1, i18n.language) })}
          </h2>
          <button onClick={onClose} aria-label={t('close')} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="p-4 flex-grow overflow-auto">
          <div className="mb-4 p-2 bg-gray-900 rounded">
            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(row, null, 2)}</pre>
          </div>
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-2">{t('generated_prompt')}</h3>
              <div className="flex-grow p-2 bg-gray-900 rounded overflow-auto">
                <pre className="whitespace-pre-wrap text-sm">{prompt}</pre>
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-2">{t('ai_response')}</h3>
              <div className="flex-grow p-2 bg-gray-900 rounded overflow-auto">
                {isLoading
                  ? <p>{t('getting_response')}</p>
                  : <pre className="whitespace-pre-wrap text-sm">{response || t('response_placeholder')}</pre>}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-center">
          <button
            onClick={handleGetResponse}
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded"
            disabled={isLoading}
          >
            {isLoading ? t('getting_response') : t('get_response')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
