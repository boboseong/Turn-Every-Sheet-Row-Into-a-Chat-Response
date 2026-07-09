import type { CsvData } from '@/types';

export const MISSING_ROW_MESSAGE = 'To get started, please select a data row from the Sheet Upload Panel.';
export const MISSING_TEMPLATE_MESSAGE = 'Now, please enter a prompt template in the PromptTemplatePanel.';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const renderPromptTemplate = (
  csvData: CsvData,
  selectedRowIndex: number | null,
  promptTemplate: string,
): string => {
  if (selectedRowIndex === null || !csvData.rows[selectedRowIndex]) {
    return MISSING_ROW_MESSAGE;
  }

  if (!promptTemplate) {
    return MISSING_TEMPLATE_MESSAGE;
  }

  const selectedRow = csvData.rows[selectedRowIndex];

  return csvData.headers.reduce((result, header) => {
    const regex = new RegExp(`{{${escapeRegExp(header)}}}`, 'g');
    const value = selectedRow[header] ?? '';
    return result.replace(regex, String(value));
  }, promptTemplate);
};
