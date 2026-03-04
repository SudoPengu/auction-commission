import { supabase } from '@/integrations/supabase/client';

export type MockSettlementStatus = 'pending' | 'paid';

export interface SoldLotInput {
  lotId: string;
  auctionId: string;
  bidderId: string;
  lotTitle: string;
  lotNumber: number;
  amount: number;
}

export interface MockLotSettlementRecord extends SoldLotInput {
  status: MockSettlementStatus;
  updatedAt: string;
  updatedBy?: string;
}

const TABLE = 'auction_lot_settlements';

const mapRow = (row: any): MockLotSettlementRecord => ({
  lotId: row.lot_id,
  auctionId: row.auction_id,
  bidderId: row.bidder_id,
  lotTitle: row.lot_title,
  lotNumber: row.lot_number,
  amount: Number(row.amount || 0),
  status: (row.status || 'pending') as MockSettlementStatus,
  updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  updatedBy: row.updated_by || undefined,
});

export const syncSoldLotsToMockSettlement = async (lots: SoldLotInput[]) => {
  if (lots.length === 0) return;

  const payload = lots.map((lot) => ({
    lot_id: lot.lotId,
    auction_id: lot.auctionId,
    bidder_id: lot.bidderId,
    lot_title: lot.lotTitle,
    lot_number: lot.lotNumber,
    amount: lot.amount,
    status: 'pending',
  }));

  const { error } = await (supabase as any)
    .from(TABLE)
    .upsert(payload, { onConflict: 'lot_id', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
};

export const getAuctionMockSettlements = async (auctionId: string): Promise<MockLotSettlementRecord[]> => {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select('*')
    .eq('auction_id', auctionId);

  if (error) throw error;
  return (data || []).map(mapRow);
};

export const getBidderMockSettlements = async (bidderId: string): Promise<MockLotSettlementRecord[]> => {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select('*')
    .eq('bidder_id', bidderId);

  if (error) throw error;
  return (data || []).map(mapRow);
};

export const getAllMockSettlements = async (): Promise<MockLotSettlementRecord[]> => {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select('*');

  if (error) throw error;
  return (data || []).map(mapRow);
};

export const updateMockSettlementStatus = async (
  lotId: string,
  status: MockSettlementStatus,
  updatedBy?: string
) => {
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || null,
  };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  } else {
    updates.paid_at = null;
  }

  const { data, error } = await (supabase as any)
    .from(TABLE)
    .update(updates)
    .eq('lot_id', lotId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
};

export const updateMockSettlementRecord = async (
  lotId: string,
  updates: Partial<Pick<MockLotSettlementRecord, 'status' | 'amount' | 'updatedBy'>>
) => {
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof updates.amount === 'number') dbUpdates.amount = updates.amount;
  if (updates.status) {
    dbUpdates.status = updates.status;
    dbUpdates.paid_at = updates.status === 'paid' ? new Date().toISOString() : null;
  }
  if (updates.updatedBy !== undefined) dbUpdates.updated_by = updates.updatedBy || null;

  const { data, error } = await (supabase as any)
    .from(TABLE)
    .update(dbUpdates)
    .eq('lot_id', lotId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
};
