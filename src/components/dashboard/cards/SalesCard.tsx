
import React from 'react';
import { LineChart } from 'lucide-react';
import { MetricCardProps } from '../types/metrics';
import MetricCard from './shared/MetricCard';

const SalesCard: React.FC<MetricCardProps> = ({ timeFrame }) => {
  const value = Math.floor(Math.random() * 100);
  const change = `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 15).toFixed(2)}%`;

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
