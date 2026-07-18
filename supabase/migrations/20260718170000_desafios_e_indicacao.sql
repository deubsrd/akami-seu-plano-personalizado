-- =========================================================
-- BLOCO 3 (FASE 2) — DESAFIOS EM GRUPO + PROGRAMA DE INDICAÇÃO
-- =========================================================

-- =========================
-- GROUP CHALLENGES
-- =========================
CREATE TABLE public.group_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  metric_key TEXT NOT NULL, -- water_ml | workouts_count | weight_loss_kg ...
  scope TEXT NOT NULL DEFAULT 'global', -- global | connections (amigos/casal do criador)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_challenges TO authenticated;
GRANT ALL ON public.group_challenges TO service_role;
ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

-- Desafios globais são visíveis a todos; desafios "connections" só a quem foi convidado (via challenge_participants)
CREATE POLICY "challenges visible" ON public.group_challenges FOR SELECT
  USING (
    scope = 'global'
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.challenge_id = id AND cp.user_id = auth.uid())
  );
CREATE POLICY "challenges insert by creator" ON public.group_challenges FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "challenges update by creator" ON public.group_challenges FOR UPDATE
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "challenges delete by creator" ON public.group_challenges FOR DELETE
  USING (created_by = auth.uid());

-- =========================
-- CHALLENGE PARTICIPANTS
-- =========================
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

-- Ranking (progresso de todo mundo) é visível a quem participa; a própria linha sempre visível
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

-- =========================
-- REFERRALS (programa de indicação)
-- =========================
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  invited_email TEXT,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | signed_up | converted (assinou apos trial)
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

-- Vincula um novo cadastro a um código de indicação (chamado logo após o signup)
CREATE OR REPLACE FUNCTION public.claim_referral(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_referral RECORD;
BEGIN
  SELECT * INTO v_referral FROM public.referrals WHERE code = p_code AND status = 'pending' FOR UPDATE;
  IF v_referral IS NULL THEN
    RETURN false;
  END IF;
  IF v_referral.referrer_id = auth.uid() THEN
    RETURN false; -- não pode se autoindicar
  END IF;
  UPDATE public.referrals
    SET invited_user_id = auth.uid(), status = 'signed_up'
    WHERE id = v_referral.id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.claim_referral(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;

-- NOTA IMPORTANTE: esta função só marca o convite como "signed_up" no banco.
-- Passar de "signed_up" para "converted" (quando a pessoa indicada assina após o trial)
-- e efetivamente CREDITAR o mes gratis no Stripe precisa acontecer no webhook de pagamento
-- (src/routes/api/public/payments/webhook.ts), chamando a API do Stripe (ex: customer_balance_transactions
-- ou coupon) para o `referrer_id`. Isso ainda não está implementado — ver observação no lib de referrals.
