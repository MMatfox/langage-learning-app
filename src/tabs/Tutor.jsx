import { useState, useEffect, useRef } from 'react'
import { chatWithTutor } from '../services/aiService'

export default function Tutor() {
  const [messages, setMessages] = useState([
    { role: 'model', text: '안녕하세요! Je suis Ji-min, ton tuteur. Prêt à pratiquer un peu ?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const speak = (text) => {
    // 1. On coupe le sifflet s'il parle déjà
    window.speechSynthesis.cancel();

    // 2. On récupère les voix
    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KR'));
    const frVoice = voices.find(v => v.lang.includes('fr') || v.lang.includes('FR'));

    // 3. Nettoyage du Markdown (gras, italique) pour ne pas qu'il lise les étoiles
    const cleanText = text.replace(/[*#_`]/g, '');

    // 4. L'algorithme de découpage : On sépare le texte par blocs de Coréen
    // Cette regex sépare le texte dès qu'elle voit du Hangeul
    const parts = cleanText.split(/([ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+)/g);

    // 5. On lit chaque morceau avec la bonne voix
    parts.forEach((part) => {
      const segment = part.trim();
      if (!segment) return; // On ignore les vides

      const utterance = new SpeechSynthesisUtterance(segment);

      // On vérifie si ce bout de texte est du Coréen
      const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(segment);

      if (isKorean && koVoice) {
        utterance.voice = koVoice;
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9; // Un peu plus lent pour bien entendre la prononciation
      } else {
        // C'est du français (ou autre), on utilise la voix FR par défaut
        if (frVoice) utterance.voice = frVoice;
        utterance.lang = 'fr-FR';
        utterance.rate = 1;
      }

      // Le navigateur est intelligent : il va jouer les morceaux à la suite sans coupure
      window.speechSynthesis.speak(utterance);
    });
  };

  const startVoiceInput = () => {
    window.speechSynthesis.cancel()
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée sur ce navigateur.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    
    recognition.onerror = (e) => {
      console.error("Micro Error:", e.error)
      setIsListening(false)
      if (e.error === 'not-allowed') alert("Active le micro dans tes réglages !")
    }

    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
    }

    try {
      recognition.start()
    } catch (e) {
      console.error(e)
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
      setMessages(prev => [...prev, { role: 'model', text: "Désolé, j'ai une petite coupure de micro. Peux-tu répéter ?" }])
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
            <h3 className="font-black text-slate-800 text-lg">Ji-min</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">En ligne</p>
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
            onClick={startVoiceInput}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}
          >
            {isListening ? '●' : '🎤'}
          </button>
          <input 
            className="flex-1 bg-transparent py-2 px-1 text-sm focus:outline-none"
            placeholder="Écris en coréen..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={!input.trim() || loading} className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-30 transition-all">🚀</button>
        </form>
      </div>
    </div>
  )
}