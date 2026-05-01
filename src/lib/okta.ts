import { OktaAuth, type CustomUserClaims } from '@okta/okta-auth-js'
import {
  clearPendingOktaTenantSlug,
  getPendingOktaTenantSlug,
  getOktaConfig,
  resolvePrimaryRole,
  writePendingOktaTenantSlug,
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
  const pendingTenantSlug = getPendingOktaTenantSlug()
  const configuredTenantSlug = getOktaConfig()?.tenantSlugHint ?? null

  return {
    id: 0,
    tenantId: Number.isFinite(tenantId) ? tenantId : 0,
    tenantSlug: pendingTenantSlug ?? configuredTenantSlug ?? (tenantId ? `tenant-${tenantId}` : ''),
    tenantName: tenantId ? `Tenant ${tenantId}` : '',
    email: claims.email || claims.preferred_username || '',
    displayName: claims.name || claims.given_name || null,
    role,
    authProvider: 'okta',
    onboardingCompleted: true,
    canRemediate: role === 'admin',
  }
}

export interface OktaExchangeCandidate {
  idToken: string
  refreshToken: string | null
  user: AuthUser
}

function buildExchangeCandidateFromTokens(
  tokens: Awaited<ReturnType<OktaAuth['tokenManager']['getTokens']>>,
  claims: OktaUserClaims,
): OktaExchangeCandidate {
  const idToken = tokens.idToken?.idToken
  if (!idToken) {
    throw new Error('O Okta nao retornou id token para concluir o login.')
  }

  return {
    idToken,
    refreshToken: tokens.refreshToken?.refreshToken ?? null,
    user: buildPlaceholderUser(claims),
  }
}

function extractClaimsFromTokens(tokens: Awaited<ReturnType<OktaAuth['tokenManager']['getTokens']>>): OktaUserClaims {
  const rawClaims = tokens.idToken?.claims
  return rawClaims && typeof rawClaims === 'object' ? rawClaims as OktaUserClaims : {}
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

export async function startOktaLogin(returnPath = '/', tenantSlug?: string) {
  const client = getOktaClient()
  const config = getOktaConfig()
  if (!client || !config) {
    throw new Error('Configuracao do Okta ausente no frontend.')
  }

  writePendingOktaTenantSlug(tenantSlug ?? config.tenantSlugHint ?? '')

  await client.signInWithRedirect({
    originalUri: returnPath,
    scopes: config.scopes,
    extraParams: {
      audience: config.audience,
    },
  })
}

export async function completeOktaLogin(_currentUrl: string): Promise<{ exchangeCandidate: OktaExchangeCandidate; returnPath: string }> {
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
  const claims = extractClaimsFromTokens(tokens)

  return {
    exchangeCandidate: buildExchangeCandidateFromTokens(tokens, claims),
    returnPath,
  }
}

export async function restoreOktaExchangeCandidate(): Promise<OktaExchangeCandidate | null> {
  const client = getOktaClient()
  if (!client) return null

  try {
    const authenticated = await client.isAuthenticated()
    if (!authenticated) return null

    const tokens = await client.tokenManager.getTokens()
    const claims = extractClaimsFromTokens(tokens)
    return buildExchangeCandidateFromTokens(tokens, claims)
  } catch {
    return null
  }
}

export async function signOutFromOkta(idToken: string | null | undefined): Promise<void> {
  const client = getOktaClient()
  clearPendingOktaTenantSlug()

  if (!client || !idToken) {
    return
  }

  try {
    await client.signOut()
  } catch {
    await client.tokenManager.clear()
  }
}
