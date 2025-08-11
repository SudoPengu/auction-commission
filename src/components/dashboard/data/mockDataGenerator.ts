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
  const baseRevenue = 25000;
  const values = generateTrendData(baseRevenue, labels.length, 0.15, 0.03);
  
  return labels.map((date, index) => ({
    date,
    value: values[index],
    previousPeriod: values[index] * (0.8 + Math.random() * 0.4),
    trend: values[index] > (values[index - 1] || values[index]) ? 'up' : 'down'
  }));
};

export const generateSalesData = (timeFrame: TimeFrame): SalesData[] => {
  const labels = generateDateLabels(timeFrame);
  const baseSales = 150;
  const values = generateTrendData(baseSales, labels.length, 0.2, 0.02);
  
  return labels.map((date, index) => ({
    date,
    value: values[index],
    quantity: Math.round(values[index]),
    averageValue: Math.round((25000 / values[index]) * 100) / 100
  }));
};

export const generateUsersData = (timeFrame: TimeFrame): UsersData[] => {
  const labels = generateDateLabels(timeFrame);
  const baseUsers = 1200;
  const activeUsers = generateTrendData(baseUsers, labels.length, 0.1, 0.025);
  const newUsers = generateTrendData(80, labels.length, 0.3, 0.01);
  
  return labels.map((date, index) => ({
    date,
    value: Math.round(activeUsers[index]),
    activeUsers: Math.round(activeUsers[index]),
    newUsers: Math.round(newUsers[index]),
    growthRate: Math.round(((newUsers[index] / activeUsers[index]) * 100) * 100) / 100
  }));
};

export const generateCategoryData = (): CategoryData[] => {
  const categories = [
    { name: 'Electronics', base: 35, color: 'hsl(var(--primary))' },
    { name: 'Clothing', base: 25, color: 'hsl(var(--secondary))' },
    { name: 'Home & Garden', base: 20, color: 'hsl(var(--accent))' },
    { name: 'Books', base: 12, color: 'hsl(var(--muted))' },
    { name: 'Sports', base: 8, color: 'hsl(var(--destructive))' }
  ];
  
  const total = categories.reduce((sum, cat) => sum + cat.base, 0);
  
  return categories.map(cat => ({
    name: cat.name,
    value: Math.round(cat.base * (0.8 + Math.random() * 0.4) * 1000),
    percentage: Math.round((cat.base / total) * 100),
    color: cat.color
  }));
};

export const generateProductData = (): ProductData[] => {
  const products = [
    'Wireless Headphones',
    'Smart Watch',
    'Laptop Stand',
    'Coffee Maker',
    'Desk Lamp',
    'Phone Case',
    'Water Bottle',
    'Notebook Set'
  ];
  
  return products.map(name => ({
    name,
    sales: Math.round(50 + Math.random() * 200),
    revenue: Math.round((1000 + Math.random() * 5000) * 100) / 100,
    growth: Math.round((Math.random() * 40 - 10) * 100) / 100
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
};
