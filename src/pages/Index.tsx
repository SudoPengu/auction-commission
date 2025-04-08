
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from '../components/Logo';

const Index: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically redirect to login
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bluesky-50 to-bluesky-100 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md">
        <div className="flex justify-center">
          <Logo size="large" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-bluesky-800">
          BlueSky Inc.
        </h1>
        <p className="text-xl text-bluesky-600">
          Cloud-Based POS & Live Auction System
        </p>
        <Button 
          className="px-8 py-6 text-lg bluesky-gradient"
          onClick={() => navigate('/login')}
        >
          Enter System
        </Button>
      </div>
    </div>
  );
};

export default Index;
