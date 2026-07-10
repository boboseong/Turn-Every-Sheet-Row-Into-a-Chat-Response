import { expect, Page, test } from '@playwright/test';

const prepareSheetTest = async (page: Page) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles('test.csv');
  await page.getByPlaceholder("What's the weather in {{location}} on {{date}}?").fill('Describe {{name}}.');
  await page.getByPlaceholder('Enter your OpenRouter API key').fill('test-api-key');
};

test.describe('Cost estimation', () => {
  test('handles zero, missing, invalid, and failed cost responses without stale values', async ({ page }) => {
    const responses = [
      {
        status: 200,
        body: { choices: [{ message: { content: 'Zero cost response' } }], usage: { cost: 0 } },
      },
      {
        status: 200,
        body: { choices: [{ message: { content: 'Missing cost response' } }] },
      },
      {
        status: 200,
        body: { choices: [{ message: { content: 'Invalid cost response' } }], usage: { cost: 'invalid' } },
      },
      {
        status: 500,
        body: { error: { message: 'Request failed' } },
      },
    ];
    let responseIndex = 0;
    let generationRequestCount = 0;

    await page.route('**/openrouter.ai/api/v1/generation**', async (route) => {
      generationRequestCount += 1;
      await route.abort();
    });
    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      const response = responses[responseIndex++];
      await route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify(response.body),
      });
    });

    await prepareSheetTest(page);
    const testButton = page.getByRole('button', { name: 'Test First Row Prompt' });

    await testButton.click();
    await expect(page.getByText('Zero cost response')).toBeVisible();
    await expect(page.getByTestId('test-api-cost')).toHaveText('$0.000000');
    await expect(page.getByTestId('estimated-total-cost')).toHaveText('$0.000000 - $0.000000');

    await testButton.click();
    await expect(page.getByText('Missing cost response')).toBeVisible();
    await expect(page.getByTestId('test-api-cost')).toHaveText('-');
    await expect(page.getByTestId('estimated-total-cost')).toHaveText('-');
    await expect(page.getByTestId('cost-estimate-status')).toHaveText('Cost information was not available in the API response.');

    await testButton.click();
    await expect(page.getByText('Invalid cost response')).toBeVisible();
    await expect(page.getByTestId('test-api-cost')).toHaveText('-');
    await expect(page.getByTestId('cost-estimate-status')).toHaveText('Cost information was not available in the API response.');

    await testButton.click();
    await expect(page.getByText('Request failed: Request failed')).toBeVisible();
    await expect(page.getByTestId('test-api-cost')).toHaveText('-');
    await expect(page.getByTestId('estimated-total-cost')).toHaveText('-');
    await expect(page.getByTestId('cost-estimate-status')).toHaveText('Cost information was not available in the API response.');

    expect(responseIndex).toBe(4);
    expect(generationRequestCount).toBe(0);
  });
});
