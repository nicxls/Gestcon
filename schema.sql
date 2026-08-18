-- Criação da tabela de Perfis de Usuários (vinculada à Autenticação)
CREATE TABLE public.perfis (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    matricula TEXT UNIQUE NOT NULL,
    papel TEXT DEFAULT 'leitor', -- 'leitor', 'administrador', 'master'
    aprovado BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela de perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para perfis
CREATE POLICY "Permitir leitura para todos autenticados" ON public.perfis FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir inserção pelo próprio usuário no cadastro" ON public.perfis FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Permitir atualização pelo master" ON public.perfis FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND papel = 'master')
);

-- Tabela de Empresas
CREATE TABLE public.empresas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela de empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Políticas para empresas
CREATE POLICY "Leitura de empresas para autenticados" ON public.empresas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Inserção/Atualização/Deleção de empresas para administradores" ON public.empresas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND (papel = 'administrador' OR papel = 'master'))
);

-- Tabela de Contratos
CREATE TABLE public.contratos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_contrato TEXT NOT NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE RESTRICT NOT NULL,
    tipo_contrato TEXT NOT NULL,
    situacao TEXT NOT NULL,
    motivo_dispensa TEXT,
    processo_contratacao_anterior TEXT,
    lei TEXT,
    conta_vinculada TEXT,
    processo_licitacao TEXT,
    edital TEXT,
    processo_contratacao TEXT,
    servico TEXT,
    quantidade_postos INTEGER,
    cre TEXT,
    valor_mensal NUMERIC,
    vigencia_inicio DATE,
    vigencia_fim DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela de contratos
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Políticas para contratos
CREATE POLICY "Leitura de contratos para autenticados" ON public.contratos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Inserção/Atualização/Deleção de contratos para administradores" ON public.contratos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND (papel = 'administrador' OR papel = 'master'))
);

-- Tabela de Postos
CREATE TABLE public.postos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
    numero_posto TEXT,                -- nullable: gerado automaticamente pelo índice
    municipio TEXT,
    local TEXT,
    carga_horaria TEXT,
    status TEXT DEFAULT 'vago',       -- 'ocupado' ou 'vago'
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela de postos
ALTER TABLE public.postos ENABLE ROW LEVEL SECURITY;

-- Políticas para postos
CREATE POLICY "Leitura de postos para autenticados" ON public.postos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Inserção/Atualização/Deleção de postos para administradores" ON public.postos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND (papel = 'administrador' OR papel = 'master'))
);
