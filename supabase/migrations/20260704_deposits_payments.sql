-- Deposits on quotes and partial payments on invoices.
-- Quotes: deposit_required + deposit_paid
-- Invoices: amount_paid (deposit + any payments recorded)

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS deposit_required numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) NOT NULL DEFAULT 0;
