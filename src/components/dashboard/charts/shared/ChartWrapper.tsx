import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  config?: any;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  description,
  children,
  isLoading = false,
  className = "",
  config = {}
}) => {
  if (isLoading) {
    return (
      <Card className={`min-w-0 ${className}`.trim()}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden px-3 sm:px-6">
          <div className="h-[200px] w-full min-w-0">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`min-w-0 ${className}`.trim()}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="min-w-0 overflow-hidden px-3 sm:px-6">
        <ChartContainer config={config} className="h-[200px] w-full min-w-0 aspect-auto">
          {children as React.ReactElement}
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ChartWrapper;