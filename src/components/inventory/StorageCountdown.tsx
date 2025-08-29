
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';

interface StorageCountdownProps {
  expiresAt: string;
  className?: string;
}

export const StorageCountdown: React.FC<StorageCountdownProps> = ({ 
  expiresAt, 
  className 
}) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('EXPIRED');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }

      setIsExpired(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  const getBadgeVariant = () => {
    if (isExpired) return 'destructive';
    
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const hoursLeft = (expiry - now) / (1000 * 60 * 60);
    
    if (hoursLeft <= 6) return 'destructive';
    if (hoursLeft <= 24) return 'secondary';
    return 'outline';
  };

  return (
    <div className={className}>
      <Badge variant={getBadgeVariant()} className="flex items-center gap-1">
        {isExpired ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <Clock className="w-3 h-3" />
        )}
        <span className="text-xs">
          Storage: {timeLeft}
        </span>
      </Badge>
      {isExpired && (
        <p className="text-xs text-destructive mt-1">
          Follow up required for expired storage
        </p>
      )}
    </div>
  );
};
