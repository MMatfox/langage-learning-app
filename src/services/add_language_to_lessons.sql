-- Ajouter la colonne language à la table lessons pour supporter le multi-langues
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Coréen';

-- Mettre à jour les anciennes leçons sans langue (optionnel, on suppose Coréen par défaut)
UPDATE public.lessons 
SET language = 'Coréen' 
WHERE language IS NULL;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_lessons_user_language 
ON public.lessons(user_id, language);
