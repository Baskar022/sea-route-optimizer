-- Fix foreign key constraint to allow NULL values for user_id
ALTER TABLE public.routes
DROP CONSTRAINT IF EXISTS routes_user_id_fkey;

-- Re-add the foreign key constraint that allows NULL
ALTER TABLE public.routes
ADD CONSTRAINT routes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
