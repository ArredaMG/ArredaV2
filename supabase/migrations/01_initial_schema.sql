-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- DROP EXISTING TABLES TO PREVENT CONFLICTS
-- ==========================================
DROP TABLE IF EXISTS cost_items CASCADE;
DROP TABLE IF EXISTS cost_groups CASCADE;
DROP TABLE IF EXISTS project_versions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS templates CASCADE;

-- ==========================================
-- 1. CLIENTS (Contatos / Contas)
-- ==========================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. PROJECTS (Orçamentos / Projetos principais)
-- ==========================================
-- Status pode ser 'Pendente', 'Aprovado', 'Concluído'
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. PROJECT VERSIONS (Versões do Orçamento)
-- ==========================================
CREATE TABLE project_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Ex: 'V1', 'V2'
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    default_tax NUMERIC(5,2) DEFAULT 10.0,
    default_margin NUMERIC(5,2) DEFAULT 15.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. COST GROUPS (Grupos de Custos dentro da Versão)
-- ==========================================
CREATE TABLE cost_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    margin NUMERIC(5,2), -- Pode herdar do default_margin se for nulo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. COST ITEMS (Itens de Custo)
-- ==========================================
CREATE TABLE cost_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES cost_groups(id) ON DELETE CASCADE,
    role VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 1,
    days NUMERIC(10,2) DEFAULT 1,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    tax NUMERIC(5,2) DEFAULT 0,
    in_house BOOLEAN DEFAULT FALSE,
    executed_cost NUMERIC(15,2),
    receipt_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 6. ASSETS & PROFESSIONALS (Recursos da Produtora)
-- ==========================================
CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    pix VARCHAR(255),
    daily_rate NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    rental_value NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 7. TEMPLATES (Modelos pré-salvos)
-- ==========================================
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL, -- Armazena a estrutura JSON inteira (groups, taxes) para instanciar projetos rápidos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) BASICS
-- ==========================================
-- Aqui ativamos RLS em todas as tabelas principais para garantir que as queries passem pela policy.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- DROP POLICIES IF EXIST BEFORE CREATING (Para evitar erro caso rodando múltiplas vezes)
DROP POLICY IF EXISTS "Allow All for Authenticated" ON clients;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON projects;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON project_versions;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON cost_groups;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON cost_items;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON professionals;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON equipment;
DROP POLICY IF EXISTS "Allow All for Authenticated" ON templates;

-- Exemplo: Permitir acesso total temporário (Atenção: em prod usar auth.uid() para segregar tenants)
CREATE POLICY "Allow All for Authenticated" ON clients FOR ALL USING (true);
CREATE POLICY "Allow All for Authenticated" ON projects FOR ALL USING (true);
CREATE POLICY "Allow All for Authenticated" ON project_versions FOR ALL USING (true);
CREATE POLICY "Allow All for Authenticated" ON cost_groups FOR ALL USING (true);
CREATE POLICY "Allow All for Authenticated" ON cost_items FOR ALL USING (true);
CREATE POLICY "Allow All for Authenticated" ON professionals FOR ALL USING (true);
CREATE POLICY "Allow All for Authenticated" ON equipment FOR ALL USING (true);
CREATE POLICY "Allow All for Authenticated" ON templates FOR ALL USING (true);
