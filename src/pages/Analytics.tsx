
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import POS from './POS';

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
      
      {/* POS Floating Panel */}
      <POS />
      
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Revenue by Category</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                  <p className="text-center text-muted-foreground">
                    Revenue by category chart would appear here
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Selling Products</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                  <p className="text-center text-muted-foreground">
                    Top selling products chart would appear here
                  </p>
                </CardContent>
              </Card>
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
