import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useAnalyticsData } from '../../dashboard/data/chartDataService';
import ChartWrapper from '../../dashboard/charts/shared/ChartWrapper';

const chartConfig = {
  products: {
    label: "Products",
    color: "hsl(var(--primary))",
  },
};

const ProductBarChart: React.FC = () => {
  const { productData } = useAnalyticsData();

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-primary">
            Revenue: ${data.revenue.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Sales: {data.sales} units
          </p>
          <p className={`text-xs ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Growth: {data.growth >= 0 ? '+' : ''}{data.growth}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartWrapper 
      title="Top Selling Products" 
      description="Products ranked by revenue"
      config={chartConfig}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="horizontal"
          data={productData}
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <XAxis 
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatCurrency}
          />
          <YAxis 
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="revenue"
            fill="hsl(var(--primary))"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default ProductBarChart;