ALTER TABLE public.ledger_entries 
  ADD COLUMN category text,
  ADD COLUMN entry_date date DEFAULT CURRENT_DATE,
  ADD COLUMN inventory_item_id uuid REFERENCES public.inventory(id),
  ADD COLUMN gross_weight numeric,
  ADD COLUMN deductions numeric,
  ADD COLUMN payment_method text,
  ADD COLUMN crop_type text,
  ADD COLUMN crop_weight numeric;