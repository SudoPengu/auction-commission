import React from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatCurrency}
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
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default RevenueAreaChart;