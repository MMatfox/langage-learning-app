-- Corriger la fonction handle_new_user pour inclure le champ email obligatoire
-- et utiliser le display_name des métadonnées comme username

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, xp, level, target_language, ui_language, theme)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'display_name', new.email),
    new.email, -- CRUCIAL: Ce champ est NOT NULL dans la table profiles
    0, 
    1,
    'Coréen', -- Valeur par défaut, sera mise à jour par l'app
    'Français',
    'light'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que le déclencheur est bien attaché
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
