
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  timeFrame: string;
  Icon: LucideIcon;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  timeFrame,
  Icon,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {change} from last {timeFrame.toLowerCase()}
        </p>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
