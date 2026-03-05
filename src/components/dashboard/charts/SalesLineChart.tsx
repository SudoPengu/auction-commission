import React from 'react';
import { Line, LineChart, XAxis, YAxis, Tooltip } from 'recharts';
import { useChartData } from '../data/chartDataService';
import { TimeFrame } from '../data/chartTypes';
import ChartWrapper from './shared/ChartWrapper';

interface SalesLineChartProps {
  timeFrame: TimeFrame;
}

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--secondary))",
  },
};

const SalesLineChart: React.FC<SalesLineChartProps> = ({ timeFrame }) => {
  const { salesData } = useChartData(timeFrame);

  const formatTickLabel = (value: string) => {
    if (!value.includes(':')) return value;
    const [time, meridiem] = value.split(' ');
    return `${time.split(':')[0]} ${meridiem}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-secondary">
            Sales: {Math.round(data.value)} units
          </p>
          <p className="text-xs text-muted-foreground">
            Avg Value: ${data.averageValue}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartWrapper 
      title="Sales Volume" 
      description="Number of sales over time"
      config={chartConfig}
    >
      <LineChart data={salesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={formatTickLabel}
          interval="preserveStartEnd"
          minTickGap={20}
          tickMargin={6}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--secondary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, fill: 'hsl(var(--secondary))' }}
        />
      </LineChart>
    </ChartWrapper>
  );
};

export default SalesLineChart;