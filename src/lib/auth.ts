export type PlatformRole = 'admin' | 'viewer'
export type AuthProviderType = 'local' | 'okta' | 'mock'
export type FrontendAuthMode = 'okta' | 'mock'

export interface AuthUser {
  id: number
  tenantId: number
  tenantSlug: string
  tenantName: string
  email: string
  displayName: string | null
  role: PlatformRole
  authProvider: string
  onboardingCompleted: boolean
  canRemediate: boolean
}

export interface AuthSession {
  provider: AuthProviderType
  accessToken: string
  expiresAt: string
  user: AuthUser
  idToken?: string | null
  refreshToken?: string | null
}

export interface BootstrapSetupResponse extends AuthSession {
  operatorApiKey: string
}

export interface ApiKeyRecord {
  id: number
  description: string | null
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  isActive: boolean
  revokedAt: string | null
}

export interface ApiKeyCreateResponse {
  id: number
  description: string | null
  prefix: string
  createdAt: string
  rawToken: string
}

export interface AuthMeResponse {
  user: AuthUser
}

export interface BootstrapStatus {
  bootstrapRequired: boolean
  localLoginEnabled: boolean
  oktaConfigured: boolean
  primaryProvider: string | null
}

export interface BootstrapSetupPayload {
  tenantName: string
  tenantSlug: string
  adminName: string
  adminEmail: string
  password: string
}

export interface LocalLoginPayload {
  tenantSlug: string
  email: string
  password: string
}

export type TenantAuthProviderType = 'okta' | 'generic_oidc'

export interface TenantAuthIntegration {
  id: number
  providerType: string
  integrationKind: string
  integrationName: string
  isEnabled: boolean
  isPrimary: boolean
  issuerUrl: string | null
  clientId: string | null
  audience: string | null
  scopes: string[]
  redirectUri: string | null
  postLogoutRedirectUri: string | null
  verifiedAt: string | null
  activatedAt: string | null
  configuredByUserId: number | null
  updatedAt: string
}

export interface UpsertTenantAuthIntegrationPayload {
  providerType: TenantAuthProviderType
  integrationName: string
  issuerUrl: string
  clientId: string
  audience: string
  scopes: string[]
  redirectUri?: string
  postLogoutRedirectUri?: string
}

export interface VerifyTenantAuthIntegrationResult {
  status: string
  message: string
  integration: TenantAuthIntegration
}

export interface OktaConfig {
  issuer: string
  clientId: string
  audience: string
  redirectUri: string
  postLogoutRedirectUri: string
  scopes: string[]
  tenantSlugHint: string | null
}

export interface DevAuthConfig {
  tenantId: number
  tenantSlug: string
  tenantName: string
  email: string
  displayName: string
  roles: string[]
}

const AUTH_STORAGE_KEY = 'titlis.auth.session'
const OKTA_PENDING_TENANT_SLUG_KEY = 'titlis.auth.okta.pendingTenantSlug'
const ADMIN_ROLE_ALIASES = new Set([
  'jeitto confia - admin',
  'titlis.admin',
  'admin',
])
const VIEWER_ROLE_ALIASES = new Set([
  'jeitto confia - viewer',
  'titlis.viewer',
  'titlis.engineer',
  'viewer',
  'engineer',
])

export function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function writeStoredSession(session: AuthSession) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getStoredAccessToken(): string | null {
  return readStoredSession()?.accessToken ?? null
}

export function normalizeTenantSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function writePendingOktaTenantSlug(value: string) {
  if (typeof window === 'undefined') return
  const normalized = normalizeTenantSlug(value)
  if (!normalized) {
    window.localStorage.removeItem(OKTA_PENDING_TENANT_SLUG_KEY)
    return
  }
  window.localStorage.setItem(OKTA_PENDING_TENANT_SLUG_KEY, normalized)
}

export function getPendingOktaTenantSlug(): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(OKTA_PENDING_TENANT_SLUG_KEY)
  return raw ? normalizeTenantSlug(raw) || null : null
}

