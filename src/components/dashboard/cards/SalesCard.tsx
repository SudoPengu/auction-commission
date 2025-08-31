
import React from 'react';
import { LineChart } from 'lucide-react';
import { MetricCardProps } from '../types/metrics';
import MetricCard from './shared/MetricCard';

const SalesCard: React.FC<MetricCardProps> = ({ timeFrame }) => {
  // TODO: Replace with actual sales data from backend
  const value = 0;
  const change = '+0.00%';

  return (
    <MetricCard
      title="Sales"
      value={value}
      change={change}
      timeFrame={timeFrame}
      Icon={LineChart}
    />
  );
};

export default SalesCard;
