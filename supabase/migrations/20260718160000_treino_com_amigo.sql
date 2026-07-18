-- =========================================================
-- BLOCO 2 (FASE 2) — TREINO COM AMIGO
-- friend_connections, shared_workouts, busca de usuário por e-mail
-- =========================================================

-- =========================
-- FRIEND CONNECTIONS
-- =========================
CREATE TABLE public.friend_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined
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

-- Impede duplicidade de convite entre o mesmo par, em qualquer direção
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

-- Função auxiliar para checar participação em uma conexão aceita
CREATE OR REPLACE FUNCTION public.is_friend_connection_member(p_connection_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_connections
    WHERE id = p_connection_id
      AND status = 'accepted'
      AND (requester_id = auth.uid() OR addressee_id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_friend_connection_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_friend_connection_member(UUID) TO authenticated;

-- =========================
-- SHARED WORKOUTS
-- =========================
CREATE TABLE public.shared_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.friend_connections(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ,
  workout_plan JSONB NOT NULL, -- { shared_notes, per_user: { [user_id]: {exercises...} } }
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | completed | canceled
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

-- =========================
-- BUSCA DE USUÁRIO POR E-MAIL (para enviar convite de treino)
-- Retorna apenas id + nome, nunca a lista completa nem outros dados sensíveis.
-- =========================
CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, full_name TEXT) AS $$
  SELECT u.id, p.full_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(p_email)
    AND u.id <> auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated;
