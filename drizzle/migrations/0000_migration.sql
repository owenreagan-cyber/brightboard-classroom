CREATE TABLE public.slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  position int NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT 'New slide',
  theme text NOT NULL DEFAULT 'sakura',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slides TO authenticated;
GRANT ALL ON public.slides TO service_role;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own slides select" ON public.slides FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own slides insert" ON public.slides FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own slides update" ON public.slides FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own slides delete" ON public.slides FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'My Class',
  students text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rosters TO authenticated;
GRANT ALL ON public.rosters TO service_role;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rosters select" ON public.rosters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own rosters insert" ON public.rosters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rosters update" ON public.rosters FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own rosters delete" ON public.rosters FOR DELETE TO authenticated USING (auth.uid() = user_id);