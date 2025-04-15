
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from "@/components/ui/use-toast";
import POS from './POS';
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
    
    toast({
      title: "Dashboard Loaded",
      description: `Welcome ${profile?.full_name || 'User'}!`,
    });
  }, [profile]);
  
  const canViewAnalytics = profile && ['admin', 'super-admin'].includes(profile.role);
  
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
        <div>
          <p className="text-sm text-muted-foreground">
            Logged in as: <span className="font-semibold">{profile?.full_name} ({profile?.role})</span>
          </p>
        </div>
      </div>
      
      <POS />
      
      {canViewAnalytics ? (
        <>
          <TimeFrameSelector timeFrame={timeFrame} setTimeFrame={setTimeFrame} />
          <MetricCards timeFrame={timeFrame} />
          <AnalyticsTabs getChartLabel={getChartLabel} timeFrame={timeFrame} />
        </>
      ) : (
        <RecentActivity />
      )}
    </div>
  );
};

export default Dashboard;
