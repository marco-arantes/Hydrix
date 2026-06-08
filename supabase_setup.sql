-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  birth_date DATE,
  municipality TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to view profiles (needed for the export to map names)
CREATE POLICY "Allow all authenticated users to view profiles" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, birth_date, municipality)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    (new.raw_user_meta_data->>'birthDate')::DATE,
    new.raw_user_meta_data->>'municipality'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill existing users (Optional: handles any users already registered without meta_data)
INSERT INTO public.user_profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;
