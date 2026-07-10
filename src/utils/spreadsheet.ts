import * as XLSX from 'xlsx';
import type { CsvData } from '@/types';

export type SpreadsheetErrorCode = 'invalid_workbook' | 'no_sheets';

export class SpreadsheetParseError extends Error {
  constructor(public readonly code: SpreadsheetErrorCode) {
    super(code);
    this.name = 'SpreadsheetParseError';
  }
}

export interface WorkbookSheetOption {
  name: string;
  rowCount: number;
  status: 'valid' | 'empty';
  data: CsvData | null;
}

const hasXlsxArchiveSignature = (data: ArrayBuffer): boolean => {
  const bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 4));
  return bytes.length === 4
    && bytes[0] === 0x50
    && bytes[1] === 0x4b
    && (
      (bytes[2] === 0x03 && bytes[3] === 0x04)
      || (bytes[2] === 0x05 && bytes[3] === 0x06)
      || (bytes[2] === 0x07 && bytes[3] === 0x08)
    );
};

const stringifyCell = (value: unknown): string => {
  return value === undefined || value === null ? '' : String(value);
};

const createUniqueHeaders = (headerRow: string[], columnCount: number): string[] => {
  const usedHeaders = new Set<string>();

  return Array.from({ length: columnCount }, (_, index) => {
    const baseHeader = headerRow[index]?.trim() || `Column_${index + 1}`;
    let header = baseHeader;
    let suffix = 2;

    while (usedHeaders.has(header)) {
      header = `${baseHeader}_${suffix}`;
      suffix += 1;
    }

    usedHeaders.add(header);
    return header;
  });
};

const parseWorksheet = (name: string, worksheet: XLSX.WorkSheet): WorkbookSheetOption => {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  }).map((row) => row.map(stringifyCell));

  if (matrix.length === 0) {
    return { name, rowCount: 0, status: 'empty', data: null };
  }

  const [headerRow, ...bodyRows] = matrix;
  const rowsWithData = bodyRows.filter((row) => row.some((cell) => cell.trim() !== ''));

  if (rowsWithData.length === 0) {
    return { name, rowCount: 0, status: 'empty', data: null };
  }

  const columnCount = Math.max(
    headerRow.length,
    ...rowsWithData.map((row) => row.length),
  );
  const headers = createUniqueHeaders(headerRow, columnCount);
  const rows = rowsWithData.map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] ?? '']),
  ));

  return {
    name,
    rowCount: rows.length,
    status: 'valid',
    data: { headers, rows },
  };
};

export const parseWorkbook = (
  data: ArrayBuffer,
  format: 'xlsx' | 'xls',
): WorkbookSheetOption[] => {
  let workbook: XLSX.WorkBook;

  if (format === 'xlsx' && !hasXlsxArchiveSignature(data)) {
    throw new SpreadsheetParseError('invalid_workbook');
  }

  try {
    workbook = XLSX.read(data, { type: 'array' });
  } catch {
    throw new SpreadsheetParseError('invalid_workbook');
  }

  if (workbook.SheetNames.length === 0) {
    throw new SpreadsheetParseError('no_sheets');
  }

  return workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    return worksheet
      ? parseWorksheet(name, worksheet)
      : { name, rowCount: 0, status: 'empty', data: null };
  });
};
