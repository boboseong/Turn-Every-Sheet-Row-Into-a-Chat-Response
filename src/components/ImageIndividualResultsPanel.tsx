import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Panel from '@/components/Panel';
import { SpinnerIcon } from '@/components/icons';
import ImageResultModal from '@/components/ImageResultModal';
import { useStore } from '@/state/store';

const ImageIndividualResultsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { imageTasks } = useStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <Panel title={t('individual_results')}>
      <div className="p-4">
        {imageTasks.length > 0 ? (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {imageTasks.map((task, index) => (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                aria-label={t('image_result_button', { index: index + 1, name: task.name })}
                className={`flex min-h-10 items-center justify-center rounded p-2 ${
                  task.response
                    ? 'bg-teal-500 hover:bg-teal-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {task.loading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : index + 1}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">{t('no_data_to_display')}</p>
        )}
      </div>
      {selectedTaskId && (
        <ImageResultModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </Panel>
  );
};

export default ImageIndividualResultsPanel;
