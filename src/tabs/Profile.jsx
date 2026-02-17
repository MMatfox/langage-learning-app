import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useApp } from '../AppContext'

export default function Profile() {
  const { profile, languageProfile, updateTheme, updateUILanguage, updateTargetLanguage, loading, t } = useApp()
  const [showSettings, setShowSettings] = useState(false)

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  if (!profile) return <p className="p-10 text-center">{t('profile.not_found')}</p>

  const displayName = profile.username.includes('@') ? profile.username.split('@')[0] : profile.username

  const handleThemeToggle = () => {
    const newTheme = profile.theme === 'light' ? 'dark' : 'light'
    updateTheme(newTheme)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="p-6 pb-28 max-w-md mx-auto">
      <header className="pt-8 mb-8">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('profile.title')}</h2>
      </header>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-lg mb-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg">
            {profile.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{profile.username || 'Utilisateur'}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{profile.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-center shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{languageProfile.level}</p>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">{t('profile.level')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-center shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-3xl font-black text-purple-500 dark:text-purple-400">{languageProfile.xp}</p>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">{t('profile.xp')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-center shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-3xl font-black text-purple-500 dark:text-purple-400">{profile.target_language?.substring(0, 2).toUpperCase()}</p>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">{t('profile.target_lang')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="w-full bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] flex justify-between items-center shadow-lg border border-slate-200 dark:border-slate-700 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <span className="font-bold text-slate-800 dark:text-white">{t('profile.settings')}</span>
          </div>
          <span className={`transition-transform duration-300 text-slate-400 ${showSettings ? 'rotate-180' : ''}`}>▼</span>
        </button>
        
        {showSettings && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] space-y-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 dark:text-white">{t('profile.dark_mode')}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">{t('profile.appearance')}</span>
              </div>
              <button 
                onClick={handleThemeToggle} 
                className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${profile.theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${profile.theme === 'dark' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase">{t('profile.app_lang')}</label>
              <div className="relative">
                <select
                  value={profile.ui_language}
                  onChange={(e) => updateUILanguage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white font-bold p-3 rounded-xl border-r-8 border-transparent outline-none appearance-none shadow-sm cursor-pointer text-sm"
                >
                  {['Français', 'English', 'Español', 'Deutsch', 'Italiano', 'Português'].map(lang => (
                    <option key={lang} value={lang}>
                      {t(`languages.${lang}`, lang)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase">{t('profile.learning_lang')}</label>
              <div className="grid grid-cols-3 gap-2">
                {['Coréen', 'Japonais', 'Chinois'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => updateTargetLanguage(lang)}
                    className={`py-3 rounded-xl text-xs font-black border-2 transition-all active:scale-95 shadow-sm flex flex-col items-center justify-center gap-1 ${
                      profile.target_language === lang 
                      ? 'bg-purple-600 border-purple-600 text-white ring-4 ring-purple-100 dark:ring-purple-900/30' 
                      : 'bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 border-slate-200 text-slate-500 hover:border-purple-300'
                    }`}
                  >
                    {profile.target_language === lang && <span className="text-[10px]">✓</span>}
                    {t(`languages.${lang}`, lang)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={handleLogout} 
          className="w-full bg-red-500 hover:bg-red-600 text-white p-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all mt-6 shadow-xl shadow-red-200 dark:shadow-none"
        >
          {t('profile.logout')}
        </button>
      </div>
    </div>
  )
}
