import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Package } from 'lucide-react';

export const BulkLabelGenerator: React.FC = () => {
  const [count, setCount] = useState(10);
  const [branchTag, setBranchTag] = useState('Main Branch');
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateLabelsMutation = useMutation({
    mutationFn: async ({ count, branchTag }: { count: number; branchTag: string }) => {
      const { data, error } = await supabase.rpc('reserve_inventory_labels', {
        p_count: count,
        p_branch: branchTag
      });

      if (error) throw error;
      return data as string[];
    },
    onSuccess: (data) => {
      setGeneratedIds(data);
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: "Labels Generated",
        description: `Created ${data.length} new item placeholders`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleGenerate = () => {
    if (count < 1 || count > 100) {
      toast({
        title: "Invalid Count",
        description: "Please enter a number between 1 and 100",
        variant: "destructive"
      });
      return;
    }

    generateLabelsMutation.mutate({ count, branchTag });
  };

  const downloadLabels = () => {
    if (generatedIds.length === 0) return;

    // Create a simple HTML page with QR codes for printing
    const qrCodes = generatedIds.map(id => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(id)}`;
      return `
        <div style="
          display: inline-block; 
          margin: 10px; 
          padding: 10px; 
          border: 1px solid #ccc; 
          text-align: center;
          page-break-inside: avoid;
        ">
          <img src="${qrUrl}" alt="${id}" style="display: block; margin: 0 auto;" />
          <div style="font-family: monospace; font-weight: bold; margin-top: 5px;">${id}</div>
          <div style="font-size: 12px; color: #666;">BlueSky Auction House</div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BlueSky Inventory Labels</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { display: flex; flex-wrap: wrap; }
            @media print {
              body { margin: 0; }
              .container { display: block; }
            }
          </style>
        </head>
        <body>
          <h1>BlueSky Inventory Labels - ${branchTag}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <div class="container">
            ${qrCodes}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bluesky-labels-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Bulk Label Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="count">Number of Labels</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum 100 labels per batch
              </p>
            </div>
            <div>
              <Label htmlFor="branch">Branch Tag</Label>
              <Input
                id="branch"
                value={branchTag}
                onChange={(e) => setBranchTag(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default: Main Branch
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateLabelsMutation.isPending}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {generateLabelsMutation.isPending 
              ? 'Generating...' 
              : `Generate ${count} Labels`
            }
          </Button>
        </CardContent>
      </Card>

      {generatedIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Labels ({generatedIds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                {generatedIds.map(id => (
                  <div 
                    key={id} 
                    className="text-sm font-mono bg-muted p-2 rounded text-center"
                  >
                    {id}
                  </div>
                ))}
              </div>
              <Button onClick={downloadLabels} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Printable Labels
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 Tip: Print labels before shipment arrives, then attach during unloading. 
                Complete item details (photo, name, category) later in the inventory system.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
