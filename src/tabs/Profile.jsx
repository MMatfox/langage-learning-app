import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)

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
    } catch (err) {
      console.error("Erreur profil:", err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const toggleTheme = async () => {
    const newTheme = profile.theme === 'light' ? 'dark' : 'light'
    // Mise à jour optimiste
    setProfile({ ...profile, theme: newTheme })
    
    await supabase.from('profiles').update({ theme: newTheme }).eq('id', profile.id)
  }

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center h-full space-y-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Chargement...</p>
    </div>
  )

  if (!profile) return <p className="p-10 text-center">Profil introuvable.</p>

  // On nettoie le pseudo pour ne pas afficher tout l'email
  const displayName = profile.username.includes('@') 
    ? profile.username.split('@')[0] 
    : profile.username

  return (
    <div className={`p-6 pb-32 min-h-screen transition-colors duration-500 ${
      profile.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-[#F8FAFC] text-slate-800'
    }`}>
      
      {/* Avatar et Nom */}
      <div className="flex flex-col items-center py-12">
        <div className="relative">
          <div className="w-28 h-28 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-[2.5rem] flex items-center justify-center text-5xl mb-6 shadow-2xl shadow-blue-500/20 border-4 border-white dark:border-slate-800 rotate-3">
            👤
          </div>
          <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-black shadow-lg">
            ✓
          </div>
        </div>
        <h2 className="text-3xl font-black tracking-tight">{displayName}</h2>
        <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-black opacity-60">
          Membre depuis 2024
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-center shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-3xl font-black text-blue-500">{profile.level}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">Niveau</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-center shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-3xl font-black text-purple-500">{profile.xp}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">XP Total</p>
        </div>
      </div>

      {/* Menu Actions */}
      <div className="space-y-4">
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="w-full bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] flex justify-between items-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <span className="font-bold">Paramètres</span>
          </div>
          <span className={`transition-transform duration-300 ${showSettings ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showSettings && (
          <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-[1.5rem] space-y-6 animate-slide-down border border-slate-50 dark:border-slate-700">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-sm font-bold">Mode Sombre</span>
                <span className="text-[10px] text-slate-400 uppercase font-black">Économie d'énergie</span>
              </div>
              <button 
                onClick={toggleTheme} 
                className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${profile.theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${profile.theme === 'dark' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            
            <div className="flex justify-between items-center opacity-50">
              <span className="text-sm font-bold">Langue</span>
              <span className="text-xs font-black bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg uppercase tracking-widest">Français 🇫🇷</span>
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
      
      <p className="text-center text-[10px] text-slate-400 font-bold mt-12 opacity-30 uppercase tracking-[0.3em]">
        Hangeul App v1.0.4
      </p>
    </div>
  )
}