import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Écouter les changements (connexion/déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return <Auth />
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="p-4 bg-white border-b flex justify-between items-center pt-12">
        <h1 className="font-bold text-lg">Tableau de bord</h1>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full"
        >
          Déconnexion
        </button>
      </header>
      <main className="p-6">
        <p className="text-slate-600 text-center">Bienvenue, {session.user.email} !</p>
      </main>
    </div>
  )
}

export default App