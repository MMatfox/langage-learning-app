import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { AppProvider, useApp } from './AppContext'
import Auth from './Auth'
import Home from './tabs/Home'
import Lessons from './tabs/Lessons'
import Words from './tabs/Words'
import Popup from './Popup'
import Revision from './tabs/Revision'
import Hangeul from './tabs/Hangeul'
import Profile from './tabs/Profile'
import Tutor from './tabs/Tutor'
import Flashcards from './tabs/Flashcards'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <Auth />

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

function AppContent() {
  const { profile, activeTab, setActiveTab, t } = useApp()

  // Forcer l'application du thème à chaque changement
  useEffect(() => {
    if (profile?.theme) {
      if (profile.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [profile?.theme])

  // Redirection si on est sur Hangeul mais que la langue change
  useEffect(() => {
    if (activeTab === 'hangeul' && profile?.target_language !== 'Coréen') {
      setActiveTab('home')
    }
  }, [profile?.target_language, activeTab, setActiveTab])

  const showHangeul = profile?.target_language === 'Coréen'

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-300">
      <Popup />
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'home' && <Home />}
        {activeTab === 'lessons' && <Lessons />}
        {activeTab === 'words' && <Words />}
        {activeTab === 'revision' && <Revision />}
        {activeTab === 'hangeul' && showHangeul && <Hangeul />}
        {activeTab === 'tutor' && <Tutor />}
        {activeTab === 'flashcards' && <Flashcards />}
        {activeTab === 'profile' && <Profile />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-700 px-2 py-3 flex justify-around items-center safe-area-bottom z-50 transition-colors duration-300">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} label={t('nav.home')} icon="🏠" />
        <NavButton active={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} label={t('nav.lessons')} icon="📚" />
        <NavButton active={activeTab === 'words'} onClick={() => setActiveTab('words')} label={t('nav.words')} icon="🔤" />
        <NavButton active={activeTab === 'revision'} onClick={() => setActiveTab('revision')} label={t('nav.revision')} icon="🔁" />
        {showHangeul && (
          <NavButton active={activeTab === 'hangeul'} onClick={() => setActiveTab('hangeul')} label={t('nav.hangeul')} icon="🇰🇷" />
        )}
        <NavButton active={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} label={t('nav.flashcards')} icon="🃏" />
        <NavButton active={activeTab === 'tutor'} onClick={() => setActiveTab('tutor')} label={t('nav.tutor')} icon="👨‍🏫" />
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label={t('nav.profile')} icon="👤" />
      </nav>
    </div>
  )
}

function NavButton({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-slate-300 dark:text-slate-500'}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
      {active && <span className="w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></span>}
    </button>
  )
}

export default App