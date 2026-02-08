import { useApp } from '../AppContext'

function Home() {
  const { profile, languageProfile, loading: profileLoading, setActiveTab, t } = useApp()

  if (profileLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const displayName = profile?.username?.split('@')[0] || 'Utilisateur'
  const xpForNextLevel = 100 // Supposons 100 XP par niveau pour l'affichage
  const currentLevelProgress = languageProfile.xp % xpForNextLevel
  const progressPercent = (currentLevelProgress / xpForNextLevel) * 100

  return (
    <div className="p-6 pb-28 max-w-md mx-auto space-y-8 animate-fade-in relative">
      
      {/* HEADER */}
      <header className="flex justify-between items-center pt-4">
        <div>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{t('home.welcome')},</p>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none bg-gradient-to-br from-slate-800 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            {displayName}
          </h1>
        </div>
        <div 
          onClick={() => setActiveTab('profile')}
          className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-transform cursor-pointer hover:shadow-xl hover:shadow-blue-500/30"
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      </header>
      
      {/* NIVEAU & PROGRESSION */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <span className="text-5xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{languageProfile.level}</span>
            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-2 uppercase">{t('profile.level')}</span>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{languageProfile.xp}</span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wide">XP Total</span>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="space-y-2 relative z-10">
          <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{currentLevelProgress} XP</span>
            <span>{xpForNextLevel} XP</span>
          </div>
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30"></div>
            </div>
          </div>
          <p className="text-xs text-center text-slate-400 font-medium pt-1">
            {xpForNextLevel - currentLevelProgress} XP {t('home.until_next_level')}
          </p>
        </div>

        {/* Décoration background */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-50 dark:bg-purple-900/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Encouragement / Citation */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-6 rounded-[2rem] shadow-lg shadow-blue-900/20 text-white relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <span className="text-4xl">🚀</span>
          <div>
            <h3 className="font-bold text-lg leading-tight">{t('home.keep_going')}</h3>
            <p className="text-blue-100 text-sm font-medium mt-1">
              {t('home.learning_target', profile.target_language)}
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
      </div>

      {/* ACTIONS PRINCIPALES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-black text-slate-800 dark:text-white">{t('home.ready')}</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <ActionCard
            icon="📖"
            title={t('home.new_lesson')}
            description={t('home.new_lesson_desc')}
            onClick={() => setActiveTab('lessons')}
            color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          />
          <ActionCard
            icon="🔁"
            title={t('home.revision')}
            description={t('home.revision_desc')}
            onClick={() => setActiveTab('revision')}
            color="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
          />
          <ActionCard
            icon="🃏"
            title={t('home.flashcards')}
            description={t('home.flashcards_desc')}
            onClick={() => setActiveTab('flashcards')}
            color="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
          />
          <ActionCard
            icon="👨‍🏫"
            title={t('home.tutor')}
            description={t('home.tutor_desc')}
            onClick={() => setActiveTab('tutor')}
            color="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
          />
        </div>
      </div>
    </div>
  )
}

function ActionCard({ icon, title, description, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-slate-800 p-4 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-5 active:scale-95 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-slate-600 group text-left"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 ${color || 'bg-slate-100 text-slate-600'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-slate-800 dark:text-white text-lg">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{description}</p>
      </div>
      <div className="text-slate-300 dark:text-slate-600 pr-2">
        ➔
      </div>
    </button>
  )
}

export default Home
