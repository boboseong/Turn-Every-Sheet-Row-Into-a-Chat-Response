import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/state/store';

interface EstimateCostPanelProps {
    itemCount: number;
}

const formatCost = (cost: number) => `$${cost.toFixed(6)}`;

const EstimateCostPanel: React.FC<EstimateCostPanelProps> = ({ itemCount }) => {
    const { t } = useTranslation();
    const { lastApiCost, estimatedTotalCost, costEstimateStatus } = useStore();

    const isReady = costEstimateStatus === 'ready' && lastApiCost !== null;
    const singleCost = isReady ? formatCost(lastApiCost) : '-';
    const totalCost = isReady && estimatedTotalCost
        ? `${formatCost(estimatedTotalCost.min)} - ${formatCost(estimatedTotalCost.max)}`
        : '-';

    const statusMessage = {
        idle: t('cost_status_idle'),
        loading: t('cost_status_loading'),
        ready: t('cost_estimate_note'),
        unavailable: t('cost_status_unavailable'),
    }[costEstimateStatus];

    return (
        <div className="p-4 space-y-2" aria-live="polite">
            <div className="p-3 bg-gray-900 border border-gray-700 rounded-md space-y-2 text-sm">
                <div className="flex justify-between items-center gap-4">
                    <span className="text-gray-400">{t('test_call_cost')}</span>
                    <span data-testid="test-api-cost" className="font-mono text-blue-400">{singleCost}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                    <span className="text-gray-400">{t('estimated_total_cost', { count: itemCount })}</span>
                    <span data-testid="estimated-total-cost" className="font-mono text-blue-400">{totalCost}</span>
                </div>
            </div>
            <p
                data-testid="cost-estimate-status"
                className={`text-xs ${costEstimateStatus === 'unavailable' ? 'text-amber-400' : 'text-gray-400'}`}
            >
                {statusMessage}
            </p>
        </div>
    );
};

export default EstimateCostPanel;
