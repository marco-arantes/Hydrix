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
