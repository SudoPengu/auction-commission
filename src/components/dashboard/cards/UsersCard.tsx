
import React from 'react';
import { PieChart } from 'lucide-react';
import { MetricCardProps } from '../types/metrics';
import MetricCard from './shared/MetricCard';

const UsersCard: React.FC<MetricCardProps> = ({ timeFrame }) => {
  const value = Math.floor(Math.random() * 50);
  const change = `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 10).toFixed(2)}%`;

  return (
    <MetricCard
      title="Active Users"
      value={value}
      change={change}
      timeFrame={timeFrame}
      Icon={PieChart}
    />
  );
};

export default UsersCard;
