ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS dislikes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disliked_by text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.messages
  ALTER COLUMN expires_at SET DEFAULT (now() + '02:00:00'::interval);