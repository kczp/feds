CREATE TABLE public.site_profile (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_profile TO anon, authenticated;
GRANT ALL ON public.site_profile TO service_role;
ALTER TABLE public.site_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the profile" ON public.site_profile FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.site_profile (id, data) VALUES (1, '{}'::jsonb);