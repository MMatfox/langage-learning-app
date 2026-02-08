import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useApp } from '../AppContext'

export default function Home() {
  const { profile, languageProfile, loading: profileLoading } = useApp()
  const [stats, setStats] = useState({ words: 0, lessons: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.target_language) {
      fetchUserData()
    }
  }, [profile?.target_language])

  async function fetchUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profile?.target_language) return

      // Récupérer les stats filtrées par langue
      const { count: wordCount } = await supabase
        .from('learned_words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('language', profile.target_language)

      const { count: lessonCount } = await supabase
        .from('completed_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('language', profile.target_language)

      setStats({ words: wordCount || 0, lessons: lessonCount || 0 })
    } catch (err) {
      console.error("Erreur chargement Home:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || profileLoading) return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  if (!profile) return null

  return (
    <div className="p-6 pb-28 max-w-md mx-auto">
      {/* Header avec salutation */}
      <header className="pt-8 mb-8">
        <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-2">
          Bonjour, {profile.username || 'Apprenant'} 👋
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
          Continue ton apprentissage !
        </p>
      </header>

      {/* Carte de niveau */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-lg mb-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Niveau Actuel</p>
            <h2 className="text-4xl font-black text-blue-600 dark:text-blue-400">
              Niveau {languageProfile.level}
            </h2>
          </div>
          <div className="text-5xl">🎯</div>
        </div>

        {/* Barre de progression XP */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300">{languageProfile.xp % 100} XP</span>
            <span className="text-slate-400 dark:text-slate-500">100 XP</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${(languageProfile.xp % 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {100 - (languageProfile.xp % 100)} XP pour le niveau {languageProfile.level + 1}
          </p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="text-3xl mb-2">📚</div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.lessons}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Leçons</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="text-3xl mb-2">🔤</div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.words}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Mots</p>
        </div>
      </div>

      {/* Carte d'encouragement */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-[2.5rem] shadow-xl text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="text-4xl">✨</div>
          <div>
            <h3 className="font-black text-lg mb-1">Continue comme ça !</h3>
            <p className="text-white/90 text-sm">
              Tu progresses bien en {profile.target_language} 🚀
            </p>
          </div>
        </div>
      </div>

      {/* Suggestions d'actions */}
      <div className="space-y-3">
        <h3 className="text-slate-700 dark:text-slate-300 font-black text-sm uppercase tracking-widest mb-4">
          Que veux-tu faire ?
        </h3>
        <ActionCard icon="📖" title="Nouvelle leçon" description="Apprends de nouveaux concepts" />
        <ActionCard icon="🔁" title="Révision" description="Renforce tes connaissances" />
        <ActionCard icon="🎯" title="Quiz" description="Teste tes compétences" />
      </div>
    </div>
  )
}

function ActionCard({ icon, title, description }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center gap-4 active:scale-95 transition-transform cursor-pointer hover:shadow-lg">
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <h4 className="font-black text-slate-800 dark:text-white text-sm">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="text-slate-300 dark:text-slate-600">→</div>
    </div>
  )
}
