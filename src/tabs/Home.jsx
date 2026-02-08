import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Home() {
  const [profile, setProfile] = useState({ xp: 0, level: 1, username: 'Étudiant' })
  const [stats, setStats] = useState({ words: 0, lessons: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()

    // Petit bonus : si l'utilisateur change ou si la session est rafraîchie
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserData()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Récupérer le profil
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

        if (profError) {
        console.warn("Profil introuvable, il sera créé au prochain événement.");
        } else if (prof) {
        setProfile(prof);
        } 

      if (prof) setProfile(prof)

      // 2. Récupérer les stats en temps réel
      const { count: wordCount } = await supabase
        .from('learned_words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: lessonCount } = await supabase
        .from('completed_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setStats({ words: wordCount || 0, lessons: lessonCount || 0 })
    } catch (err) {
      console.error("Erreur chargement Home:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center pt-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Salut, {profile.username.split('@')[0]} !
          </h2>
          <p className="text-slate-500 font-medium text-sm">Prêt pour ta dose de Coréen ?</p>
        </div>
        <div className="relative flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl rotate-3 shadow-lg shadow-blue-200 border-2 border-white">
          <span className="text-white font-black text-xl -rotate-3 leading-none">
            {profile.level}
          </span>
        </div>
      </header>

      {/* Barre d'XP - Design plus "App" */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex justify-between text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.1em]">
          <span>Progression Niveau</span>
          <span className="text-blue-600">{profile.xp % 100} / 100 XP</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
            style={{ width: `${profile.xp % 100}%` }}
          ></div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon="🧧" label="Mots" value={stats.words} color="bg-orange-50" textColor="text-orange-600" />
        <StatCard icon="🎓" label="Leçons" value={stats.lessons} color="bg-purple-50" textColor="text-purple-600" />
      </div>

      {/* Cards de raccourcis */}
      <section className="space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
          <span>🔥</span> Objectif du jour
        </h3>
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Leçon suggérée</span>
            <h4 className="text-xl font-bold mt-1">Les bases de la politesse</h4>
            <p className="text-blue-100/80 text-xs mt-2 leading-relaxed max-w-[80%]">
              Maîtrise les formules essentielles pour voyager sereinement.
            </p>
            <button className="mt-5 bg-white text-blue-600 px-6 py-2.5 rounded-xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-blue-900/20 uppercase">
              Continuer
            </button>
          </div>
          <span className="absolute -right-6 -bottom-6 text-[10rem] opacity-10 pointer-events-none rotate-12">🇰🇷</span>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, label, value, color, textColor }) {
  return (
    <div className={`${color} p-5 rounded-[2rem] flex flex-col items-center text-center border border-white shadow-sm`}>
      <span className="text-2xl mb-1">{icon}</span>
      <span className={`text-2xl font-black ${textColor}`}>{value}</span>
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">{label}</span>
    </div>
  )
}