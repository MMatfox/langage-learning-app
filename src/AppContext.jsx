import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [languageProfile, setLanguageProfile] = useState({ xp: 0, level: 1 })
  const [loading, setLoading] = useState(true)

  // Appliquer le thème par défaut au chargement initial
  useEffect(() => {
    // S'assurer que le thème clair est appliqué par défaut
    document.documentElement.classList.remove('dark')
  }, [])

  // Charger le profil utilisateur et appliquer le thème
  useEffect(() => {
    loadProfile()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  // Charger le profil de langue quand la langue cible change
  useEffect(() => {
    if (profile?.target_language) {
      loadLanguageProfile(profile.target_language)
    }
  }, [profile?.target_language])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)

      // Appliquer le thème globalement
      applyTheme(data.theme)

    } catch (err) {
      console.error('Erreur chargement profil:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadLanguageProfile(language) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupérer ou créer le profil de langue
      let { data, error } = await supabase
        .from('language_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('language', language)
        .single()

      if (error || !data) {
        // Créer le profil de langue s'il n'existe pas
        const { data: newProfile, error: createError } = await supabase
          .from('language_profiles')
          .insert({ user_id: user.id, language, xp: 0, level: 1 })
          .select()
          .single()

        if (createError) throw createError
        data = newProfile
      }

      setLanguageProfile(data)
    } catch (err) {
      console.error('Erreur chargement profil de langue:', err)
      setLanguageProfile({ xp: 0, level: 1 })
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  async function updateTheme(newTheme) {
    if (!profile) return

    // Mise à jour locale immédiate
    setProfile(prev => ({ ...prev, theme: newTheme }))
    
    // Application globale
    applyTheme(newTheme)
    
    // Sauvegarde en BDD
    await supabase
      .from('profiles')
      .update({ theme: newTheme })
      .eq('id', profile.id)
  }

  async function updateUILanguage(language) {
    if (!profile) return

    setProfile(prev => ({ ...prev, ui_language: language }))
    
    await supabase
      .from('profiles')
      .update({ ui_language: language })
      .eq('id', profile.id)
  }

  async function updateTargetLanguage(language) {
    if (!profile) return

    setProfile(prev => ({ ...prev, target_language: language }))
    
    await supabase
      .from('profiles')
      .update({ target_language: language })
      .eq('id', profile.id)

    // Charger le profil de la nouvelle langue
    await loadLanguageProfile(language)
  }

  async function addXP(amount) {
    if (!profile?.target_language) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Ajouter l'XP à la langue spécifique
      const { error } = await supabase.rpc('add_xp_to_language', {
        amount,
        target_lang: profile.target_language
      })

      if (error) throw error

      // Recharger le profil de langue
      await loadLanguageProfile(profile.target_language)
    } catch (err) {
      console.error('Erreur ajout XP:', err)
    }
  }

  const value = {
    profile,
    languageProfile,
    loading,
    updateTheme,
    updateUILanguage,
    updateTargetLanguage,
    addXP,
    refreshProfile: loadProfile,
    refreshLanguageProfile: () => loadLanguageProfile(profile?.target_language)
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp doit être utilisé dans un AppProvider')
  }
  return context
}
