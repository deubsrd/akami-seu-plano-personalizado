
-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função utilitária de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  birth_date DATE,
  accepted_terms_at TIMESTAMPTZ,
  city TEXT,
  postal_code TEXT,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cria perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- SUBSCRIPTIONS
-- =========================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'trialing', -- trialing, active, past_due, canceled, expired
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription read" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own subscription insert" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subscription update" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- INTAKE FORMS (questionário)
-- =========================
CREATE TABLE public.intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_forms TO authenticated;
GRANT ALL ON public.intake_forms TO service_role;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own intakes" ON public.intake_forms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_intake_user_created ON public.intake_forms(user_id, created_at DESC);

-- =========================
-- GENERATED PLANS
-- =========================
CREATE TABLE public.generated_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_form_id UUID REFERENCES public.intake_forms(id) ON DELETE SET NULL,
  version INT NOT NULL DEFAULT 1,
  metrics JSONB NOT NULL,      -- IMC, TMB, GET, macros...
  training_plan JSONB NOT NULL,
  nutrition_plan JSONB NOT NULL,
  warnings TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_plans TO authenticated;
GRANT ALL ON public.generated_plans TO service_role;
ALTER TABLE public.generated_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.generated_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_plans_user_created ON public.generated_plans(user_id, created_at DESC);

-- =========================
-- BUDGET SETTINGS
-- =========================
CREATE TABLE public.budget_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_brl NUMERIC(10,2) NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'weekly', -- weekly|monthly
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_settings TO authenticated;
GRANT ALL ON public.budget_settings TO service_role;
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budget" ON public.budget_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_budget_updated BEFORE UPDATE ON public.budget_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- SHOPPING LIST ITEMS
-- =========================
CREATE TABLE public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.generated_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT,
  estimated_price_brl NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT ALL ON public.shopping_list_items TO service_role;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shopping" ON public.shopping_list_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_shopping_user_plan ON public.shopping_list_items(user_id, plan_id);
CREATE TRIGGER trg_shopping_updated BEFORE UPDATE ON public.shopping_list_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- MEASUREMENTS LOG
-- =========================
CREATE TABLE public.measurements_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,2),
  waist_cm NUMERIC(5,2),
  hip_cm NUMERIC(5,2),
  chest_cm NUMERIC(5,2),
  arm_cm NUMERIC(5,2),
  thigh_cm NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurements_log TO authenticated;
GRANT ALL ON public.measurements_log TO service_role;
ALTER TABLE public.measurements_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own measurements" ON public.measurements_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_meas_user_date ON public.measurements_log(user_id, measured_on DESC);

-- =========================
-- WORKOUT SESSIONS
-- =========================
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.generated_plans(id) ON DELETE SET NULL,
  performed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_key TEXT,        -- ex: "A", "B"
  exercises JSONB NOT NULL, -- [{name, sets:[{reps, load_kg, rpe}], notes}]
  duration_min INT,
  overall_rpe INT,
  pain_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workouts" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_workouts_user_date ON public.workout_sessions(user_id, performed_on DESC);

-- =========================
-- NUTRITION LOG
-- =========================
CREATE TABLE public.nutrition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_key TEXT,             -- desjejum, almoco, etc.
  description TEXT,
  calories NUMERIC(7,2),
  protein_g NUMERIC(6,2),
  carbs_g NUMERIC(6,2),
  fat_g NUMERIC(6,2),
  followed_plan BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_log TO authenticated;
GRANT ALL ON public.nutrition_log TO service_role;
ALTER TABLE public.nutrition_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition" ON public.nutrition_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_nutri_user_date ON public.nutrition_log(user_id, logged_on DESC);

-- =========================
-- WATER LOG
-- =========================
CREATE TABLE public.water_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_ml INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_log TO authenticated;
GRANT ALL ON public.water_log TO service_role;
ALTER TABLE public.water_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water" ON public.water_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_water_user_date ON public.water_log(user_id, logged_on DESC);

-- =========================
-- WELLNESS LOG
-- =========================
CREATE TABLE public.wellness_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours NUMERIC(3,1),
  stress_level INT,       -- 1-5
  cycle_status TEXT,      -- para registro informativo
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellness_log TO authenticated;
GRANT ALL ON public.wellness_log TO service_role;
ALTER TABLE public.wellness_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wellness" ON public.wellness_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_well_user_date ON public.wellness_log(user_id, logged_on DESC);

-- =========================
-- PROGRESS PHOTOS
-- =========================
CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_path TEXT NOT NULL,
  taken_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own photos" ON public.progress_photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- ACHIEVEMENTS
-- =========================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
