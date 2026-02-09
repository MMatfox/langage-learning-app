import { useState, useEffect, useRef } from 'react'
import { chatWithTutor } from '../services/aiService'
import { useApp } from '../AppContext'

export default function Tutor() {
  const { profile, t, showPopup, tutorMessages, setTutorMessages } = useApp()
  // Utiliser le contexte pour les messages, sinon local (mais on veut persistance)
  const messages = tutorMessages || []
  const setMessages = setTutorMessages || (() => {})

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const chatEndRef = useRef(null)
  const recognitionRef = useRef(null) // Pour contrôler l'instance

  // Configuration par langue
  const tutorConfig = {
    'Coréen': { name: 'Ji-min', langCode: 'ko-KR', helloKey: 'intro_ko' },
    'Japonais': { name: 'Yuki', langCode: 'ja-JP', helloKey: 'intro_jp' },
    'Chinois': { name: 'Wei', langCode: 'zh-CN', helloKey: 'intro_zh' },
    'defaut': { name: 'Tuteur', langCode: 'fr-FR', helloKey: 'intro_default' }
  }

  const currentConfig = tutorConfig[profile?.target_language] || tutorConfig['defaut']

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'model', text: t(`tutor.${currentConfig.helloKey}`) }])
    }
    
    // Cleanup audio quand on quitte l'onglet
    return () => {
      window.speechSynthesis.cancel()
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [profile?.target_language]) // Dépendance simplifiée

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const targetLang = profile?.target_language;
    
    let targetRegex;
    let targetCode = 'fr-FR'; 

    if (targetLang === 'Coréen') {
        targetRegex = /([\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+)/; // Hangeul
        targetCode = 'ko-KR';
    } else if (targetLang === 'Japonais') {
        targetRegex = /([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/; // Hiragana, Katakana, Kanji
        targetCode = 'ja-JP';
    } else if (targetLang === 'Chinois') {
        targetRegex = /([\u4E00-\u9FAF]+)/; // Hanzi
        targetCode = 'zh-CN';
    }

    const uiLangMap = {
      'Français': 'fr-FR',
      'Anglais': 'en-US',
      'Espagnol': 'es-ES',
      'Allemand': 'de-DE'
    };
    const fallbackCode = uiLangMap[profile?.ui_language] || 'fr-FR';

    // Fonction helper pour trouver la voix
    const getVoice = (langCode) => {
      return voices.find(v => v.lang.replace('_', '-').includes(langCode.split('-')[0])) 
          || voices.find(v => v.lang.includes(langCode.substring(0, 2)));
    }

    if (!targetRegex) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getVoice(fallbackCode); // Default fallback
      window.speechSynthesis.speak(utterance);
      return;
    }

    // Découper le texte : partie cible vs reste (supposé français/anglais)
    const parts = text.split(targetRegex);

    parts.forEach(part => {
      if (!part.trim()) return;

      const isTarget = targetRegex.test(part);
      const utterance = new SpeechSynthesisUtterance(part);
      
      if (isTarget) {
        const v = getVoice(targetCode);
        if (v) utterance.voice = v;
        utterance.lang = targetCode;
        utterance.rate = 0.9; // Un peu plus lent pour la langue cible
      } else {
        const v = getVoice(fallbackCode); // Langue UI
        if (v) utterance.voice = v;
        utterance.lang = fallbackCode;
      }

      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleVoiceInput = () => {
    // Si déjà en écoute, on arrête
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    window.speechSynthesis.cancel()
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      showPopup(t('tutor.speech_error'), 'error')
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = currentConfig.langCode // Langue cible pour l'exercice
    // Mais si l'utilisateur veut parler sa langue ? Idéalement détection auto ou bouton toggle lang
    // Pour l'instant on reste sur la config
    
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    
    recognition.onerror = (e) => {
      console.error("Micro Error:", e.error)
      setIsListening(false)
      if (e.error === 'not-allowed') showPopup(t('tutor.micro_permission'), 'error')
      if (e.error === 'no-speech') showPopup("Aucune parole détectée. Réessayez.", 'info')
    }

    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      if (transcript) {
        setInput(prev => prev ? `${prev} ${transcript}` : transcript)
      }
    }

    try {
      recognition.start()
    } catch (e) {
      console.error(e)
      setIsListening(false)
    }
  }

  const sendMessage = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }))
      
      const response = await chatWithTutor(history, userText)
      setMessages(prev => [...prev, { role: 'model', text: response }])
      speak(response)
      
    } catch (error) {
      console.error("Erreur Chat:", error)
      setMessages(prev => [...prev, { role: 'model', text: t('tutor.network_error') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      <div className="p-4 bg-white border-b flex items-center justify-between pt-12 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center text-2xl shadow-inner shadow-white/20">👨‍🏫</div>
          <div>
            <h3 className="font-black text-slate-800 text-lg">{currentConfig.name}</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('tutor.online')}</p>
            </div>
          </div>
        </div>
        <button onClick={() => window.speechSynthesis.cancel()} className="p-2 bg-slate-50 rounded-xl text-slate-400 transition-colors active:bg-slate-200">🔇</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`relative max-w-[85%] p-4 rounded-[2rem] shadow-sm text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-blue-100' : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
            }`}>
              {m.text}
              {m.role === 'model' && (
                <button onClick={() => speak(m.text)} className="absolute -right-10 bottom-2 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-50 text-xs">🔊</button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-3xl rounded-bl-none border border-slate-100 flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]">
        <form onSubmit={sendMessage} className="max-w-md mx-auto bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-100 flex gap-2 items-center">
          <button 
            type="button"
            onClick={toggleVoiceInput}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}
          >
            {isListening ? '●' : '🎤'}
          </button>
          <input 
            className="flex-1 bg-transparent py-2 px-1 text-sm focus:outline-none"
            placeholder={t('tutor.placeholder', profile.target_language)}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={!input.trim() || loading} className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-30 transition-all">🚀</button>
        </form>
      </div>
    </div>
  )
}