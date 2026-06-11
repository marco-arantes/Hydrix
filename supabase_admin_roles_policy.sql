-- Habilita o acesso de administradores para alterar os níveis de acesso (tabela user_roles)

-- 1. Permite que o ADMIN atualize (UPDATE) os níveis existentes
CREATE POLICY "Allow admins to update user_roles" ON public.user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles admin_role
      WHERE admin_role.id = auth.uid() AND admin_role.role = 'ADMIN'
    )
  );

-- 2. Permite que o ADMIN insira (INSERT) novos níveis (necessário para o upsert)
CREATE POLICY "Allow admins to insert user_roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles admin_role
      WHERE admin_role.id = auth.uid() AND admin_role.role = 'ADMIN'
    )
  );
