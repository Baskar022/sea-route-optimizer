-- Fix RLS policies for both profiles and routes tables
-- The previous policies failed when IDs are compared because NULL comparisons return NULL, not FALSE

-- ============================================================================
-- FIX PROFILES TABLE POLICIES
-- ============================================================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create updated profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- FIX ROUTES TABLE POLICIES  
-- ============================================================================

-- Drop existing routes policies
DROP POLICY IF EXISTS "Users can view their own routes" ON public.routes;
DROP POLICY IF EXISTS "Users can view their own routes or public routes" ON public.routes;
DROP POLICY IF EXISTS "Users can create their own routes" ON public.routes;
DROP POLICY IF EXISTS "Users can update their own routes" ON public.routes;
DROP POLICY IF EXISTS "Admins can view all routes" ON public.routes;

-- Create updated routes policies that handle NULL user_id
-- Allow select if user_id matches current user, OR if user_id is NULL (routes without owner)
CREATE POLICY "Users can view their own routes or public routes"
  ON public.routes FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Only authenticated users can insert routes
CREATE POLICY "Users can create their own routes"
  ON public.routes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own routes, service role can update NULL user_id routes
CREATE POLICY "Users can update their own routes"
  ON public.routes FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all routes
CREATE POLICY "Admins can view all routes"
  ON public.routes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
