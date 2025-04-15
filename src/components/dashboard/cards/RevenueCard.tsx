
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';
import { MetricCardProps } from '../types/metrics';

const RevenueCard: React.FC<MetricCardProps> = ({ timeFrame }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        <BarChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">₱{(Math.random() * 10000).toFixed(2)}</div>
        <p className="text-xs text-muted-foreground">
          +{(Math.random() * 20).toFixed(2)}% from last {timeFrame.toLowerCase()}
        </p>
      </CardContent>
    </Card>
  );
};

export default RevenueCard;
