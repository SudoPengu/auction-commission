
import React from 'react';
import { BarChart } from 'lucide-react';
import { MetricCardProps } from '../types/metrics';
import MetricCard from './shared/MetricCard';

const RevenueCard: React.FC<MetricCardProps> = ({ timeFrame }) => {
  // Generate more realistic revenue data based on timeframe
  let value = '₱0.00';
  let change = '+0.00%';
  
  switch(timeFrame) {
    case '1D':
      value = `₱${(Math.random() * 5000 + 15000).toFixed(2)}`;
      change = `+${(Math.random() * 5 + 2).toFixed(2)}%`;
      break;
    case '1W':
      value = `₱${(Math.random() * 20000 + 50000).toFixed(2)}`;
      change = `+${(Math.random() * 10 + 5).toFixed(2)}%`;
      break;
    case '1M':
      value = `₱${(Math.random() * 50000 + 120000).toFixed(2)}`;
      change = `+${(Math.random() * 15 + 7).toFixed(2)}%`;
      break;
    case '3M':
      value = `₱${(Math.random() * 100000 + 300000).toFixed(2)}`;
      change = `+${(Math.random() * 20 + 10).toFixed(2)}%`;
      break;
    case '1Y':
      value = `₱${(Math.random() * 500000 + 1000000).toFixed(2)}`;
      change = `+${(Math.random() * 30 + 15).toFixed(2)}%`;
      break;
    default:
      value = `₱${(Math.random() * 10000).toFixed(2)}`;
      change = `+${(Math.random() * 20).toFixed(2)}%`;
  }

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
