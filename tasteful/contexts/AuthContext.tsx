import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase'

interface DatabaseUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  dbUser: DatabaseUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchDbUser(session.user.email!)
      }
      
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchDbUser(session.user.email!)
        } else {
          setDbUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchDbUser = async (email: string) => {
    try {
      const response = await fetch(`/api/auth/user?email=${email}`)
      if (response.ok) {
        const userData = await response.json()
        setDbUser(userData)
      }
    } catch (error) {
      console.error('Failed to fetch database user:', error)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setDbUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
} 