import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generateNewLesson, generateRevisionQuiz } from '../services/aiService'
import { useApp } from '../AppContext'

export default function Lessons() {
  const { profile, t, showPopup, addXP } = useApp()
  const [currentLesson, setCurrentLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizStarted, setQuizStarted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [quizFeedback, setQuizFeedback] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  
  const [selectedWord, setSelectedWord] = useState(null)
  const [regeneratingQuiz, setRegeneratingQuiz] = useState(false)

  useEffect(() => {
    const loadLesson = async () => {
      if (!profile?.target_language) return
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('user_id', user.id)
        .eq('language', profile.target_language)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        setCurrentLesson(data)
      } else {
        setCurrentLesson(null)
      }
      setLoading(false)
    }
    loadLesson()
  }, [profile?.target_language])

  const fetchLesson = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profile?.target_language) return
      
      const { data: allLessons } = await supabase.from('lessons').select('title').eq('user_id', user.id).eq('language', profile.target_language)
      const titles = allLessons?.map(l => l.title) || []
      const { data: prof } = await supabase.from('language_profiles').select('level').eq('user_id', user.id).eq('language', profile.target_language).maybeSingle()
      
      const aiContent = await generateNewLesson(titles, prof?.level || 1)
      
      const { data: savedLesson, error } = await supabase.from('lessons').insert([
        { 
          user_id: user.id, 
          title: aiContent.title, 
          content: aiContent, 
          completed: false,
          language: profile.target_language
        }
      ]).select().single()

      if (error) throw error
      
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
              language: profile.target_language,
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
      setScore(0)

    } catch (error) {
      console.error("Erreur leçon:", error)
      showPopup("Erreur lors de la génération. Réessaie.", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (option) => {
    if (quizFeedback) return
    setSelectedAnswer(option)
    const currentQ = currentLesson.content.quiz[currentQuestionIndex]
    
    const cleanOption = typeof option === 'string' ? option.trim() : option
    const cleanAnswer = typeof currentQ.answer === 'string' ? currentQ.answer.trim() : currentQ.answer

    let isCorrect = cleanOption === cleanAnswer;

    if (!isCorrect && typeof cleanAnswer === 'string' && cleanAnswer.length === 1) {
        const index = currentQ.options.findIndex(o => o === option);
        const upperAnswer = cleanAnswer.toUpperCase();
        
        if (upperAnswer === 'A' && index === 0) isCorrect = true;
        else if (upperAnswer === 'B' && index === 1) isCorrect = true;
        else if (upperAnswer === 'C' && index === 2) isCorrect = true;
        else if (upperAnswer === '0' && index === 0) isCorrect = true;
        else if (upperAnswer === '1' && index === 1) isCorrect = true;
        else if (upperAnswer === '2' && index === 2) isCorrect = true;
    }

    if (isCorrect) {
        setQuizFeedback("correct")
        setScore(prev => prev + 1)
    } else {
        setQuizFeedback("wrong")
    }
  }

  const nextQuestion = () => {
    const quiz = currentLesson.content.quiz
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setQuizFeedback(null)
      setSelectedAnswer(null)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    const threshold = Math.ceil(quizLength * 0.8)

    if (score >= threshold) {
        const { error } = await supabase.from('lessons').update({ completed: true }).eq('id', currentLesson.id)
        if (!error) {
            const xpEarned = 50 + (score * 2);
            await addXP(xpEarned)
            showPopup(`Leçon validée ! ${score}/${quizLength} (+${xpEarned} XP) 🎓`, "success")
            setCurrentLesson(null) 
        }
    } else {
        showPopup(`Score insuffisant (${score}/${quizLength}). Il faut ${threshold}/${quizLength}. Nouveau quiz en approche...`, "info")
        setRegeneratingQuiz(true)
        
        try {
            const newQuiz = await generateRevisionQuiz(currentLesson.content.title, currentLesson.content.vocabulary, 10)
            const newContent = { ...currentLesson.content, quiz: newQuiz }
            
            await supabase.from('lessons').update({ content: newContent }).eq('id', currentLesson.id)

            setCurrentLesson({ ...currentLesson, content: newContent })
            
            setCurrentQuestionIndex(0)
            setScore(0)
            setQuizFeedback(null)
            setSelectedAnswer(null)
            showPopup("Nouveau quiz prêt ! Bonne chance.", "success")
            
        } catch (e) {
            console.error(e)
            showPopup("Erreur lors de la régénération du quiz.", "error")
        } finally {
            setRegeneratingQuiz(false)
        }
    }
  }

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

    if(targetVoice) {
        utterance.voice = targetVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  const renderSafeContent = (content) => {
    if (content === null || content === undefined) return null;
// ... (rest of renderSafeContent remains unchanged, but I need to target correctly to insert speak before it)

    if (typeof content === 'string' || typeof content === 'number') {
      return <span className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm italic whitespace-pre-line">{content}</span>;
    }
    if (Array.isArray(content)) {
      return <ul className="list-disc pl-5">{content.map((item, i) => <li key={i}>{renderSafeContent(item)}</li>)}</ul>;
    }
    if (typeof content === 'object') {
      return (
        <div className="pl-2 border-l-2 border-blue-100 my-2 space-y-2">
          {Object.entries(content).map(([key, value], index) => (
            <div key={index}>
              <strong className="block text-slate-800 dark:text-slate-100 capitalize text-xs mb-1 bg-slate-50 dark:bg-slate-700 inline-block px-1 rounded">{key.replace(/_/g, ' ')} :</strong>
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
    <div className="p-6 pb-40 pt-4 max-w-md mx-auto relative">
      <header className="mb-8 text-center">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('lessons.title')}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('lessons.subtitle')}</p>
      </header>

      {!currentLesson ? (
        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 dark:shadow-none text-center border border-slate-100 dark:border-slate-700 flex flex-col items-center animate-fade-in">
          <div className="text-6xl mb-6 text-blue-600">📖</div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('lessons.ready_title')}</h3>
          {!loading && (
             <button onClick={fetchLesson} disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all mt-6">
              {t('lessons.generate')}
            </button>
          )}
           {loading && <p className="text-blue-500 font-bold mt-4 animate-pulse">{t('lessons.generating')}</p>}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {!quizStarted ? (
            <>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">{t('lessons.theory')}</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-3 mb-4">{lessonData.title}</h3>
                <div className="mt-4">
                  {renderSafeContent(lessonData.explanation)}
                </div>
              </div>

              <div className="grid gap-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">
                  {t('lessons.vocabulary_title')}
                </h4>
                {Array.isArray(lessonData.vocabulary) && lessonData.vocabulary.map((v, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedWord(v)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-50 dark:border-slate-700 cursor-pointer active:scale-95 transition-transform hover:border-blue-300 group"
                  >
                    <div>
                        <span className="font-bold text-xl text-slate-800 dark:text-white block group-hover:text-blue-600 transition-colors">
                          {v.kr}
                          <span className="ml-2 text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-500 px-1.5 py-0.5 rounded-full align-middle">i</span>
                        </span>
                        {v.romanization && <span className="text-xs text-blue-400 italic block">{v.romanization}</span>}
                    </div>
                    <span className="text-slate-500 dark:text-slate-300 font-medium text-sm bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-lg">{v.fr}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setQuizStarted(true)} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all uppercase tracking-wider">
                {t('lessons.start_quiz')}
              </button>
            </>
          ) : (
            /* QUIZ */
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-700 animate-slide-up">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                {t('lessons.question_count', currentQuestionIndex + 1, lessonData.quiz.length)}
              </span>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mt-6 mb-8 text-center leading-snug">
                {lessonData.quiz[currentQuestionIndex].question}
              </h3>
              <div className="space-y-3">
                {lessonData.quiz[currentQuestionIndex].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    className={`w-full p-4 rounded-2xl font-bold text-left transition-all border-2 ${
                      selectedAnswer === opt 
                        ? (quizFeedback === 'correct' 
                            ? 'border-green-600 bg-green-500 text-white shadow-lg shadow-green-200 scale-105' 
                            : 'border-red-600 bg-red-500 text-white shadow-lg shadow-red-200 shake')
                        : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600 hover:shadow-md hover:border-blue-200 active:scale-95'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {quizFeedback === 'correct' && (
                <button onClick={nextQuestion} className="w-full mt-8 bg-green-500 text-white py-5 rounded-2xl font-black shadow-lg shadow-green-200 animate-bounce">
                  {currentQuestionIndex < lessonData.quiz.length - 1 ? t('lessons.next') : t('lessons.finish')}
                </button>
              )}
              {quizFeedback === 'wrong' && (
                <button onClick={() => {setQuizFeedback(null); setSelectedAnswer(null);}} className="w-full mt-4 text-slate-400 text-xs font-bold underline">
                  {t('lessons.retry')}
                </button>
              )}
            </div>
          )}
          
          <button onClick={async () => {
            if(confirm(t('lessons.confirm_delete'))) {
              await supabase.from('lessons').delete().eq('id', currentLesson.id)
              setCurrentLesson(null)
            }
          }} className="w-full text-slate-300 text-[10px] font-bold uppercase tracking-widest pt-4">
            {t('lessons.delete')}
          </button>
        </div>
      )}

      {selectedWord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up relative">
            <button 
              onClick={() => setSelectedWord(null)}
              className="absolute top-6 right-6 w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-1">
                <h3 className="text-4xl font-black text-slate-800 dark:text-white">{selectedWord.kr}</h3>
                <button 
                  onClick={() => speak(selectedWord.kr)}
                  className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors active:scale-95"
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
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">{t('lessons.usage')}</span>
                <p className="text-blue-900 dark:text-blue-200 text-sm leading-relaxed">
                  {selectedWord.details || "Pas de détails supplémentaires disponibles."}
                </p>
              </div>

              {selectedWord.context && (
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('lessons.example')}</span>
                  <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">{selectedWord.context}</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedWord(null)}
              className="w-full mt-6 bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all"
            >
              {t('lessons.got_it')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}