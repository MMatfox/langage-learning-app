import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { generateNewWord } from '../services/aiService'

export default function Words() {
  const [currentWord, setCurrentWord] = useState(null)
  const [loading, setLoading] = useState(true) // On charge au début
  const [isListening, setIsListening] = useState(false)
  
  // Charge le dernier mot en cours ou reste vide
  useEffect(() => {
    const loadState = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // On cherche un mot "en cours" (niveau 0)
      const { data } = await supabase
        .from('learned_words')
        .select('*')
        .eq('user_id', user.id)
        .eq('mastery_level', 0) 
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setCurrentWord(data)
      }
      setLoading(false)
    }
    loadState()
  }, [])

  const speak = (text) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    
    // Fix voix (optionnel, reprends ta fonction speak améliorée précédente si tu veux)
    const voices = window.speechSynthesis.getVoices()
    const koVoice = voices.find(v => v.lang.includes('ko'))
    if(koVoice) utterance.voice = koVoice

    window.speechSynthesis.speak(utterance)
  }

  const fetchNewWord = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // 1. Récupérer TOUS les mots (appris + en cours) pour éviter répétitions
      const { data: existing } = await supabase.from('learned_words').select('word').eq('user_id', user.id)
      const excludeList = existing?.map(w => w.word) || []
      
      // 2. Récupérer niveau
      const { data: prof } = await supabase.from('profiles').select('level').eq('id', user.id).single()
      
      // 3. Générer
      const aiData = await generateNewWord(excludeList, prof?.level || 1)
      
      // 4. SAUVEGARDER IMMÉDIATEMENT (Niveau 0 = En cours)
      const { data: savedWord, error } = await supabase.from('learned_words').insert([
        { 
          user_id: user.id, 
          word: aiData.word,
          romanization: aiData.romanization,
          translation: aiData.translation,
          example_kr: aiData.example_kr,
          example_fr: aiData.example_fr,
          mastery_level: 0 // Marqueur "Non validé"
        }
      ]).select().single()

      if (error) throw error
      setCurrentWord(savedWord)

    } catch (error) {
      console.error("Erreur génération:", error)
      alert("Erreur de connexion IA. Réessaie.")
    } finally {
      setLoading(false)
    }
  }

  const startListening = () => {
    window.speechSynthesis.cancel()
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return alert("Micro non supporté")

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.trim()
      // Comparaison souple
      if (transcript.toLowerCase().includes(currentWord.word.replace(/[!?.]/g, '').toLowerCase())) {
        alert("Bravo ! Excellente prononciation ✅ (+10 XP)")
        await validateWord()
      } else {
        alert(`Tu as dit : "${transcript}". Réessaie ! ❌`)
      }
    }
    recognition.start()
  }

  const validateWord = async () => {
    if (!currentWord) return
    
    // Mise à jour : on passe de 0 à 20%
    const { error } = await supabase
      .from('learned_words')
      .update({ mastery_level: 20 })
      .eq('id', currentWord.id)

    if (!error) {
      await supabase.rpc('add_xp', { amount: 10 })
      // On met à jour l'état local pour afficher le badge "Appris"
      setCurrentWord(prev => ({ ...prev, mastery_level: 20 }))
    }
  }

  const isLearned = currentWord?.mastery_level > 0

  return (
    <div className="p-6 pb-24 flex flex-col items-center justify-center min-h-full space-y-8 max-w-md mx-auto">
      <h2 className="text-xl font-black text-slate-300 uppercase tracking-widest pt-8">Apprentissage</h2>

      {currentWord ? (
        <div className="w-full bg-white p-8 rounded-[40px] shadow-xl shadow-blue-100/50 text-center space-y-6 border border-slate-50 relative overflow-hidden animate-fade-in">
          {isLearned && (
            <div className="absolute top-4 right-4 text-green-500 font-bold text-xs bg-green-50 px-2 py-1 rounded-lg">
              Appris ✓
            </div>
          )}
          
          <div className="py-4">
            <div className="text-6xl font-black text-slate-800 mb-2">{currentWord.word}</div>
            <div className="text-lg text-blue-500 font-medium italic">{currentWord.romanization}</div>
          </div>
          
          <div className="text-2xl font-bold text-slate-700 border-t border-slate-50 pt-6">
            {currentWord.translation}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl text-sm text-left border border-slate-100">
            <p className="font-bold text-slate-800 mb-1">{currentWord.example_kr}</p>
            <p className="text-slate-500 italic">{currentWord.example_fr}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button onClick={() => speak(currentWord.word)} className="bg-blue-50 text-blue-600 p-5 rounded-3xl active:scale-95 transition-all flex flex-col items-center gap-1 font-bold">
              <span className="text-2xl">🔊</span> <span className="text-[10px] uppercase">Écouter</span>
            </button>
            <button onClick={startListening} className={`${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-900 text-white'} p-5 rounded-3xl active:scale-95 transition-all flex flex-col items-center gap-1 font-bold shadow-lg shadow-slate-200`}>
              <span className="text-2xl">🎤</span> <span className="text-[10px] uppercase">{isListening ? 'Parle...' : 'Répéter'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4 py-20">
          {!loading && (
            <>
               <div className="text-6xl animate-bounce">🇰🇷</div>
               <p className="text-slate-400 font-medium">Prêt pour ton prochain mot ?</p>
            </>
          )}
        </div>
      )}

      <button 
        onClick={fetchNewWord}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-wider"
      >
        {loading ? "Chargement..." : "Nouveau mot"}
      </button>
    </div>
  )
}