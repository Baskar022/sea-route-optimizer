-- Make user_id optional in routes table
ALTER TABLE public.routes
ALTER COLUMN user_id DROP NOT NULL;
