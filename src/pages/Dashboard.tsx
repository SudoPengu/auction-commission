
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, PieChart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1D');
  
  // Only admin and super-admin can see analytics
  const canViewAnalytics = user && ['admin', 'super-admin'].includes(user.role);
  
  // Mock data for demonstration
  const getRandomData = (length: number) => {
    return Array.from({ length }, () => Math.floor(Math.random() * 100));
  };
  
  const getChartLabel = () => {
    switch (timeFrame) {
      case '1D': return 'Today\'s Sales';
      case '1W': return 'This Week\'s Sales';
      case '1M': return 'This Month\'s Sales';
      case '3M': return 'Last 3 Months Sales';
      case '1Y': return 'This Year\'s Sales';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      {canViewAnalytics ? (
        <>
          <div className="flex space-x-2 mb-6">
            {(['1D', '1W', '1M', '3M', '1Y'] as TimeFrame[]).map(time => (
              <button
                key={time}
                className={`time-button ${timeFrame === time ? 'active' : ''}`}
                onClick={() => setTimeFrame(time)}
              >
                {time}
              </button>
            ))}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{(Math.random() * 10000).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  +{(Math.random() * 20).toFixed(2)}% from last {timeFrame.toLowerCase()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.floor(Math.random() * 100)}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 15).toFixed(2)}% from last {timeFrame.toLowerCase()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.floor(Math.random() * 50)}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 10).toFixed(2)}% from last {timeFrame.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{getChartLabel()}</CardTitle>
                  <CardDescription>
                    {timeFrame} Sales Overview
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                  <div className="text-muted-foreground text-center">
                    <div className="text-xl mb-2">Graph Visualization</div>
                    <p>Sales data visualization would appear here</p>
                  </div>
                </CardContent>
              </Card>
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
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>POS System</CardTitle>
              <CardDescription>
                Process sales and manage inventory
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center">
              <Button className="bluesky-gradient" onClick={() => window.location.href = '/pos'}>
                Open POS
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your recent actions in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                No recent activity to display
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
