
-- Profiles table for staff info
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Documents (all 4 types)
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('quote','invoice','delivery_note','job_card')),
  doc_number text UNIQUE NOT NULL,
  parent_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_email text,
  customer_phone text,
  customer_address text,
  project_description text,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read docs" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert docs" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Auth update docs" ON public.documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete docs" ON public.documents FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_documents_type ON public.documents(doc_type);
CREATE INDEX idx_documents_parent ON public.documents(parent_id);
CREATE INDEX idx_documents_status ON public.documents(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Line items
CREATE TABLE public.line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_items TO authenticated;
GRANT ALL ON public.line_items TO service_role;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all line items" ON public.line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_line_items_doc ON public.line_items(document_id);

-- Job tasks
CREATE TABLE public.job_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  task_description text NOT NULL DEFAULT '',
  assigned_to text,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_tasks TO authenticated;
GRANT ALL ON public.job_tasks TO service_role;
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all job tasks" ON public.job_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_job_tasks_jc ON public.job_tasks(job_card_id);

-- Activity log
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read activity" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = performed_by);
CREATE INDEX idx_activity_doc ON public.activity_log(document_id);

-- Doc number generator
CREATE OR REPLACE FUNCTION public.generate_doc_number(p_doc_type text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefix text;
  v_year text := to_char(now(), 'YYYY');
  v_max int;
  v_next int;
BEGIN
  v_prefix := CASE p_doc_type
    WHEN 'quote' THEN 'QT'
    WHEN 'invoice' THEN 'INV'
    WHEN 'delivery_note' THEN 'DN'
    WHEN 'job_card' THEN 'JC'
    ELSE 'DOC' END;
  SELECT COALESCE(MAX(CAST(split_part(doc_number, '-', 3) AS int)), 0)
    INTO v_max
    FROM public.documents
    WHERE doc_type = p_doc_type AND doc_number LIKE v_prefix || '-' || v_year || '-%';
  v_next := v_max + 1;
  RETURN v_prefix || '-' || v_year || '-' || lpad(v_next::text, 4, '0');
END; $$;
GRANT EXECUTE ON FUNCTION public.generate_doc_number(text) TO authenticated;
