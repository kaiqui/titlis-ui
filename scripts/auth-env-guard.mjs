import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROTECTED_ENVS = new Set(['dev', 'staging', 'prod'])

export function normalizeValue(value, fallback) {
  const normalized = String(value ?? fallback).trim().toLowerCase()
  return normalized || fallback
}

export function validateAuthEnv({
  appEnv = process.env.VITE_APP_ENV,
  authMode = process.env.VITE_AUTH_MODE,
} = {}) {
  const normalizedAppEnv = normalizeValue(appEnv, 'local')
  const normalizedAuthMode = normalizeValue(authMode, 'okta')

  if (normalizedAuthMode === 'mock' && PROTECTED_ENVS.has(normalizedAppEnv)) {
    return {
      ok: false,
      code: 'mock_auth_not_allowed',
      message: `VITE_AUTH_MODE=mock nao pode ser usado em ${normalizedAppEnv}. Use okta nesses ambientes.`,
    }
  }

  return {
    ok: true,
    code: 'ok',
    message: 'Auth env check passed.',
  }
}

export function assertAuthEnv(input) {
  const result = validateAuthEnv(input)
  if (!result.ok) {
    throw new Error(result.message)
  }
  return result
}

function shouldRunAsCli() {
  if (!process.argv[1]) return false
  const currentModulePath = fileURLToPath(import.meta.url)
  return path.resolve(process.argv[1]) === currentModulePath
}

if (shouldRunAsCli()) {
  try {
    const result = assertAuthEnv()
    console.log(`[auth-env] ${result.message}`)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Auth env validation failed.'
    console.error(`[auth-env] ${message}`)
    process.exit(1)
  }
}
