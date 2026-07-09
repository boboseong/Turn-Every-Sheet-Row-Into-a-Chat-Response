
import React, { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Papa, { type ParseResult } from 'papaparse';
import * as XLSX from 'xlsx';
import { useStore } from '@/state/store';
import type { CsvData } from '@/types';
import { idbRemove } from '@/utils/indexedDB';
import { UploadIcon } from '@/components/icons';
import Panel from '@/components/Panel';

const SheetUploadPanel: React.FC = () => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { csvData, selectedRowIndex, setSelectedRowIndex, setCsvData, clearAllData } = useStore();

  const handleFileLoaded = useCallback(async (data: CsvData) => {
    setCsvData(data);
    setSelectedRowIndex(data.rows.length > 0 ? 0 : null);
  }, [clearAllData, setCsvData, setSelectedRowIndex]);

  const handleParse = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (data instanceof ArrayBuffer) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
        const headers = Object.keys(json[0]);
        handleFileLoaded({ headers, rows: json });
      } else if (typeof data === 'string') {
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<Record<string, string>>) => {
            const headers = results.meta.fields || [];
            const rows = results.data as Record<string, string>[];
            handleFileLoaded({ headers, rows });
          },
          error: (error: Error) => {
            console.error('Error parsing file:', error);
            alert('Error parsing file. Please check the console for details.');
          }
        });
      }
    };

    if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload a valid .csv, .xlsx, .xls, or .tsv file.');
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
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleClearUploadedCsv = async () => {
    if (window.confirm('Are you sure you want to clear the uploaded CSV and refresh?')) {
      await idbRemove('uploadedCsv');
      location.reload();
    }
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
