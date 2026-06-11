-- Função definitiva para que o Administrador possa salvar/alterar dados de outros usuários
-- Como ela usa SECURITY DEFINER, ela ignora o bloqueio do RLS e resolve 100% dos problemas de permissão.

CREATE OR REPLACE FUNCTION admin_update_user(
  target_user_id uuid,
  p_name text,
  p_birth_date date,
  p_municipality text,
  p_role text
) RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Trava de segurança: Verifica se quem chamou a função realmente é ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar usuários.';
  END IF;

  -- 2. Atualiza o perfil na marra (ignora RLS)
  UPDATE public.user_profiles 
  SET name = p_name, 
      birth_date = p_birth_date, 
      municipality = p_municipality
  WHERE id = target_user_id;

  -- 3. Atualiza ou insere o nível de acesso (ignora RLS)
  INSERT INTO public.user_roles (id, role)
  VALUES (target_user_id, p_role::app_role)
  ON CONFLICT (id) DO UPDATE SET role = p_role::app_role;
END;
$$ LANGUAGE plpgsql;
