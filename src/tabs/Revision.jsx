import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
// N'oublie pas d'importer la nouvelle fonction !
import { generateRevisionQuiz } from '../services/aiService'

export default function Revision() {
  const [activeTab, setActiveTab] = useState('words')
  
  // États Mots
  const [words, setWords] = useState([])
  const [filterWord, setFilterWord] = useState('all')
  
  // États Leçons
  const [lessons, setLessons] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  
  // États Quiz de Révision
  const [revisionQuiz, setRevisionQuiz] = useState(null) // Stocke les questions
  const [quizLoading, setQuizLoading] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerFeedback, setAnswerFeedback] = useState(null) // 'correct' | 'wrong'
  
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (activeTab === 'words') {
        let query = supabase
          .from('learned_words')
          .select('*')
          .eq('user_id', user.id)
          .gte('mastery_level', 0)
          .order('mastery_level', { ascending: true })

        if (filterWord === 'weak') query = query.lt('mastery_level', 50)
        
        const { data } = await query
        setWords(data || [])
      } else {
        const { data } = await supabase
          .from('lessons')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('created_at', { ascending: false })
          
        setLessons(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [activeTab, filterWord])

  const boostMastery = async (id, current) => {
    const newMastery = Math.min(current + 10, 100)
    setWords(prev => prev.map(w => w.id === id ? { ...w, mastery_level: newMastery } : w))
    const { error } = await supabase
      .from('learned_words')
      .update({ mastery_level: newMastery })
      .eq('id', id)
    if (!error) await supabase.rpc('add_xp', { amount: 5 })
  }

  // --- LOGIQUE DU QUIZ DE RÉVISION ---

  const startRevisionQuiz = async () => {
    setQuizLoading(true)
    try {
      const content = selectedLesson.content
      // On génère 3 questions basées sur le titre et le vocabulaire
      const questions = await generateRevisionQuiz(content.title, content.vocabulary || [])
      
      setRevisionQuiz(questions)
      setCurrentQIndex(0)
      setQuizScore(0)
      setQuizFinished(false)
      setSelectedAnswer(null)
      setAnswerFeedback(null)
    } catch (error) {
      alert("Impossible de générer le quiz pour le moment.")
      console.error("Erreur génération quiz:", error)
    } finally {
      setQuizLoading(false)
    }
  }

  const handleQuizAnswer = (option) => {
    if (answerFeedback) return // Empêche de cliquer 2 fois

    setSelectedAnswer(option)
    const currentQuestion = revisionQuiz[currentQIndex]
    
    if (option === currentQuestion.answer) {
      setAnswerFeedback('correct')
      setQuizScore(prev => prev + 1)
    } else {
      setAnswerFeedback('wrong')
    }

    // Passage automatique à la question suivante après 1.5s
    setTimeout(() => {
      if (currentQIndex < revisionQuiz.length - 1) {
        setCurrentQIndex(prev => prev + 1)
        setSelectedAnswer(null)
        setAnswerFeedback(null)
      } else {
        finishQuiz()
      }
    }, 1500)
  }

  const finishQuiz = async () => {
    setQuizFinished(true)
    // Bonus XP si score parfait
    // On ajoute +10 XP par bonne réponse via Supabase
    // Ici on simule un gain global pour l'exemple (20 XP fixes pour la révision)
    await supabase.rpc('add_xp', { amount: 20 })
  }

  const closeQuiz = () => {
    setRevisionQuiz(null)
    setQuizFinished(false)
  }

  // --- AFFICHAGE DÉTAIL LEÇON ---
  if (selectedLesson) {
    const content = selectedLesson.content
    
    // Si on est en mode QUIZ
    if (revisionQuiz) {
      return (
        <div className="p-6 pb-28 max-w-md mx-auto animate-fade-in">
          <button onClick={closeQuiz} className="text-slate-400 font-bold mb-6 text-xs uppercase tracking-widest">
            Quitter le quiz
          </button>

          {!quizFinished ? (
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Question {currentQIndex + 1} / {revisionQuiz.length}
                </span>
                <span className="text-slate-300 font-bold text-xs">XP ++</span>
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-8 text-center leading-snug">
                {revisionQuiz[currentQIndex].question}
              </h3>

              <div className="space-y-3">
                {revisionQuiz[currentQIndex].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuizAnswer(opt)}
                    className={`w-full p-4 rounded-2xl font-bold text-left transition-all border-2 ${
                      selectedAnswer === opt
                        ? (answerFeedback === 'correct' 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-red-500 bg-red-50 text-red-700')
                        : 'border-slate-100 bg-slate-50 text-slate-600 active:border-blue-400 active:scale-95'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // ÉCRAN DE FIN DE QUIZ
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 text-center animate-slide-up">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Révision terminée !</h3>
              <p className="text-slate-500 mb-6">
                Score : <span className="text-blue-600 font-bold">{quizScore} / {revisionQuiz.length}</span>
              </p>
              <div className="bg-yellow-50 text-yellow-600 p-4 rounded-2xl font-bold mb-8 text-sm">
                +20 XP gagnés
              </div>
              <button 
                onClick={closeQuiz}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all"
              >
                Retour à la leçon
              </button>
            </div>
          )}
        </div>
      )
    }

    // Affichage normal de la leçon
    if (!content) return null

    return (
      <div className="p-6 pb-28 max-w-md mx-auto animate-fade-in">
        <button 
          onClick={() => setSelectedLesson(null)} 
          className="text-blue-500 font-bold mb-4 flex items-center gap-2"
        >
          ← Retour aux révisions
        </button>
        
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-2xl font-black text-slate-800 mb-4">
            {content.title || "Leçon"}
          </h3>
          <div className="text-slate-600 text-sm leading-relaxed space-y-2">
            {content.explanation && (
              <p className="italic border-l-4 border-blue-400 pl-4">
                {typeof content.explanation === 'string' 
                  ? content.explanation 
                  : "Explication disponible en mode lecture."}
              </p>
            )}
          </div>
        </div>

        {content.vocabulary && Array.isArray(content.vocabulary) && content.vocabulary.length > 0 && (
          <div className="grid gap-3 mt-6">
            <h4 className="text-xs font-black text-slate-400 uppercase">Vocabulaire</h4>
            {content.vocabulary.map((v, i) => (
              <div key={i} className="bg-white p-3 rounded-xl flex justify-between border border-slate-50">
                <span className="font-bold">{v.kr || "?"}</span>
                <span className="text-slate-500 text-sm">{v.fr || "?"}</span>
              </div>
            ))}
          </div>
        )}

        {/* --- NOUVEAU BOUTON : LANCER LE QUIZ --- */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-center text-slate-400 text-xs font-bold uppercase mb-4 tracking-widest">
            Besoin de pratiquer ?
          </p>
          <button 
            onClick={startRevisionQuiz}
            disabled={quizLoading}
            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-purple-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {quizLoading ? (
              <span className="animate-pulse">Génération du quiz...</span>
            ) : (
              <>
                <span>🚀</span> Lancer un Quiz Express
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // --- LISTE PRINCIPALE (Mots / Leçons) ---
  return (
    <div className="p-6 pb-28 max-w-md mx-auto">
      <header className="pt-8 mb-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Révisions</h2>
        
        <div className="flex bg-slate-200 p-1 rounded-2xl mt-4">
          <button 
            onClick={() => setActiveTab('words')} 
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'words' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
            }`}
          >
            Mots
          </button>
          <button 
            onClick={() => setActiveTab('lessons')} 
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'lessons' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
            }`}
          >
            Leçons
          </button>
        </div>

        {activeTab === 'words' && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <button 
              onClick={() => setFilterWord('all')} 
              className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                filterWord === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'
              }`}
            >
              Tous
            </button>
            <button 
              onClick={() => setFilterWord('weak')} 
              className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                filterWord === 'weak' ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 text-slate-500'
              }`}
            >
              À revoir
            </button>
          </div>
        )}
      </header>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 animate-pulse">Chargement...</div>
        ) : activeTab === 'words' ? (
          /* LISTE DES MOTS */
          words.length > 0 ? words.map(word => (
            <div key={word.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xl font-black text-slate-800">{word.word}</h4>
                  <span className="text-[10px] font-bold text-slate-400">{word.mastery_level}%</span>
                </div>
                <p className="text-slate-500 text-sm">{word.translation}</p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full ${word.mastery_level < 50 ? 'bg-orange-400' : 'bg-green-400'}`} style={{ width: `${Math.max(word.mastery_level, 5)}%` }}></div>
                </div>
              </div>
              <button onClick={() => boostMastery(word.id, word.mastery_level)} disabled={word.mastery_level >= 100} className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg active:scale-90 transition-all">
                {word.mastery_level >= 100 ? '✅' : '🔥'}
              </button>
            </div>
          )) : <p className="text-center text-slate-400 py-10">Aucun mot appris.</p>
        ) : (
          /* LISTE DES LEÇONS */
          lessons.length > 0 ? lessons.map(l => (
            <div 
              key={l.id} 
              onClick={() => setSelectedLesson(l)}
              className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-all group"
            >
              <h4 className="text-lg font-black text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                {l.title || "Leçon sans titre"}
              </h4>
              <p className="text-slate-400 text-xs">
                Complétée le {new Date(l.created_at).toLocaleDateString()}
              </p>
            </div>
          )) : <p className="text-center text-slate-400 py-10">Aucune leçon terminée.</p>
        )}
      </div>
    </div>
  )
}