export function clearPendingOktaTenantSlug() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(OKTA_PENDING_TENANT_SLUG_KEY)
}

export function getStoredSessionProvider(): AuthProviderType | null {
  return readStoredSession()?.provider ?? null
}

export function getAppEnv(): string {
  return import.meta.env.VITE_APP_ENV?.trim().toLowerCase() || 'local'
}

export function getAuthMode(): FrontendAuthMode {
  return import.meta.env.VITE_AUTH_MODE?.trim().toLowerCase() === 'mock' ? 'mock' : 'okta'
}

export function isMockAuthMode(): boolean {
  return getAuthMode() === 'mock'
}

export function assertSupportedAuthMode() {
  if (isMockAuthMode() && getAppEnv() !== 'local') {
    throw new Error('VITE_AUTH_MODE=mock so pode ser usado no ambiente local.')
  }
}

export function getOktaConfig(): OktaConfig | null {
  const issuer = import.meta.env.VITE_OKTA_ISSUER?.trim()
  const clientId = import.meta.env.VITE_OKTA_CLIENT_ID?.trim()
  const audience = import.meta.env.VITE_OKTA_AUDIENCE?.trim()
  const redirectUri = import.meta.env.VITE_OKTA_REDIRECT_URI?.trim()
  const postLogoutRedirectUri = import.meta.env.VITE_OKTA_POST_LOGOUT_REDIRECT_URI?.trim()
  const tenantSlugHint = normalizeTenantSlug(import.meta.env.VITE_OKTA_TENANT_SLUG?.trim() || '')

  if (!issuer || !clientId || !audience || !redirectUri || !postLogoutRedirectUri || clientId === 'REPLACE_ME') {
    return null
  }

  return {
    issuer,
    clientId,
    audience,
    redirectUri,
    postLogoutRedirectUri,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    tenantSlugHint: tenantSlugHint || null,
  }
}

export function getDevAuthConfig(): DevAuthConfig {
  const tenantId = Number(import.meta.env.VITE_DEV_TENANT_ID ?? '1')
  const email = (import.meta.env.VITE_DEV_USER_EMAIL?.trim() || 'dev@titlis.local').toLowerCase()
  const tenantSlug = (import.meta.env.VITE_DEV_TENANT_SLUG?.trim() || `dev-tenant-${tenantId}`).toLowerCase()

  return {
    tenantId: Number.isFinite(tenantId) ? tenantId : 1,
    tenantSlug,
    tenantName: import.meta.env.VITE_DEV_TENANT_NAME?.trim() || `Tenant ${tenantId}`,
    email,
    displayName: import.meta.env.VITE_DEV_USER_NAME?.trim() || 'Dev Bypass',
    roles: (import.meta.env.VITE_DEV_ROLES?.trim() || 'titlis.admin')
      .split(',')
      .map((role: string) => role.trim())
      .filter(Boolean),
  }
}

export function resolvePrimaryRole(values: string[]): PlatformRole {
  const normalized = values.map(value => value.trim().toLowerCase())

  if (normalized.some(value => ADMIN_ROLE_ALIASES.has(value))) return 'admin'
  return 'viewer'
}

export function isLikelyOidcEndpointUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized.endsWith('/authorize')
    || normalized.endsWith('/token')
    || normalized.endsWith('/userinfo')
}

export function acceptedRoleAliases(): string[] {
  return Array.from(new Set([...ADMIN_ROLE_ALIASES, ...VIEWER_ROLE_ALIASES]))
}

export function buildMockSession(): AuthSession {
  const devAuth = getDevAuthConfig()
  const role = resolvePrimaryRole(devAuth.roles)

  return {
    provider: 'mock',
    accessToken: 'mock-access-token',
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    user: {
      id: 0,
      tenantId: devAuth.tenantId,
      tenantSlug: devAuth.tenantSlug,
      tenantName: devAuth.tenantName,
      email: devAuth.email,
      displayName: devAuth.displayName,
      role,
      authProvider: 'dev_bypass',
      onboardingCompleted: true,
      canRemediate: role === 'admin',
    },
  }
}
