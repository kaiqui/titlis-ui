import { useState } from 'react'
import { Activity, AlertOctagon, AlertTriangle, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, Download, ShieldAlert, Users } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/jeitto/Card'
import { MetricCard } from '@/components/jeitto/MetricCard'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { useAdminOverview, useAdminUsers, useUpdateUserRole } from '@/hooks/useApi'
import { useAuth } from '@/contexts/useAuth'
import { exportUsersCsv } from '@/lib/exportCsv'
import { cn, formatDate } from '@/lib/utils'

const PAGE_SIZE = 10

const PILLAR_LABELS: Record<string, string> = {
  RESILIENCE: 'Resiliência',
  SECURITY: 'Segurança',
  PERFORMANCE: 'Performance',
  COST: 'Custo',
  OPERATIONAL: 'Operacional',
  COMPLIANCE: 'Compliance',
  OBSERVABILITY: 'Observabilidade',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  viewer: 'Observador',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
  viewer: 'bg-slate-500/15 text-slate-400',
}

function scoreTextColor(score: number) {
  if (score >= 80) return 'text-[var(--color-success)]'
  if (score >= 50) return 'text-[var(--color-warning)]'
  return 'text-[var(--color-danger)]'
}

function scoreBgColor(score: number) {
  if (score >= 80) return 'bg-[var(--color-success)]'
  if (score >= 50) return 'bg-[var(--color-warning)]'
  return 'bg-[var(--color-danger)]'
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 60) return diffMins <= 1 ? 'agora' : `há ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `há ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'ontem'
  if (diffDays < 30) return `há ${diffDays} dias`
  const months = Math.floor(diffDays / 30)
  return months === 1 ? 'há 1 mês' : `há ${months} meses`
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR')
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
      {children}
    </th>
  )
}

function StatMini({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="text-center">
      <p className={cn('text-2xl font-bold', colorClass ?? 'text-[var(--color-foreground)]')}>
        {value}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
    </div>
  )
}

function SectionRow({ icon, iconClass, label, value }: { icon: React.ReactNode; iconClass: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={iconClass}>{icon}</span>
        <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{label}</span>
      </div>
      <span className="font-bold text-lg" style={{ color: 'var(--color-foreground)' }}>{value}</span>
    </div>
  )
}

type PendingChange = { userId: number; targetRole: 'admin' | 'viewer' }

