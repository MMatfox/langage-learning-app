-- Mise à jour de la fonction handle_new_user pour utiliser les métadonnées de langue
-- Cette version prend en compte la sélection utilisateur lors de l'inscription

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    xp, 
    level, 
    target_language, 
    ui_language, 
    theme
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'display_name', new.email),
    new.email, -- CRUCIAL: Ce champ est NOT NULL dans la table profiles
    0, 
    1,
    -- Utiliser la langue choisie ou 'Coréen' par défaut si absente
    COALESCE(new.raw_user_meta_data->>'target_language', 'Coréen'),
    COALESCE(new.raw_user_meta_data->>'ui_language', 'Français'),
    'light'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que le déclencheur est bien attaché (si ce n'est pas déjà fait)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
