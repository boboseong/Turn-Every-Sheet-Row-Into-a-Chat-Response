import { expect, Page, test } from '@playwright/test';

const redImage = {
  name: 'red.svg',
  mimeType: 'image/svg+xml',
  buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>'),
};

const blueImage = {
  name: 'blue.svg',
  mimeType: 'image/svg+xml',
  buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>'),
};

const redImageDataUrl = `data:${redImage.mimeType};base64,${redImage.buffer.toString('base64')}`;

const openImageMode = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN' }).click();
  await page.getByRole('button', { name: 'Images' }).click();
};

test.describe('Image mode shared prompt', () => {
  test('tests the shared prompt with the first uploaded image', async ({ page }) => {
    const requests: Array<{ prompt: string; imageUrl: string }> = [];

    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      const payload = route.request().postDataJSON();
      const content = payload.messages[0].content;
      requests.push({
        prompt: content.find((item: { type: string }) => item.type === 'text').text,
        imageUrl: content.find((item: { type: string }) => item.type === 'image_url').image_url.url,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: 'First image test response' } }],
          usage: { cost: 0.001 },
        }),
      });
    });

    await openImageMode(page);

    const testButton = page.getByRole('button', { name: 'Test Prompt' });
    await expect(testButton).toBeDisabled();
    await page.locator('input[type="file"][multiple]').setInputFiles([redImage, blueImage]);
    await page.getByLabel('Shared image prompt').fill('Test the first image.');
    await page.getByPlaceholder('Enter your OpenRouter API key').fill('test-api-key');
    await expect(testButton).toBeEnabled();

    await testButton.click();

    await expect(page.getByText('First image test response')).toBeVisible();
    await expect(page.getByTestId('test-api-cost')).toHaveText('$0.001000');
    await expect(page.getByTestId('estimated-total-cost')).toHaveText('$0.001600 - $0.006000');
    expect(requests).toEqual([{ prompt: 'Test the first image.', imageUrl: redImageDataUrl }]);
  });

  test('applies one prompt to every image and keeps responses isolated', async ({ page }) => {
    const requests: Array<{ prompt: string; imageUrl: string }> = [];

    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      const payload = route.request().postDataJSON();
      const content = payload.messages[0].content;
      const prompt = content.find((item: { type: string }) => item.type === 'text').text;
      const imageUrl = content.find((item: { type: string }) => item.type === 'image_url').image_url.url;
      requests.push({ prompt, imageUrl });

      await new Promise((resolve) => setTimeout(resolve, 150));

      if (imageUrl === redImageDataUrl) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ choices: [{ message: { content: 'Red image response' } }] }),
        });
        return;
      }

      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Blue image failed' } }),
      });
    });

    await openImageMode(page);

    await expect(page.locator('main h2')).toHaveText([
      'Image input',
      'Prompt input',
      'API Settings',
      'Batch Processing',
      'Individual Results',
    ]);

    const processButton = page.locator('button[aria-busy]');
    const promptInput = page.getByLabel('Shared image prompt');
    await expect(processButton).toHaveText('Start Processing');
    await expect(processButton).toBeDisabled();
    await expect(page.locator('textarea')).toHaveCount(1);

    await promptInput.fill('Describe this image.');
    await page.locator('input[type="file"][multiple]').setInputFiles([redImage, blueImage]);
    await page.getByPlaceholder('Enter your OpenRouter API key').fill('test-api-key');
    await expect(processButton).toBeEnabled();

    await processButton.click();
    await expect(processButton).toBeDisabled();
    await expect(promptInput).toBeDisabled();

    await page.getByRole('button', { name: 'Image result 1: red.svg' }).click();
    await expect(page.getByRole('dialog', { name: 'Image 1 · red.svg' })).toContainText('Red image response');
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Image result 2: blue.svg' }).click();
    await expect(page.getByRole('dialog', { name: 'Image 2 · blue.svg' })).toContainText('Error: Blue image failed');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(processButton).toBeEnabled();
    await expect(promptInput).toBeEnabled();

    expect(requests).toHaveLength(2);
    expect(requests.map(({ prompt }) => prompt)).toEqual([
      'Describe this image.',
      'Describe this image.',
    ]);
    expect(new Set(requests.map(({ imageUrl }) => imageUrl)).size).toBe(2);
  });

  test('migrates the first legacy image prompt and persists cleaned tasks', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'EN' }).click();

    await page.evaluate(async ({ dataUrl }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('csv-prompt-generator-db', 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('user-data')) {
            request.result.createObjectStore('user-data');
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('user-data', 'readwrite');
        const store = transaction.objectStore('user-data');
        store.put('image', 'workMode');
        store.put([
          {
            id: 'legacy-red',
            name: 'legacy-red.svg',
            dataUrl,
            prompt: 'Use this legacy prompt.',
            response: 'Stored response',
            loading: true,
          },
          {
            id: 'legacy-blue',
            name: 'legacy-blue.svg',
            dataUrl,
            prompt: 'Ignore this later prompt.',
            response: '',
            loading: false,
          },
        ], 'imageTasks');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      database.close();
    }, { dataUrl: redImageDataUrl });

    await page.reload();

    await expect(page.getByLabel('Shared image prompt')).toHaveValue('Use this legacy prompt.');
    await page.getByRole('button', { name: 'Image result 1: legacy-red.svg' }).click();
    await expect(page.getByRole('dialog', { name: 'Image 1 · legacy-red.svg' })).toContainText('Stored response');

    const storedTasks = await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('csv-prompt-generator-db', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const tasks = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        const request = database.transaction('user-data').objectStore('user-data').get('imageTasks');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      database.close();
      return tasks;
    });

    expect(storedTasks).toHaveLength(2);
    expect(storedTasks.every((task) => !('prompt' in task))).toBe(true);
    expect(storedTasks.every((task) => task.loading === false)).toBe(true);
  });
});
