
import React, { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Papa, { type ParseResult } from 'papaparse';
import { useStore } from '@/state/store';
import type { CsvData } from '@/types';
import { UploadIcon } from '@/components/icons';
import Panel from '@/components/Panel';
import {
  parseWorkbook,
  SpreadsheetParseError,
  type WorkbookSheetOption,
} from '@/utils/spreadsheet';

type UploadErrorKey =
  | 'file_read_error'
  | 'invalid_file_type'
  | 'spreadsheet_invalid'
  | 'spreadsheet_no_data'
  | 'spreadsheet_no_sheets';

const SheetUploadPanel: React.FC = () => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<UploadErrorKey | null>(null);
  const [pendingSheets, setPendingSheets] = useState<WorkbookSheetOption[] | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { csvData, selectedRowIndex, setSelectedRowIndex, setCsvData, clearSheetData } = useStore();

  const handleFileLoaded = useCallback(async (data: CsvData) => {
    await setCsvData(data);
    setPendingSheets(null);
    setSelectedSheetName('');
    setUploadError(null);
  }, [setCsvData]);

  const handleParse = useCallback((file: File) => {
    setUploadError(null);
    setPendingSheets(null);
    setSelectedSheetName('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (data instanceof ArrayBuffer) {
        try {
          const sheets = parseWorkbook(
            data,
            file.name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'xls',
          );
          const validSheets = sheets.filter((sheet) => sheet.status === 'valid' && sheet.data);

          if (validSheets.length === 0) {
            setUploadError('spreadsheet_no_data');
            return;
          }

          if (validSheets.length === 1) {
            void handleFileLoaded(validSheets[0].data!);
            return;
          }

          setPendingSheets(sheets);
          setSelectedSheetName(validSheets[0].name);
        } catch (error) {
          console.error('Error parsing workbook:', error);
          setUploadError(
            error instanceof SpreadsheetParseError && error.code === 'no_sheets'
              ? 'spreadsheet_no_sheets'
              : 'spreadsheet_invalid',
          );
        }
      } else if (typeof data === 'string') {
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<Record<string, string>>) => {
            const headers = results.meta.fields || [];
            const rows = results.data as Record<string, string>[];
            void handleFileLoaded({ headers, rows });
          },
          error: (error: Error) => {
            console.error('Error parsing file:', error);
            setUploadError('file_read_error');
          }
        });
      }
    };
    reader.onerror = () => {
      console.error('Error reading file:', reader.error);
      setUploadError('file_read_error');
    };

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
      reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      setUploadError('invalid_file_type');
    }
  }, [handleFileLoaded]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleParse(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleParse(e.target.files[0]);
    }
    e.target.value = '';
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleClearUploadedCsv = async () => {
    if (window.confirm(t('confirm_delete_sheet'))) {
      await clearSheetData();
      setPendingSheets(null);
      setSelectedSheetName('');
      setUploadError(null);
    }
  };

  const handleLoadSelectedSheet = async () => {
    const selectedSheet = pendingSheets?.find(
      (sheet) => sheet.name === selectedSheetName && sheet.status === 'valid',
    );
    if (selectedSheet?.data) {
      await handleFileLoaded(selectedSheet.data);
    }
  };

  const handleCancelSheetSelection = () => {
    setPendingSheets(null);
    setSelectedSheetName('');
    setUploadError(null);
  };

  return (
    <Panel
      title={t('upload_sheet')}
      headerContent={
        <button
          onClick={handleClearUploadedCsv}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded transition-colors text-xs"
        >
          {t('delete_sheet')}
        </button>
      }
    >
      <div className="p-4 flex-grow flex flex-col overflow-hidden">
        {csvData.rows.length === 0 ? (
          <div className="flex flex-grow flex-col gap-3">
            {pendingSheets ? (
              <div className="flex min-h-64 flex-grow flex-col justify-center rounded-md border border-gray-600 bg-gray-900/50 p-6">
                <label htmlFor="workbook-sheet" className="text-sm font-medium text-gray-200">
                  {t('select_sheet')}
                </label>
                <p className="mt-1 text-sm text-gray-400">{t('select_sheet_help')}</p>
                <select
                  id="workbook-sheet"
                  value={selectedSheetName}
                  onChange={(event) => setSelectedSheetName(event.target.value)}
                  className="mt-4 rounded-md border border-gray-600 bg-gray-950 p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {pendingSheets.map((sheet) => (
                    <option key={sheet.name} value={sheet.name} disabled={sheet.status === 'empty'}>
                      {sheet.status === 'empty'
                        ? `${sheet.name} — ${t('sheet_empty')}`
                        : `${sheet.name} — ${t('sheet_row_count', { count: sheet.rowCount })}`}
                    </option>
                  ))}
                </select>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelSheetSelection}
                    className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLoadSelectedSheet()}
                    className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
                  >
                    {t('load_sheet')}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer transition-colors ${isDragging ? 'border-teal-400 bg-gray-700' : 'border-gray-600 hover:border-teal-500'}`}
              >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv, .xlsx, .xls, .tsv"
                    className="hidden"
                />
                <UploadIcon className="w-12 h-12 text-gray-500 mb-2"/>
                <p className="text-gray-400">{t('guide_text')}</p>
                <p className="text-gray-500 text-sm">{t('file_placeholder')}</p>
              </div>
            )}
            {uploadError && (
              <p role="alert" aria-live="polite" className="rounded-md border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
                {t(uploadError)}
              </p>
            )}
          </div>
        ) : (
          <div className="flex-grow overflow-auto border border-gray-700 rounded-md max-h-[40rem]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0">
                <tr>
                  {csvData.headers.map((header) => (
                    <th key={header} scope="col" className="px-4 py-3 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    onClick={() => setSelectedRowIndex(rowIndex)}
                    className={`border-b border-gray-700 transition-colors cursor-pointer ${
                      selectedRowIndex === rowIndex
                        ? 'bg-teal-900/50'
                        : 'hover:bg-gray-600/50'
                    }`}
                  >
                    {csvData.headers.map((header) => (
                      <td key={`${rowIndex}-${header}`} className="px-4 py-2 whitespace-nowrap">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
};

export default SheetUploadPanel;
