
-- 1. Fix broken RLS on group_challenges
DROP POLICY IF EXISTS "challenges visible" ON public.group_challenges;
CREATE POLICY "challenges visible" ON public.group_challenges
FOR SELECT TO authenticated USING (
  scope = 'global'
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.challenge_participants cp
    WHERE cp.challenge_id = group_challenges.id AND cp.user_id = auth.uid()
  )
);

-- 2. Restrict price_confirmations reads to the submitter
DROP POLICY IF EXISTS "price confirmations readable by authenticated" ON public.price_confirmations;
CREATE POLICY "price confirmations readable by owner" ON public.price_confirmations
FOR SELECT TO authenticated USING (confirmed_by = auth.uid());

-- 3. Move SECURITY DEFINER functions out of the exposed public schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.is_household_member(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_friend_connection_member(uuid) SET SCHEMA private;
ALTER FUNCTION public.accept_household_invite(text) SET SCHEMA private;
ALTER FUNCTION public.find_user_by_email(text) SET SCHEMA private;
ALTER FUNCTION public.claim_referral(text) SET SCHEMA private;
ALTER FUNCTION public.get_regional_price(text, text) SET SCHEMA private;
ALTER FUNCTION public.admin_get_metrics() SET SCHEMA private;

-- 4. Public SECURITY INVOKER wrappers so existing RPC clients keep working
CREATE OR REPLACE FUNCTION public.accept_household_invite(p_invite_code text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.accept_household_invite(p_invite_code) $$;

CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS TABLE(id uuid, full_name text) LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT * FROM private.find_user_by_email(p_email) $$;

CREATE OR REPLACE FUNCTION public.claim_referral(p_code text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.claim_referral(p_code) $$;

CREATE OR REPLACE FUNCTION public.get_regional_price(p_item_name text, p_city text)
RETURNS TABLE(avg_price numeric, sample_count bigint) LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT * FROM private.get_regional_price(p_item_name, p_city) $$;

CREATE OR REPLACE FUNCTION public.admin_get_metrics()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.admin_get_metrics() $$;

REVOKE ALL ON FUNCTION public.accept_household_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_referral(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_regional_price(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_metrics() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.accept_household_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_regional_price(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_metrics() TO authenticated;
