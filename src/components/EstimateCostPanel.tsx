import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { idbGet, idbSet } from '@/utils/indexedDB';

interface EstimateCostPanelProps {
    csvRowCount: number;
}

const EstimateCostPanel: React.FC<EstimateCostPanelProps> = ({ csvRowCount }) => {
    const { t } = useTranslation();
    const [singleCost, setSingleCost] = useState<string | null>(null);
    const [totalCost, setTotalCost] = useState<string | null>(null);

    const calculateCost = useCallback(async () => {
        const apiKey = await idbGet('apiKey');
        let data = await idbGet('lastApiResponse');
        if (data && data.id) {
            try {
                const generationResponse = await fetch(`https://openrouter.ai/api/v1/generation?id=${data.id}`, {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                    }
                });
                if (generationResponse.ok) {
                    const generationData = await generationResponse.json();
                    await idbSet('lastGenerationData', generationData);
                    data = generationData;
                }
            } catch (error) {
                console.error("Failed to fetch generation data:", error);
            }
        }

        if (data) {
            try {
                if (data && typeof data.data.usage === 'number') {
                    const cost = data.data.usage;
                    const minCost = cost * 0.8;
                    const maxCost = cost * 3;
                    const singleCostMinStr = `$${minCost.toFixed(6)}`;
                    const singleCostMaxStr = `$${maxCost.toFixed(6)}`;
                    setSingleCost(`${singleCostMinStr} - ${singleCostMaxStr}`);

                    if (csvRowCount > 0) {
                        const totalMinCost = minCost * csvRowCount;
                        const totalMaxCost = maxCost * csvRowCount;
                        const totalCostMinStr = `$${totalMinCost.toFixed(6)}`;
                        const totalCostMaxStr = `$${totalMaxCost.toFixed(6)}`;
                        setTotalCost(`${totalCostMinStr} - ${totalCostMaxStr}`);
                    } else {
                        setTotalCost(null);
                    }
                }
            } catch (error) {
                console.error("Error parsing lastGenerationData from localStorage", error);
                setSingleCost("Error");
                setTotalCost("Error");
            }
        } else {
            setSingleCost("No data");
            setTotalCost("No data");
        }
    }, [csvRowCount]);

    return (
        <div className="p-4 space-y-4">
            <div className="text-center">
                <button
                    onClick={calculateCost}
                    className="inline-flex items-center gap-2 justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
                >
                    {t('cost_estimation')}
                </button>
            </div>
            <div className="p-3 bg-gray-900 border border-gray-700 rounded-md space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('estimated_cost')}</span>
                    <span className="font-mono text-blue-400">{singleCost}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('total_rows')}</span>
                    <span className="font-mono text-blue-400">{totalCost}</span>
                </div>
            </div>
        </div>
    );
};

export default EstimateCostPanel;