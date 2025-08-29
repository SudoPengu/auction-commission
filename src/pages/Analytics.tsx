
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import CategoryPieChart from '../components/analytics/charts/CategoryPieChart';
import ProductBarChart from '../components/analytics/charts/ProductBarChart';

const Analytics: React.FC = () => {
  const { profile } = useAuth();
  const canViewAnalytics = profile && ['admin', 'super-admin'].includes(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <div>
          <p className="text-sm text-muted-foreground">
            Logged in as: <span className="font-semibold">{profile?.full_name} ({profile?.role})</span>
          </p>
        </div>
      </div>
      
      {canViewAnalytics ? (
        <Card>
          <CardHeader>
            <CardTitle>Sales Analytics</CardTitle>
            <CardDescription>
              Detailed sales analytics and reporting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <CategoryPieChart />
              <ProductBarChart />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to view analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Please contact an administrator if you need access to this section.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
