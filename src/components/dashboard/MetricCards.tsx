
import React from 'react';
import { MetricCardProps } from './types/metrics';
import RevenueCard from './cards/RevenueCard';
import SalesCard from './cards/SalesCard';
import UsersCard from './cards/UsersCard';

const MetricCards: React.FC<MetricCardProps> = ({ timeFrame }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <RevenueCard timeFrame={timeFrame} />
      <SalesCard timeFrame={timeFrame} />
      <UsersCard timeFrame={timeFrame} />
    </div>
  );
};

export default MetricCards;
