import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)

  // Chargement du profil
  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
      
      // APPLIQUER LE THÈME GLOBALEMENT DÈS LE CHARGEMENT
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

    } catch (err) {
      console.error("Erreur profil:", err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // --- GESTION DU THÈME GLOBAL ---
  const toggleTheme = async () => {
    const newTheme = profile.theme === 'light' ? 'dark' : 'light'
    
    // 1. Mise à jour locale (Immédiat)
    setProfile(prev => ({ ...prev, theme: newTheme }))
    
    // 2. Application globale sur la balise HTML (Pour que CSS s'adapte partout)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // 3. Sauvegarde BDD
    await supabase.from('profiles').update({ theme: newTheme }).eq('id', profile.id)
  }

  // --- GESTION DES LANGUES ---
  const updateLanguage = async (field, value) => {
    // field = 'ui_language' ou 'target_language'
    setProfile(prev => ({ ...prev, [field]: value }))
    await supabase.from('profiles').update({ [field]: value }).eq('id', profile.id)
    alert(`Langue mise à jour : ${value}`)
  }

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  if (!profile) return <p className="p-10 text-center">Profil introuvable.</p>

  const displayName = profile.username.includes('@') ? profile.username.split('@')[0] : profile.username

  return (
    <div className={`p-6 pb-32 min-h-screen transition-colors duration-500 ${profile.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-[#F8FAFC] text-slate-800'}`}>
      
      {/* Avatar & Nom */}
      <div className="flex flex-col items-center py-8">
        <div className="relative mb-6">
          <div className="w-28 h-28 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl shadow-blue-500/20 border-4 border-white dark:border-slate-800 rotate-3">
            👤
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-black border-2 border-slate-100 dark:border-slate-700 shadow-sm">
            Niv. {profile.level}
          </div>
        </div>
        <h2 className="text-3xl font-black tracking-tight">{displayName}</h2>
        <p className="text-slate-400 text-sm font-medium mt-1">Apprenti {profile.target_language}</p>
      </div>

      {/* Stats Rapides */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-center shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-3xl font-black text-blue-500">{profile.xp}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">XP Total</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-center shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-3xl font-black text-purple-500">{profile.target_language?.substring(0, 2).toUpperCase()}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">Langue Cible</p>
        </div>
      </div>

      {/* Paramètres */}
      <div className="space-y-4">
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="w-full bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] flex justify-between items-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <span className="font-bold">Paramètres & Langues</span>
          </div>
          <span className={`transition-transform duration-300 ${showSettings ? 'rotate-180' : ''}`}>▼</span>
        </button>
        
        {showSettings && (
          <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-[2rem] space-y-6 animate-slide-down border border-slate-50 dark:border-slate-700 backdrop-blur-sm">
            
            {/* 1. Thème */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-sm font-bold">Mode Sombre</span>
                <span className="text-[10px] text-slate-400 uppercase font-black">Apparence</span>
              </div>
              <button 
                onClick={toggleTheme} 
                className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${profile.theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${profile.theme === 'dark' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* 2. Langue de l'Interface */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase">Langue de l'application</label>
              <div className="grid grid-cols-3 gap-2">
                {['Français', 'English', 'Español'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => updateLanguage('ui_language', lang)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      profile.ui_language === lang 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 border-slate-200 text-slate-500'
                    }`}
                  >
                    {lang === 'Français' ? 'FR 🇫🇷' : lang === 'English' ? 'EN 🇬🇧' : 'ES 🇪🇸'}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Langue d'apprentissage */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase">Je veux apprendre</label>
              <select 
                value={profile.target_language || 'Coréen'}
                onChange={(e) => updateLanguage('target_language', e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Coréen">Coréen (한국어)</option>
                <option value="Japonais">Japonais (日本語)</option>
                <option value="Anglais">Anglais (English)</option>
                <option value="Chinois">Chinois (中文)</option>
                <option value="Espagnol">Espagnol (Español)</option>
                <option value="Allemand">Allemand (Deutsch)</option>
              </select>
            </div>

          </div>
        )}

        <button 
          onClick={() => supabase.auth.signOut()} 
          className="w-full bg-red-500/10 text-red-500 p-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all mt-4"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}