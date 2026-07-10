import { expect, Page, test } from '@playwright/test';
import * as XLSX from 'xlsx';

interface SheetDefinition {
  name: string;
  rows: unknown[][];
}

const createWorkbookFile = (
  name: string,
  sheets: SheetDefinition[],
  bookType: 'xlsx' | 'xls' = 'xlsx',
) => {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  });

  return {
    name,
    mimeType: bookType === 'xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(workbook, { type: 'buffer', bookType }),
  };
};

const openSheetPage = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN' }).click();
};

const fileInput = (page: Page) => page.locator('input[type="file"]').first();

test.describe('Excel workbook upload', () => {
  test('shows inline errors for empty, header-only, and damaged workbooks', async ({ page }) => {
    await openSheetPage(page);

    await fileInput(page).setInputFiles(createWorkbookFile('empty.xlsx', [
      { name: 'Empty', rows: [] },
    ]));
    await expect(page.getByRole('alert')).toHaveText(
      'No data rows were found. Add data below the header row.',
    );

    await fileInput(page).setInputFiles(createWorkbookFile('headers-only.xlsx', [
      { name: 'Headers', rows: [['name', 'email']] },
    ]));
    await expect(page.getByRole('alert')).toHaveText(
      'No data rows were found. Add data below the header row.',
    );

    await fileInput(page).setInputFiles({
      name: 'damaged.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('not an excel workbook'),
    });
    await expect(page.getByRole('alert')).toHaveText(
      'The Excel file could not be parsed. Check that it is not damaged.',
    );
    await expect(page.getByRole('table')).toHaveCount(0);
  });

  test('loads a single valid sheet and preserves headers missing from the first data row', async ({ page }) => {
    await openSheetPage(page);

    await fileInput(page).setInputFiles(createWorkbookFile('people.xlsx', [
      {
        name: 'People',
        rows: [
          ['name', 'email', 'grade'],
          ['Alice', undefined, 2],
          ['Bob', 'bob@example.com', 3],
        ],
      },
    ]));

    await expect(page.getByLabel('Select a sheet to load')).toHaveCount(0);
    await expect(page.getByRole('columnheader')).toHaveText(['name', 'email', 'grade']);
    await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'bob@example.com' })).toBeVisible();
  });

  test('requires a choice when multiple sheets contain data and disables empty sheets', async ({ page }) => {
    await openSheetPage(page);

    const workbookFile = createWorkbookFile('multi-sheet.xlsx', [
      { name: 'Empty', rows: [['name']] },
      { name: 'People', rows: [['name'], ['Alice']] },
      { name: 'Cities', rows: [['city'], ['Seoul']] },
    ]);
    await fileInput(page).setInputFiles(workbookFile);

    const sheetSelect = page.getByLabel('Select a sheet to load');
    await expect(sheetSelect).toBeVisible();
    await expect(sheetSelect.locator('option[value="Empty"]')).toBeDisabled();
    await expect(page.getByRole('table')).toHaveCount(0);

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheetSelect).toHaveCount(0);
    await expect(page.getByText('Click to select a file')).toBeVisible();

    await fileInput(page).setInputFiles(workbookFile);
    await expect(sheetSelect).toBeVisible();
    await sheetSelect.selectOption('Cities');
    await page.getByRole('button', { name: 'Load Sheet' }).click();

    await expect(page.getByRole('columnheader')).toHaveText(['city']);
    await expect(page.getByRole('cell', { name: 'Seoul' })).toBeVisible();
    await expect(page.getByText('Alice', { exact: true })).toHaveCount(0);
  });

  test('creates stable names for blank and duplicate headers without dropping wider rows', async ({ page }) => {
    await openSheetPage(page);

    await fileInput(page).setInputFiles(createWorkbookFile('headers.xlsx', [
      {
        name: 'Data',
        rows: [
          [' name ', '', 'name'],
          ['Alice', 'alice@example.com', 'Alias', 'extra value'],
        ],
      },
    ]));

    await expect(page.getByRole('columnheader')).toHaveText([
      'name',
      'Column_2',
      'name_2',
      'Column_4',
    ]);
    await expect(page.getByRole('cell', { name: 'extra value' })).toBeVisible();
  });

  test('clears sheet-derived results while keeping the prompt and API settings', async ({ page }) => {
    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: 'Mocked response' } }],
          usage: { cost: 0.001 },
        }),
      });
    });

    await openSheetPage(page);
    await fileInput(page).setInputFiles('test.csv');
    const promptInput = page.getByPlaceholder("What's the weather in {{location}} on {{date}}?");
    const apiKeyInput = page.getByPlaceholder('Enter your OpenRouter API key');
    await promptInput.fill('Describe {{name}}.');
    await apiKeyInput.fill('test-api-key');

    await page.getByRole('button', { name: 'Test First Row Prompt' }).click();
    await expect(page.getByTestId('test-api-cost')).toHaveText('$0.001000');
    await page.getByRole('button', { name: 'Process All Rows' }).click();
    await expect(page.getByRole('button', { name: 'Download Results' })).toBeEnabled();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Sheet' }).click();

    await expect(page.getByText('Click to select a file')).toBeVisible();
    await expect(fileInput(page)).toBeEnabled();
    await expect(promptInput).toHaveValue('Describe {{name}}.');
    await expect(apiKeyInput).toHaveValue('test-api-key');
    await expect(page.getByRole('button', { name: 'Download Results' })).toBeDisabled();
    await expect(page.getByTestId('test-api-cost')).toHaveText('-');
    await expect(page.getByTestId('cost-estimate-status')).toHaveText(
      'The cost will appear automatically after testing the prompt.',
    );

    await fileInput(page).setInputFiles(createWorkbookFile('replacement.xlsx', [
      { name: 'Replacement', rows: [['name'], ['Carol']] },
    ]));
    await expect(page.getByRole('cell', { name: 'Carol' })).toBeVisible();
    await expect(promptInput).toHaveValue('Describe {{name}}.');
    await expect(page.getByRole('button', { name: 'Download Results' })).toBeDisabled();
  });

  test('continues to support legacy XLS files', async ({ page }) => {
    await openSheetPage(page);

    await fileInput(page).setInputFiles(createWorkbookFile('legacy.xls', [
      { name: 'Legacy', rows: [['name'], ['Legacy row']] },
    ], 'xls'));

    await expect(page.getByRole('cell', { name: 'Legacy row' })).toBeVisible();
  });
});
