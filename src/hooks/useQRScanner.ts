
import { useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, QRValidationResult } from '@/services/inventoryService';

export interface ScannedQRResult {
  code: string;
  validation: QRValidationResult;
}

export const useQRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedQRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();

  const startScanning = (elementId: string) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }

    setIsScanning(true);
    setError(null);
    setScannedResult(null);

    const scanner = new Html5QrcodeScanner(
      elementId,
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250
        },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(
      async (decodedText) => {
        console.log('QR Code scanned:', decodedText);
        
        try {
          const validation = await inventoryService.validateQR(decodedText);
          
          setScannedResult({
            code: decodedText,
            validation
          });

          if (!validation.exists) {
            toast({
              title: "QR Code Not Found",
              description: "This QR code is not in our system. Generate new labels first.",
              variant: "destructive"
            });
          } else if (validation.is_used) {
            toast({
              title: "QR Code Already Used",
              description: "This QR code has already been assigned to an item.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "QR Code Valid",
              description: "Ready to create inventory item",
            });
          }

          scanner.clear();
          setIsScanning(false);
        } catch (error: any) {
          console.error('QR validation failed:', error);
          setError(error.message);
          toast({
            title: "Validation Failed",
            description: error.message,
            variant: "destructive"
          });
        }
      },
      (errorMessage) => {
        console.log('QR scan error:', errorMessage);
        // Don't show errors for common scanning issues
        if (errorMessage.includes('No QR code found')) {
          return;
        }
        setError(errorMessage);
      }
    );

    scannerRef.current = scanner;
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const validateQRCode = async (code: string): Promise<QRValidationResult> => {
    try {
      const validation = await inventoryService.validateQR(code);
      return validation;
    } catch (error: any) {
      console.error('QR validation failed:', error);
      throw error;
    }
  };

  const reset = () => {
    setScannedResult(null);
    setError(null);
  };

  return {
    isScanning,
    scannedResult,
    error,
    startScanning,
    stopScanning,
    validateQRCode,
    reset
  };
};
