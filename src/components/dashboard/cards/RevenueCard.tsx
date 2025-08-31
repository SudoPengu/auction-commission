
import React from 'react';
import { BarChart } from 'lucide-react';
import { MetricCardProps } from '../types/metrics';
import MetricCard from './shared/MetricCard';

const RevenueCard: React.FC<MetricCardProps> = ({ timeFrame }) => {
  // TODO: Replace with actual revenue data from backend
  const value = '₱0.00';
  const change = '+0.00%';

  return (
    <MetricCard
      title="Total Revenue"
      value={value}
      change={change}
      timeFrame={timeFrame}
      Icon={BarChart}
    />
  );
};

export default RevenueCard;
