import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/state/store';

interface ImageResultModalProps {
  taskId: string;
  onClose: () => void;
}

const ImageResultModal: React.FC<ImageResultModalProps> = ({ taskId, onClose }) => {
  const { t } = useTranslation();
  const { imageTasks, imagePrompt } = useStore();
  const taskIndex = imageTasks.findIndex((task) => task.id === taskId);
  const task = imageTasks[taskIndex];

  if (!task) return null;

  const title = t('image_modal_title', { index: taskIndex + 1, name: task.name });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-result-modal-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-gray-800 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          <h2 id="image-result-modal-title" className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label={t('close')} className="text-2xl leading-none text-gray-400 hover:text-white">
            &times;
          </button>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-4 md:grid-cols-2">
          <div className="space-y-4">
            <img src={task.dataUrl} alt={task.name} className="h-64 w-full rounded-md bg-gray-950 object-contain" />
            <div>
              <h3 className="mb-2 text-lg font-semibold">{t('generated_prompt')}</h3>
              <pre className="min-h-24 whitespace-pre-wrap break-words rounded-md bg-gray-900 p-3 font-sans text-sm text-gray-200">
                {imagePrompt}
              </pre>
            </div>
          </div>
          <div className="flex min-h-64 flex-col">
            <h3 className="mb-2 text-lg font-semibold">{t('ai_response')}</h3>
            <pre className="flex-1 whitespace-pre-wrap break-words rounded-md bg-gray-900 p-3 font-sans text-sm text-gray-200">
              {task.loading ? t('getting_response') : task.response || t('api_response')}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageResultModal;
