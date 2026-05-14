-- ==========================================
-- 1. ADD USER_ID AND FINANCIAL FIELDS
-- ==========================================

-- Adicionar os campos solicitados em cost_items
ALTER TABLE cost_items 
  RENAME COLUMN in_house TO is_in_house;

ALTER TABLE cost_items 
  ADD COLUMN custom_margin NUMERIC(5,2);

-- Adicionar user_id em todas as tabelas (supondo ambiente multi-tenant)
ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE project_versions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE cost_groups ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE cost_items ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE professionals ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE equipment ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE templates ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- ==========================================
-- 2. UPDATE ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Drop previous open policies
DROP POLICY IF EXISTS "Allow All for Authenticated" ON clients;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON projects;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON project_versions;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON cost_groups;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON cost_items;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON professionals;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON equipment;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON templates;

-- Enable RLS just in case it's not enabled
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies based on auth.uid()
CREATE POLICY "Users can manage their own clients" ON clients 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own projects" ON projects 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own project versions" ON project_versions 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cost groups" ON cost_groups 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cost items" ON cost_items 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own professionals" ON professionals 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own equipment" ON equipment 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own templates" ON templates 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
