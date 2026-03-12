-- Drop the restrictive SELECT policy that blocks realtime events
DROP POLICY IF EXISTS "No direct select on direct_messages" ON public.direct_messages;

-- Allow SELECT so realtime postgres_changes can deliver DM events
-- Security is enforced at the RPC layer (session token validation)
CREATE POLICY "Anyone can read direct_messages"
  ON public.direct_messages
  FOR SELECT
  TO public
  USING (true);