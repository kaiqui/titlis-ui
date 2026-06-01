import { useState } from 'react'
import { Activity, AlertOctagon, AlertTriangle, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, GitMerge, ShieldAlert, Users } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/jeitto/Card'
import { MetricCard } from '@/components/jeitto/MetricCard'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { useAdminOverview, useAdminUsers } from '@/hooks/useApi'
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
  'titlis.admin': 'Admin',
  'titlis.engineer': 'Engenheiro',
  'titlis.pm': 'PM',
  'titlis.viewer': 'Observador',
}

const ROLE_COLORS: Record<string, string> = {
  'titlis.admin': 'bg-purple-500/15 text-purple-400',
  'titlis.engineer': 'bg-blue-500/15 text-blue-400',
  'titlis.pm': 'bg-amber-500/15 text-amber-400',
  'titlis.viewer': 'bg-slate-500/15 text-slate-400',
}

function scoreTextColor(score: number) {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-500'
}

function scoreBgColor(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
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
      <p className={cn('text-2xl font-black', colorClass ?? 'text-[var(--color-foreground)]')}>
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
      <span className="font-black text-lg" style={{ color: 'var(--color-foreground)' }}>{value}</span>
    </div>
  )
}

export function AdminOverview() {
  const { data: overview, isLoading: loadingOverview, error: errorOverview, refetch } = useAdminOverview()
  const { data: usersData, isLoading: loadingUsers } = useAdminUsers()
  const [page, setPage] = useState(0)

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

  const { compliance, remediations, pillars, users } = overview
  const userList = usersData?.users ?? []
  const totalPages = Math.ceil(userList.length / PAGE_SIZE)
  const pagedUsers = userList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col">
      <Header
        title="Visão Executiva"
        subtitle="Panorama de compliance, automação e adoção da plataforma."
      />

      <div className="space-y-6 px-4 py-6 lg:px-8">

        {/* Bloco 1 — 4 big numbers */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Score médio de compliance"
            value={`${compliance.averageScore.toFixed(0)} / 100`}
            icon={BarChart3}
            iconColor={scoreTextColor(compliance.averageScore)}
            delay={0}
          />
          <MetricCard
            label="Em conformidade"
            value={`${compliance.compliancePercent.toFixed(0)}%`}
            sub={`${fmt(compliance.compliantWorkloads)} de ${fmt(compliance.totalWorkloads)} workloads`}
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            delay={0.05}
          />
          <MetricCard
            label="Workloads monitorados"
            value={fmt(compliance.totalWorkloads)}
            sub=" "
            icon={Activity}
            iconColor="text-blue-500"
            delay={0.10}
          />
          <MetricCard
            label="Remediações automatizadas"
            value={fmt(remediations.totalAutomated)}
            sub={`${fmt(remediations.merged)} PRs mesclados`}
            icon={GitMerge}
            iconColor="text-violet-500"
            delay={0.15}
          />
        </div>

        {/* Bloco 2 — Usuários da Plataforma (tabela com paginação) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={15} /> Usuários da Plataforma
            </CardTitle>
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
                    {pagedUsers.map(user => (
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
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', ROLE_COLORS[user.role] ?? 'bg-slate-500/15 text-slate-400')}>
                            {ROLE_LABELS[user.role] ?? user.role}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn('text-[13px]', user.lastLoginAt ? '' : 'text-amber-500')}
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
                            <span className={cn('inline-block h-2 w-2 rounded-full', user.isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
                            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                              {user.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
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

        {/* Bloco 3 — Automação & Risco */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Automação</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <SectionRow icon="✓" iconClass="text-emerald-500 text-base" label="PRs mesclados" value={fmt(remediations.merged)} />
              <SectionRow icon="◷" iconClass="text-blue-400 text-base" label="Em andamento" value={fmt(remediations.inProgress)} />
              <SectionRow icon="✗" iconClass="text-red-500 text-base" label="Com falha" value={fmt(remediations.failed)} />
              <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Taxa de sucesso</span>
                  <span className={cn('font-black text-2xl', scoreTextColor(remediations.successRate))}>
                    {remediations.successRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risco Operacional</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <SectionRow
                icon={<ShieldAlert size={15} />}
                iconClass="text-red-500"
                label="Workloads críticos (score < 50)"
                value={fmt(compliance.criticalWorkloads)}
              />
              <SectionRow
                icon={<AlertTriangle size={15} />}
                iconClass="text-amber-500"
                label="Falhas críticas acumuladas"
                value={fmt(compliance.totalCriticalFailures)}
              />
              <SectionRow
                icon={<AlertOctagon size={15} />}
                iconClass="text-slate-400"
                label="Sem avaliação"
                value={fmt(compliance.workloadsWithoutEvaluation)}
              />
            </div>
          </Card>
        </div>

        {/* Bloco 4 — Pillar bars */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance por Pilar</CardTitle>
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
                  <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div
                      className={cn('h-full rounded-full transition-all', scoreBgColor(p.averageScore))}
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
              <StatMini label="Ativos (30d)" value={fmt(users.activeLastThirtyDays)} colorClass="text-emerald-500" />
            </div>
            <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                Por role
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(users.byRole).map(([role, count]) => (
                  <span
                    key={role}
                    className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', ROLE_COLORS[role] ?? 'bg-slate-500/15 text-slate-400')}
                  >
                    {ROLE_LABELS[role] ?? role}
                    <span className="font-black">{count}</span>
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
