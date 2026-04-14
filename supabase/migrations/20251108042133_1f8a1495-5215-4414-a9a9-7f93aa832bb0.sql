-- Add position tracking fields to routes table
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS current_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS current_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS speed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_position_update TIMESTAMP WITH TIME ZONE;

-- Enable realtime for routes table
ALTER TABLE public.routes REPLICA IDENTITY FULL;

-- Add routes table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.routes;