import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function Flashcards() {
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false) // Renommé pour clarté
  const [loading, setLoading] = useState(true)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // On récupère les 10 mots les moins révisés (y compris ceux à 0%)
      const { data } = await supabase
        .from('learned_words')
        .select('*')
        .eq('user_id', user.id)
        // CORRECTION ICI : .gte au lieu de .gt
        .gte('mastery_level', 0) 
        .order('last_reviewed', { ascending: true }) // Les plus vieux d'abord
        .limit(10)

      setCards(data || [])
    } catch (error) {
      console.error("Erreur Flashcards:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const handleResult = async (score) => {
    // Empêcher le clic multiple
    if (!cards[currentIndex]) return

    const card = cards[currentIndex]
    const newMastery = Math.max(0, Math.min(100, card.mastery_level + score))
    
    // Mise à jour optimiste (pour que l'UI réagisse vite)
    const newCards = [...cards]
    newCards[currentIndex].mastery_level = newMastery
    setCards(newCards)
    
    // Mise à jour BDD en arrière-plan
    await supabase.from('learned_words')
      .update({ 
        mastery_level: newMastery,
        last_reviewed: new Date().toISOString()
      })
      .eq('id', card.id)

    // On passe à la suite
    setIsFlipped(false)

    setTimeout(async () => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        await supabase.rpc('add_xp', { amount: 20 })
        alert("Session terminée ! Bravo 🎉 +20 XP")
        // Reset pour recommencer ou recharger
        setCurrentIndex(0)
        fetchCards()
      }
    }, 300)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  if (cards.length === 0) return (
    <div className="p-10 text-center flex flex-col items-center justify-center h-full space-y-4">
      <div className="text-6xl">📭</div>
      <p className="text-slate-500 font-bold leading-tight">Ta boîte de révision est vide !</p>
      <p className="text-slate-400 text-sm">Va dans l'onglet "Mots" pour en générer.</p>
    </div>
  )

  const currentCard = cards[currentIndex]

  return (
    <div className="p-6 flex flex-col items-center h-full pt-16 max-w-md mx-auto">
      <header className="text-center mb-8 w-full">
        <h2 className="text-xl font-black text-slate-300 uppercase tracking-[0.3em]">Flashcards</h2>
        {/* Barre de progression */}
        <div className="flex gap-1 mt-4 justify-center h-1.5 w-full max-w-[200px] mx-auto">
          {cards.map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'bg-blue-600' : i < currentIndex ? 'bg-blue-200' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </header>

      {/* SCÈNE 3D */}
      <div className="relative w-full aspect-[3/4] max-h-[400px]" style={{ perspective: '1000px' }}>
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-full relative cursor-pointer transition-all duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* FACE AVANT (RECTO) */}
          <div 
            className="absolute inset-0 bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 flex flex-col items-center justify-center p-6 backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-6xl font-black text-slate-800 text-center leading-tight">
              {currentCard.word}
            </span>
            <p className="mt-8 text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
              Toucher pour retourner
            </p>
          </div>

          {/* FACE ARRIÈRE (VERSO) */}
          <div 
            className="absolute inset-0 bg-blue-600 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center p-6 text-white backface-hidden"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <span className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Traduction</span>
            <span className="text-3xl font-black text-center mb-4 leading-snug">
              {currentCard.translation}
            </span>
            
            <div className="w-12 h-1 bg-white/20 rounded-full mb-4"></div>
            
            {currentCard.romanization && (
              <span className="text-lg italic opacity-90 font-medium">
                {currentCard.romanization}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONTRÔLES (Visibles uniquement si retourné) */}
      <div 
        className={`flex gap-4 mt-8 w-full transition-all duration-300 ${
          isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); handleResult(-10); }}
          className="flex-1 bg-white border-2 border-red-100 text-red-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-sm hover:bg-red-50 transition-colors"
        >
          À revoir ❌
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleResult(10); }}
          className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-lg shadow-green-200 hover:bg-green-600 transition-colors"
        >
          Facile ✅
        </button>
      </div>
      
      <p className="mt-6 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
        Carte {currentIndex + 1} / {cards.length}
      </p>
    </div>
  )
}