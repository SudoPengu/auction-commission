-- Shared settlement state for won auction lots (pending/paid)
create table if not exists public.auction_lot_settlements (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auction_events(id) on delete cascade,
  lot_id uuid not null unique references public.auction_lots(id) on delete cascade,
  bidder_id uuid not null references public.bidders(id) on delete cascade,
  lot_title text not null,
  lot_number integer not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auction_lot_settlements_auction_id
  on public.auction_lot_settlements(auction_id);

create index if not exists idx_auction_lot_settlements_bidder_id
  on public.auction_lot_settlements(bidder_id);

create index if not exists idx_auction_lot_settlements_status
  on public.auction_lot_settlements(status);

alter table public.auction_lot_settlements enable row level security;

drop policy if exists "Admins can manage lot settlements" on public.auction_lot_settlements;
create policy "Admins can manage lot settlements"
on public.auction_lot_settlements
for all
using (public.get_current_user_role()::text = any (array['staff', 'admin', 'super-admin', 'auction-manager']))
with check (public.get_current_user_role()::text = any (array['staff', 'admin', 'super-admin', 'auction-manager']));

drop policy if exists "Bidders can view own lot settlements" on public.auction_lot_settlements;
create policy "Bidders can view own lot settlements"
on public.auction_lot_settlements
for select
using (bidder_id = auth.uid());

drop trigger if exists set_auction_lot_settlements_updated_at on public.auction_lot_settlements;
create trigger set_auction_lot_settlements_updated_at
before update on public.auction_lot_settlements
for each row
execute function public.update_updated_at_column();
