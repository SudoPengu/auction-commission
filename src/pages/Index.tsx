
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
    <div className="min-h-screen bg-gradient-to-br from-cloud-light to-cloud-medium flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md">
        <div className="flex justify-center">
          <Logo size="large" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-sky-night dark:text-sky-day">
          BlueSky Inc.
        </h1>
        <p className="text-xl text-muted-foreground">
          Cloud-Based POS & Live Auction System
        </p>
        <Button 
          className="px-8 py-6 text-lg brand-gradient text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          onClick={() => navigate('/login')}
        >
          Enter System
        </Button>
      </div>
    </div>
  );
};

export default Index;
