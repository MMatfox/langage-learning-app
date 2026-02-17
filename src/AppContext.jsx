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
  const [tutorMessages, setTutorMessages] = useState([])

  const showPopup = (message, type = 'info') => {
    setPopup({ message, type, isOpen: true })
    setTimeout(() => {
      setPopup(prev => ({ ...prev, isOpen: false }))
    }, 3000)
  }

  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  useEffect(() => {
    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

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

      let { data, error } = await supabase
        .from('language_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('language', language)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('language_profiles')
          .insert({ user_id: user.id, language, xp: 0, level: 1 })
          .select()
          .maybeSingle()

        if (createError) {
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
             console.error("Erreur création profil langue:", createError)
          }
        } else {
          data = newProfile
        }
      }

      setLanguageProfile(data || { xp: 0, level: 1 })
    } catch (err) {
      console.error('Erreur chargement profil de langue:', err)
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

    setProfile(prev => ({ ...prev, theme: newTheme }))
    
    applyTheme(newTheme)
    
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

    await loadLanguageProfile(language)
  }

  async function addXP(amount) {
    if (!profile?.target_language) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('add_xp_to_language', {
        amount,
        target_lang: profile.target_language
      })

      if (error) throw error

      await loadLanguageProfile(profile.target_language)
    } catch (err) {
      console.error('Erreur ajout XP:', err)
    }
  }

  const t = (path, ...args) => {
    const lang = profile?.ui_language || 'Français'
    const dict = translations[lang] || translations['Français']
    
    const keys = path.split('.')
    let value = dict
    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value === 'function') {
      return value(...args)
    }

    return value || path
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
    t,
    showPopup,
    popup,
    tutorMessages,
    setTutorMessages
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
