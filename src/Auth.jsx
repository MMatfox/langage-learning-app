import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  
  // NOUVEAU : État pour la langue cible
  const [targetLang, setTargetLang] = useState('Coréen')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        // 1. Inscription
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: username } }
        })
        if (error) throw error

        // 2. Mise à jour immédiate du profil avec la langue choisie
        if (data.user) {
          await supabase.from('profiles').update({
            target_language: targetLang,
            ui_language: 'Français' // Par défaut pour l'instant
          }).eq('id', data.user.id)
        }

        alert("Compte créé ! Vérifie tes emails.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-xl shadow-blue-900/5 border border-slate-100 animate-slide-up">
        <h1 className="text-4xl font-black text-slate-800 mb-2 text-center tracking-tight">
          {isSignUp ? "Rejoindre" : "Bon retour"}
        </h1>
        <p className="text-slate-400 text-center mb-8 font-medium">Ton voyage linguistique commence ici.</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <input
                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                type="text" placeholder="Pseudo" value={username} onChange={(e) => setUsername(e.target.value)} required
              />
              
              {/* SÉLECTEUR DE LANGUE D'APPRENTISSAGE */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2">Je veux apprendre :</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Coréen', 'Japonais', 'Anglais', 'Chinois'].map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setTargetLang(lang)}
                      className={`p-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        targetLang === lang 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-slate-100 bg-white text-slate-400'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <input
            className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <input
            className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
            type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required
          />
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all mt-4 uppercase tracking-widest text-xs"
          >
            {loading ? "Chargement..." : isSignUp ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
          >
            {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  )
}