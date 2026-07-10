import { expect, test } from '@playwright/test';

test.describe('Localized UI copy', () => {
  test('shows mode-specific Korean copy and keeps provider error details', async ({ page }) => {
    await page.route('**/openrouter.ai/api/v1/chat/completions', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Provider detail' } }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'KO' }).click();

    await expect(page.getByText('시트를 업로드하고 프롬프트를 만든 뒤, 모든 행의 AI 응답을 받으세요.')).toBeVisible();
    await expect(page.getByText('CSV, TSV, XLSX, XLS 파일을 여기에 끌어다 놓으세요.')).toBeVisible();
    await expect(page.getByText('먼저 시트를 업로드하세요.')).toBeVisible();

    const resetButton = page.getByRole('button', { name: '저장 데이터 초기화' });
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe('저장된 시트, 이미지, 프롬프트, API 설정과 결과를 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.');
      await dialog.dismiss();
    });
    await resetButton.click();

    await page.locator('input[type="file"]').setInputFiles('test.csv');
    await page.getByPlaceholder('{{날짜}}에 {{지역}}의 날씨는 어때?').fill('{{name}} 설명');
    await page.getByPlaceholder('OpenRouter API 키를 입력하세요').fill('test-api-key');

    await expect(page.getByRole('button', { name: '첫 번째 행 결과' })).toBeVisible();
    await page.getByRole('button', { name: '첫 번째 행 결과' }).click();
    await expect(page.getByRole('dialog', { name: '첫 번째 행' })).toContainText('응답 결과가 여기에 표시됩니다.');
    await page.getByRole('button', { name: '닫기' }).click();

    await page.getByRole('button', { name: '첫 번째 행 프롬프트 테스트' }).click();
    await expect(page.getByRole('button', { name: '첫 번째 행 프롬프트 테스트 중...' })).toBeVisible();
    await expect(page.getByText('요청에 실패했습니다: Provider detail')).toBeVisible();
    await expect(page.getByText('첫 번째 행 프롬프트 테스트 결과')).toBeVisible();

    await page.getByRole('button', { name: '이미지' }).click();
    await expect(page.getByText('이미지를 업로드하고 공통 프롬프트를 입력한 뒤, 모든 이미지의 AI 응답을 받으세요.')).toBeVisible();
    await expect(page.getByRole('button', { name: '첫 번째 이미지 프롬프트 테스트' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '모든 이미지 처리' })).toBeDisabled();
  });

  test('formats the first ten ordinals as words and later ordinals numerically', async ({ page }) => {
    const rows = Array.from({ length: 11 }, (_, index) => `Person ${index + 1}`).join('\n');

    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'eleven-rows.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`name\n${rows}`),
    });

    await expect(page.getByRole('button', { name: 'First row result' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tenth row result' })).toBeVisible();
    await expect(page.getByRole('button', { name: '11th row result' })).toBeVisible();

    await page.getByRole('button', { name: 'KO' }).click();
    await expect(page.getByRole('button', { name: '첫 번째 행 결과' })).toBeVisible();
    await expect(page.getByRole('button', { name: '열 번째 행 결과' })).toBeVisible();
    await expect(page.getByRole('button', { name: '11번째 행 결과' })).toBeVisible();
  });
});
