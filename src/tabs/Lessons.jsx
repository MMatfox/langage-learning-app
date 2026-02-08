import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generateNewLesson } from '../services/aiService'

export default function Lessons() {
  const [currentLesson, setCurrentLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizStarted, setQuizStarted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [quizFeedback, setQuizFeedback] = useState(null)

  useEffect(() => {
    const loadLesson = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setCurrentLesson(data)
      }
      setLoading(false)
    }
    loadLesson()
  }, [])

  const fetchLesson = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Récupérer les titres de toutes les leçons
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('title')
        .eq('user_id', user.id)
      const titles = allLessons?.map(l => l.title) || []
      
      const { data: prof } = await supabase
        .from('profiles')
        .select('level')
        .eq('id', user.id)
        .single()
      
      // Générer la leçon
      const aiContent = await generateNewLesson(titles, prof?.level || 1)
      
      // Sauvegarder immédiatement
      const { data: savedLesson, error } = await supabase
        .from('lessons')
        .insert([
          { 
            user_id: user.id, 
            title: aiContent.title, 
            content: aiContent,
            completed: false 
          }
        ])
        .select()
        .single()

      if (error) throw error
      
      setCurrentLesson(savedLesson)
      setQuizStarted(false)
      setQuizFeedback(null)
      setSelectedAnswer(null)

    } catch (error) {
      console.error("Erreur leçon:", error)
      alert("Erreur IA. Réessaie.")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (option) => {
    if (quizFeedback) return
    setSelectedAnswer(option)
    
    const lessonData = currentLesson.content
    if (option === lessonData.quiz[0].answer) {
      setQuizFeedback("correct")
    } else {
      setQuizFeedback("wrong")
    }
  }

  const completeLesson = async () => {
    const { error } = await supabase
      .from('lessons')
      .update({ completed: true })
      .eq('id', currentLesson.id)
    
    if (!error) {
      await supabase.rpc('add_xp', { amount: 50 })
      alert("Bravo ! Leçon validée. +50 XP 🎓")
      setCurrentLesson(null) 
    }
  }

  const lessonData = currentLesson?.content

  return (
    <div className="p-6 pb-28 max-w-md mx-auto">
      <header className="pt-8 mb-8 text-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Cours IA</h2>
        <p className="text-slate-500 text-sm font-medium">Un programme sur mesure par Mistral.</p>
      </header>

      {!currentLesson ? (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 text-center border border-slate-100 flex flex-col items-center animate-fade-in">
          <div className="text-6xl mb-6 text-blue-600">📖</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Prêt pour ton cours ?</h3>
          {!loading && (
             <button 
               onClick={fetchLesson} 
               disabled={loading} 
               className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all mt-6"
             >
              GÉNÉRER MON COURS
            </button>
          )}
           {loading && <p className="text-blue-500 font-bold mt-4 animate-pulse">Rédaction en cours...</p>}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {!quizStarted ? (
            <>
              {/* SECTION THÉORIE - VERSION SIMPLIFIÉE ET ROBUSTE */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                  Théorie
                </span>
                <h3 className="text-2xl font-black text-slate-800 mt-3 mb-4">
                  {lessonData?.title || "Leçon"}
                </h3>
                
                <div className="text-slate-600 leading-relaxed text-sm border-l-4 border-blue-500 pl-4 space-y-2">
                  {/* Affichage robuste de l'explication */}
                  {lessonData?.explanation && (
                    <p className="italic">{lessonData.explanation}</p>
                  )}
                </div>
              </div>

              {/* VOCABULAIRE */}
              <div className="grid gap-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">
                  Vocabulaire clé
                </h4>
                {lessonData?.vocabulary?.map((v, i) => (
                  <div 
                    key={i} 
                    className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-50"
                  >
                    <span className="font-bold text-xl text-slate-800">{v.kr}</span>
                    <span className="text-slate-500 font-medium text-sm bg-slate-50 px-3 py-1 rounded-lg">
                      {v.fr}
                    </span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setQuizStarted(true)} 
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all uppercase tracking-wider"
              >
                Passer au Quiz ⚡️
              </button>
            </>
          ) : (
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 animate-slide-up">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full">
                Vérification
              </span>
              <h3 className="text-xl font-black text-slate-800 mt-6 mb-8 text-center leading-snug">
                {lessonData?.quiz?.[0]?.question || "Question de révision"}
              </h3>

              <div className="space-y-3">
                {lessonData?.quiz?.[0]?.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    className={`w-full p-4 rounded-2xl font-bold text-left transition-all border-2 ${
                      selectedAnswer === opt 
                        ? (quizFeedback === 'correct' 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-red-500 bg-red-50 text-red-700')
                        : 'border-slate-100 bg-slate-50 text-slate-600 active:border-blue-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {quizFeedback === 'correct' && (
                <button 
                  onClick={completeLesson} 
                  className="w-full mt-8 bg-green-500 text-white py-5 rounded-2xl font-black shadow-lg shadow-green-200 animate-bounce"
                >
                  TERMINER (+50 XP) 🎓
                </button>
              )}
              
              {quizFeedback === 'wrong' && (
                <button 
                  onClick={() => {
                    setQuizFeedback(null)
                    setSelectedAnswer(null)
                  }} 
                  className="w-full mt-4 text-slate-400 text-xs font-bold underline"
                >
                  Réessayer
                </button>
              )}
            </div>
          )}
          
          <button 
            onClick={() => {
              if(confirm('Es-tu sûr de vouloir jeter cette leçon ?')) {
                setCurrentLesson(null)
              }
            }} 
            className="w-full text-slate-300 text-[10px] font-bold uppercase tracking-widest pt-4"
          >
            Supprimer la leçon (pas d'XP)
          </button>
        </div>
      )}
    </div>
  )
}