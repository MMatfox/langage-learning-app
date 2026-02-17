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
import JapaneseAlphabet from './tabs/JapaneseAlphabet'
import Profile from './tabs/Profile'
import Tutor from './tabs/Tutor'
import Flashcards from './tabs/Flashcards'
import { useSwipeable } from 'react-swipeable'

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
  const { profile, activeTab, setActiveTab, learnTab, setLearnTab, reviewTab, setReviewTab, t } = useApp()

  useEffect(() => {
    if (profile?.theme) {
      if (profile.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [profile?.theme])

  const showHangeul = profile?.target_language === 'Coréen'
  const showJapanese = profile?.target_language === 'Japonais'

  // Ensure default sub-tabs are valid if language changes
  useEffect(() => {
    if (learnTab === 'alphabet' && !showJapanese && !showHangeul) {
      setLearnTab('lessons')
    }
  }, [showJapanese, showHangeul, learnTab])

  const learnTabs = [
    { id: 'lessons', label: t('nav.lessons') },
    { id: 'words', label: t('nav.words') },
    ...(showHangeul ? [{ id: 'alphabet', label: t('nav.hangeul') }] : []),
    ...(showJapanese ? [{ id: 'alphabet', label: 'Alphabet' }] : [])
  ]

  const reviewTabs = [
    { id: 'revision', label: t('nav.revision') },
    { id: 'flashcards', label: t('nav.flashcards') },
    { id: 'tutor', label: t('nav.tutor') }
  ]

  const handleLearnSwipe = (dir) => {
    const currentIndex = learnTabs.findIndex(t => t.id === learnTab)
    if (dir === 'Left' && currentIndex < learnTabs.length - 1) {
      setLearnTab(learnTabs[currentIndex + 1].id)
    } else if (dir === 'Right' && currentIndex > 0) {
      setLearnTab(learnTabs[currentIndex - 1].id)
    }
  }

  const handleReviewSwipe = (dir) => {
    const currentIndex = reviewTabs.findIndex(t => t.id === reviewTab)
    if (dir === 'Left' && currentIndex < reviewTabs.length - 1) {
      setReviewTab(reviewTabs[currentIndex + 1].id)
    } else if (dir === 'Right' && currentIndex > 0) {
      setReviewTab(reviewTabs[currentIndex - 1].id)
    }
  }

  const learnSwipe = useSwipeable({
    onSwipedLeft: () => handleLearnSwipe('Left'),
    onSwipedRight: () => handleLearnSwipe('Right'),
    preventScrollOnSwipe: false,
    trackMouse: true
  })

  const reviewSwipe = useSwipeable({
    onSwipedLeft: () => handleReviewSwipe('Left'),
    onSwipedRight: () => handleReviewSwipe('Right'),
    preventScrollOnSwipe: false,
    trackMouse: true
  })

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home />
      case 'learn':
        return (
          <div className="flex flex-col h-full" {...learnSwipe}>
            <TopNav 
              tabs={learnTabs}
              active={learnTab}
              onChange={setLearnTab}
            />
            <div className="flex-1 overflow-y-auto pb-24">
              {learnTab === 'lessons' && <Lessons />}
              {learnTab === 'words' && <Words />}
              {learnTab === 'alphabet' && showHangeul && <Hangeul />}
              {learnTab === 'alphabet' && showJapanese && <JapaneseAlphabet />}
            </div>
          </div>
        )
      case 'review':
        return (
          <div className="flex flex-col h-full" {...reviewSwipe}>
            <TopNav 
              tabs={reviewTabs}
              active={reviewTab}
              onChange={setReviewTab}
            />
            <div className="flex-1 overflow-y-auto pb-24">
              {reviewTab === 'revision' && <Revision />}
              {reviewTab === 'flashcards' && <Flashcards />}
              {reviewTab === 'tutor' && <Tutor />}
            </div>
          </div>
        )
      case 'profile':
        return <Profile />
      default:
        return <Home />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-300">
      <Popup />
      
      {/* Scrollable Container Handling */}
      {activeTab === 'home' || activeTab === 'profile' ? (
         <div className="flex-1 overflow-y-auto pb-24">
           {renderContent()}
         </div>
      ) : (
         /* Content handles its own scrolling (for learn/review containers) */
         <div className="flex-1 overflow-hidden relative">
           {renderContent()}
         </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-700 px-2 py-3 flex justify-around items-center safe-area-bottom z-50 transition-colors duration-300">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} label={t('nav.home')} icon="🏠" />
        <NavButton active={activeTab === 'learn'} onClick={() => setActiveTab('learn')} label={t('nav.learn')} icon="📚" />
        <NavButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} label={t('nav.review')} icon="🔁" />
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

function TopNav({ tabs, active, onChange }) {
  return (
    <div className="flex justify-center pt-6 pb-2 px-4 bg-slate-50 dark:bg-slate-900 z-40">
      <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl backdrop-blur-md">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              active === tab.id 
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm scale-100' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App