CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Nosso lar',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  shared_budget BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_households_updated BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  visibility JSONB NOT NULL DEFAULT '{"plano": true, "treino": true, "cardapio": true, "medidas": false, "bem_estar": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE (household_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_household_members_household ON public.household_members(household_id);
CREATE INDEX idx_household_members_user ON public.household_members(user_id);

CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_household_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_household_member(UUID) TO authenticated;

CREATE POLICY "household visible to members" ON public.households FOR SELECT
  USING (created_by = auth.uid() OR public.is_household_member(id));
CREATE POLICY "household insert by creator" ON public.households FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "household update by members" ON public.households FOR UPDATE
  USING (created_by = auth.uid() OR public.is_household_member(id))
  WITH CHECK (created_by = auth.uid() OR public.is_household_member(id));
CREATE POLICY "household delete by creator" ON public.households FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "member sees own row" ON public.household_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_household_member(household_id));
CREATE POLICY "member insert self or creator invite" ON public.household_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.created_by = auth.uid())
  );
CREATE POLICY "member update own row" ON public.household_members FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.created_by = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.created_by = auth.uid()));
CREATE POLICY "member delete own row" ON public.household_members FOR DELETE
  USING (user_id = auth.uid());

CREATE TABLE public.household_budget_settings (
  household_id UUID PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  amount_brl NUMERIC(10,2) NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'weekly',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_budget_settings TO authenticated;
GRANT ALL ON public.household_budget_settings TO service_role;
ALTER TABLE public.household_budget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household budget rw by members" ON public.household_budget_settings FOR ALL
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));
CREATE TRIGGER trg_household_budget_updated BEFORE UPDATE ON public.household_budget_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shopping_list_items
  ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;

CREATE INDEX idx_shopping_household ON public.shopping_list_items(household_id);

DROP POLICY IF EXISTS "own shopping" ON public.shopping_list_items;
CREATE POLICY "own or household shopping" ON public.shopping_list_items FOR ALL
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );

CREATE OR REPLACE FUNCTION public.accept_household_invite(p_invite_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_household_id UUID;
BEGIN
  SELECT id INTO v_household_id FROM public.households WHERE invite_code = p_invite_code;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Código de convite inválido';
  END IF;

  IF (SELECT count(*) FROM public.household_members WHERE household_id = v_household_id AND status = 'accepted') >= 2 THEN
    RAISE EXCEPTION 'Esse lar já tem duas pessoas conectadas';
  END IF;

  INSERT INTO public.household_members (household_id, user_id, status, joined_at)
  VALUES (v_household_id, auth.uid(), 'accepted', now())
  ON CONFLICT (household_id, user_id)
  DO UPDATE SET status = 'accepted', joined_at = now();

  RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.accept_household_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_household_invite(TEXT) TO authenticated;