import { expect, Page, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const makeImage = (name: string, color: string) => ({
  name,
  mimeType: 'image/svg+xml',
  buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="${color}"/></svg>`),
});

const toDataUrl = (image: ReturnType<typeof makeImage>) =>
  `data:${image.mimeType};base64,${image.buffer.toString('base64')}`;

const openEnglishApp = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN' }).click();
};

const setConcurrency = async (page: Page, value: number) => {
  await page.getByRole('button', { name: 'Advanced Settings' }).click();
  await page.getByLabel('Concurrent requests').fill(String(value));
  await page.getByRole('button', { name: 'Close' }).click();
};

const uploadSheet = async (page: Page, rowCount: number) => {
  const rows = Array.from({ length: rowCount }, (_, index) => `${index + 1},Name ${index + 1}`);
  await page.locator('input[type="file"][accept*=".csv"]').setInputFiles({
    name: 'batch.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`id,name\n${rows.join('\n')}`),
  });
  await page.getByPlaceholder("What's the weather in {{location}} on {{date}}?").fill('Describe {{id}} {{name}}');
  await page.getByPlaceholder('Enter your OpenRouter API key').fill('test-api-key');
};

const openImageMode = async (page: Page) => {
  await openEnglishApp(page);
  await page.getByRole('button', { name: 'Images' }).click();
};

test.describe('Batch concurrency controls', () => {
  test('persists and clamps the concurrency setting', async ({ page }) => {
    await openEnglishApp(page);
    await page.getByRole('button', { name: 'Advanced Settings' }).click();
    const input = page.getByLabel('Concurrent requests');
    await expect(input).toHaveValue('5');
    await expect(input).toHaveAttribute('min', '1');
    await expect(input).toHaveAttribute('max', '20');

    await input.fill('99');
    await expect(input).toHaveValue('20');
    await input.fill('0');
    await expect(input).toHaveValue('1');
    await input.fill('7');
    await page.getByRole('button', { name: 'Close' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'EN' }).click();
    await page.getByRole('button', { name: 'Advanced Settings' }).click();
    await expect(page.getByLabel('Concurrent requests')).toHaveValue('7');
  });

  test('limits both sheet and image requests to the configured concurrency', async ({ page }) => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    let requestCount = 0;

    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      activeRequests += 1;
      requestCount += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 120));
      activeRequests -= 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: `Response ${requestCount}` } }] }),
      });
    });

    await openEnglishApp(page);
    await uploadSheet(page, 6);
    await setConcurrency(page, 2);
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.getByRole('button', { name: 'Download Results' })).toBeEnabled();
    expect(requestCount).toBe(6);
    expect(maximumActiveRequests).toBeLessThanOrEqual(2);

    activeRequests = 0;
    maximumActiveRequests = 0;
    requestCount = 0;
    await page.getByRole('button', { name: 'Images' }).click();
    const images = Array.from({ length: 6 }, (_, index) => makeImage(`image-${index + 1}.svg`, ['red', 'blue', 'green', 'yellow', 'black', 'white'][index]));
    await page.locator('input[type="file"][multiple]').setInputFiles(images);
    await page.getByLabel('Shared image prompt').fill('Describe this image.');
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect.poll(() => requestCount).toBe(6);
    await expect(page.locator('button[aria-busy]')).toHaveText('Start Processing');
    expect(maximumActiveRequests).toBeLessThanOrEqual(2);
  });

  test('stops queued sheet work, preserves a partial download, and resumes only incomplete rows', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      requestCount += 1;
      const payload = route.request().postDataJSON();
      await new Promise((resolve) => setTimeout(resolve, requestCount <= 2 ? 450 : 30));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: `Result for ${payload.messages[0].content}` } }] }),
      });
    });

    await openEnglishApp(page);
    await uploadSheet(page, 6);
    await setConcurrency(page, 2);
    const promptInput = page.getByPlaceholder("What's the weather in {{location}} on {{date}}?");
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect.poll(() => requestCount).toBe(2);
    await expect(page.getByRole('button', { name: 'Images' })).toBeDisabled();
    await expect(page.getByPlaceholder('Enter your OpenRouter API key')).toBeDisabled();
    await expect(promptInput).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Advanced Settings' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Test Prompt' })).toBeDisabled();

    await page.getByRole('button', { name: 'Stop Processing' }).click();
    await expect(page.getByRole('button', { name: 'Resume Incomplete' })).toBeVisible();
    expect(requestCount).toBe(2);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Results' }).click();
    await page.getByRole('menuitem', { name: 'Download Results as CSV' }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const csv = await readFile(downloadPath!, 'utf8');
    const lines = csv.trimEnd().split('\n');
    expect(lines).toHaveLength(7);
    expect(lines.slice(3).every((line) => line.endsWith(',""'))).toBe(true);

    await page.reload();
    await page.getByRole('button', { name: 'EN' }).click();
    const resumeButton = page.getByRole('button', { name: 'Resume Incomplete' });
    await expect(resumeButton).toBeEnabled();
    await page.getByPlaceholder('Enter your OpenRouter API key').fill('replacement-test-key');
    await setConcurrency(page, 3);
    await expect(resumeButton).toBeEnabled();
    await promptInput.fill('Changed {{id}}');
    await expect(resumeButton).toBeDisabled();
    await promptInput.fill('Describe {{id}} {{name}}');
    await expect(resumeButton).toBeEnabled();

    await resumeButton.click();
    await expect.poll(() => requestCount).toBe(6);
    await expect(page.getByRole('button', { name: 'Download Results' })).toBeEnabled();
  });

  test('retries only transient errors and cancels retry waiting when stopped', async ({ page }) => {
    const images = [
      makeImage('rate.svg', 'red'),
      makeImage('overloaded.svg', 'blue'),
      makeImage('timeout.svg', 'green'),
      makeImage('unavailable.svg', 'yellow'),
      makeImage('network.svg', 'black'),
      makeImage('auth.svg', 'white'),
    ];
    const namesByUrl = new Map(images.map((image) => [toDataUrl(image), image.name]));
    const attempts = new Map<string, number>();

    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      const payload = route.request().postDataJSON();
      const imageUrl = payload.messages[0].content.find((item: { type: string }) => item.type === 'image_url').image_url.url;
      const name = namesByUrl.get(imageUrl)!;
      const attempt = (attempts.get(name) ?? 0) + 1;
      attempts.set(name, attempt);

      if (name === 'rate.svg' && attempt === 1) {
        await route.fulfill({ status: 429, headers: { 'Retry-After': '0' }, body: JSON.stringify({ error: { message: 'Rate limited' } }) });
      } else if (name === 'overloaded.svg' && attempt === 1) {
        await route.fulfill({ status: 503, headers: { 'Retry-After': '0' }, body: JSON.stringify({ error: { message: 'Overloaded' } }) });
      } else if (name === 'timeout.svg' && attempt === 1) {
        await route.fulfill({ status: 408, body: JSON.stringify({ error: { message: 'Timed out' } }) });
      } else if (name === 'unavailable.svg') {
        await route.fulfill({ status: 502, body: JSON.stringify({ error: { message: 'Unavailable' } }) });
      } else if (name === 'network.svg' && attempt === 1) {
        await route.abort('failed');
      } else if (name === 'auth.svg') {
        await route.fulfill({ status: 401, body: JSON.stringify({ error: { message: 'Invalid key' } }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ choices: [{ message: { content: `${name} success` } }] }),
        });
      }
    });

    await openImageMode(page);
    await page.locator('input[type="file"][multiple]').setInputFiles(images);
    await page.getByLabel('Shared image prompt').fill('Retry test.');
    await page.getByPlaceholder('Enter your OpenRouter API key').fill('test-api-key');
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.locator('button[aria-busy]')).toHaveText('Start Processing', { timeout: 15_000 });

    expect(attempts.get('rate.svg')).toBe(2);
    expect(attempts.get('overloaded.svg')).toBe(2);
    expect(attempts.get('timeout.svg')).toBe(2);
    expect(attempts.get('unavailable.svg')).toBe(3);
    expect(attempts.get('network.svg')).toBe(2);
    expect(attempts.get('auth.svg')).toBe(1);

    const responses = await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('csv-prompt-generator-db', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tasks = await new Promise<Array<{ name: string; response: string }>>((resolve, reject) => {
        const request = database.transaction('user-data').objectStore('user-data').get('imageTasks');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      database.close();
      return Object.fromEntries(tasks.map((task) => [task.name, task.response]));
    });
    expect(responses['rate.svg']).toBe('rate.svg success');
    expect(responses['auth.svg']).toContain('Error: Invalid key');
    expect(responses['unavailable.svg']).toContain('Error: Unavailable');

    let delayedRetryRequests = 0;
    await page.unroute('**/openrouter.ai/api/v1/chat/completions');
    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      delayedRetryRequests += 1;
      await route.fulfill({
        status: 429,
        headers: { 'Retry-After': '60' },
        body: JSON.stringify({ error: { message: 'Wait before retrying' } }),
      });
    });
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect.poll(() => delayedRetryRequests).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Stop Processing' }).click();
    await expect(page.getByRole('button', { name: 'Resume Incomplete' })).toBeVisible({ timeout: 5_000 });
    expect(delayedRetryRequests).toBe(5);
  });

  test('restarts every image after a partial stop', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      requestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, requestCount <= 2 ? 400 : 30));
      await route.fulfill({ status: 200, body: JSON.stringify({ choices: [{ message: { content: `Response ${requestCount}` } }] }) });
    });

    await openImageMode(page);
    const images = ['red', 'blue', 'green', 'yellow'].map((color, index) => makeImage(`restart-${index + 1}.svg`, color));
    await page.locator('input[type="file"][multiple]').setInputFiles(images);
    await page.getByLabel('Shared image prompt').fill('Restart test.');
    await page.getByPlaceholder('Enter your OpenRouter API key').fill('test-api-key');
    await setConcurrency(page, 2);
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect.poll(() => requestCount).toBe(2);
    await page.getByRole('button', { name: 'Stop Processing' }).click();
    await expect(page.getByRole('button', { name: 'Restart All' })).toBeVisible();
    await page.getByRole('button', { name: 'Restart All' }).click();
    await expect.poll(() => requestCount).toBe(6);
    await expect(page.locator('button[aria-busy]')).toHaveText('Start Processing');
  });
});
