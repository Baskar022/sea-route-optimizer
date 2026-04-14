ALTER TABLE public.routes
ADD COLUMN IF NOT EXISTS optimization_score NUMERIC,
ADD COLUMN IF NOT EXISTS scoring_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS algorithm TEXT DEFAULT 'astar-haversine-weighted',
ADD COLUMN IF NOT EXISTS route_coords JSONB;
