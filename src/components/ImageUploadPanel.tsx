import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Panel from '@/components/Panel';
import { UploadIcon } from '@/components/icons';
import { useStore } from '@/state/store';

const ImageUploadPanel: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { imageTasks, addImageTasks, removeImageTask } = useStore();
  const hasRunningTask = imageTasks.some((task) => task.loading);

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Unable to read image.'));
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
      response: '',
      loading: false,
    })));
    addImageTasks(tasks);
  };

  return (
    <Panel title={t('image_input')}>
      <div className="p-4 space-y-4">
        <div
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void handleFiles(event.dataTransfer.files);
          }}
          onClick={() => !hasRunningTask && fileInputRef.current?.click()}
          className={`flex min-h-40 flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors ${hasRunningTask ? 'cursor-not-allowed border-gray-700 opacity-60' : 'cursor-pointer'} ${isDragging ? 'border-teal-400 bg-gray-700' : 'border-gray-600 hover:border-teal-500'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={hasRunningTask}
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void handleFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <UploadIcon className="mb-2 h-12 w-12 text-gray-500" />
          <p className="text-gray-300">{t('upload_images')}</p>
          <p className="text-sm text-gray-500">{t('multiple_images_help')}</p>
        </div>

        {imageTasks.length === 0 ? (
          <p className="text-center text-sm text-gray-500">{t('no_images_uploaded')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {imageTasks.map((task, index) => (
              <article key={task.id} aria-label={task.name} className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                <img src={task.dataUrl} alt={task.name} className="h-40 w-full rounded-md bg-gray-950 object-contain" />
                <p className="mt-2 truncate text-sm text-gray-400" title={task.name}>
                  {index + 1}. {task.name}
                </p>
                <button
                  onClick={() => removeImageTask(task.id)}
                  disabled={hasRunningTask}
                  className="mt-2 text-xs text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('remove_image')}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
};

export default ImageUploadPanel;
