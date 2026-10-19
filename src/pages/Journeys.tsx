import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Download, Plus, Route, Upload } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/contexts/useAuth'
import { useJourneyImpact, useJourneys } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { downloadText } from '@/lib/exportCsv'
import { parseStepsText } from '@/lib/journeys'
import { routeLabel } from '@/lib/outcome'
import type { ImpactLevel, Journey, JourneyImpact, JourneyStatus } from '@/types'

// docs/todo/customer-reliability-plan.md §5–6 — jornadas: o ConfiaAI sugere a partir da topologia
// observada, uma pessoa confirma (e define a criticidade) e o sweep mantém (drift). O impacto vem
// do motor determinístico do scoreops.

const IMPACT: Record<ImpactLevel, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Impacto confirmado', color: 'var(--color-danger)', bg: 'var(--color-danger-soft)' },
  probable: { label: 'Impacto provável', color: 'var(--color-warning)', bg: 'var(--color-warning-soft)' },
  potential: { label: 'Impacto potencial', color: 'var(--color-info)', bg: 'var(--color-info-soft)' },
  none: { label: 'Sem impacto', color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
  unknown: { label: 'Impacto desconhecido', color: 'var(--color-muted-foreground)', bg: 'var(--color-muted)' },
}

const DRIFT_LABEL: Record<string, string> = {
  service_missing: 'serviço sumiu',
  route_missing: 'rota sem tráfego',
  edge_missing: 'chamada não observada',
  queue_missing: 'fila não observada',
  new_dependency: 'nova dependência crítica',
}

const TABS: Array<{ status: JourneyStatus; label: string }> = [
  { status: 'confirmed', label: 'Confirmadas' },
  { status: 'suggested', label: 'Sugeridas' },
  { status: 'archived', label: 'Arquivadas' },
]

function Chain({ journey, impact }: { journey: Journey; impact: JourneyImpact | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {journey.steps.map((s, i) => {
        const responsible = impact?.responsibleLink?.toLowerCase() === s.serviceName.toLowerCase()
        const border = responsible ? 'var(--color-danger)' : s.drift ? 'var(--color-warning)' : 'var(--color-border)'
        return (
          <span key={s.journeyStepId} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight size={12} style={{ color: 'var(--color-muted-foreground)' }} />}
            <span className="rounded-[8px] border px-2 py-1 text-xs" style={{ borderColor: border }} title={s.driftDetail ?? undefined}>
              <Link to={`/coverage/${encodeURIComponent(`service:${s.serviceName}`)}`} className="font-medium hover:underline">{s.serviceName}</Link>
              {s.resourceName && <span className="ml-1 font-mono" style={{ color: 'var(--color-muted-foreground)' }}>{routeLabel(s.resourceName)}</span>}
              {s.kind === 'async' && <span className="ml-1" style={{ color: 'var(--color-muted-foreground)' }}>fila {s.subscriptionId}</span>}
              {responsible && <span className="ml-1 font-semibold" style={{ color: 'var(--color-danger)' }}>· elo responsável</span>}
              {s.drift && <span className="ml-1 font-semibold" style={{ color: 'var(--color-warning)' }}>· {DRIFT_LABEL[s.drift] ?? s.drift}</span>}
            </span>
          </span>
        )
      })}
    </div>
  )
}

