
import React from 'react';
import { BarChart } from 'lucide-react';
import { MetricCardProps } from '../types/metrics';
import MetricCard from './shared/MetricCard';

const RevenueCard: React.FC<MetricCardProps> = ({ timeFrame }) => {
  const value = `₱${(Math.random() * 10000).toFixed(2)}`;
  const change = `+${(Math.random() * 20).toFixed(2)}%`;

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
