import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from "@/components/ui/card";
import { Info } from 'lucide-react';
import TimeFrameSelector from '../components/dashboard/TimeFrameSelector';
import MetricCards from '../components/dashboard/MetricCards';
import AnalyticsTabs from '../components/dashboard/AnalyticsTabs';
import RecentActivity from '../components/dashboard/RecentActivity';

type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1D');
  
  useEffect(() => {
    console.log("Dashboard mounted, user profile:", profile);
  }, [profile]);
  
  const canViewAnalytics = profile && ['admin', 'super-admin'].includes(profile.role);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div>
          <p className="text-sm text-muted-foreground">
            Logged in as: <span className="font-semibold">{profile?.full_name} ({profile?.role})</span>
          </p>
        </div>
      </div>
      
      {canViewAnalytics ? (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <TimeFrameSelector timeFrame={timeFrame} setTimeFrame={setTimeFrame} />
            <MetricCards timeFrame={timeFrame} />
            <AnalyticsTabs timeFrame={timeFrame} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <RecentActivity />
          </CardContent>
        </Card>
      )}
      
      {/* Color Legend */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Status Colors</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span className="text-muted-foreground">Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent rounded"></div>
              <span className="text-muted-foreground">Activity</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default Dashboard;
