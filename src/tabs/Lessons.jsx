import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generateNewLesson } from '../services/aiService'

export default function Lessons() {
  const [currentLesson, setCurrentLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizStarted, setQuizStarted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [quizFeedback, setQuizFeedback] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  
  // NOUVEAU : État pour le mot sélectionné (popup)
  const [selectedWord, setSelectedWord] = useState(null)

  // --- CHARGEMENT ---
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

      if (data) setCurrentLesson(data)
      setLoading(false)
    }
    loadLesson()
  }, [])

  // --- GÉNÉRATION ---
  const fetchLesson = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: allLessons } = await supabase.from('lessons').select('title').eq('user_id', user.id)
      const titles = allLessons?.map(l => l.title) || []
      const { data: prof } = await supabase.from('profiles').select('level').eq('id', user.id).single()
      
      const aiContent = await generateNewLesson(titles, prof?.level || 1)
      
      const { data: savedLesson, error } = await supabase.from('lessons').insert([
        { 
          user_id: user.id, 
          title: aiContent.title, 
          content: aiContent, 
          completed: false 
        }
      ]).select().single()

      if (error) throw error
      
      // Sauvegarde vocabulaire (Version simplifiée pour la BDD words)
      if (aiContent.vocabulary && aiContent.vocabulary.length > 0) {
        const { data: existingWords } = await supabase.from('learned_words').select('word').eq('user_id', user.id);
        const existingSet = new Set(existingWords?.map(w => w.word));

        const wordsToInsert = aiContent.vocabulary
            .filter(v => !existingSet.has(v.kr))
            .map(v => ({
              user_id: user.id,
              word: v.kr,
              romanization: v.romanization || '',
              translation: v.fr,
              mastery_level: 0,
              // On stocke l'exemple dans la BDD mots aussi
              example_kr: v.context ? v.context.split('(')[0] : `Leçon: ${aiContent.title}`,
              example_fr: v.details || "Voir leçon pour détails"
            }));

        if (wordsToInsert.length > 0) await supabase.from('learned_words').insert(wordsToInsert);
      }

      setCurrentLesson(savedLesson)
      setQuizStarted(false)
      setQuizFeedback(null)
      setSelectedAnswer(null)
      setCurrentQuestionIndex(0)

    } catch (error) {
      console.error("Erreur leçon:", error)
      alert("Erreur lors de la génération. Réessaie.")
    } finally {
      setLoading(false)
    }
  }

  // --- QUIZ ---
  const handleAnswer = (option) => {
    if (quizFeedback) return
    setSelectedAnswer(option)
    const currentQ = currentLesson.content.quiz[currentQuestionIndex]
    setQuizFeedback(option === currentQ.answer ? "correct" : "wrong")
  }

  const nextQuestion = () => {
    const quiz = currentLesson.content.quiz
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setQuizFeedback(null)
      setSelectedAnswer(null)
    } else {
      completeLesson()
    }
  }

  const completeLesson = async () => {
    const { error } = await supabase.from('lessons').update({ completed: true }).eq('id', currentLesson.id)
    if (!error) {
      await supabase.rpc('add_xp', { amount: 50 })
      alert("Leçon terminée ! +50 XP 🎓")
      setCurrentLesson(null) 
    }
  }

  // --- AFFICHAGE SÉCURISÉ ---
  const renderSafeContent = (content) => {
    if (content === null || content === undefined) return null;
    if (typeof content === 'string' || typeof content === 'number') {
      return <span className="text-slate-600 leading-relaxed text-sm italic whitespace-pre-line">{content}</span>;
    }
    if (Array.isArray(content)) {
      return <ul className="list-disc pl-5">{content.map((item, i) => <li key={i}>{renderSafeContent(item)}</li>)}</ul>;
    }
    if (typeof content === 'object') {
      return (
        <div className="pl-2 border-l-2 border-blue-100 my-2 space-y-2">
          {Object.entries(content).map(([key, value], index) => (
            <div key={index}>
              <strong className="block text-slate-800 capitalize text-xs mb-1 bg-slate-50 inline-block px-1 rounded">{key.replace(/_/g, ' ')} :</strong>
              <div className="pl-1">{renderSafeContent(value)}</div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const lessonData = currentLesson?.content

  return (
    <div className="p-6 pb-28 max-w-md mx-auto relative">
      <header className="pt-8 mb-8 text-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Cours IA</h2>
        <p className="text-slate-500 text-sm font-medium">Programme détaillé & personnalisé.</p>
      </header>

      {!currentLesson ? (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 text-center border border-slate-100 flex flex-col items-center animate-fade-in">
          <div className="text-6xl mb-6 text-blue-600">📖</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Prêt pour ton cours ?</h3>
          {!loading && (
             <button onClick={fetchLesson} disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all mt-6">
              GÉNÉRER MON COURS
            </button>
          )}
           {loading && <p className="text-blue-500 font-bold mt-4 animate-pulse">Rédaction en cours...</p>}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {!quizStarted ? (
            <>
              {/* THÉORIE */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Théorie</span>
                <h3 className="text-2xl font-black text-slate-800 mt-3 mb-4">{lessonData.title}</h3>
                <div className="mt-4">
                  {renderSafeContent(lessonData.explanation)}
                </div>
              </div>

              {/* VOCABULAIRE INTERACTIF */}
              <div className="grid gap-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">
                  Vocabulaire (Touche pour infos)
                </h4>
                {Array.isArray(lessonData.vocabulary) && lessonData.vocabulary.map((v, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedWord(v)} // OUVRE LE MODAL
                    className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-50 cursor-pointer active:scale-95 transition-transform hover:border-blue-300 group"
                  >
                    <div>
                        <span className="font-bold text-xl text-slate-800 block group-hover:text-blue-600 transition-colors">
                          {v.kr}
                          {/* Petit indicateur d'info */}
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full align-middle">i</span>
                        </span>
                        {v.romanization && <span className="text-xs text-blue-400 italic block">{v.romanization}</span>}
                    </div>
                    <span className="text-slate-500 font-medium text-sm bg-slate-50 px-3 py-1 rounded-lg">{v.fr}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setQuizStarted(true)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all uppercase tracking-wider">
                Passer au Quiz ⚡️
              </button>
            </>
          ) : (
            /* QUIZ */
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 animate-slide-up">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full">
                Question {currentQuestionIndex + 1} / {lessonData.quiz.length}
              </span>
              <h3 className="text-xl font-black text-slate-800 mt-6 mb-8 text-center leading-snug">
                {lessonData.quiz[currentQuestionIndex].question}
              </h3>
              <div className="space-y-3">
                {lessonData.quiz[currentQuestionIndex].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    className={`w-full p-4 rounded-2xl font-bold text-left transition-all border-2 ${
                      selectedAnswer === opt 
                        ? (quizFeedback === 'correct' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700')
                        : 'border-slate-100 bg-slate-50 text-slate-600 active:border-blue-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {quizFeedback === 'correct' && (
                <button onClick={nextQuestion} className="w-full mt-8 bg-green-500 text-white py-5 rounded-2xl font-black shadow-lg shadow-green-200 animate-bounce">
                  {currentQuestionIndex < lessonData.quiz.length - 1 ? "SUIVANT →" : "TERMINER 🎓"}
                </button>
              )}
              {quizFeedback === 'wrong' && (
                <button onClick={() => {setQuizFeedback(null); setSelectedAnswer(null);}} className="w-full mt-4 text-slate-400 text-xs font-bold underline">
                  Réessayer
                </button>
              )}
            </div>
          )}
          
          <button onClick={async () => {
            if(confirm('Supprimer cette leçon ?')) {
              await supabase.from('lessons').delete().eq('id', currentLesson.id)
              setCurrentLesson(null)
            }
          }} className="w-full text-slate-300 text-[10px] font-bold uppercase tracking-widest pt-4">
            Supprimer la leçon
          </button>
        </div>
      )}

      {/* --- MODAL DE DÉTAILS DU MOT --- */}
      {selectedWord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up relative">
            <button 
              onClick={() => setSelectedWord(null)}
              className="absolute top-6 right-6 w-8 h-8 bg-slate-100 rounded-full text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <h3 className="text-4xl font-black text-slate-800 mb-1">{selectedWord.kr}</h3>
              <p className="text-blue-500 font-medium italic">{selectedWord.romanization}</p>
              <p className="text-slate-400 font-bold uppercase text-xs mt-2 tracking-widest">{selectedWord.fr}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Usage & Grammaire</span>
                <p className="text-blue-900 text-sm leading-relaxed">
                  {selectedWord.details || "Pas de détails supplémentaires disponibles."}
                </p>
              </div>

              {selectedWord.context && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exemple</span>
                  <p className="text-slate-700 text-sm font-medium">{selectedWord.context}</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedWord(null)}
              className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </div>
  )
}