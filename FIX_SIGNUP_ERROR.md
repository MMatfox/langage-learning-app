# 🚨 Correction de l'erreur d'inscription "Database error saving new user"

Le problème vient d'un déclencheur (trigger) de base de données obsolète qui ne remplit pas le champ obligatoire `email` dans la table `profiles` lors de la création d'un utilisateur Supabase.

## 🛠️ Solution Rapide

1. Ouvre ton projet **Supabase**.
2. Va dans l'onglet **SQL Editor** (l'icône de terminal sur le côté gauche).
3. Crée une **nouvelle requête** (New Query).
4. Copie-colle le code suivant :

```sql
-- Créer ou remplacer la fonction de gestion des nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, xp, level, target_language, ui_language, theme)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'display_name', new.email),
    new.email, -- CRUCIAL: Ce champ manquait !
    0, 
    1,
    'Coréen',
    'Français',
    'light'
  )
  ON CONFLICT (id) DO NOTHING; -- Sécurité supplémentaire
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le déclencheur pour être sûr
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

5. Clique sur **RUN**.

---

### Pourquoi ça plantait ?

La table `profiles` a une contrainte `email NOT NULL`. Le déclencheur précédent essayait d'insérer un profil sans fournir l'email, ce qui causait une violation de contrainte et annulait toute l'inscription.

Une fois ce script exécuté, les inscriptions fonctionneront correctement ! 🚀