function JourneyCard({ journey, impact, isAdmin }: { journey: Journey; impact: JourneyImpact | undefined; isAdmin: boolean }) {
  const qc = useQueryClient()
  const [tier, setTier] = useState(journey.tier ?? 'T1')
  const refresh = () => void qc.invalidateQueries({ queryKey: ['journeys'] })
  const confirm = useMutation({
    mutationFn: () =>
      api.journeys.confirm(journey.journeyKey, {
        journeyKey: journey.journeyKey,
        name: journey.name,
        tier,
        ownerTeam: journey.ownerTeam,
        availabilityObjective: journey.availabilityObjective,
        steps: journey.steps.map((s) => ({ serviceName: s.serviceName, resourceName: s.resourceName, subscriptionId: s.subscriptionId, kind: s.kind, required: s.required })),
      }),
    onSuccess: refresh,
  })
  const archive = useMutation({ mutationFn: () => api.journeys.archive(journey.journeyKey), onSuccess: refresh })
  const level = impact ? IMPACT[impact.level] : null
  const drifts = journey.steps.filter((s) => s.drift).length

  return (
    <div data-testid={`journey-${journey.journeyKey}`}>
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{journey.name}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {journey.tier ?? 'criticidade não definida'} · {journey.ownerTeam ? `time ${journey.ownerTeam}` : 'sem dono'}
            {journey.status === 'suggested' && journey.confidence !== null && ` · sugerida pelo ConfiaAI (confiança ${Math.round(journey.confidence * 100)}%)`}
          </p>
        </div>
        {level && (
          <span className="rounded-[8px] px-2.5 py-1 text-xs font-bold" style={{ color: level.color, backgroundColor: level.bg }}>
            {level.label}{impact?.failedRequests ? ` · ${impact.failedRequests.toLocaleString('pt-BR')} requisições falharam` : ''}
          </span>
        )}
      </div>
      <Chain journey={journey} impact={impact} />
      {impact && impact.reasons.length > 0 && (
        <ul className="space-y-0.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {impact.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
      {drifts > 0 && (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-warning)' }}>
          <AlertTriangle size={12} />
          {drifts} passo(s) não batem com a topologia observada — revise a jornada.
        </p>
      )}
      {isAdmin && journey.status === 'suggested' && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <label className="text-xs" htmlFor={`tier-${journey.journeyKey}`}>Criticidade</label>
          <select
            id={`tier-${journey.journeyKey}`}
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="rounded-[8px] border bg-transparent px-2 py-1 text-xs"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {['T0', 'T1', 'T2', 'T3'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <ButtonDefault label={confirm.isPending ? 'Confirmando…' : 'Confirmar jornada'} onClick={() => confirm.mutate()} />
          <ButtonDefault label="Descartar" visual="secondary" onClick={() => archive.mutate()} />
          {(confirm.isError || archive.isError) && <span className="text-xs" style={{ color: 'var(--color-danger)' }}>Não foi possível salvar.</span>}
        </div>
      )}
      {isAdmin && journey.status === 'confirmed' && (
        <div className="flex justify-end">
          <button type="button" className="text-xs hover:underline" style={{ color: 'var(--color-muted-foreground)' }} onClick={() => archive.mutate()}>
            Arquivar
          </button>
        </div>
      )}
    </Card>
    </div>
  )
}

function NewJourneyForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [tier, setTier] = useState('T1')
  const [owner, setOwner] = useState('')
  const [steps, setSteps] = useState('')
  const save = useMutation({
    mutationFn: () => api.journeys.save({ name, tier, ownerTeam: owner || null, steps: parseStepsText(steps) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      onDone()
    },
  })
  const valid = name.trim().length > 0 && parseStepsText(steps).length > 0
  return (
    <Card className="space-y-3 p-5">
      <p className="text-sm font-semibold">Nova jornada</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input id="journey-name" placeholder="Nome (ex.: Pix — envio)" value={name} onChange={(e) => setName(e.target.value)} className="rounded-[8px] border bg-transparent px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }} />
        <select id="journey-tier" value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-[8px] border bg-transparent px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }}>
          {['T0', 'T1', 'T2', 'T3'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input id="journey-owner" placeholder="Time dono" value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-[8px] border bg-transparent px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }} />
      </div>
      <textarea
        id="journey-steps"
        rows={4}
        placeholder={'Um passo por linha: serviço | rota ou fila | entry, sync ou async\nbff-pix-payment | post_/cashout/transfers | entry\npix-management-service | | sync'}
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        className="w-full rounded-[8px] border bg-transparent px-3 py-2 font-mono text-xs"
        style={{ borderColor: 'var(--color-border)' }}
      />
      {save.isError && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{save.error instanceof Error ? save.error.message : 'Não foi possível salvar.'}</p>}
      <div className="flex gap-2">
        <ButtonDefault label={save.isPending ? 'Salvando…' : 'Salvar jornada'} onClick={() => valid && save.mutate()} />
        <ButtonDefault label="Cancelar" visual="secondary" onClick={onDone} />
      </div>
    </Card>
  )
}

