import React, { useState } from 'react';
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
  
  const getAuctionsForDate = (date: number) => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const checkDate = new Date(currentYear, currentMonth, date);
    
    return auctions.filter(auction => {
      const auctionDate = new Date(auction.date);
      return auctionDate.toDateString() === checkDate.toDateString();
    });
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  
  const days = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-12" />);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayAuctions = getAuctionsForDate(day);
    const isToday = today.getDate() === day && 
                   today.getMonth() === currentDate.getMonth() && 
                   today.getFullYear() === currentDate.getFullYear();
    
    days.push(
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
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays size={20} />
            Auction Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft size={16} />
            </Button>
            <span className="font-medium min-w-[120px] text-center">
              {monthName} {year}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
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