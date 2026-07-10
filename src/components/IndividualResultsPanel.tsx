import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/state/store';
import Panel from '@/components/Panel';
import ResultModal from '@/components/ResultModal';
import { formatOrdinal } from '@/utils/ordinal';

const IndividualResultsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { csvData, individualResponses } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const handleOpenModal = (rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRowIndex(null);
  };

  return (
    <Panel title={t('individual_results')}>
      <div className="p-4">
        {csvData.rows.length > 0 ? (
          <div className="grid grid-cols-10 gap-2">
            {csvData.rows.map((_, rowIndex) => (
              <button
                key={rowIndex}
                onClick={() => handleOpenModal(rowIndex)}
                aria-label={t('row_result_button', {
                  ordinal: formatOrdinal(rowIndex + 1, i18n.language),
                })}
                className={`p-2 rounded ${
                  individualResponses[rowIndex]
                    ? 'bg-teal-500 hover:bg-teal-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {rowIndex + 1}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">{t('no_data_to_display')}</p>
        )}
      </div>
      {isModalOpen && selectedRowIndex !== null && (
        <ResultModal
          rowIndex={selectedRowIndex}
          onClose={handleCloseModal}
        />
      )}
    </Panel>
  );
};

export default IndividualResultsPanel;
