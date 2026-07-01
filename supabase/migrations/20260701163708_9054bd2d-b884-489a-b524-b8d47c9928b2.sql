
-- 1. Comment replies (denormalized for simple, robust display)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS reply_to_author text,
  ADD COLUMN IF NOT EXISTS reply_to_text text;

-- 2. Alert relevance: community confirmations so only pertinent alerts surface
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS confirmations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmed_by text[] NOT NULL DEFAULT '{}'::text[];

-- 3. Identity: hardware fingerprint for fraud control & anti-duplicate
ALTER TABLE public.identity_traces
  ADD COLUMN IF NOT EXISTS fingerprint text;

-- Fast lookups on phone / fingerprint from the (service-role) verify function
CREATE INDEX IF NOT EXISTS idx_identity_traces_phone ON public.identity_traces (phone);
CREATE INDEX IF NOT EXISTS idx_identity_traces_fingerprint ON public.identity_traces (fingerprint);
