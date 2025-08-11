import React from 'react';
import { ComposedChart, Bar, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useChartData } from '../data/chartDataService';
import { TimeFrame } from '../data/chartTypes';
import ChartWrapper from './shared/ChartWrapper';

interface UsersComboChartProps {
  timeFrame: TimeFrame;
}

const chartConfig = {
  activeUsers: {
    label: "Active Users",
    color: "hsl(var(--accent))",
  },
  newUsers: {
    label: "New Users",
    color: "hsl(var(--muted))",
  },
  growthRate: {
    label: "Growth Rate",
    color: "hsl(var(--destructive))",
  },
};

const UsersComboChart: React.FC<UsersComboChartProps> = ({ timeFrame }) => {
  const { usersData } = useChartData(timeFrame);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-accent">
            Active: {data.activeUsers.toLocaleString()} users
          </p>
          <p className="text-sm text-muted-foreground">
            New: {data.newUsers} users
          </p>
          <p className="text-sm text-destructive">
            Growth: {data.growthRate}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartWrapper 
      title="User Activity" 
      description="Active users and growth rate"
      config={chartConfig}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={usersData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            yAxisId="users"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            yAxisId="rate"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
            iconType="circle"
          />
          <Bar
            yAxisId="users"
            dataKey="activeUsers"
            fill="hsl(var(--accent))"
            fillOpacity={0.7}
            name="Active Users"
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="growthRate"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 3 }}
            name="Growth Rate (%)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default UsersComboChart;