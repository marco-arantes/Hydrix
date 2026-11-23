-- 1. Adicionar a coluna de relacionamento na tabela 'events'
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES public.event_types(id);

-- 2. Migrar os dados antigos conectando pelo nome do tipo
UPDATE public.events e
SET event_type_id = et.id
FROM public.event_types et
WHERE e.type = et.name;

-- 3. (OPCIONAL) Após garantir que o sistema está rodando bem com a nova coluna 'event_type_id', 
-- você pode apagar a coluna 'type' de texto antiga para limpar o banco.
-- Descomente a linha abaixo quando tiver certeza:
-- ALTER TABLE public.events DROP COLUMN type;

-- 4. Adicionar coluna 'severity' (Gravidade) na tabela 'events' com padrão 'Baixa'
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'Baixa' CHECK (severity IN ('Baixa', 'Média', 'Alta'));
UPDATE public.events SET severity = 'Baixa' WHERE severity IS NULL;

-- 5. Política para permitir que usuários com nível diferente de CIDADÃO (ex: ADMIN, GESTOR) alterem a gravidade dos eventos
CREATE POLICY "Allow non-citizens to update events" ON public.events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.id = auth.uid() AND user_roles.role != 'CIDADÃO'
    )
  );

-- 6. Adicionar coluna 'status' (Status) na tabela 'events' com padrão 'Aberto'
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Em Atendimento', 'Resolvido'));
UPDATE public.events SET status = 'Aberto' WHERE status IS NULL;
