import { test, expect } from '@playwright/test';

test.describe('CSV-based Dynamic Prompt Generator E2E Test', () => {
  test('should allow a user to upload a CSV, generate prompts, and download the results', async ({ page }) => {
    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-openrouter-cost': '0.001' },
        body: JSON.stringify({
          choices: [{ message: { content: 'Mocked response' } }],
        }),
      });
    });

    // 1. Navigate to the app
    await page.goto('/');


    // 2. Upload a CSV file
    // Note: The file upload is triggered by clicking the drop zone.
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('.flex-grow.flex.flex-col.items-center.justify-center').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('test.csv');

    // 3. Verify the data is displayed in the table
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'New York' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'London' })).toBeVisible();

    // 4. Enter a prompt template
    const promptText = 'Create a story about {{name}} who is {{age}} years old and lives in {{city}}. (within 100 characters)';
    await page.getByPlaceholder("What's the weather in {{location}} on {{date}}?").fill(promptText);

    // 5. Verify the generated prompt is correct
    // Select the Second row
    await page.getByText('Jane Smith').click();
    await expect(page.getByText('Create a story about Jane Smith who is 28 years old and lives in London. (within 100 characters)')).toBeVisible();


    // 6. Enter API Key and Model
    await page.getByPlaceholder('Enter your OpenRouter API key').fill('test-api-key');
    await page.getByPlaceholder('Enter the model name').fill('google/gemini-2.5-flash-lite');

    await page.getByRole('button', { name: 'Test Prompt' }).click();

    // 7. Click "Start Processing"
    await page.getByRole('button', { name: 'start processing' }).click();

    // 8. Verify processing progress and completion
    //await expect(page.getByText('2 / 2 processed')).toBeVisible({ timeout: 10000 });

    // 9. Download the results
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'download results' }).click();
    await page.getByRole('menuitem', { name: 'Download Results as CSV' }).click();
    const download = await downloadPromise;

    // Verify the downloaded file
    expect(download.suggestedFilename()).toBe('processed_results.csv');
    await expect(page.getByText(/Error/)).toHaveCount(0);


  });
});
