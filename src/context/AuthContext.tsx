import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMyProfile } from '../lib/api'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { SessionProfile } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: SessionProfile | null
  loading: boolean
  configured: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<SessionProfile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const loadProfile = async (userId?: string) => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      setProfile(await fetchMyProfile(userId))
    } catch (error) {
      console.error('Impossible de charger le profil utilisateur', error)
      setProfile(null)
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (mounted) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void loadProfile(nextSession?.user.id)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured: isSupabaseConfigured,
      refreshProfile: async () => loadProfile(session?.user.id),
    }),
    [session, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return value
}
