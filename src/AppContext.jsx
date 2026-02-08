import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { translations } from './translations'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [languageProfile, setLanguageProfile] = useState({ xp: 0, level: 1 })
  const [activeTab, setActiveTab] = useState('home')
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState({ message: '', type: 'info', isOpen: false })

  const showPopup = (message, type = 'info') => {
    setPopup({ message, type, isOpen: true })
    setTimeout(() => {
      setPopup(prev => ({ ...prev, isOpen: false }))
    }, 3000)
  }

  // Appliquer le thème par défaut au chargement initial
  useEffect(() => {
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
        .maybeSingle()

      if (error) throw error

      if (!data) {
        // Créer le profil de langue s'il n'existe pas
        // Utiliser .select().maybeSingle() pour éviter les erreurs si l'insertion échoue ou retourne rien
        const { data: newProfile, error: createError } = await supabase
          .from('language_profiles')
          .insert({ user_id: user.id, language, xp: 0, level: 1 })
          .select()
          .maybeSingle()

        if (createError) {
          // Si erreur de duplication (409), on réessaie de lire le profil existant
          if (createError.code === '23505' || createError.status === 409) {
             const { data: retryData } = await supabase
              .from('language_profiles')
              .select('*')
              .eq('user_id', user.id)
              .eq('language', language)
              .maybeSingle()
              
              if (retryData) {
                data = retryData
              }
          } else {
            // Autre erreur réelle
            console.error("Erreur création profil langue:", createError)
          }
        } else {
          data = newProfile
        }
      }

      setLanguageProfile(data || { xp: 0, level: 1 })
    } catch (err) {
      console.error('Erreur chargement profil de langue:', err)
      // Ne pas écraser avec des valeurs par défaut si c'est juste une erreur réseau temporaire
      // mais si c'est pas critique, on peut laisser tel quel.
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

  // Fonction de traduction
  const t = (path, ...args) => {
    // Langue par défaut : Français
    const lang = profile?.ui_language || 'Français'
    const dict = translations[lang] || translations['Français']
    
    // Récupération de la valeur imbriquée (ex: 'nav.home')
    const keys = path.split('.')
    let value = dict
    for (const k of keys) {
      value = value?.[k]
    }

    // Gestion des fonctions (ex: message avec paramètre)
    if (typeof value === 'function') {
      return value(...args)
    }

    return value || path // Retourne la clé si pas trouvé
  }

  const activeTabValue = {
    profile,
    languageProfile,
    loading,
    updateTheme,
    updateUILanguage,
    updateTargetLanguage,
    addXP,
    refreshProfile: loadProfile,
    refreshLanguageProfile: () => loadLanguageProfile(profile?.target_language),
    activeTab,
    setActiveTab,
    t, // Export de la fonction de traduction
    showPopup,
    popup
  }

  return <AppContext.Provider value={activeTabValue}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp doit être utilisé dans un AppProvider')
  }
  return context
}
