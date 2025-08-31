
import React from 'react';
import { PieChart } from 'lucide-react';
import { MetricCardProps } from '../types/metrics';
import MetricCard from './shared/MetricCard';

const UsersCard: React.FC<MetricCardProps> = ({ timeFrame }) => {
  // TODO: Replace with actual user data from backend
  const value = 0;
  const change = '+0.00%';

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
