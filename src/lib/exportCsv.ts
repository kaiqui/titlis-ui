import type { AdminUser } from '@/types'
import { formatDate } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  'titlis.admin': 'Admin',
  'titlis.engineer': 'Engenheiro',
  'titlis.pm': 'PM',
  'titlis.viewer': 'Observador',
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildUsersCsv(users: AdminUser[]): string {
  const headers = ['Nome', 'Email', 'Role', 'Último Acesso', 'Membro desde', 'Status']
  const rows = users.map(u =>
    [
      u.displayName ?? u.email,
      u.email,
      ROLE_LABELS[u.role] ?? u.role,
      u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Nunca',
      formatDate(u.createdAt),
      u.isActive ? 'Ativo' : 'Inativo',
    ]
      .map(escapeCsvField)
      .join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

export function exportUsersCsv(users: AdminUser[]): void {
  const csv = buildUsersCsv(users)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
