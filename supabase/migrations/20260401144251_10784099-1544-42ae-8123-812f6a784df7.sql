
-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  author_id TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  liked_by TEXT[] NOT NULL DEFAULT '{}',
  reported BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  author_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Messages: anyone can read non-reported, non-expired messages
CREATE POLICY "Anyone can read active messages"
  ON public.messages FOR SELECT
  USING (reported = false AND expires_at > now());

-- Anyone can insert messages
CREATE POLICY "Anyone can create messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

-- Anyone can update messages (for likes)
CREATE POLICY "Anyone can update messages"
  ON public.messages FOR UPDATE
  USING (true);

-- Comments: anyone can read
CREATE POLICY "Anyone can read comments"
  ON public.comments FOR SELECT
  USING (true);

-- Anyone can insert comments
CREATE POLICY "Anyone can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Create indexes
CREATE INDEX idx_messages_expires_at ON public.messages(expires_at);
CREATE INDEX idx_messages_reported ON public.messages(reported);
CREATE INDEX idx_comments_message_id ON public.comments(message_id);
