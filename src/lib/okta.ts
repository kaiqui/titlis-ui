import { OktaAuth, type CustomUserClaims } from '@okta/okta-auth-js'
import {
  clearStoredSession,
  getOktaConfig,
  resolvePrimaryRole,
  type AuthSession,
  type AuthUser,
  type PlatformRole,
} from '@/lib/auth'

type OktaUserClaims = CustomUserClaims & {
  email?: string
  preferred_username?: string
  name?: string
  given_name?: string
  locale?: string
  group?: string[] | string
  groups?: string[] | string
  titlis_tenant_id?: string | number
  titlis_roles?: string[] | string
}

let oktaClient: OktaAuth | null = null

function normalizeReturnPath(originalUri?: string): string {
  if (!originalUri) return '/'
  if (originalUri.startsWith(window.location.origin)) {
    return originalUri.slice(window.location.origin.length) || '/'
  }
  return originalUri.startsWith('/') ? originalUri : '/'
}

function resolveRoles(claims: OktaUserClaims): string[] {
  const candidateClaims = [claims.group, claims.groups, claims.titlis_roles]

  for (const value of candidateClaims) {
    if (Array.isArray(value)) {
      const normalized = value.map(role => role.trim()).filter(Boolean)
      if (normalized.length > 0) return normalized
    }

    if (typeof value === 'string') {
      const normalized = value.split(',').map(role => role.trim()).filter(Boolean)
      if (normalized.length > 0) return normalized
    }
  }

  return []
}

function buildPlaceholderUser(claims: OktaUserClaims): AuthUser {
  const roles = resolveRoles(claims)
  const role: PlatformRole = resolvePrimaryRole(roles)
  const tenantId = Number(claims.titlis_tenant_id ?? 0)

  return {
    id: 0,
    tenantId: Number.isFinite(tenantId) ? tenantId : 0,
    tenantSlug: tenantId ? `tenant-${tenantId}` : '',
    tenantName: tenantId ? `Tenant ${tenantId}` : '',
    email: claims.email || claims.preferred_username || '',
    displayName: claims.name || claims.given_name || null,
    role,
    authProvider: 'okta',
    onboardingCompleted: true,
    canRemediate: role === 'admin',
  }
}

function buildSessionFromTokens(tokens: Awaited<ReturnType<OktaAuth['tokenManager']['getTokens']>>, claims: OktaUserClaims): AuthSession {
  const accessToken = tokens.accessToken?.accessToken
  if (!accessToken) {
    throw new Error('O Okta nao retornou access token para a sessao.')
  }

  return {
    provider: 'okta',
    accessToken,
    expiresAt: new Date((tokens.accessToken?.expiresAt ?? Math.floor(Date.now() / 1000) + 3600) * 1000).toISOString(),
    idToken: tokens.idToken?.idToken ?? null,
    refreshToken: tokens.refreshToken?.refreshToken ?? null,
    user: buildPlaceholderUser(claims),
  }
}

export function getOktaClient(): OktaAuth | null {
  const config = getOktaConfig()
  if (!config) return null

  if (oktaClient) return oktaClient

  oktaClient = new OktaAuth({
    issuer: config.issuer,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    postLogoutRedirectUri: config.postLogoutRedirectUri,
    scopes: config.scopes,
    pkce: true,
    tokenManager: {
      storage: 'localStorage',
      autoRenew: true,
      expireEarlySeconds: 60,
    },
  })

  return oktaClient
}

export async function startOktaLogin(returnPath = '/') {
  const client = getOktaClient()
  const config = getOktaConfig()
  if (!client || !config) {
    throw new Error('Configuracao do Okta ausente no frontend.')
  }

  await client.signInWithRedirect({
    originalUri: returnPath,
    scopes: config.scopes,
    extraParams: {
      audience: config.audience,
    },
  })
}

export async function completeOktaLogin(_currentUrl: string): Promise<{ session: AuthSession; returnPath: string }> {
  const client = getOktaClient()
  if (!client) {
    throw new Error('Configuracao do Okta ausente no frontend.')
  }

  const callbackError = new URL(window.location.href).searchParams.get('error_description')
    ?? new URL(window.location.href).searchParams.get('error')
  if (callbackError) {
    throw new Error(callbackError)
  }

  const returnPath = normalizeReturnPath(client.getOriginalUri())
  await client.storeTokensFromRedirect()
  client.removeOriginalUri()

  const tokens = await client.tokenManager.getTokens()
  const claims = await client.getUser<OktaUserClaims>().catch(() => ({}))

  return {
    session: buildSessionFromTokens(tokens, claims),
    returnPath,
  }
}

export async function renewOktaSession(currentSession: AuthSession): Promise<AuthSession | null> {
  const client = getOktaClient()
  if (!client || currentSession.provider !== 'okta') {
    return null
  }

  try {
    await client.tokenManager.renew('accessToken')
    const tokens = await client.tokenManager.getTokens()
    const claims = await client.getUser<OktaUserClaims>().catch(() => ({}))
    return buildSessionFromTokens(tokens, claims)
  } catch {
    return null
  }
}

export async function restoreOktaSession(): Promise<AuthSession | null> {
  const client = getOktaClient()
  if (!client) return null

  try {
    const authenticated = await client.isAuthenticated()
    if (!authenticated) return null

    const tokens = await client.tokenManager.getTokens()
    const claims = await client.getUser<OktaUserClaims>().catch(() => ({}))
    return buildSessionFromTokens(tokens, claims)
  } catch {
    return null
  }
}

export async function signOutFromOkta(session: AuthSession | null): Promise<void> {
  const client = getOktaClient()
  clearStoredSession()

  if (!client || session?.provider !== 'okta') {
    return
  }

  try {
    await client.signOut()
  } catch {
    await client.tokenManager.clear()
  }
}
