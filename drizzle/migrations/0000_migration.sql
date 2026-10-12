
CREATE TABLE public.campus_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.electricity_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.campus_sections(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT current_date,
  kwh numeric NOT NULL CHECK (kwh >= 0 AND kwh <= 100000),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 300),
  is_simulated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.water_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.campus_sections(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT current_date,
  litres numeric NOT NULL CHECK (litres >= 0 AND litres <= 10000000),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 300),
  is_simulated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.waste_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.campus_sections(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT current_date,
  category text NOT NULL CHECK (category IN ('paper','plastic','food','other')),
  kg numeric NOT NULL CHECK (kg >= 0 AND kg <= 100000),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 300),
  is_simulated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('suggestion','wastage')),
  resource text NOT NULL CHECK (resource IN ('electricity','water','waste','other')),
  section_id uuid REFERENCES public.campus_sections(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(description) BETWEEN 5 AND 1000),
  submitter_name text CHECK (submitter_name IS NULL OR char_length(submitter_name) <= 80),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','actioned','resolved')),
  is_simulated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sustainability_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  resource text NOT NULL CHECK (resource IN ('electricity','water','waste','other')),
  completed boolean NOT NULL DEFAULT false,
  is_simulated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['campus_sections','electricity_records','water_records','waste_records','reports','sustainability_actions'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "demo read" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "demo insert" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', t);
  END LOOP;
END $$;

CREATE POLICY "demo update" ON public.campus_sections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo delete" ON public.campus_sections FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "demo update" ON public.reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo update" ON public.sustainability_actions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.campus_sections (name, description, sort_order) VALUES
 ('Classrooms','Lecture halls and tutorial rooms (configurable)',1),
 ('Computer Laboratories','Computing labs and server rooms (configurable)',2),
 ('Library','Reading halls and stacks (configurable)',3),
 ('Administrative Buildings','Offices and admin blocks (configurable)',4),
 ('Canteen','Food service and kitchen areas (configurable)',5),
 ('Other Campus Areas','Grounds, hostels, corridors (configurable)',6);

-- Simulated sample data: 14 days, deterministic pseudo-variation
INSERT INTO public.electricity_records (section_id, record_date, kwh, notes, is_simulated)
SELECT s.id, current_date - d,
  round((CASE s.sort_order WHEN 1 THEN 420 WHEN 2 THEN 610 WHEN 3 THEN 180 WHEN 4 THEN 240 WHEN 5 THEN 150 ELSE 200 END)
    * (CASE WHEN extract(dow FROM current_date - d) IN (0) THEN 0.45 ELSE 1 END)
    * (0.85 + ((d * 7 + s.sort_order * 13) % 30) / 100.0), 1),
  'Simulated sample value', true
FROM public.campus_sections s, generate_series(0,13) d;

INSERT INTO public.water_records (section_id, record_date, litres, notes, is_simulated)
SELECT s.id, current_date - d,
  round((CASE s.sort_order WHEN 1 THEN 3200 WHEN 2 THEN 900 WHEN 3 THEN 700 WHEN 4 THEN 1500 WHEN 5 THEN 6800 ELSE 5200 END)
    * (CASE WHEN extract(dow FROM current_date - d) IN (0) THEN 0.5 ELSE 1 END)
    * (0.8 + ((d * 11 + s.sort_order * 5) % 40) / 100.0)),
  'Simulated sample value', true
FROM public.campus_sections s, generate_series(0,13) d;

INSERT INTO public.waste_records (section_id, record_date, category, kg, notes, is_simulated)
SELECT s.id, current_date - d, c.cat,
  round((c.base * (CASE s.sort_order WHEN 5 THEN 2.5 WHEN 1 THEN 1.2 ELSE 0.6 END)
    * (0.7 + ((d * 3 + s.sort_order) % 50) / 100.0))::numeric, 1),
  'Simulated sample value', true
FROM public.campus_sections s,
  (VALUES ('paper', 8.0), ('plastic', 5.0), ('food', 12.0), ('other', 3.0)) AS c(cat, base),
  generate_series(0,13,2) d
WHERE NOT (c.cat = 'food' AND s.sort_order NOT IN (5,6));

INSERT INTO public.reports (kind, resource, section_id, title, description, submitter_name, status, is_simulated)
SELECT 'wastage','electricity', id, 'Lights on in empty rooms after 6 PM', 'Sample report: lights and fans observed running in empty rooms in the evening.', 'Demo Student', 'under_review', true FROM public.campus_sections WHERE sort_order = 1;
INSERT INTO public.reports (kind, resource, section_id, title, description, submitter_name, status, is_simulated)
SELECT 'wastage','water', id, 'Leaking tap near wash area', 'Sample report: a tap is dripping continuously near the wash basins.', 'Demo Student', 'submitted', true FROM public.campus_sections WHERE sort_order = 5;
INSERT INTO public.reports (kind, resource, section_id, title, description, submitter_name, status, is_simulated)
VALUES ('suggestion','waste', NULL, 'Separate bins for dry and wet waste', 'Sample suggestion: place colour-coded bins in every block with clear signage.', 'Demo Student', 'actioned', true);

INSERT INTO public.sustainability_actions (title, resource, completed, is_simulated) VALUES
 ('Switch corridor lights to LED','electricity', true, true),
 ('Auto shut-down policy for lab PCs','electricity', true, true),
 ('Install tap aerators in washrooms','water', false, true),
 ('Colour-coded segregation bins','waste', true, true),
 ('Canteen food-waste composting pilot','waste', false, true);
