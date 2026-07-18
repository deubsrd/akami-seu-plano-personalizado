-- BLOCO 2 — TREINO COM AMIGO
CREATE TABLE public.friend_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  score_requester INT,
  score_addressee INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_connections TO authenticated;
GRANT ALL ON public.friend_connections TO service_role;
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_friend_connections_pair
  ON public.friend_connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX idx_friend_connections_requester ON public.friend_connections(requester_id);
CREATE INDEX idx_friend_connections_addressee ON public.friend_connections(addressee_id);
CREATE POLICY "connections visible to participants" ON public.friend_connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "connections created by requester" ON public.friend_connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "connections updated by participants" ON public.friend_connections FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "connections deleted by participants" ON public.friend_connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE OR REPLACE FUNCTION public.is_friend_connection_member(p_connection_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_connections
    WHERE id = p_connection_id AND status = 'accepted'
      AND (requester_id = auth.uid() OR addressee_id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_friend_connection_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_friend_connection_member(UUID) TO authenticated;

CREATE TABLE public.shared_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.friend_connections(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ,
  workout_plan JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_workouts TO authenticated;
GRANT ALL ON public.shared_workouts TO service_role;
ALTER TABLE public.shared_workouts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_shared_workouts_connection ON public.shared_workouts(connection_id);
CREATE POLICY "shared workouts visible to connection members" ON public.shared_workouts FOR SELECT
  USING (public.is_friend_connection_member(connection_id));
CREATE POLICY "shared workouts insert by connection members" ON public.shared_workouts FOR INSERT
  WITH CHECK (public.is_friend_connection_member(connection_id) AND created_by = auth.uid());
CREATE POLICY "shared workouts update by connection members" ON public.shared_workouts FOR UPDATE
  USING (public.is_friend_connection_member(connection_id))
  WITH CHECK (public.is_friend_connection_member(connection_id));
CREATE POLICY "shared workouts delete by connection members" ON public.shared_workouts FOR DELETE
  USING (public.is_friend_connection_member(connection_id));

CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, full_name TEXT) AS $$
  SELECT u.id, p.full_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(p_email) AND u.id <> auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated;

-- BLOCO 3 — DESAFIOS + INDICAÇÃO
CREATE TABLE public.group_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  metric_key TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_challenges TO authenticated;
GRANT ALL ON public.group_challenges TO service_role;
ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.group_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress NUMERIC(12,2) NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);

CREATE POLICY "challenges visible" ON public.group_challenges FOR SELECT
  USING (
    scope = 'global' OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.challenge_id = id AND cp.user_id = auth.uid())
  );
CREATE POLICY "challenges insert by creator" ON public.group_challenges FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "challenges update by creator" ON public.group_challenges FOR UPDATE
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "challenges delete by creator" ON public.group_challenges FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "participants visible to co-participants" ON public.challenge_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants me
      WHERE me.challenge_id = challenge_participants.challenge_id AND me.user_id = auth.uid()
    )
  );
CREATE POLICY "participants insert self" ON public.challenge_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants update self" ON public.challenge_participants FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants delete self" ON public.challenge_participants FOR DELETE
  USING (user_id = auth.uid());

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  invited_email TEXT,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_months_credited INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE POLICY "referrals visible to referrer" ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid());
CREATE POLICY "referrals insert by referrer" ON public.referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid());
CREATE POLICY "referrals update by referrer" ON public.referrals FOR UPDATE
  USING (referrer_id = auth.uid()) WITH CHECK (referrer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_referral(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE v_referral RECORD;
BEGIN
  SELECT * INTO v_referral FROM public.referrals WHERE code = p_code AND status = 'pending' FOR UPDATE;
  IF v_referral IS NULL THEN RETURN false; END IF;
  IF v_referral.referrer_id = auth.uid() THEN RETURN false; END IF;
  UPDATE public.referrals SET invited_user_id = auth.uid(), status = 'signed_up' WHERE id = v_referral.id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.claim_referral(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;

-- BLOCO 4 — COACH DE IA
CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coach messages" ON public.coach_messages FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_coach_messages_user_created ON public.coach_messages(user_id, created_at);

-- BLOCO 5 — FOTO DE COMIDA
CREATE TABLE public.food_photo_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_path TEXT NOT NULL,
  logged_on DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_description TEXT,
  estimated_calories NUMERIC(7,2),
  estimated_protein_g NUMERIC(6,2),
  estimated_carbs_g NUMERIC(6,2),
  estimated_fat_g NUMERIC(6,2),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  nutrition_log_id UUID REFERENCES public.nutrition_log(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_photo_logs TO authenticated;
GRANT ALL ON public.food_photo_logs TO service_role;
ALTER TABLE public.food_photo_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food photo logs" ON public.food_photo_logs FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_food_photo_logs_user_date ON public.food_photo_logs(user_id, logged_on DESC);

-- Storage policies para o bucket food-photos (bucket criado via ferramenta)
CREATE POLICY "food photos own read" ON storage.objects FOR SELECT
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "food photos own insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "food photos own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- BLOCO 6 — PREÇO COLABORATIVO
CREATE TABLE public.price_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  price_brl NUMERIC(10,2) NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.price_confirmations TO authenticated;
GRANT ALL ON public.price_confirmations TO service_role;
ALTER TABLE public.price_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price confirmations readable by authenticated" ON public.price_confirmations FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "price confirmations insert self" ON public.price_confirmations FOR INSERT
  WITH CHECK (confirmed_by = auth.uid());
CREATE INDEX idx_price_confirmations_item_city ON public.price_confirmations(lower(item_name), city);

CREATE OR REPLACE FUNCTION public.get_regional_price(p_item_name TEXT, p_city TEXT)
RETURNS TABLE(avg_price NUMERIC, sample_count BIGINT) AS $$
  SELECT avg(price_brl)::NUMERIC(10,2), count(*)
  FROM public.price_confirmations
  WHERE lower(item_name) = lower(p_item_name)
    AND (p_city IS NULL OR city = p_city)
    AND confirmed_at > now() - interval '90 days';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_regional_price(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_regional_price(TEXT, TEXT) TO authenticated;

-- BLOCO 8 — WEARABLES (só estrutura)
CREATE TABLE public.wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wearable_connections TO authenticated;
GRANT ALL ON public.wearable_connections TO service_role;
ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wearable connections" ON public.wearable_connections FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- BLOCO 9 — PAINEL ADMIN
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_get_metrics()
RETURNS JSONB AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;
  SELECT jsonb_build_object(
    'active_users', (SELECT count(*) FROM public.profiles),
    'trials_active', (SELECT count(*) FROM public.subscriptions WHERE status = 'trialing'),
    'subscriptions_active', (SELECT count(*) FROM public.subscriptions WHERE status = 'active'),
    'subscriptions_canceled', (SELECT count(*) FROM public.subscriptions WHERE status IN ('canceled', 'expired')),
    'households_active', (SELECT count(*) FROM public.households),
    'friend_connections_accepted', (SELECT count(*) FROM public.friend_connections WHERE status = 'accepted'),
    'referrals_total', (SELECT count(*) FROM public.referrals),
    'referrals_converted', (SELECT count(*) FROM public.referrals WHERE status = 'converted'),
    'active_challenges', (SELECT count(*) FROM public.group_challenges WHERE ends_on >= CURRENT_DATE)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.admin_get_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_metrics() TO authenticated;