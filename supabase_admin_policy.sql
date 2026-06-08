-- Create policy to allow admins to update all profiles
-- Isso é necessário para que os administradores possam alterar os dados dos usuários no Painel Admin.
CREATE POLICY "Allow admins to update all profiles" ON public.user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'ADMIN'
    )
  );
