
import React from 'react';
import { Area, AreaChart, XAxis, YAxis, Tooltip } from 'recharts';
import { useChartData } from '../data/chartDataService';
import { TimeFrame } from '../data/chartTypes';
import ChartWrapper from './shared/ChartWrapper';

interface RevenueAreaChartProps {
  timeFrame: TimeFrame;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
};

const RevenueAreaChart: React.FC<RevenueAreaChartProps> = ({ timeFrame }) => {
  const { revenueData } = useChartData(timeFrame);

  const formatTickLabel = (value: string) => {
    if (!value.includes(':')) return value;
    const [time, meridiem] = value.split(' ');
    return `${time.split(':')[0]} ${meridiem}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-primary">
            Revenue: {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.trend && (
            <p className={`text-xs ${payload[0].payload.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {payload[0].payload.trend === 'up' ? '↗' : '↘'} Trend
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartWrapper 
      title="Revenue Trend" 
      description="Total revenue over time"
      config={chartConfig}
    >
      <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
          </linearGradient>
        </defs>
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
          tickFormatter={formatCurrency}
          width={38}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fillOpacity={1}
          fill="url(#revenueGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartWrapper>
  );
};

export default RevenueAreaChart;
