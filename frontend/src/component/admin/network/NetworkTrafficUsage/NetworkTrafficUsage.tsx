import { type VFC, useState, useEffect } from 'react';
import { usePageTitle } from 'hooks/usePageTitle';
import { Alert } from '@mui/material';
import useUiConfig from 'hooks/api/getters/useUiConfig/useUiConfig';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { useInstanceTrafficMetrics } from 'hooks/api/getters/useInstanceTrafficMetrics/useInstanceTrafficMetrics';
import annotationPlugin from 'chartjs-plugin-annotation';
import {
    type ChartDatasetType,
    useTrafficDataEstimation,
} from 'hooks/useTrafficData';

const proPlanIncludedRequests = 53_000_000;

export const NetworkTrafficUsage: VFC = () => {
    usePageTitle('Network - Data Usage');

    const { isPro } = useUiConfig();

    const {
        record,
        period,
        getDayLabels,
        toChartData,
        toTrafficUsageSum,
        endpointsInfo,
        calculateOverageCost,
        calculateEstimatedMonthlyCost,
    } = useTrafficDataEstimation();

    const includedTraffic = isPro() ? proPlanIncludedRequests : 0;

    const traffic = useInstanceTrafficMetrics(period);

    const [labels, setLabels] = useState<number[]>([]);

    const [datasets, setDatasets] = useState<ChartDatasetType[]>([]);

    const [usageTotal, setUsageTotal] = useState<number>(0);

    const [overageCost, setOverageCost] = useState<number>(0);

    const [estimatedMonthlyCost, setEstimatedMonthlyCost] = useState<number>(0);

    const data = {
        labels,
        datasets,
    };

    useEffect(() => {
        setDatasets(toChartData(labels, traffic, endpointsInfo));
    }, [labels, traffic]);

    useEffect(() => {
        if (record && period) {
            const periodData = record[period];
            setLabels(getDayLabels(periodData.dayCount));
        }
    }, [period]);

    useEffect(() => {
        if (data) {
            const usage = toTrafficUsageSum(data.datasets);
            setUsageTotal(usage);
            if (includedTraffic > 0) {
                const calculatedOverageCost = calculateOverageCost(
                    usage,
                    includedTraffic,
                );
                setOverageCost(calculatedOverageCost);

                setEstimatedMonthlyCost(
                    calculateEstimatedMonthlyCost(
                        period,
                        data.datasets,
                        includedTraffic,
                        new Date(),
                    ),
                );
            }
        }
    }, [data]);

    return <Alert severity='warning'>Not enabled.</Alert>;
};

// Register dependencies that we need to draw the chart.
ChartJS.register(
    annotationPlugin,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

// Use a default export to lazy-load the charting library.
export default NetworkTrafficUsage;
