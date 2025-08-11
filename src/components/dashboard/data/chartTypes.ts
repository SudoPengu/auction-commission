export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueData extends ChartDataPoint {
  previousPeriod?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface SalesData extends ChartDataPoint {
  quantity: number;
  averageValue: number;
}

export interface UsersData extends ChartDataPoint {
  activeUsers: number;
  newUsers: number;
  growthRate: number;
}

export interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface ProductData {
  name: string;
  sales: number;
  revenue: number;
  growth: number;
}

export type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface ChartConfig {
  timeFrame: TimeFrame;
  dataPoints: number;
  showTrend: boolean;
  showComparison: boolean;
}