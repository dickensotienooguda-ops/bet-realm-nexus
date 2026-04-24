ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS checkout_id text;
CREATE INDEX IF NOT EXISTS idx_transactions_checkout_id ON public.transactions(checkout_id);