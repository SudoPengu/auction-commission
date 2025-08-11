import { useMemo } from 'react';
import { 
  generateRevenueData,
  generateSalesData,
  generateUsersData,
  generateCategoryData,
  generateProductData
} from './mockDataGenerator';
import { TimeFrame } from './chartTypes';

// Memoized data service to prevent unnecessary regeneration
export const useChartData = (timeFrame: TimeFrame) => {
  const revenueData = useMemo(() => generateRevenueData(timeFrame), [timeFrame]);
  const salesData = useMemo(() => generateSalesData(timeFrame), [timeFrame]);
  const usersData = useMemo(() => generateUsersData(timeFrame), [timeFrame]);
  
  return {
    revenueData,
    salesData,
    usersData
  };
};

export const useAnalyticsData = () => {
  const categoryData = useMemo(() => generateCategoryData(), []);
  const productData = useMemo(() => generateProductData(), []);
  
  return {
    categoryData,
    productData
  };
};

// Future: Replace with real API calls
export const chartDataService = {
  async getRevenueData(timeFrame: TimeFrame) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return generateRevenueData(timeFrame);
  },
  
  async getSalesData(timeFrame: TimeFrame) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return generateSalesData(timeFrame);
  },
  
  async getUsersData(timeFrame: TimeFrame) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return generateUsersData(timeFrame);
  },
  
  async getCategoryBreakdown() {
    await new Promise(resolve => setTimeout(resolve, 100));
    return generateCategoryData();
  },
  
  async getTopProducts() {
    await new Promise(resolve => setTimeout(resolve, 100));
    return generateProductData();
  }
};