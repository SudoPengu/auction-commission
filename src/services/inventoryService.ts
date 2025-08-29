
import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
  id: string;
  name: string | null;
  category_id: bigint | null;
  category_name: string | null;
  condition: 'brand_new' | 'like_new' | 'used_good' | 'used_fair' | 'damaged';
  quantity: number;
  sold_quantity: number;
  starting_bid_price: number;
  expected_sale_price: number | null;
  final_sale_price: number | null;
  status: 'pending_auction' | 'auctioned_sold' | 'auctioned_unsold' | 'walk_in_available' | 'locked';
  photo_url: string | null;
  storage_expires_at: string | null;
  branch_tag: string;
  qr_id: string | null;
  qr_path: string | null;
  qr_code_url: string | null;
  qr_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface QRCode {
  id: string;
  code: string;
  branch_tag: string;
  printed: boolean;
  is_used: boolean;
  qr_path: string | null;
  qr_code_url: string | null;
  created_at: string;
  used_at: string | null;
  used_by: string | null;
}

export interface QRValidationResult {
  exists: boolean;
  is_used?: boolean;
  qr_id?: string;
  qr_path?: string | null;
  qr_code_url?: string | null;
  branch_tag?: string;
}

export interface ItemCreateData {
  name?: string;
  category_id?: number;
  category_name?: string;
  condition?: 'brand_new' | 'like_new' | 'used_good' | 'used_fair' | 'damaged';
  quantity?: number;
  starting_bid_price?: number;
  expected_sale_price?: number;
  photo_url?: string;
  branch_tag?: string;
}

export const inventoryService = {
  // Reserve QR codes without creating inventory items
  async reserveQRCodes(count: number, branch: string = 'Main Branch'): Promise<string[]> {
    const { data, error } = await supabase.rpc('reserve_qr_codes', {
      p_count: count,
      p_branch: branch
    });

    if (error) throw error;
    return data as string[];
  },

  // Validate a scanned QR code
  async validateQR(code: string): Promise<QRValidationResult> {
    const { data, error } = await supabase.rpc('qr_validate', {
      p_code: code
    });

    if (error) throw error;
    return data as QRValidationResult;
  },

  // Claim QR and create inventory item atomically
  async claimQRAndCreateItem(code: string, itemData: ItemCreateData): Promise<{
    success: boolean;
    error?: string;
    item_id?: string;
    qr_id?: string;
  }> {
    const { data, error } = await supabase.rpc('qr_claim_and_create_inventory', {
      p_code: code,
      p_item: itemData
    });

    if (error) throw error;
    return data;
  },

  // Upload QR code image to storage
  async uploadQRImage(code: string, imageBlob: Blob): Promise<{
    publicUrl: string;
    path: string;
  }> {
    const fileName = `${code}.png`;
    const { data, error } = await supabase.storage
      .from('qr-codes')
      .upload(fileName, imageBlob, {
        upsert: true,
        contentType: 'image/png'
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('qr-codes')
      .getPublicUrl(fileName);

    return {
      publicUrl,
      path: data.path
    };
  },

  // Update QR code with image paths
  async updateQRCodePaths(qrId: string, qrPath: string, qrCodeUrl: string): Promise<void> {
    const { error } = await supabase
      .from('qr_codes')
      .update({
        qr_path: qrPath,
        qr_code_url: qrCodeUrl
      })
      .eq('id', qrId);

    if (error) throw error;
  },

  // Get all inventory items
  async getInventoryItems(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get single inventory item
  async getInventoryItem(id: string): Promise<InventoryItem | null> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Update inventory item
  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
    const { error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // Get all QR codes
  async getQRCodes(): Promise<QRCode[]> {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
