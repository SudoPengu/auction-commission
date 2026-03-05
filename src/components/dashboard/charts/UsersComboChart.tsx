import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
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
      <ComposedChart data={usersData} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
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
          yAxisId="users"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          width={28}
        />
        <YAxis 
          yAxisId="rate"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(value) => `${value}%`}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
          iconType="circle"
          formatter={(value) => value === 'Growth Rate (%)' ? 'Growth' : value}
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
    </ChartWrapper>
  );
};

export default UsersComboChart;