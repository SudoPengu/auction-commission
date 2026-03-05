import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { AuctionEvent } from './LiveAuctionCard';

interface AuctionCalendarProps {
  auctions: AuctionEvent[];
  onDateSelect?: (date: Date) => void;
}

export const AuctionCalendar: React.FC<AuctionCalendarProps> = ({ auctions, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const getAuctionsForDate = useCallback((date: number) => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const checkDate = new Date(currentYear, currentMonth, date);
    
    return auctions.filter(auction => {
      const auctionDate = new Date(auction.date);
      return auctionDate.toDateString() === checkDate.toDateString();
    });
  }, [auctions, currentDate]);
  
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const fromIso = prev.toISOString();
      const year = prev.getFullYear();
      const month = prev.getMonth() + (direction === 'prev' ? -1 : 1);
      // Always go to the first of the target month to avoid day overflow (e.g., 31 -> 30/28 issues)
      const newDate = new Date(year, month, 1);
      console.log('AuctionCalendar navigateMonth', { direction, fromIso, toIso: newDate.toISOString() });
      return newDate;
    });
  }, []);
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const today = new Date();
  
  const days = useMemo(() => {
    const list: React.ReactNode[] = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      list.push(<div key={`empty-start-${i}`} className="h-12" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayAuctions = getAuctionsForDate(day);
      const isToday = today.getDate() === day && 
                      today.getMonth() === currentDate.getMonth() && 
                      today.getFullYear() === currentDate.getFullYear();
      
      list.push(
        <div 
          key={day} 
          className={`h-12 border border-border rounded-md p-1 cursor-pointer transition-colors hover:bg-accent ${
            isToday ? 'bg-primary/10 border-primary' : ''
          }`}
          onClick={() => onDateSelect?.(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
        >
          <div className="text-sm font-medium">{day}</div>
          {dayAuctions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {dayAuctions.slice(0, 2).map((auction, idx) => (
                <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    auction.status === 'LIVE' ? 'bg-destructive animate-pulse' :
                    auction.status === 'STARTING_SOON' ? 'bg-orange-500' :
                    auction.status === 'UPCOMING' ? 'bg-primary' :
                    'bg-muted-foreground'
                  }`}
                />
              ))}
              {dayAuctions.length > 2 && (
                <div className="text-xs text-muted-foreground">+{dayAuctions.length - 2}</div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Trailing empty cells to complete the last week row (keeps layout consistent)
    const totalCells = firstDay + daysInMonth;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      list.push(<div key={`empty-end-${i}`} className="h-12" />);
    }

    return list;
  }, [currentDate, getAuctionsForDate, onDateSelect, today]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl leading-tight">
            <CalendarDays size={20} />
            Auction Calendar
          </CardTitle>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              type="button" 
              aria-label="Previous month"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="font-medium text-center text-sm sm:text-base min-w-[110px] sm:min-w-[140px]">
              {monthName} {year}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              type="button" 
              aria-label="Next month"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-7 gap-1 mb-2 min-w-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-xs sm:text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 min-w-0">
          {days}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <span>Live Now</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-orange-500 rounded-full" />
            <span>Starting Soon</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Upcoming</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-muted-foreground rounded-full" />
            <span>Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
