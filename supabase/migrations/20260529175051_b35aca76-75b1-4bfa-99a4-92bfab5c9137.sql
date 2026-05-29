-- SOS / urgency alerts (publicly visible so nearby people can respond)
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  message TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

GRANT SELECT, INSERT, UPDATE ON public.alerts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read alerts"
ON public.alerts FOR SELECT USING (true);

CREATE POLICY "Anyone can create alerts"
ON public.alerts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update alerts"
ON public.alerts FOR UPDATE USING (true);

-- Private identity store for police tracing (insert-only, NOT publicly readable)
CREATE TABLE public.identity_traces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No anon/authenticated SELECT: PII reserved for service_role (law enforcement / admin) only
GRANT INSERT ON public.identity_traces TO anon;
GRANT INSERT ON public.identity_traces TO authenticated;
GRANT ALL ON public.identity_traces TO service_role;

ALTER TABLE public.identity_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register their identity"
ON public.identity_traces FOR INSERT WITH CHECK (true);

-- Realtime for alerts
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;