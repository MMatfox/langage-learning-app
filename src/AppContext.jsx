import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { translations } from './translations'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [languageProfile, setLanguageProfile] = useState({ xp: 0, level: 1 })
  const [activeTab, setActiveTab] = useState('home')
  const [learnTab, setLearnTab] = useState('lessons')
  const [reviewTab, setReviewTab] = useState('revision')
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState({ message: '', type: 'info', isOpen: false })
  const [tutorMessages, setTutorMessages] = useState([])

  const [confirmState, setConfirmState] = useState({ 
    isOpen: false, 
    message: '', 
    onConfirm: () => {}, 
    onCancel: () => {} 
  })

  const showPopup = (message, type = 'info') => {
    setPopup({ message, type, isOpen: true })
    setTimeout(() => {
      setPopup(prev => ({ ...prev, isOpen: false }))
    }, 3000)
  }

  const askConfirmation = (message, onConfirm, onCancel = () => {}) => {
    setConfirmState({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm()
        setConfirmState(prev => ({ ...prev, isOpen: false }))
      },
      onCancel: () => {
        onCancel()
        setConfirmState(prev => ({ ...prev, isOpen: false }))
      }
    })
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

  // Formula: XP required for level L = 50 * L * (L - 1)
  // Inverse: L = (1 + sqrt(1 + 0.08 * XP)) / 2
  
  function getLevelFromXP(xp) {
    return Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2)
  }

  function getXPForLevel(level) {
    return 50 * level * (level - 1)
  }

  async function addXP(amount) {
    if (!profile?.target_language) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get latest data to ensure consistency
      const { data: currentProfile, error: fetchError } = await supabase
        .from('language_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('language', profile.target_language)
        .single()
      
      if (fetchError) throw fetchError

      const newXP = (currentProfile.xp || 0) + amount
      const newLevel = getLevelFromXP(newXP)
      
      const { error: updateError } = await supabase
        .from('language_profiles')
        .update({ xp: newXP, level: newLevel })
        .eq('id', currentProfile.id)

      if (updateError) throw updateError

      // Update local state immediately
      setLanguageProfile({ ...currentProfile, xp: newXP, level: newLevel })
      
      // Show level up popup if changed
      if (newLevel > currentProfile.level) {
        showPopup(`Niveau supérieur ! Tu es maintenant niveau ${newLevel} 🎉`, 'success')
      }

    } catch (err) {
      console.error('Erreur ajout XP:', err)
      showPopup("Erreur lors de la sauvegarde de l'XP", 'error')
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
    learnTab,
    setLearnTab,
    reviewTab,
    setReviewTab,
    t,
    showPopup,
    popup,
    tutorMessages,
    setTutorMessages,
    getLevelFromXP,
    setTutorMessages,
    getLevelFromXP,
    getXPForLevel,
    askConfirmation
  }

  return (
    <AppContext.Provider value={activeTabValue}>
      {children}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-scale-up border-[3px] border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ⚠️
            </div>
            <h3 className="text-xl font-black text-center text-slate-800 dark:text-white mb-2">Attention</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 font-medium mb-8">
              {confirmState.message}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={confirmState.onCancel}
                className="flex-1 py-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmState.onConfirm}
                className="flex-1 py-4 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 dark:shadow-red-900/20 active:scale-95 transition-all"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp doit être utilisé dans un AppProvider')
  }
  return context
}