export function Journeys() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState<JourneyStatus>('confirmed')
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [yaml, setYaml] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const qc = useQueryClient()
  const journeys = useJourneys('suggested,confirmed,archived')
  const impact = useJourneyImpact()
  const impactByKey = useMemo(() => new Map((impact.data?.journeys ?? []).map((j) => [j.key, j])), [impact.data])
  const importYaml = useMutation({
    mutationFn: () => api.journeys.importYaml(yaml),
    onSuccess: (r) => {
      setNotice(`${r?.imported ?? 0} jornada(s) importada(s).`)
      setImporting(false)
      setYaml('')
      void qc.invalidateQueries({ queryKey: ['journeys'] })
    },
  })

  if (journeys.isLoading) return <><Header title="Jornadas" /><PageLoading /></>
  if (journeys.isError) return <><Header title="Jornadas" /><PageError message="Falha ao carregar as jornadas." onRetry={() => journeys.refetch()} /></>
  const all = journeys.data ?? []
  const shown = all.filter((j) => j.status === tab)

  async function exportYaml() {
    try {
      downloadText('journeys.yaml', await api.journeys.exportYaml(), 'application/yaml')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Falha ao exportar.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Jornadas" subtitle="O que o cliente faz, por quais serviços passa e se está sendo atendido." />
      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => {
            const n = all.filter((j) => j.status === t.status).length
            return (
              <button
                key={t.status}
                type="button"
                onClick={() => setTab(t.status)}
                className="rounded-[8px] px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: tab === t.status ? 'var(--color-primary-soft)' : 'transparent', color: tab === t.status ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
              >
                {t.label} ({n})
              </button>
            )
          })}
          {isAdmin && (
            <div className="ml-auto flex flex-wrap gap-2">
              <ButtonDefault label="Nova jornada" icon={Plus} onClick={() => setCreating(true)} />
              <ButtonDefault label="Importar YAML" visual="secondary" icon={Upload} onClick={() => setImporting((v) => !v)} />
              <ButtonDefault label="Exportar YAML" visual="secondary" icon={Download} onClick={exportYaml} />
            </div>
          )}
        </div>
        {notice && <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{notice}</p>}
        {creating && <NewJourneyForm onDone={() => setCreating(false)} />}
        {importing && (
          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold">Importar journeys.yaml</p>
            <textarea id="journey-yaml" rows={8} value={yaml} onChange={(e) => setYaml(e.target.value)} className="w-full rounded-[8px] border bg-transparent px-3 py-2 font-mono text-xs" style={{ borderColor: 'var(--color-border)' }} />
            {importYaml.isError && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{importYaml.error instanceof Error ? importYaml.error.message : 'YAML inválido.'}</p>}
            <ButtonDefault label={importYaml.isPending ? 'Importando…' : 'Importar'} onClick={() => yaml.trim() && importYaml.mutate()} />
          </Card>
        )}
        {shown.length === 0 ? (
          <EmptyState
            icon={Route}
            title={tab === 'suggested' ? 'Nenhuma sugestão pendente' : tab === 'archived' ? 'Nenhuma jornada arquivada' : 'Nenhuma jornada confirmada'}
            description={tab === 'confirmed' ? 'Confirme uma sugestão do ConfiaAI ou declare uma jornada. Sem jornada, o impacto no cliente fica como desconhecido.' : 'As sugestões aparecem depois da coleta, a partir dos pontos de entrada observados.'}
          />
        ) : (
          <div className="grid gap-4">
            {shown.map((j) => <JourneyCard key={j.journeyKey} journey={j} impact={impactByKey.get(j.journeyKey)} isAdmin={isAdmin} />)}
          </div>
        )}
      </div>
    </div>
  )
}
