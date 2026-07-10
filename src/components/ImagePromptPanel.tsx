import React from 'react';
import { useTranslation } from 'react-i18next';
import Panel from '@/components/Panel';
import { useStore } from '@/state/store';

const ImagePromptPanel: React.FC = () => {
  const { t } = useTranslation();
  const { imagePrompt, imageTasks, setImagePrompt } = useStore();
  const hasRunningTask = imageTasks.some((task) => task.loading);

  return (
    <Panel title={t('image_prompt_input')}>
      <div className="p-4">
        <label htmlFor="shared-image-prompt" className="block text-sm font-medium text-gray-300">
          {t('image_prompt')}
        </label>
        <textarea
          id="shared-image-prompt"
          value={imagePrompt}
          onChange={(event) => setImagePrompt(event.target.value)}
          disabled={hasRunningTask}
          placeholder={t('enter_image_prompt')}
          className="mt-2 h-28 w-full resize-none rounded-md border border-gray-600 bg-gray-950 p-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </Panel>
  );
};

export default ImagePromptPanel;
