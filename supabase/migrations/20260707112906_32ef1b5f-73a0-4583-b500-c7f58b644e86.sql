
-- Trace accounts back to the in-app posting handle
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS device_user_id text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- User reports of suspicious/fake accounts
CREATE TABLE IF NOT EXISTS public.account_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_author_id text NOT NULL,
  reported_author_name text NOT NULL,
  reason text NOT NULL,
  reporter_id text,
  message_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.account_reports TO anon, authenticated;
GRANT ALL ON public.account_reports TO service_role;

ALTER TABLE public.account_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can file a report; nobody but the backend (service_role) can read them.
CREATE POLICY "Anyone can create account reports"
  ON public.account_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
