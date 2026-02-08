import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Home from './tabs/Home'
import Lessons from './tabs/Lessons'
import Words from './tabs/Words'
import Revision from './tabs/Revision'
import Hangeul from './tabs/Hangeul'
import Profile from './tabs/Profile'
import Tutor from './tabs/Tutor'
import Flashcards from './tabs/Flashcards'

function App() {
  const [session, setSession] = useState(null)
  const [activeTab, setActiveTab] = useState('home')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <Auth />

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'home' && <Home />}
        {activeTab === 'lessons' && <Lessons />}
        {activeTab === 'words' && <Words />}
        {activeTab === 'revision' && <Revision />}
        {activeTab === 'hangeul' && <Hangeul />}
        {activeTab === 'tutor' && <Tutor />}
        {activeTab === 'flashcards' && <Flashcards />}
        {activeTab === 'profile' && <Profile />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-2 py-3 flex justify-around items-center safe-area-bottom z-50">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="Home" icon="🏠" />
        <NavButton active={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} label="Cours" icon="📚" />
        <NavButton active={activeTab === 'words'} onClick={() => setActiveTab('words')} label="Mots" icon="🔤" />
        <NavButton active={activeTab === 'revision'} onClick={() => setActiveTab('revision')} label="Révision" icon="🔁" />
        <NavButton active={activeTab === 'hangeul'} onClick={() => setActiveTab('hangeul')} label="Coréen" icon="🇰🇷" />
        <NavButton active={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} label="Flashcards" icon="🃏" />
        <NavButton active={activeTab === 'tutor'} onClick={() => setActiveTab('tutor')} label="Tuteur" icon="👨‍🏫" />
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Profil" icon="👤" />
      </nav>
    </div>
  )
}

function NavButton({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
      {active && <span className="w-1 h-1 bg-blue-600 rounded-full"></span>}
    </button>
  )
}

export default App