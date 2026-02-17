import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generateRevisionQuiz } from '../services/aiService'
import { useApp } from '../AppContext'

export default function Revision() {
  const { profile, addXP, t, showPopup, askConfirmation } = useApp()
  const [activeTab, setActiveTab] = useState('words')
  
  const [words, setWords] = useState([])
  const [filterWord, setFilterWord] = useState('all')
  
  const [lessons, setLessons] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  
  const [revisionQuiz, setRevisionQuiz] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerFeedback, setAnswerFeedback] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [selectedWord, setSelectedWord] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profile?.target_language) return

      if (activeTab === 'words') {
        let query = supabase
          .from('learned_words')
          .select('*')
          .eq('user_id', user.id)
          .eq('language', profile.target_language)
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
          .eq('language', profile.target_language)
          .eq('completed', true)
          .order('created_at', { ascending: false })
          
        setLessons(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [activeTab, filterWord, profile?.target_language])

  const speak = (text) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    
    const langMap = {
      'Coréen': 'ko-KR',
      'Japonais': 'ja-JP',
      'Chinois': 'zh-CN',
      'Anglais': 'en-US',
      'Français': 'fr-FR',
      'Espagnol': 'es-ES',
      'Allemand': 'de-DE'
    };
    
    const targetCode = langMap[profile?.target_language] || 'fr-FR';
    utterance.lang = targetCode;
    utterance.rate = 0.8;

    const voices = window.speechSynthesis.getVoices()
    const targetVoice = voices.find(v => v.lang === targetCode) 
                          || voices.find(v => v.lang.startsWith(targetCode.split('-')[0]));
    if(targetVoice) { utterance.voice = targetVoice }

    window.speechSynthesis.speak(utterance)
  }

  const boostMastery = async (id, current) => {
    const newMastery = Math.min(current + 10, 100)
    setWords(prev => prev.map(w => w.id === id ? { ...w, mastery_level: newMastery } : w))
    const { error } = await supabase
      .from('learned_words')
      .update({ mastery_level: newMastery })
      .eq('id', id)
    if (!error) await addXP(5)
  }

  const handleDeleteWordRevision = (id, wordText) => {
      askConfirmation(
        `Supprimer définitivement le mot "${wordText}" ?`,
        async () => {
          const { error } = await supabase.from('learned_words').delete().eq('id', id);
          if (!error) {
              showPopup("Mot supprimé.", "success");
              setWords(prev => prev.filter(w => w.id !== id));
              if (selectedWord?.id === id) setSelectedWord(null);
          } else {
              showPopup("Erreur suppression.", "error");
          }
        }
      );
  }

  const handleDeleteLesson = (id, title) => {
      askConfirmation(
        `Supprimer définitivement la leçon "${title}" ?`,
        async () => {
          const { error } = await supabase.from('lessons').delete().eq('id', id);
          if (!error) {
              showPopup("Leçon supprimée.", "success");
              setLessons(prev => prev.filter(l => l.id !== id));
              if (selectedLesson?.id === id) setSelectedLesson(null);
          } else {
              showPopup("Erreur suppression.", "error");
          }
        }
      );
  }

  const startRevisionQuiz = async () => {
    setQuizLoading(true)
    try {
      const content = selectedLesson.content
      const questions = await generateRevisionQuiz(content.title, content.vocabulary || [])
      
      setRevisionQuiz(questions)
      setCurrentQIndex(0)
      setQuizScore(0)
      setQuizFinished(false)
      setSelectedAnswer(null)
      setAnswerFeedback(null)
    } catch (error) {
      showPopup("Impossible de générer le quiz pour le moment.", "error")
      console.error("Erreur génération quiz:", error)
    } finally {
      setQuizLoading(false)
    }
  }

  const handleQuizAnswer = (option) => {
    if (answerFeedback) return

    setSelectedAnswer(option)
    const currentQuestion = revisionQuiz[currentQIndex]
    
    // Normalisation pour comparaison
    const cleanOption = typeof option === 'string' ? option.trim() : option
    const cleanAnswer = typeof currentQuestion.answer === 'string' ? currentQuestion.answer.trim() : currentQuestion.answer

    let isCorrect = cleanOption === cleanAnswer;

    // Fallback pour compatibilité avec anciennes leçons
    if (!isCorrect && typeof cleanAnswer === 'string' && cleanAnswer.length === 1) {
        const index = currentQuestion.options.findIndex(o => o === option);
        const upperAnswer = cleanAnswer.toUpperCase();
        
        if (upperAnswer === 'A' && index === 0) isCorrect = true;
        else if (upperAnswer === 'B' && index === 1) isCorrect = true;
        else if (upperAnswer === 'C' && index === 2) isCorrect = true;
        else if (upperAnswer === '0' && index === 0) isCorrect = true;
        else if (upperAnswer === '1' && index === 1) isCorrect = true;
        else if (upperAnswer === '2' && index === 2) isCorrect = true;
    }
    
    if (isCorrect) {
      setAnswerFeedback('correct')
      setQuizScore(prev => prev + 1)
    } else {
      setAnswerFeedback('wrong')
    }

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
    await addXP(20)
  }

  const closeQuiz = () => {
    setRevisionQuiz(null)
    setQuizFinished(false)
  }

  if (selectedLesson && revisionQuiz) {
    return (
      <div className="p-6 pb-40 pt-4 max-w-md mx-auto">
        <button onClick={closeQuiz} className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold mb-6 text-xs uppercase tracking-widest">
          {t('revision.quit_quiz')}
        </button>

        {!quizFinished ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {t('revision.question_count', currentQIndex + 1, revisionQuiz.length)}
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-bold text-xs">{t('revision.xp_plus')}</span>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 text-center leading-snug">
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
                          ? 'border-green-600 bg-green-500 text-white shadow-lg shadow-green-200 scale-105' 
                          : 'border-red-600 bg-red-500 text-white shadow-lg shadow-red-200 shake')
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-blue-300 active:scale-95'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-xl border border-slate-200 dark:border-slate-700 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{t('revision.finished')}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {t('revision.score')} <span className="text-blue-600 dark:text-blue-400 font-bold">{quizScore} / {revisionQuiz.length}</span>
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 p-4 rounded-2xl font-bold mb-8 text-sm">
              {t('revision.xp_gained', 20)}
            </div>
            <button 
              onClick={closeQuiz}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all"
            >
              {t('revision.back_lesson')}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (selectedLesson) {
    const content = selectedLesson.content
    if (!content) return null

    return (
      <div className="p-6 pb-40 pt-4 max-w-md mx-auto">
        <button 
          onClick={() => setSelectedLesson(null)} 
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold mb-4 flex items-center gap-2"
        >
          {t('revision.back')}
        </button>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">
            {content.title || t('revision.untitled')}
          </h3>
          <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-2">
            {content.explanation && (
              <p className="italic border-l-4 border-blue-400 dark:border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-r-lg">
                {typeof content.explanation === 'string' 
                  ? content.explanation 
                  : t('revision.explanation_placeholder')}
              </p>
            )}
          </div>
        </div>

        {content.vocabulary && Array.isArray(content.vocabulary) && content.vocabulary.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-3">{t('revision.vocabulary')}</h4>
            <div className="grid gap-3">
              {content.vocabulary.map((v, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedWord(v)}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer active:scale-95 transition-all group"
                >
                  <span className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{v.kr || "?"}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{v.fr || "?"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-bold uppercase mb-4 tracking-widest">
            {t('revision.need_practice')}
          </p>
          <button 
            onClick={startRevisionQuiz}
            disabled={quizLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {quizLoading ? (
              <span className="animate-pulse">{t('revision.gen_quiz')}</span>
            ) : (
              <>
                <span>🚀</span> {t('revision.start_quiz')}
              </>
            )}
          </button>
        </div>
        
      {selectedWord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedWord(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up relative text-left" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedWord(null)}
              className="absolute top-6 right-6 w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-1">
                <h3 className="text-4xl font-black text-slate-800 dark:text-white">{selectedWord.kr}</h3>
                <button 
                  onClick={() => speak(selectedWord.kr)}
                  className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors active:scale-95"
                  title="Écouter"
                >
                  🔊
                </button>
              </div>
              <p className="text-blue-500 font-medium italic">{selectedWord.romanization}</p>
              <p className="text-slate-400 font-bold uppercase text-xs mt-2 tracking-widest">{selectedWord.fr}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Détails</span>
                <p className="text-blue-900 dark:text-blue-100 text-sm leading-relaxed">
                  {selectedWord.details || "Pas de détails supplémentaires disponibles."}
                </p>
              </div>

              {selectedWord.context && (
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exemple</span>
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">{selectedWord.context}</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setSelectedWord(null)}
              className="w-full mt-6 bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}
      </div>
    )
  }

  return (
    <div className="p-6 pb-40 pt-4 max-w-md mx-auto">
      <header className="mb-6">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('revision.title')}</h2>
        
        <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-2xl mt-4">
          <button 
            onClick={() => setActiveTab('words')} 
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'words' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t('revision.words')}
          </button>
          <button 
            onClick={() => setActiveTab('lessons')} 
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'lessons' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t('revision.lessons')}
          </button>
        </div>

        {activeTab === 'words' && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            <button 
              onClick={() => setFilterWord('all')} 
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                filterWord === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              {t('revision.all')}
            </button>
            <button 
              onClick={() => setFilterWord('weak')} 
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                filterWord === 'weak' ? 'bg-red-500 text-white border-red-500' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-red-400 dark:hover:border-red-500'
              }`}
            >
              {t('revision.weak')}
            </button>
          </div>
        )}
      </header>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 animate-pulse">{t('revision.loading')}</div>
        ) : activeTab === 'words' ? (
          words.length > 0 ? words.map(word => (
            <div key={word.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:shadow-xl transition-all">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xl font-black text-slate-800 dark:text-white">{word.word}</h4>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{word.mastery_level}%</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{word.translation}</p>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full transition-all ${word.mastery_level < 50 ? 'bg-orange-400' : 'bg-green-400'}`} style={{ width: `${Math.max(word.mastery_level, 5)}%` }}></div>
                </div>
              </div>

              <div className="flex flex-col gap-2 items-center">
                  <button onClick={() => boostMastery(word.id, word.mastery_level)} disabled={word.mastery_level >= 100} className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg active:scale-90 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50">
                    {word.mastery_level >= 100 ? '✅' : '🔥'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteWordRevision(word.id, word.word) }}
                    className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-400 flex items-center justify-center text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    title="Supprimer"
                  >
                    ✕
                  </button>
              </div>
            </div>
          )) : <p className="text-center text-slate-400 dark:text-slate-500 py-10">{t('revision.no_words')}</p>
        ) : (
          lessons.length > 0 ? lessons.map(l => (
            <div 
              key={l.id} 
              className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer active:scale-95 transition-all group hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600"
              onClick={() => setSelectedLesson(l)}
            >
              <div>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {l.title || t('revision.untitled')}
                  </h4>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">
                    {t('revision.completed_at')} {new Date(l.created_at).toLocaleDateString()}
                  </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteLesson(l.id, l.title || 'Leçon') }}
                className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                title="Supprimer la leçon"
              >
                ✕
              </button>
            </div>
          )) : <p className="text-center text-slate-400 dark:text-slate-500 py-10">{t('revision.no_lessons')}</p>
        )}
      </div>
      {/* --- MODAL DE DÉTAILS DU MOT --- */}
      {selectedWord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedWord(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up relative text-left" onClick={e => e.stopPropagation()}>
            <div className="absolute top-6 right-6 flex gap-2">
                 <button 
                  onClick={() => { handleDeleteWordRevision(selectedWord.id, selectedWord.word || selectedWord.kr) }}
                  className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-full text-red-400 font-bold flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40"
                  title="Supprimer"
                >
                  ✕
                </button>
                <button 
                  onClick={() => setSelectedWord(null)}
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  ✕
                </button>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-4xl font-black text-slate-800 dark:text-white mb-1">{selectedWord.kr}</h3>
              <p className="text-blue-500 font-medium italic">{selectedWord.romanization}</p>
              <p className="text-slate-400 font-bold uppercase text-xs mt-2 tracking-widest">{selectedWord.fr}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Détails</span>
                <p className="text-blue-900 dark:text-blue-100 text-sm leading-relaxed">
                  {selectedWord.details || "Pas de détails supplémentaires disponibles."}
                </p>
              </div>

              {selectedWord.context && (
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exemple</span>
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">{selectedWord.context}</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setSelectedWord(null)}
              className="w-full mt-6 bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}