
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, Users, Clock, Tag, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AuctionEvents: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  
  // Mock auction events data
  const auctionEvents = [
    {
      id: 1,
      title: 'Summer Art Auction',
      date: 'June 15, 2025',
      time: '3:00 PM - 6:00 PM',
      location: 'Main Gallery',
      status: 'Upcoming',
      itemCount: 241,
      registeredBidders: 12
    },
    {
      id: 2,
      title: 'Vintage Collectibles',
      date: 'July 5, 2025',
      time: '1:00 PM - 5:00 PM',
      location: 'East Wing',
      status: 'Upcoming',
      itemCount: 148,
      registeredBidders: 30
    },
    {
      id: 3,
      title: 'Spring Showcase',
      date: 'April 10, 2025',
      time: '2:00 PM - 4:00 PM',
      location: 'West Hall',
      status: 'Completed',
      itemCount: 236,
      registeredBidders: 28,
      totalSales: '$42,500'
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Auction Events</h1>
        <div>
          <p className="text-sm text-muted-foreground">
            Logged in as: <span className="font-semibold">{profile?.full_name} ({profile?.role})</span>
          </p>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Upcoming & Recent Events</h2>
          <p className="text-sm text-muted-foreground">Manage and view all auction events</p>
        </div>
        {isAdmin && (
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            New Event
          </Button>
        )}
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {auctionEvents.map((event) => (
          <Card key={event.id} className={event.status === 'Completed' ? 'bg-muted/20' : ''}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle>{event.title}</CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  event.status === 'Upcoming' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {event.status}
                </span>
              </div>
              <CardDescription className="flex items-center gap-1">
                <CalendarDays size={14} />
                {event.date} • {event.time}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-muted-foreground" />
                  <span className="text-sm">{event.itemCount} Items</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  <span className="text-sm">{event.registeredBidders} Bidders</span>
                </div>
                {event.totalSales && (
                  <div className="col-span-2 flex items-center gap-2">
                    <Clock size={16} className="text-muted-foreground" />
                    <span className="text-sm">Total Sales: {event.totalSales}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full flex justify-between items-center">
                View Details
                <ArrowRight size={16} />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AuctionEvents;
