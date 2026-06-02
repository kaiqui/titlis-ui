import { describe, expect, it } from 'vitest'
import { buildUsersCsv } from '@/lib/exportCsv'
import type { AdminUser } from '@/types'

const base: AdminUser = {
  id: 1,
  email: 'ana@titlis.io',
  displayName: 'Ana Silva',
  role: 'titlis.admin',
  isActive: true,
  lastLoginAt: '2024-03-10T14:30:00Z',
  createdAt: '2023-01-01T00:00:00Z',
}

describe('buildUsersCsv', () => {
  it('inclui a linha de cabeçalho correta', () => {
    const csv = buildUsersCsv([base])
    const header = csv.split('\n')[0]
    expect(header).toBe('Nome,Email,Role,Último Acesso,Membro desde,Status')
  })

  it('formata role para rótulo em PT-BR', () => {
    const csv = buildUsersCsv([base])
    expect(csv).toContain('Admin')
  })

  it('exibe "Nunca" quando lastLoginAt é null', () => {
    const user: AdminUser = { ...base, lastLoginAt: null }
    const csv = buildUsersCsv([user])
    const row = csv.split('\n')[1]
    expect(row).toContain('Nunca')
  })

  it('usa displayName quando disponível; cai para email se null', () => {
    const withName = buildUsersCsv([base]).split('\n')[1]
    expect(withName.startsWith('Ana Silva')).toBe(true)

    const noName: AdminUser = { ...base, displayName: null }
    const withoutName = buildUsersCsv([noName]).split('\n')[1]
    expect(withoutName.startsWith('ana@titlis.io')).toBe(true)
  })

  it('marca usuário inativo como "Inativo"', () => {
    const inactive: AdminUser = { ...base, isActive: false }
    const csv = buildUsersCsv([inactive])
    expect(csv).toContain('Inativo')
  })

  it('escapa campos com vírgula entre aspas duplas', () => {
    const user: AdminUser = { ...base, displayName: 'Silva, Ana' }
    const csv = buildUsersCsv([user])
    expect(csv).toContain('"Silva, Ana"')
  })

  it('escapa aspas duplas dentro de campos', () => {
    const user: AdminUser = { ...base, displayName: 'Ana "Titlis" Silva' }
    const csv = buildUsersCsv([user])
    expect(csv).toContain('"Ana ""Titlis"" Silva"')
  })

  it('gera uma linha por usuário além do cabeçalho', () => {
    const users: AdminUser[] = [
      base,
      { ...base, id: 2, email: 'bob@titlis.io', displayName: 'Bob' },
    ]
    const lines = buildUsersCsv(users).split('\n')
    expect(lines).toHaveLength(3)
  })

  it('retorna apenas o cabeçalho para lista vazia', () => {
    const csv = buildUsersCsv([])
    expect(csv.split('\n')).toHaveLength(1)
  })
})
