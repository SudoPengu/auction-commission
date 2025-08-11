import React from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
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
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={salesData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default SalesLineChart;