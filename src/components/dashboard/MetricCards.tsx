
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, LineChart, PieChart } from 'lucide-react';

interface MetricCardsProps {
  timeFrame: string;
}

const MetricCards: React.FC<MetricCardsProps> = ({ timeFrame }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales</CardTitle>
          <LineChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.floor(Math.random() * 100)}</div>
          <p className="text-xs text-muted-foreground">
            {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 15).toFixed(2)}% from last {timeFrame.toLowerCase()}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.floor(Math.random() * 50)}</div>
          <p className="text-xs text-muted-foreground">
            {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 10).toFixed(2)}% from last {timeFrame.toLowerCase()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricCards;
