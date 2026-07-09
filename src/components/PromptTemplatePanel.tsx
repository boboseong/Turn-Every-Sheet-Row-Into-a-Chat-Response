
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/state/store';
import { MISSING_ROW_MESSAGE, MISSING_TEMPLATE_MESSAGE, renderPromptTemplate } from '@/utils/prompt';
import Panel from '@/components/Panel';
import { useMemo } from 'react';

const PromptTemplatePanel: React.FC = () => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { csvData, promptTemplate, setPromptTemplate, selectedRowIndex } = useStore();
  const headers = csvData.headers;
  const disabled = headers.length === 0;

  const generatedPrompt = useMemo(
    () => renderPromptTemplate(csvData, selectedRowIndex, promptTemplate),
    [csvData, selectedRowIndex, promptTemplate],
  );

  const isInstructionalText = generatedPrompt === MISSING_ROW_MESSAGE || generatedPrompt === MISSING_TEMPLATE_MESSAGE;

  const handleTagClick = (header: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const tag = `{{${header}}}`;
    const { selectionStart, selectionEnd, value } = textarea;

    const newValue = value.substring(0, selectionStart) + tag + value.substring(selectionEnd);
    setPromptTemplate(newValue);

    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = selectionStart + tag.length;
    }, 0);
  };

  return (
    <Panel title={t('prompt_template')}>
      <div className="p-4 flex flex-col flex-grow overflow-hidden">
        <div className="mb-3">
          <p className={`text-sm ${disabled ? 'text-gray-500' : 'text-gray-400'}`}>
            {disabled ? t('no_file_uploaded') : t('insert_header')}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {headers.map(header => (
              <button
                key={header}
                onClick={() => handleTagClick(header)}
                className="bg-gray-600 hover:bg-teal-600 text-gray-200 font-mono text-sm py-1 px-3 rounded-full transition-colors"
              >
                {`{{${header}}}`}
              </button>
            ))}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          placeholder={t('enter_prompt_template')}
          disabled={disabled}
          className="flex-grow w-full p-3 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none text-gray-200 placeholder-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed h-64"
        />
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('generated_prompt')}</label>
          <pre className="p-3 bg-gray-900 border border-gray-700 rounded-md font-sans text-base whitespace-pre-wrap break-words h-64 overflow-auto text-gray-400">
            {isInstructionalText ? t('no_prompt_template') : generatedPrompt}
          </pre>
        </div>
      </div>
    </Panel>
  );
};

export default PromptTemplatePanel;
