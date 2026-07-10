
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SheetUploadPanel from '@/components/SheetUploadPanel';
import PromptTemplatePanel from '@/components/PromptTemplatePanel';
import ApiPanel from '@/components/ApiPanel';
import ActionPanel from '@/components/ActionPanel';
import IndividualResultsPanel from '@/components/IndividualResultsPanel';
import ImageUploadPanel from '@/components/ImageUploadPanel';
import ImagePromptPanel from '@/components/ImagePromptPanel';
import ImageActionPanel from '@/components/ImageActionPanel';
import ImageIndividualResultsPanel from '@/components/ImageIndividualResultsPanel';
import { useStore } from '@/state/store';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { loadInitialData, clearAllData, workMode, setWorkMode, activeBatchMode } = useStore();
  const isBatchLocked = activeBatchMode !== null;

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleClearAndRefresh = async () => {
    if (window.confirm('Are you sure you want to clear all data and refresh? This action cannot be undone.')) {
      await clearAllData();
      location.reload();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
      <header className="p-4 shrink-0 border-b border-gray-700/50">
        <div className="flex justify-between items-center relative">
          <div>
            <button onClick={() => i18n.changeLanguage('en')} className={`mr-2 ${i18n.language === 'en' ? 'text-teal-400' : ''}`}>EN</button>
            <button onClick={() => i18n.changeLanguage('ko')} className={`${i18n.language === 'ko' ? 'text-teal-400' : ''}`}>KO</button>
          </div>
          <h1 className="text-3xl font-bold text-center text-teal-400">{t('title')}</h1>
          <button
            onClick={handleClearAndRefresh}
            disabled={isBatchLocked}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded transition-colors text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('clear_all_data')}
          </button>
        </div>
        <p className="text-center text-gray-400 mt-1">{t('guide_text')}</p>
        <div className="mt-3 flex justify-center gap-2" role="group" aria-label={t('work_mode')}>
          <button
            onClick={() => setWorkMode('sheet')}
            disabled={isBatchLocked}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${workMode === 'sheet' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {t('sheet_mode')}
          </button>
          <button
            onClick={() => setWorkMode('image')}
            disabled={isBatchLocked}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${workMode === 'image' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {t('image_mode')}
          </button>
        </div>
      </header>
       <div className="flex-1 overflow-y-auto p-4">
        <main className="max-w-screen-xl mx-auto w-full space-y-4">
          {workMode === 'sheet' ? (
            <>
              <SheetUploadPanel />
              <PromptTemplatePanel />
            </>
          ) : (
            <>
              <ImageUploadPanel />
              <ImagePromptPanel />
            </>
          )}
          <ApiPanel />
          {workMode === 'sheet' ? <ActionPanel /> : <ImageActionPanel />}
          {workMode === 'sheet' ? <IndividualResultsPanel /> : <ImageIndividualResultsPanel />}
        </main>
      </div>
    </div>
  );
};

export default App;