export function AdminOverview({ standalone = true }: { standalone?: boolean }) {
  const { user: currentUser } = useAuth()
  const { data: overview, isLoading: loadingOverview, error: errorOverview, refetch } = useAdminOverview()
  const { data: usersData, isLoading: loadingUsers } = useAdminUsers()
  const updateRole = useUpdateUserRole()
  const [page, setPage] = useState(0)
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)

  if (loadingOverview || loadingUsers) return <PageLoading />
  if (errorOverview) {
    return (
      <PageError
        message={errorOverview instanceof Error ? errorOverview.message : undefined}
        onRetry={() => void refetch()}
      />
    )
  }
  if (!overview) return null

  const { compliance, pillars, users } = overview
  const userList = usersData?.users ?? []
  const totalPages = Math.ceil(userList.length / PAGE_SIZE)
  const pagedUsers = userList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col">
      {standalone && (
        <Header
          title="Visão Executiva"
          subtitle="Panorama da postura de confiabilidade e da adoção da plataforma."
        />
      )}

      <div className="space-y-6 px-4 py-6 lg:px-8">

        {/* Bloco 1 — big numbers (postura RPM, do coverage_scorecard) */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Trust Score médio"
            value={`${compliance.averageScore.toFixed(0)} / 100`}
            icon={BarChart3}
            iconColor={scoreTextColor(compliance.averageScore)}
            delay={0}
          />
          <MetricCard
            label="Serviços saudáveis"
            value={`${compliance.compliancePercent.toFixed(0)}%`}
            sub={`${fmt(compliance.compliantWorkloads)} de ${fmt(compliance.totalWorkloads)} serviços`}
            icon={CheckCircle2}
            iconColor="text-[var(--color-success)]"
            delay={0.05}
          />
          <MetricCard
            label="Serviços com scorecard"
            value={fmt(compliance.totalWorkloads)}
            sub=" "
            icon={Activity}
            iconColor="text-[var(--color-info)]"
            delay={0.10}
          />
        </div>

        {/* Bloco 2 — Usuários da Plataforma (tabela com paginação) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users size={15} /> Usuários da Plataforma
              </CardTitle>
              <button
                onClick={() => exportUsersCsv(userList)}
                disabled={userList.length === 0}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-border disabled:opacity-40"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
              >
                <Download size={13} />
                Exportar CSV
              </button>
            </div>
          </CardHeader>
          {userList.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Nenhum usuário encontrado.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <Th>Usuário</Th>
                      <Th>Role</Th>
                      <Th>Último acesso</Th>
                      <Th>Membro desde</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map(user => {
                      const isSelf = user.id === currentUser?.id
                      const isPending = pendingChange?.userId === user.id
                      const targetRole = pendingChange?.targetRole
                      return (
                      <tr key={user.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="py-3 pr-4">
                          <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
                            {user.displayName ?? user.email}
                          </p>
                          {user.displayName && (
                            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                              {user.email}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <span className={cn('inline-flex items-center rounded-[8px] px-2.5 py-1 text-xs font-semibold', ROLE_COLORS[targetRole!] ?? 'bg-slate-500/15 text-slate-400')}>
                                {ROLE_LABELS[targetRole!] ?? targetRole}
                              </span>
                              <button
                                onClick={() => {
                                  updateRole.mutate(
                                    { userId: user.id, role: targetRole! },
                                    { onSettled: () => setPendingChange(null) },
                                  )
                                }}
                                disabled={updateRole.isPending}
                                className="rounded px-2 py-0.5 text-xs font-semibold bg-[var(--color-success-soft)] text-[var(--color-success)] hover:bg-[var(--color-success-soft)] disabled:opacity-50 transition-colors"
                              >
                                {updateRole.isPending ? '...' : 'Confirmar'}
                              </button>
                              <button
                                onClick={() => setPendingChange(null)}
                                disabled={updateRole.isPending}
                                className="rounded px-2 py-0.5 text-xs font-medium hover:bg-border transition-colors disabled:opacity-50"
                                style={{ color: 'var(--color-muted-foreground)' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={cn('inline-flex items-center rounded-[8px] px-2.5 py-1 text-xs font-semibold', ROLE_COLORS[user.role] ?? 'bg-slate-500/15 text-slate-400')}>
                                {ROLE_LABELS[user.role] ?? user.role}
                              </span>
                              {!isSelf && (
                                <button
                                  onClick={() => setPendingChange({
                                    userId: user.id,
                                    targetRole: user.role === 'admin' ? 'viewer' : 'admin',
                                  })}
                                  className="rounded px-2 py-0.5 text-xs font-medium hover:bg-border transition-colors"
                                  style={{ color: 'var(--color-muted-foreground)' }}
                                >
                                  {user.role === 'admin' ? '↓ Rebaixar' : '↑ Promover'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn('text-[13px]', user.lastLoginAt ? '' : 'text-[var(--color-warning)]')}
                            style={user.lastLoginAt ? { color: 'var(--color-foreground)' } : undefined}
                          >
                            {formatRelativeTime(user.lastLoginAt)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-3">
                          <span className="flex items-center gap-1.5">
                            <span className={cn('inline-block h-2 w-2 rounded-full', user.isActive ? 'bg-[var(--color-success)]' : 'bg-slate-400')} />
                            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                              {user.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    Página {page + 1} de {totalPages} · {userList.length} usuários
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-30"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-30"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Bloco 3 — Risco */}
        <Card>
          <CardHeader>
            <CardTitle>Risco de Confiabilidade</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <SectionRow
              icon={<ShieldAlert size={15} />}
              iconClass="text-[var(--color-danger)]"
              label="Serviços críticos (Trust < 35)"
              value={fmt(compliance.criticalWorkloads)}
            />
            <SectionRow
              icon={<AlertTriangle size={15} />}
              iconClass="text-[var(--color-warning)]"
              label="Serviços saudáveis (Trust ≥ 55)"
              value={fmt(compliance.compliantWorkloads)}
            />
            <SectionRow
              icon={<AlertOctagon size={15} />}
              iconClass="text-slate-400"
              label="Total de serviços com scorecard"
              value={fmt(compliance.totalWorkloads)}
            />
          </div>
        </Card>

        {/* Bloco 4 — Dimensão bars */}
        <Card>
          <CardHeader>
            <CardTitle>Cobertura por dimensão</CardTitle>
          </CardHeader>
          {pillars.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Nenhum dado de pilar disponível ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {pillars.map(p => (
                <div key={p.pillar} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-right text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                    {PILLAR_LABELS[p.pillar] ?? p.pillar}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-[4px]" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div
                      className={cn('h-full rounded-[4px] transition-all', scoreBgColor(p.averageScore))}
                      style={{ width: `${Math.min(p.averageScore, 100)}%` }}
                    />
                  </div>
                  <span className={cn('w-10 shrink-0 text-right text-sm font-bold', scoreTextColor(p.averageScore))}>
                    {p.averageScore.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Bloco 5 — Adoção de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={15} /> Adoção de Usuários
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatMini label="Total" value={fmt(users.total)} />
              <StatMini label="Ativos (30d)" value={fmt(users.activeLastThirtyDays)} colorClass="text-[var(--color-success)]" />
            </div>
            <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                Por role
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(users.byRole).map(([role, count]) => (
                  <span
                    key={role}
                    className={cn('inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1 text-xs font-semibold', ROLE_COLORS[role] ?? 'bg-slate-500/15 text-slate-400')}
                  >
                    {ROLE_LABELS[role] ?? role}
                    <span className="font-bold">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}
