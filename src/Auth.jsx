import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert("Vérifie tes mails ou connecte-toi si déjà inscrit !")
    else alert("Inscription réussie !")
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">Langage Learning</h2>
        <form className="space-y-4">
          <input
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={handleLogin} disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-all">
              Connexion
            </button>
            <button onClick={handleSignUp} disabled={loading} className="flex-1 border border-blue-600 text-blue-600 py-3 rounded-xl font-bold active:scale-95 transition-all">
              S'inscrire
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}