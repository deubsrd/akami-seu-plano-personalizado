-- =========================================================
-- BLOCO 4 — COACH DE IA (CHAT)
-- =========================================================
CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coach messages" ON public.coach_messages FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_coach_messages_user_created ON public.coach_messages(user_id, created_at);

-- =========================================================
-- BLOCO 5 — LOG DE COMIDA POR FOTO
-- =========================================================
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

-- Bucket de storage privado para as fotos de comida (uma pasta por usuário: {user_id}/arquivo.jpg)
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-photos', 'food-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "food photos own read" ON storage.objects FOR SELECT
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "food photos own insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "food photos own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- BLOCO 6 — PREÇO COLABORATIVO NA LISTA DE COMPRAS
-- =========================================================
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
-- Qualquer pessoa autenticada pode LER (é uma base colaborativa por região), mas só insere a própria confirmação
CREATE POLICY "price confirmations readable by authenticated" ON public.price_confirmations FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "price confirmations insert self" ON public.price_confirmations FOR INSERT
  WITH CHECK (confirmed_by = auth.uid());
CREATE INDEX idx_price_confirmations_item_city ON public.price_confirmations(lower(item_name), city);

-- Função: preço médio confirmado por item numa cidade (últimos 90 dias), com contagem de amostras
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

-- =========================================================
-- BLOCO 8 — WEARABLES (apenas estrutura de dados; ver aviso no documento de planejamento)
-- Sem integração real: Apple HealthKit exige app nativo (Capacitor), API pública do Google Fit
-- está em descontinuação, e Garmin exige aprovação prévia de parceria. Tabela criada só para não
-- travar o modelo de dados de referência caso decidam avançar futuramente.
-- =========================================================
CREATE TABLE public.wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- apple_health | google_fit | garmin
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

-- =========================================================
-- BLOCO 9 — PAINEL ADMINISTRATIVO (métricas agregadas, sem dados de saúde individuais)
-- =========================================================
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Função que só retorna métricas agregadas de negócio; nunca dados de saúde por pessoa.
-- Verifica is_admin internamente antes de retornar qualquer coisa.
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
