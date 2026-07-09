import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Panel from '@/components/Panel';
import { SpinnerIcon, UploadIcon } from '@/components/icons';
import { useStore } from '@/state/store';
import { processImagePrompt } from '@/services/api';

const ImagePromptPanel: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const {
    imageTasks,
    addImageTasks,
    removeImageTask,
    updateImageTaskPrompt,
    setImageTaskLoading,
    setImageTaskResponse,
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
  } = useStore();

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read image.'));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read image.'));
    reader.readAsDataURL(file);
  });

  const handleFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert(t('image_only_alert'));
      return;
    }

    const tasks = await Promise.all(imageFiles.map(async (file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      dataUrl: await readFileAsDataUrl(file),
      prompt: '',
      response: '',
      loading: false,
    })));
    addImageTasks(tasks);
  };

  const handleProcess = async (taskId: string) => {
    const task = imageTasks.find((item) => item.id === taskId);
    if (!task) return;
    await processImagePrompt({
      task,
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
  };

  return (
    <Panel title={t('image_workspace')}>
      <div className="p-4 space-y-4">
        <div
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer transition-colors min-h-40 ${isDragging ? 'border-teal-400 bg-gray-700' : 'border-gray-600 hover:border-teal-500'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <UploadIcon className="w-12 h-12 text-gray-500 mb-2" />
          <p className="text-gray-300">{t('upload_images')}</p>
          <p className="text-gray-500 text-sm">{t('multiple_images_help')}</p>
        </div>

        {imageTasks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">{t('no_images_uploaded')}</p>
        ) : (
          <div className="space-y-4">
            {imageTasks.map((task, index) => (
              <div key={task.id} className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                <div>
                  <img src={task.dataUrl} alt={task.name} className="h-44 w-full rounded-md object-contain bg-gray-950" />
                  <p className="mt-2 truncate text-sm text-gray-400" title={task.name}>{index + 1}. {task.name}</p>
                  <button onClick={() => removeImageTask(task.id)} className="mt-2 text-xs text-red-300 hover:text-red-200">{t('remove_image')}</button>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">{t('image_prompt')}</label>
                  <textarea
                    value={task.prompt}
                    onChange={(e) => updateImageTaskPrompt(task.id, e.target.value)}
                    placeholder={t('enter_image_prompt')}
                    className="h-28 w-full resize-none rounded-md border border-gray-600 bg-gray-950 p-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={() => handleProcess(task.id)}
                    disabled={task.loading || !apiKey || !model || !task.prompt.trim()}
                    className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                  >
                    {task.loading && <SpinnerIcon className="h-5 w-5 animate-spin" />}
                    {task.loading ? t('getting_response') : t('process_image')}
                  </button>
                  <div className="min-h-24 rounded-md border border-gray-700 bg-gray-950 p-3 text-gray-200">
                    <pre className="whitespace-pre-wrap break-words font-sans text-base">{task.response || <span className="text-gray-500">{t('api_response')}</span>}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
};

export default ImagePromptPanel;
