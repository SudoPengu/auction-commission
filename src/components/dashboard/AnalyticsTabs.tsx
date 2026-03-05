
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RevenueAreaChart from './charts/RevenueAreaChart';
import SalesLineChart from './charts/SalesLineChart';
import UsersComboChart from './charts/UsersComboChart';
import { TimeFrame } from './data/chartTypes';

interface AnalyticsTabsProps {
  timeFrame: TimeFrame;
}

const AnalyticsTabs: React.FC<AnalyticsTabsProps> = ({ timeFrame }) => {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RevenueAreaChart timeFrame={timeFrame} />
          <SalesLineChart timeFrame={timeFrame} />
          <UsersComboChart timeFrame={timeFrame} />
        </div>
      </TabsContent>
      <TabsContent value="analytics" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Analytics</CardTitle>
            <CardDescription>
              Detailed analytics breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <div className="text-xl mb-2">Advanced Analytics</div>
              <p>Detailed metrics would appear here</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="reports" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>
              Generate and view reports
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <div className="text-xl mb-2">Reports System</div>
              <p>Report generation options would appear here</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AnalyticsTabs;
