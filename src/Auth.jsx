import { useState } from 'react'
import { supabase } from './supabaseClient'
import { AppProvider, useApp } from './AppContext'
import Popup from './Popup'


function AuthContent() {
  const { showPopup } = useApp()
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [targetLang, setTargetLang] = useState('Coréen')
  const [otp, setOtp] = useState('')

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return "8 caractères minimum."
    return null
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const errorMsg = validatePassword(password)
        if (errorMsg) throw new Error(errorMsg)

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              display_name: username,
              target_language: targetLang,
              ui_language: 'Français'
            } 
          }
        })
        
        if (error) throw error
        
        if (data.user && !data.session) {
          setShowOTP(true)
          showPopup("Code envoyé ! Vérifie ta boîte mail.", "info")
        } else {
          showPopup("Compte créé et connecté !", "success")
        }

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      showPopup(error.message, "error")
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      })
      if (error) throw error
      showPopup("Email vérifié avec succès ! Tu vas être connecté.", "success")
    } catch (error) {
      showPopup("Code invalide : " + error.message, "error")
    } finally {
      setLoading(false)
    }
  }

  if (showOTP) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 animate-slide-up text-center">
          <div className="text-4xl mb-4">📩</div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Vérifie ton email</h2>
          <p className="text-slate-400 mb-8 text-sm">Entre le code à 8 chiffres reçu à <strong>{email}</strong></p>
          
          <form onSubmit={verifyOtp} className="space-y-4">
            <input
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-center text-2xl tracking-[0.5em] font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              type="text" 
              placeholder="00000000" 
              maxLength="8"
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              required
            />
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              {loading ? "Vérification..." : "Valider le code"}
            </button>
          </form>
          <button onClick={() => setShowOTP(false)} className="mt-6 text-slate-400 text-xs font-bold underline">Retour</button>
        </div>
      </div>
    )
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
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-2">Je veux apprendre :</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Coréen', 'Japonais', 'Chinois'].map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setTargetLang(lang)}
                      className={`p-4 rounded-xl text-sm font-black border-2 transition-all flex items-center justify-center gap-2 ${
                        targetLang === lang 
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg scale-105' 
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-slate-50'
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

export default function Auth() {
  return (
    <AppProvider>
      <Popup />
      <AuthContent />
    </AppProvider>
  )
}