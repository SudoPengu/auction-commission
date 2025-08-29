
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, UserCircle, Eye, Phone, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BidderProfiles: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock bidder data
  const bidders = [
    {
      id: 'B001',
      name: 'Angela Mae Santos',
      email: 'angela.santos24@gmail.com',
      phone: '+63 917 542 8931',
      status: 'Active',
      totalPurchases: '₱12,500',
      bidCount: 42,
      lastActive: '2 days ago'
    },
    {
      id: 'B002',
      name: 'Jericho Dela Cruz',
      email: 'jericho.dc@yahoo.com',
      phone: '+63 915 337 1086',
      status: 'Active',
      totalPurchases: '₱8,750',
      bidCount: 28,
      lastActive: '5 days ago'
    },
    {
      id: 'B003',
      name: 'Camille Joy Ramirez',
      email: 'camille.ramirez@outlook.com',
      phone: '+63 927 649 2204',
      status: 'Inactive',
      totalPurchases: '₱3,200',
      bidCount: 15,
      lastActive: '3 months ago'
    },
    {
      id: 'B004',
      name: 'Paolo Enriquez',
      email: 'paolo.enriquez27@gmail.com',
      phone: '+63 918 471 3057',
      status: 'Active',
      totalPurchases: '₱21,300',
      bidCount: 67,
      lastActive: 'Today'
    },
    {
      id: 'B005',
      name: 'Krizia Anne Mendoza',
      email: 'krizia.mendoza@yahoo.com',
      phone: '+63 926 884 7190',
      status: 'Active',
      totalPurchases: '₱5,600',
      bidCount: 19,
      lastActive: '1 week ago'
    }
  ];
  
  // Filter bidders based on search term
  const filteredBidders = bidders.filter(bidder => 
    bidder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bidder.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bidder.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Bidder Profiles</h1>
        <div>
          <p className="text-sm text-muted-foreground">
            Logged in as: <span className="font-semibold">{profile?.full_name} ({profile?.role})</span>
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Registered Bidders</CardTitle>
              <CardDescription>
                View and manage bidder accounts for auctions
              </CardDescription>
            </div>
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              New Bidder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search bidders..." 
                  className="pl-9" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="flex gap-2">
                <Filter size={16} />
                Filter
              </Button>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bidder ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchases</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBidders.map((bidder) => (
                    <TableRow key={bidder.id}>
                      <TableCell className="font-medium">{bidder.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-6 w-6 text-muted-foreground" />
                          {bidder.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {bidder.email}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            {bidder.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={bidder.status === 'Active' ? 'default' : 'secondary'}>
                          {bidder.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{bidder.totalPurchases}</span>
                          <span className="text-xs text-muted-foreground">{bidder.bidCount} bids</span>
                        </div>
                      </TableCell>
                      <TableCell>{bidder.lastActive}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredBidders.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No bidders found matching your search criteria
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BidderProfiles;
