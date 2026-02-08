-- Migration pour ajouter le support multi-langues avec profils séparés par langue

-- 1. Créer la table language_profiles pour stocker XP/niveau par langue
CREATE TABLE IF NOT EXISTS public.language_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  language TEXT NOT NULL, -- 'Coréen', 'Japonais', 'Chinois', etc.
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT language_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT language_profiles_user_language_unique UNIQUE (user_id, language),
  CONSTRAINT language_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 2. Ajouter la colonne 'language' aux tables learned_words et completed_lessons
ALTER TABLE public.learned_words 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Coréen';

ALTER TABLE public.completed_lessons 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Coréen';

-- 3. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_language_profiles_user_language 
ON public.language_profiles(user_id, language);

CREATE INDEX IF NOT EXISTS idx_learned_words_user_language 
ON public.learned_words(user_id, language);

CREATE INDEX IF NOT EXISTS idx_completed_lessons_user_language 
ON public.completed_lessons(user_id, language);

-- 4. Fonction pour initialiser un profil de langue
CREATE OR REPLACE FUNCTION public.init_language_profile(target_lang TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.language_profiles (user_id, language, xp, level)
  VALUES (auth.uid(), target_lang, 0, 1)
  ON CONFLICT (user_id, language) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction pour ajouter de l'XP à une langue spécifique
CREATE OR REPLACE FUNCTION public.add_xp_to_language(amount INTEGER, target_lang TEXT)
RETURNS VOID AS $$
BEGIN
  -- S'assurer que le profil de langue existe
  INSERT INTO public.language_profiles (user_id, language, xp, level)
  VALUES (auth.uid(), target_lang, 0, 1)
  ON CONFLICT (user_id, language) DO NOTHING;
  
  -- Mettre à jour l'XP et le niveau
  UPDATE public.language_profiles
  SET 
    xp = xp + amount,
    level = FLOOR((xp + amount) / 100) + 1,
    updated_at = NOW()
  WHERE user_id = auth.uid() AND language = target_lang;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction pour obtenir les stats d'une langue
CREATE OR REPLACE FUNCTION public.get_language_stats(target_lang TEXT)
RETURNS TABLE(xp INTEGER, level INTEGER) AS $$
BEGIN
  -- S'assurer que le profil existe
  INSERT INTO public.language_profiles (user_id, language, xp, level)
  VALUES (auth.uid(), target_lang, 0, 1)
  ON CONFLICT (user_id, language) DO NOTHING;
  
  -- Retourner les stats
  RETURN QUERY
  SELECT lp.xp, lp.level
  FROM public.language_profiles lp
  WHERE lp.user_id = auth.uid() AND lp.language = target_lang;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Migrer les données existantes vers le nouveau système
-- Créer des profils de langue pour tous les utilisateurs existants basés sur leur target_language
INSERT INTO public.language_profiles (user_id, language, xp, level)
SELECT id, target_language, xp, level
FROM public.profiles
WHERE target_language IS NOT NULL
ON CONFLICT (user_id, language) DO UPDATE
SET xp = EXCLUDED.xp, level = EXCLUDED.level;

-- Mettre à jour les learned_words existants avec la langue du profil
UPDATE public.learned_words lw
SET language = p.target_language
FROM public.profiles p
WHERE lw.user_id = p.id AND lw.language IS NULL;

-- Mettre à jour les completed_lessons existants avec la langue du profil
UPDATE public.completed_lessons cl
SET language = p.target_language
FROM public.profiles p
WHERE cl.user_id = p.id AND cl.language IS NULL;
