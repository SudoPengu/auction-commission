import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, ScanLine, BarChart3, TrendingUp, Info } from 'lucide-react';
import TimeFrameSelector from '../components/dashboard/TimeFrameSelector';
import MetricCards from '../components/dashboard/MetricCards';
import AnalyticsTabs from '../components/dashboard/AnalyticsTabs';
import RecentActivity from '../components/dashboard/RecentActivity';

type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1D');
  
  useEffect(() => {
    console.log("Dashboard mounted, user profile:", profile);
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
      
      {/* QR Scanning Hero Section - Now fully clickable */}
      <Card 
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/30 to-secondary/40 border border-primary/30 hover:from-primary/25 hover:via-accent/35 hover:to-secondary/45 hover:border-primary/40 hover:shadow-lg hover:scale-[1.01] transition-all duration-300 cursor-pointer group"
        onClick={() => navigate('/qr-scanner')}
      >
        <CardContent className="p-8">
          {/* Decorative background shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-xl transform translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-lg transform -translate-x-8 translate-y-8" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 bg-primary/30 rounded-2xl backdrop-blur-sm group-hover:bg-primary/40 transition-colors border border-primary/20">
                <QrCode className="h-10 w-10 text-primary" />
              </div>
              <div className="text-foreground">
                <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">Faster intake with QR scanning</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">Scan items to create and manage inventory in seconds.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ScanLine className="h-6 w-6 text-primary/80 animate-pulse group-hover:text-primary transition-colors" />
              <div className="text-right">
                <div className="text-muted-foreground text-sm font-semibold">Click anywhere to</div>
                <div className="text-foreground text-lg font-bold group-hover:text-primary transition-colors">Start Scanning</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {canViewAnalytics ? (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <TimeFrameSelector timeFrame={timeFrame} setTimeFrame={setTimeFrame} />
            <MetricCards timeFrame={timeFrame} />
            <AnalyticsTabs getChartLabel={getChartLabel} timeFrame={timeFrame} />
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
              <div className="w-3 h-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded"></div>
              <span className="text-muted-foreground">QR Operations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-muted-foreground">Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-muted-foreground">Activity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
