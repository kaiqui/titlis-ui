import { createContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import {
  assertSupportedAuthMode,
  buildMockSession,
  clearStoredSession,
  getAuthMode,
  getOktaConfig,
  isMockAuthMode,
  readStoredSession,
  writeStoredSession,
  type AuthSession,
  type AuthUser,
  type BootstrapSetupPayload,
  type BootstrapStatus,
  type FrontendAuthMode,
  type LocalLoginPayload,
} from '@/lib/auth'
import { completeOktaLogin, renewOktaSession, restoreOktaSession, signOutFromOkta, startOktaLogin } from '@/lib/okta'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  authMode: FrontendAuthMode
  status: AuthStatus
  user: AuthUser | null
  session: AuthSession | null
  bootstrapStatus: BootstrapStatus | null
  hasOktaConfig: boolean
  loginLocal: (payload: LocalLoginPayload) => Promise<void>
  loginWithOkta: (returnPath?: string) => Promise<void>
  finishOktaLogin: (currentUrl: string) => Promise<string>
  bootstrapSetup: (payload: BootstrapSetupPayload) => Promise<void>
  refreshSession: () => Promise<void>
  signOut: () => Promise<void>
}

const defaultValue: AuthContextValue = {
  authMode: 'okta',
  status: 'anonymous',
  user: null,
  session: null,
  bootstrapStatus: null,
  hasOktaConfig: false,
  loginLocal: async () => undefined,
  loginWithOkta: async () => undefined,
  finishOktaLogin: async () => '/',
  bootstrapSetup: async () => undefined,
  refreshSession: async () => undefined,
  signOut: async () => undefined,
}

export const AuthContext = createContext<AuthContextValue>(defaultValue)

export function AuthProvider({ children }: { children: ReactNode }) {
  assertSupportedAuthMode()

  const authMode = getAuthMode()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null)
  const hasOktaConfig = getOktaConfig() !== null

  useEffect(() => {
    void refreshSession()
  }, [])

  useEffect(() => {
    if (status !== 'authenticated' || session?.provider !== 'okta') return

    const msUntilRefresh = new Date(session.expiresAt).getTime() - Date.now() - 60_000
    const timeout = window.setTimeout(() => {
      void refreshSession()
    }, Math.max(msUntilRefresh, 15_000))

    return () => window.clearTimeout(timeout)
  }, [session, status])

  async function refreshSession() {
    setStatus('loading')
    const stored = readStoredSession()

    if (isMockAuthMode()) {
      const mockSession = stored?.provider === 'mock' ? stored : buildMockSession()
      writeStoredSession(mockSession)
      setSession(mockSession)
      setBootstrapStatus({
        bootstrapRequired: false,
        localLoginEnabled: true,
        oktaConfigured: false,
        primaryProvider: 'mock',
      })

      try {
        const me = await api.auth.me()
        const nextSession = { ...mockSession, user: me.user }
        writeStoredSession(nextSession)
        setSession(nextSession)
      } catch {
        setSession(mockSession)
      }

      setStatus('authenticated')
      return
    }

    try {
      const bootstrap = await api.auth.bootstrapStatus()
      setBootstrapStatus(bootstrap)

      let effectiveSession = stored
      if (!effectiveSession?.accessToken) {
        effectiveSession = await restoreOktaSession()
        if (effectiveSession) {
          writeStoredSession(effectiveSession)
        }
      }

      if (stored?.provider === 'okta') {
        const expiresAtMs = new Date(stored.expiresAt).getTime()
        if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now() + 60_000) {
          effectiveSession = await renewOktaSession(stored) ?? stored
          if (effectiveSession !== stored) {
            writeStoredSession(effectiveSession)
          }
        }
      }

      if (!effectiveSession?.accessToken) {
        setSession(null)
        setStatus('anonymous')
        return
      }

      const me = await api.auth.me()
      const nextSession = { ...effectiveSession, user: me.user }
      writeStoredSession(nextSession)
      setSession(nextSession)
      setStatus('authenticated')
    } catch {
      clearStoredSession()
      setSession(null)
      setBootstrapStatus({
        bootstrapRequired: !stored?.accessToken,
        localLoginEnabled: true,
        oktaConfigured: false,
        primaryProvider: null,
      })
      setStatus('anonymous')
    }
  }

  async function loginLocal(payload: LocalLoginPayload) {
    if (isMockAuthMode()) {
      const mockSession = buildMockSession()
      writeStoredSession(mockSession)
      setSession(mockSession)
      setBootstrapStatus({
        bootstrapRequired: false,
        localLoginEnabled: true,
        oktaConfigured: false,
        primaryProvider: 'mock',
      })
      setStatus('authenticated')
      return
    }

    const nextSession = await api.auth.loginLocal(payload)
    writeStoredSession(nextSession)
    setSession(nextSession)
    const bootstrap = await api.auth.bootstrapStatus()
    setBootstrapStatus(bootstrap)
    setStatus('authenticated')
  }

  async function loginWithOkta(returnPath = '/') {
    if (isMockAuthMode()) {
      const mockSession = buildMockSession()
      writeStoredSession(mockSession)
      setSession(mockSession)
      setBootstrapStatus({
        bootstrapRequired: false,
        localLoginEnabled: true,
        oktaConfigured: false,
        primaryProvider: 'mock',
      })
      setStatus('authenticated')
      return
    }

    await startOktaLogin(returnPath)
  }

  async function finishOktaLogin(currentUrl: string) {
    const { session: oktaSession, returnPath } = await completeOktaLogin(currentUrl)
    writeStoredSession(oktaSession)
    setSession(oktaSession)
    await refreshSession()
    return returnPath
  }

  async function bootstrapSetup(payload: BootstrapSetupPayload) {
    if (isMockAuthMode()) {
      const mockSession = buildMockSession()
      writeStoredSession(mockSession)
      setSession(mockSession)
      setBootstrapStatus({
        bootstrapRequired: false,
        localLoginEnabled: true,
        oktaConfigured: false,
        primaryProvider: 'mock',
      })
      setStatus('authenticated')
      return
    }

    const nextSession = await api.auth.bootstrapSetup(payload)
    writeStoredSession(nextSession)
    setSession(nextSession)
    const bootstrap = await api.auth.bootstrapStatus()
    setBootstrapStatus(bootstrap)
    setStatus('authenticated')
  }

  async function signOut() {
    const current = readStoredSession()
    clearStoredSession()
    setSession(null)
    setStatus(isMockAuthMode() ? 'loading' : 'anonymous')
    await signOutFromOkta(current)

    if (isMockAuthMode()) {
      await refreshSession()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        authMode,
        status,
        user: session?.user ?? null,
        session,
        bootstrapStatus,
        hasOktaConfig,
        loginLocal,
        loginWithOkta,
        finishOktaLogin,
        bootstrapSetup,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
