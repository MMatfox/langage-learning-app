import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { generateNewWord } from '../services/aiService'
import { useApp } from '../AppContext'

export default function Words() {
  const { profile, addXP, t, showPopup } = useApp()
  const [currentWord, setCurrentWord] = useState(null)
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  
  useEffect(() => {
    if (profile?.target_language) {
      setLoading(true)
      setCurrentWord(null)
      setWords([])
      loadState()
      fetchLearnedWords()
    }
  }, [profile?.target_language])



  const recognitionRef = useRef(null)

  const toggleListening = async () => {
    if (isListening || isStarting) {
      recognitionRef.current?.stop()
      setIsListening(false)
      setIsStarting(false)
      return
    }

    setIsStarting(true)
    window.speechSynthesis.cancel()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop()) 
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err) {
      console.error("Hardware Mic Error:", err)
      setIsStarting(false)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
         showPopup("Permission micro refusée au niveau du navigateur.", 'error')
      } else if (err.name === 'NotFoundError') {
         showPopup("Aucun microphone détecté.", 'error')
      } else {
         showPopup(`Problème matériel: ${err.message}`, 'error')
      }
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition
    if (!SpeechRecognition) {
      showPopup(t('words.micro_error'), 'error')
      setIsStarting(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    
    const langMap = {
      'Coréen': 'ko-KR',
      'Japonais': 'ja-JP',
      'Chinois': 'zh-CN',
      'Anglais': 'en-US',
      'Français': 'fr-FR',
      'Espagnol': 'es-ES',
      'Allemand': 'de-DE'
    };
    recognition.lang = langMap[profile?.target_language] || 'ko-KR'     
    recognition.continuous = false
    recognition.interimResults = false
    
    const safetyTimeout = setTimeout(() => {
      if (recognitionRef.current === recognition) {
        console.error("Microphone timeout - Speech API not starting")
        recognition.abort()
        setIsStarting(false)
        showPopup("Service vocal inaccessible. Utilisez une autre méthode.", 'warning')
      }
    }, 8000)

    recognition.onstart = () => {
      clearTimeout(safetyTimeout)
      setIsListening(true)
      setIsStarting(false)
    }
    
    recognition.onend = () => {
      clearTimeout(safetyTimeout)
      setIsListening(false)
      setIsStarting(false)
    }

    recognition.onerror = (e) => {
      clearTimeout(safetyTimeout)
      console.error("Micro Error:", e.error)
      setIsListening(false)
      setIsStarting(false)
      if (e.error === 'not-allowed') showPopup("Permission micro refusée !", 'error')
      else if (e.error === 'no-speech') showPopup("Aucune parole détectée.", 'info')
      else if (e.error === 'network') showPopup("Erreur réseau (Speech API).", 'error')
      else showPopup(`Erreur micro: ${e.error}`, 'error')
    }

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.trim()
      const cleanTranscript = transcript.replace(/[!?.]/g, '').toLowerCase()
      const cleanTarget = currentWord.word.replace(/[!?.]/g, '').toLowerCase()

       if (cleanTranscript === cleanTarget || transcript.includes(currentWord.word)) {
          showPopup("Bravo ! Prononciation correcte 🎉", 'success')
          await addXP(5)
       } else {
         showPopup(`Entendu: "${transcript}". Essaie encore !`, 'warning')
      }
    }

    try {
      recognition.start()
    } catch (e) {
      clearTimeout(safetyTimeout)
      console.error(e)
      showPopup("Impossible de démarrer le micro.", 'error')
      setIsListening(false)
      setIsStarting(false)
    }
  }
  const loadState = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !profile?.target_language) return

    const { data } = await supabase
      .from('learned_words')
      .select('*')
      .eq('user_id', user.id)
      .eq('language', profile.target_language)
      .eq('mastery_level', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setCurrentWord(data)
    }
    setLoading(false)
  }

  const fetchLearnedWords = async () => {
    if (!profile?.target_language) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('learned_words')
      .select('*')
      .eq('user_id', user.id)
      .eq('language', profile.target_language)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setWords(data)
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

  const fetchNewWord = async () => {
    if (!profile?.target_language) return
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: existing } = await supabase
        .from('learned_words')
        .select('word')
        .eq('user_id', user.id)
        .eq('language', profile.target_language)
      const excludeList = existing?.map(w => w.word) || []
      
      const { data: langProfile } = await supabase
        .from('language_profiles')
        .select('level')
        .eq('user_id', user.id)
        .eq('language', profile.target_language)
        .maybeSingle()
      
      const aiData = await generateNewWord(excludeList, langProfile?.level || 1)
      
      const { data: savedWord, error } = await supabase.from('learned_words').insert([
        { 
          user_id: user.id, 
          word: aiData.word,
          romanization: aiData.romanization,
          translation: aiData.translation,
          example_kr: aiData.example_kr,
          example_fr: aiData.example_fr,
          language: profile.target_language,
          mastery_level: 0
        }
      ]).select().single()

      if (error) throw error
      setCurrentWord(savedWord)
      fetchLearnedWords()

    } catch (error) {
      console.error("Erreur génération:", error)
      showPopup(t('words.ai_error'), 'error')
    } finally {
      setLoading(false)
    }
  }




  const validateWord = async () => {
    if (!currentWord) return
    
    const { error } = await supabase
      .from('learned_words')
      .update({ mastery_level: 20 })
      .eq('id', currentWord.id)

    if (!error) {
      await addXP(10)
      setCurrentWord(null)
      fetchLearnedWords()
    }
  }

  const markAsKnown = async () => {
    if (!currentWord) return
    
    const { error } = await supabase
      .from('learned_words')
      .update({ mastery_level: 100 })
      .eq('id', currentWord.id)

    if (!error) {
      await addXP(20)
      setCurrentWord(null)
      fetchLearnedWords()
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  if (!currentWord) return (
    <div className="p-6 pb-28 max-w-md mx-auto">
      <header className="pt-8 mb-8">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('words.title')}</h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm mt-2">{t('words.desc', profile.target_language)}</p>
      </header>
      <button 
        onClick={fetchNewWord}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
      >
        {t('words.generate')}
      </button>
      
      {words.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-3">{t('words.recent')} ({words.length})</h3>
          <div className="space-y-2">
            {words.map(w => (
              <div key={w.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white">{w.word}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs ml-2">{w.translation}</span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{w.mastery_level}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6 pb-28 max-w-md mx-auto">
      <header className="pt-8 mb-6">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('words.title')}</h2>
      </header>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border border-slate-200 dark:border-slate-700 mb-6">
        <div className="text-center mb-6">
          <button 
            onClick={() => speak(currentWord.word)}
            className="text-6xl font-black text-slate-800 dark:text-white mb-2 active:scale-95 transition-transform"
          >
            {currentWord.word}
          </button>
          <p className="text-blue-600 dark:text-blue-400 text-sm font-bold">{currentWord.romanization}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-4">
          <p className="text-slate-800 dark:text-white font-bold text-center">{currentWord.translation}</p>
        </div>

        {currentWord.example_kr && (
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-slate-800 dark:text-white text-sm font-medium">{currentWord.example_kr}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs italic">{currentWord.example_fr}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button 
          onClick={() => speak(currentWord.word)}
          className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-4 rounded-2xl active:scale-95 transition-all flex flex-col items-center gap-1 font-bold border border-blue-200 dark:border-blue-800"
        >
          <span className="text-2xl">🔊</span>
          <span className="text-[10px] uppercase">{t('words.listen')}</span>
        </button>
        <button 
          onClick={toggleListening}
          disabled={isStarting}
          className={`${isListening ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' : isStarting ? 'bg-yellow-400 text-white' : 'bg-slate-800 dark:bg-slate-700 text-white'} p-4 rounded-2xl active:scale-95 transition-all flex flex-col items-center gap-1 font-bold shadow-lg`}
        >
          <span className={`text-2xl ${isStarting ? 'animate-spin' : ''}`}>{isStarting ? '⏳' : isListening ? '⏹️' : '🎤'}</span>
          <span className="text-[10px] uppercase">{isStarting ? '...' : isListening ? t('words.speaking') : t('words.repeat')}</span>
        </button>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={markAsKnown}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
        >
          ✅ {t('words.known')}
        </button>
        <button 
          onClick={fetchNewWord}
          className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
        >
          ➡️ {t('words.next')}
        </button>
      </div>
    </div>
  )
}