import { 
  RevenueData, 
  SalesData, 
  UsersData, 
  CategoryData, 
  ProductData, 
  TimeFrame 
} from './chartTypes';

// Helper function to generate realistic data with trends
const generateTrendData = (
  baseValue: number,
  count: number,
  volatility: number = 0.1,
  trend: number = 0.02
): number[] => {
  const data: number[] = [];
  let current = baseValue;
  
  for (let i = 0; i < count; i++) {
    // Add trend
    current *= (1 + trend + (Math.random() - 0.5) * volatility);
    // Keep values positive
    current = Math.max(current, baseValue * 0.3);
    data.push(Math.round(current * 100) / 100);
  }
  
  return data;
};

// Generate date labels based on timeframe
const generateDateLabels = (timeFrame: TimeFrame): string[] => {
  const now = new Date();
  const labels: string[] = [];
  
  switch (timeFrame) {
    case '1D':
      for (let i = 23; i >= 0; i--) {
        const date = new Date(now);
        date.setHours(date.getHours() - i);
        labels.push(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      }
      break;
    case '1W':
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      }
      break;
    case '1M':
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      break;
    case '3M':
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      break;
    case '1Y':
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      }
      break;
  }
  
  return labels;
};

export const generateRevenueData = (timeFrame: TimeFrame): RevenueData[] => {
  const labels = generateDateLabels(timeFrame);
  
  // TODO: Replace with actual revenue data from backend
  return labels.map((date) => ({
    date,
    value: 0,
    previousPeriod: 0,
    trend: 'up' as const
  }));
};

export const generateSalesData = (timeFrame: TimeFrame): SalesData[] => {
  const labels = generateDateLabels(timeFrame);
  
  // TODO: Replace with actual sales data from backend
  return labels.map((date) => ({
    date,
    value: 0,
    quantity: 0,
    averageValue: 0
  }));
};

export const generateUsersData = (timeFrame: TimeFrame): UsersData[] => {
  const labels = generateDateLabels(timeFrame);
  
  // TODO: Replace with actual user data from backend
  return labels.map((date) => ({
    date,
    value: 0,
    activeUsers: 0,
    newUsers: 0,
    growthRate: 0
  }));
};

export const generateCategoryData = (): CategoryData[] => {
  // TODO: Replace with actual category data from backend
  return [];
};

export const generateProductData = (): ProductData[] => {
  // TODO: Replace with actual product data from backend
  return [];
};
