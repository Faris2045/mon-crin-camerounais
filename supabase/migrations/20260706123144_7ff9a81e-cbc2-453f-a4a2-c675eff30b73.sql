-- 1) Restructure accounts for email-based auth (phone no longer required)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.accounts ALTER COLUMN phone DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON public.accounts (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_unique ON public.accounts (lower(username));

-- 2) Email verification codes (6-digit), only touched by edge functions
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'signup',
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_verifications TO service_role;

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
-- No public policies: only edge functions (service_role) can read/write codes.

CREATE INDEX IF NOT EXISTS email_verifications_email_idx ON public.email_verifications (email, created_at DESC);