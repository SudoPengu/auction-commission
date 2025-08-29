
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLabelGenerator } from '@/hooks/useLabelGenerator';
import { useQRScanner } from '@/hooks/useQRScanner';
import { inventoryService } from '@/services/inventoryService';
import { useToast } from '@/hooks/use-toast';
import { Package, QrCode, ScanLine, TestTube } from 'lucide-react';

export const QRWorkflowTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Array<{ step: string; status: 'pending' | 'success' | 'error'; message?: string }>>([]);
  const { reserveLabelsAndUploadQRs } = useLabelGenerator();
  const { validateQRCode } = useQRScanner();
  const { toast } = useToast();

  const runSmokeTest = async () => {
    setTestResults([]);
    const results: Array<{ step: string; status: 'pending' | 'success' | 'error'; message?: string }> = [];

    // Step 1: Reserve QR codes
    try {
      results.push({ step: 'Reserve 3 QR codes', status: 'pending' });
      setTestResults([...results]);

      const result = await reserveLabelsAndUploadQRs(3, 'Test Branch');
      
      if (result.successful.length > 0) {
        results[results.length - 1] = { 
          step: 'Reserve 3 QR codes', 
          status: 'success', 
          message: `Generated ${result.successful.length} codes: ${result.successful.slice(0, 2).join(', ')}${result.successful.length > 2 ? '...' : ''}` 
        };
      } else {
        results[results.length - 1] = { step: 'Reserve 3 QR codes', status: 'error', message: 'No codes generated' };
      }
      setTestResults([...results]);

      // Step 2: Validate first QR code
      if (result.successful.length > 0) {
        const firstCode = result.successful[0];
        
        results.push({ step: 'Validate QR code', status: 'pending' });
        setTestResults([...results]);

        const validation = await validateQRCode(firstCode);
        
        if (validation.exists && !validation.is_used) {
          results[results.length - 1] = { 
            step: 'Validate QR code', 
            status: 'success', 
            message: `${firstCode} is valid and unused` 
          };
        } else {
          results[results.length - 1] = { 
            step: 'Validate QR code', 
            status: 'error', 
            message: `${firstCode} validation failed: ${!validation.exists ? 'not found' : 'already used'}` 
          };
        }
        setTestResults([...results]);

        // Step 3: Simulate creating an item
        if (validation.exists && !validation.is_used) {
          results.push({ step: 'Create inventory item', status: 'pending' });
          setTestResults([...results]);

          const itemResult = await inventoryService.claimQRAndCreateItem(firstCode, {
            name: 'Test Item',
            category_name: 'Test Category',
            condition: 'used_good',
            quantity: 1,
            starting_bid_price: 100,
            branch_tag: 'Test Branch'
          });

          if (itemResult.success) {
            results[results.length - 1] = { 
              step: 'Create inventory item', 
              status: 'success', 
              message: `Item ${itemResult.item_id} created successfully` 
            };
          } else {
            results[results.length - 1] = { 
              step: 'Create inventory item', 
              status: 'error', 
              message: itemResult.error || 'Failed to create item' 
            };
          }
          setTestResults([...results]);
        }
      }

      toast({
        title: "Smoke Test Complete",
        description: "Check results below",
      });

    } catch (error: any) {
      console.error('Smoke test failed:', error);
      results.push({ 
        step: 'Test execution', 
        status: 'error', 
        message: error.message 
      });
      setTestResults([...results]);
      
      toast({
        title: "Smoke Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          QR Workflow Smoke Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This test verifies the complete QR workflow: generate labels → validate codes → create inventory items.
        </p>
        
        <Button onClick={runSmokeTest} className="w-full">
          <TestTube className="w-4 h-4 mr-2" />
          Run Smoke Test
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm">{result.step}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      result.status === 'success' ? 'default' :
                      result.status === 'error' ? 'destructive' : 'secondary'
                    }
                  >
                    {result.status}
                  </Badge>
                  {result.message && (
                    <span className="text-xs text-muted-foreground max-w-xs truncate">
                      {result.message}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
