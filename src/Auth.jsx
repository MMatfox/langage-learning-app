import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) // Toggle entre Login et SignUp
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // C'est ici que le username est envoyé vers le Trigger SQL
          data: { display_name: username } 
        }
      })
      if (error) alert(error.message)
      else alert("Compte créé ! Vérifie tes emails.")
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-xl shadow-blue-900/5 border border-slate-100">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🇰🇷</div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Hangeul App</h2>
          <p className="text-slate-400 font-medium mt-2 text-sm">
            {isSignUp ? "Crée ton compte pour commencer" : "Heureux de te revoir !"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <input
              className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
              type="text" placeholder="Ton nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} required
            />
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
            {isSignUp ? "Déjà un compte ? Connexion" : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  )
}