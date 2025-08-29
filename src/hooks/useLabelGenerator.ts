
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { inventoryService } from '@/services/inventoryService';
import QRCode from 'qrcode';

export interface GenerateLabelsProgress {
  total: number;
  completed: number;
  failed: string[];
  currentCode?: string;
}

export const useLabelGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerateLabelsProgress | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const { toast } = useToast();

  const generateQRImage = async (code: string): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, code, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/png');
    });
  };

  const reserveLabelsAndUploadQRs = async (count: number, branch: string = 'Main Branch') => {
    setIsGenerating(true);
    setProgress({
      total: count,
      completed: 0,
      failed: []
    });
    setGeneratedCodes([]);

    try {
      // Step 1: Reserve QR codes
      toast({
        title: "Reserving QR Codes",
        description: `Reserving ${count} QR codes...`,
      });

      const codes = await inventoryService.reserveQRCodes(count, branch);
      console.log('Reserved codes:', codes);

      const successful: string[] = [];
      const failed: string[] = [];

      // Step 2: Generate and upload QR images
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        setProgress(prev => prev ? {
          ...prev,
          currentCode: code,
          completed: i
        } : null);

        try {
          // Generate QR image
          const imageBlob = await generateQRImage(code);
          
          // Upload to storage
          const { publicUrl, path } = await inventoryService.uploadQRImage(code, imageBlob);
          
          // Find the QR record and update it with paths
          const qrValidation = await inventoryService.validateQR(code);
          if (qrValidation.exists && qrValidation.qr_id) {
            await inventoryService.updateQRCodePaths(qrValidation.qr_id, path, publicUrl);
          }

          successful.push(code);
          console.log(`Generated QR for ${code}:`, publicUrl);
        } catch (error) {
          console.error(`Failed to generate QR for ${code}:`, error);
          failed.push(code);
        }
      }

      setProgress({
        total: count,
        completed: successful.length,
        failed
      });

      setGeneratedCodes(successful);

      toast({
        title: "QR Generation Complete",
        description: `Generated ${successful.length} QR codes${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
        variant: failed.length > 0 ? "destructive" : "default"
      });

      return { successful, failed };

    } catch (error: any) {
      console.error('Label generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const retryFailedCodes = async (failedCodes: string[]) => {
    if (failedCodes.length === 0) return;

    setIsGenerating(true);
    setProgress({
      total: failedCodes.length,
      completed: 0,
      failed: []
    });

    const successful: string[] = [];
    const stillFailed: string[] = [];

    for (let i = 0; i < failedCodes.length; i++) {
      const code = failedCodes[i];
      setProgress(prev => prev ? {
        ...prev,
        currentCode: code,
        completed: i
      } : null);

      try {
        const imageBlob = await generateQRImage(code);
        const { publicUrl, path } = await inventoryService.uploadQRImage(code, imageBlob);
        
        const qrValidation = await inventoryService.validateQR(code);
        if (qrValidation.exists && qrValidation.qr_id) {
          await inventoryService.updateQRCodePaths(qrValidation.qr_id, path, publicUrl);
        }

        successful.push(code);
      } catch (error) {
        console.error(`Retry failed for ${code}:`, error);
        stillFailed.push(code);
      }
    }

    setProgress({
      total: failedCodes.length,
      completed: successful.length,
      failed: stillFailed
    });

    setGeneratedCodes(prev => [...prev, ...successful]);

    toast({
      title: "Retry Complete",
      description: `Generated ${successful.length} additional QR codes${stillFailed.length > 0 ? `, ${stillFailed.length} still failed` : ''}`,
    });

    setIsGenerating(false);
  };

  const reset = () => {
    setProgress(null);
    setGeneratedCodes([]);
  };

  return {
    isGenerating,
    progress,
    generatedCodes,
    reserveLabelsAndUploadQRs,
    retryFailedCodes,
    reset
  };
};
