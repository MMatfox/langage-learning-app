import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useApp } from '../AppContext'

export default function Flashcards() {
  const { profile, addXP, t } = useApp()
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.target_language) {
      setLoading(true)
      setCards([])
      setCurrentIndex(0)
      setIsFlipped(false)
      fetchCards()
    }
  }, [profile?.target_language])

  const fetchCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profile?.target_language) return

      const { data } = await supabase
        .from('learned_words')
        .select('*')
        .eq('user_id', user.id)
        .eq('language', profile.target_language)
        .gte('mastery_level', 0) 
        .order('last_reviewed', { ascending: true })
        .limit(10)

      setCards(data || [])
    } catch (error) {
      console.error("Erreur Flashcards:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResult = async (score) => {
    if (!cards[currentIndex]) return

    const card = cards[currentIndex]
    const newMastery = Math.max(0, Math.min(100, card.mastery_level + score))
    
    // Mise à jour optimiste
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

    setIsFlipped(false)

    setTimeout(async () => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        await addXP(20)
        alert(t('flashcards.session_end') + " (+20 XP)")
        setCurrentIndex(0)
        fetchCards()
      }
    }, 300)
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  if (cards.length === 0) return (
    <div className="p-6 pb-28 flex flex-col items-center justify-center h-full max-w-md mx-auto text-center">
      <div className="text-6xl mb-4">📭</div>
      <p className="text-slate-800 dark:text-white font-black text-xl mb-2">{t('flashcards.empty_title')}</p>
      <p className="text-slate-500 dark:text-slate-400 text-sm">{t('flashcards.empty_desc')}</p>
    </div>
  )

  const currentCard = cards[currentIndex]

  return (
    <div className="p-6 pb-28 flex flex-col items-center h-full pt-8 max-w-md mx-auto">
      <header className="text-center mb-8 w-full">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('flashcards.title')}</h2>
        
        {/* Barre de progression */}
        <div className="flex gap-1 mt-4 justify-center h-1.5 w-full max-w-[200px] mx-auto">
          {cards.map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'bg-blue-600 dark:bg-blue-400' : i < currentIndex ? 'bg-blue-200 dark:bg-blue-900' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Carte */}
      <div className="relative w-full aspect-[3/4] max-h-[400px]" style={{ perspective: '1000px' }}>
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className={`w-full h-full relative cursor-pointer transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* FACE AVANT (RECTO) */}
          <div 
            className="absolute inset-0 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-6 backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-5xl font-black text-slate-800 dark:text-white text-center leading-tight">
              {currentCard.word}
            </span>
            <p className="mt-8 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
              {t('flashcards.flip')}
            </p>
          </div>

          {/* FACE ARRIÈRE (VERSO) */}
          <div 
            className="absolute inset-0 bg-blue-600 dark:bg-blue-500 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center p-6 text-white backface-hidden transform-rotate-y-180"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <span className="text-[10px] uppercase tracking-widest opacity-80 mb-2 font-bold">{t('flashcards.translation')}</span>
            <span className="text-3xl font-black text-center mb-6 leading-snug">
              {currentCard.translation}
            </span>
            
            <div className="w-12 h-1 bg-white/20 rounded-full mb-6"></div>
            
            {currentCard.romanization && (
              <span className="text-lg italic opacity-90 font-medium bg-black/10 px-4 py-2 rounded-xl">
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
          className="flex-1 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 text-red-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          {t('flashcards.review')}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleResult(10); }}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-lg shadow-green-200 dark:shadow-green-900/20 transition-colors"
        >
          {t('flashcards.easy')}
        </button>
      </div>
      
      <p className="mt-6 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        {t('flashcards.card_count', currentIndex + 1, cards.length)}
      </p>
    </div>
  )
}