
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, Shield, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

type ProfileType = 'admin' | 'staff' | null;

const Login: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<ProfileType>(null);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleProfileSelect = (profileType: ProfileType) => {
    setSelectedProfile(profileType);
    setIsCodeDialogOpen(true);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setIsSubmitting(true);
    const success = await login(code);
    
    if (success) {
      setIsCodeDialogOpen(false);
      setCode('');
      navigate('/dashboard');
    }
    
    setIsSubmitting(false);
  };

  const closeDialog = () => {
    setIsCodeDialogOpen(false);
    setCode('');
  };

  const ProfileCard = ({ 
    type, 
    title, 
    icon, 
    description 
  }: { 
    type: ProfileType, 
    title: string, 
    icon: React.ReactNode, 
    description: string 
  }) => (
    <div 
      className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
      onClick={() => handleProfileSelect(type)}
    >
      <Card className="w-full">
        <CardHeader className="pb-2 text-center">
          <div className="mx-auto mb-2 bg-secondary rounded-full p-3 w-16 h-16 flex items-center justify-center">
            {icon}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <Logo size="large" />
          </div>
          <CardTitle className="text-2xl">Select Profile</CardTitle>
          <CardDescription>
            Choose a profile to access the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProfileCard 
              type="admin"
              title="Admin"
              icon={<ShieldCheck className="h-8 w-8 text-primary" />}
              description="Administrator access with full system controls"
            />
            <ProfileCard 
              type="staff"
              title="Staff"
              icon={<User className="h-8 w-8 text-primary" />}
              description="Standard staff access for daily operations"
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-sm bg-background/95">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">
              {selectedProfile === 'admin'
                ? 'Enter Admin Access Code'
                : 'Enter Staff Access Code'}
            </DialogTitle>
            <DialogDescription className="text-center">
              Please enter your access code to continue
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2 py-4">
              <Input
                id="code"
                type="password"
                placeholder="Enter your access code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center text-lg py-6"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={closeDialog}
                type="button"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bluesky-gradient"
                disabled={isSubmitting || !code.trim()}
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
