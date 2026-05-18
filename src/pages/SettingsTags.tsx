import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Tag, X } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useClusters, useNamespaces, useResourceTags, useWorkloadItems } from '@/hooks/useApi'
import { api } from '@/lib/api'
import type { ClusterItem, NamespaceItem, WorkloadItem } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'clusters' | 'namespaces' | 'workloads'

// ─── Tag chip ─────────────────────────────────────────────────────────────────

function TagChip({
  tag,
  onRemove,
  removing,
}: {
  tag: string
  onRemove: () => void
  removing: boolean
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
      style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
    >
      {tag}
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="ml-0.5 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30"
        title={`Remover tag "${tag}"`}
      >
        <X size={10} />
      </button>
    </span>
  )
}

// ─── Inline add-tag form ───────────────────────────────────────────────────────

function AddTagForm({
  resourceType,
  resourceId,
  onDone,
}: {
  resourceType: string
  resourceId: number
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const trimmed = value.trim()
  const invalid = trimmed.length === 0

  async function submit() {
    if (invalid || saving) return
    setSaving(true)
    setError('')
    try {
      await api.tags.add(resourceType, resourceId, trimmed)
      await queryClient.invalidateQueries({ queryKey: ['tags', resourceType] })
      setValue('')
      onDone()
    } catch {
      setError('Erro ao adicionar tag.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="env:dev, team:backend…"
          className="h-8 min-w-0 flex-1 rounded-lg border bg-transparent px-3 text-[13px] outline-none focus:ring-1"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          autoFocus
          disabled={saving}
        />
        <button
          type="button"
          onClick={submit}
          disabled={invalid || saving}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[12px] font-semibold transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
        >
          <Plus size={12} />
          {saving ? 'Salvando…' : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-8 rounded-lg px-2 text-[12px] opacity-60 hover:opacity-100"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// ─── Resource row ─────────────────────────────────────────────────────────────

function ResourceRow({
  resourceType,
  resourceId,
  label,
  sublabel,
  tags,
}: {
  resourceType: string
  resourceId: number
  label: string
  sublabel?: string
  tags: string[]
}) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [removingTag, setRemovingTag] = useState<string | null>(null)

  async function removeTag(tag: string) {
    setRemovingTag(tag)
    try {
      await api.tags.remove(resourceType, resourceId, tag)
      await queryClient.invalidateQueries({ queryKey: ['tags', resourceType] })
    } finally {
      setRemovingTag(null)
    }
  }

  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {label}
            </p>
            {sublabel && (
              <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                {sublabel}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.length === 0 && !showForm && (
              <span className="text-[12px] italic" style={{ color: 'var(--color-muted-foreground)' }}>
                Sem tags
              </span>
            )}
            {tags.map(tag => (
              <TagChip
                key={tag}
                tag={tag}
                onRemove={() => removeTag(tag)}
                removing={removingTag === tag}
              />
            ))}
          </div>
          {showForm && (
            <AddTagForm
              resourceType={resourceType}
              resourceId={resourceId}
              onDone={() => setShowForm(false)}
            />
          )}
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-soft)' }}
          >
            <Plus size={11} />
            Tag
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Clusters tab ─────────────────────────────────────────────────────────────

function ClustersTab() {
  const clustersQuery = useClusters()
  const tagsQuery = useResourceTags('cluster')

  const tagMap = useMemo(() => {
    const map = new Map<number, string[]>()
    tagsQuery.data?.forEach(item => map.set(item.resourceId, item.tags))
    return map
  }, [tagsQuery.data])

  if (clustersQuery.isLoading || tagsQuery.isLoading) return <PageLoading />
  if (clustersQuery.isError) return <PageError message="Erro ao carregar clusters." />

  const clusters = clustersQuery.data ?? []

  if (clusters.length === 0) {
    return (
      <div className="py-10 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        Nenhum cluster encontrado. O operator precisa estar conectado.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {clusters.map((c: ClusterItem) => (
        <ResourceRow
          key={c.id}
          resourceType="cluster"
          resourceId={c.id}
          label={c.name}
          sublabel={c.environment || undefined}
          tags={tagMap.get(c.id) ?? []}
        />
      ))}
    </div>
  )
}

// ─── Namespaces tab ───────────────────────────────────────────────────────────

function NamespacesTab() {
  const [selectedClusterId, setSelectedClusterId] = useState<number | undefined>()
  const clustersQuery = useClusters()
  const namespacesQuery = useNamespaces(selectedClusterId)
  const tagsQuery = useResourceTags('namespace')

  const tagMap = useMemo(() => {
    const map = new Map<number, string[]>()
    tagsQuery.data?.forEach(item => map.set(item.resourceId, item.tags))
    return map
  }, [tagsQuery.data])

  const isLoading = clustersQuery.isLoading || namespacesQuery.isLoading || tagsQuery.isLoading

  if (isLoading) return <PageLoading />
  if (namespacesQuery.isError) return <PageError message="Erro ao carregar namespaces." />

  const clusters = clustersQuery.data ?? []
  const namespaces = namespacesQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-[13px] font-medium shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
          Filtrar por cluster:
        </label>
        <select
          value={selectedClusterId ?? ''}
          onChange={e => setSelectedClusterId(e.target.value ? Number(e.target.value) : undefined)}
          className="h-9 rounded-lg border bg-transparent px-3 text-[13px] outline-none focus:ring-1"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          <option value="">Todos</option>
          {clusters.map((c: ClusterItem) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {namespaces.length === 0 ? (
        <div className="py-10 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Nenhum namespace encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {namespaces.map((ns: NamespaceItem) => (
            <ResourceRow
              key={ns.id}
              resourceType="namespace"
              resourceId={ns.id}
              label={ns.name}
              sublabel={ns.clusterName}
              tags={tagMap.get(ns.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Workloads tab ────────────────────────────────────────────────────────────

function WorkloadsTab() {
  const [selectedClusterId, setSelectedClusterId]     = useState<number | undefined>()
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<number | undefined>()

  const clustersQuery   = useClusters()
  const namespacesQuery = useNamespaces(selectedClusterId)
  const workloadsQuery  = useWorkloadItems(selectedClusterId, selectedNamespaceId)
  const tagsQuery       = useResourceTags('workload')

  const tagMap = useMemo(() => {
    const map = new Map<number, string[]>()
    tagsQuery.data?.forEach(item => map.set(item.resourceId, item.tags))
    return map
  }, [tagsQuery.data])

  const isLoading = clustersQuery.isLoading || workloadsQuery.isLoading || tagsQuery.isLoading

  if (isLoading) return <PageLoading />
  if (workloadsQuery.isError) return <PageError message="Erro ao carregar workloads." />

  const clusters   = clustersQuery.data ?? []
  const namespaces = namespacesQuery.data ?? []
  const workloads  = workloadsQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-medium shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
            Cluster:
          </label>
          <select
            value={selectedClusterId ?? ''}
            onChange={e => {
              setSelectedClusterId(e.target.value ? Number(e.target.value) : undefined)
              setSelectedNamespaceId(undefined)
            }}
            className="h-9 rounded-lg border bg-transparent px-3 text-[13px] outline-none focus:ring-1"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            <option value="">Todos</option>
            {clusters.map((c: ClusterItem) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[13px] font-medium shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
            Namespace:
          </label>
          <select
            value={selectedNamespaceId ?? ''}
            onChange={e => setSelectedNamespaceId(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-lg border bg-transparent px-3 text-[13px] outline-none focus:ring-1"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            <option value="">Todos</option>
            {namespaces.map((ns: NamespaceItem) => (
              <option key={ns.id} value={ns.id}>{ns.name}</option>
            ))}
          </select>
        </div>
      </div>

      {workloads.length === 0 ? (
        <div className="py-10 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Nenhum workload encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {workloads.map((w: WorkloadItem) => (
            <ResourceRow
              key={w.id}
              resourceType="workload"
              resourceId={w.id}
              label={w.name}
              sublabel={`${w.clusterName} / ${w.namespaceName}`}
              tags={tagMap.get(w.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsTags() {
  const [activeTab, setActiveTab] = useState<Tab>('clusters')

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Tags de Recursos"
        subtitle="Associe tags a clusters e namespaces para aplicar políticas de scoring por ambiente"
      />

      <div className="flex-1 px-4 py-6 lg:px-8">
        <div className="mb-5 flex gap-1 rounded-2xl p-1" style={{ backgroundColor: 'var(--color-muted)', width: 'fit-content' }}>
          {(['clusters', 'namespaces', 'workloads'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="rounded-xl px-5 py-2 text-sm font-semibold transition-all"
              style={activeTab === tab
                ? { backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
                : { color: 'var(--color-muted-foreground)' }}
            >
              {tab === 'clusters' ? 'Clusters' : tab === 'namespaces' ? 'Namespaces' : 'Workloads'}
            </button>
          ))}
        </div>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Tag size={16} style={{ color: 'var(--color-primary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
              Tags no formato <code className="rounded px-1 text-[12px]" style={{ backgroundColor: 'var(--color-muted)' }}>chave:valor</code> são recomendadas — ex: <code className="rounded px-1 text-[12px]" style={{ backgroundColor: 'var(--color-muted)' }}>env:dev</code>, <code className="rounded px-1 text-[12px]" style={{ backgroundColor: 'var(--color-muted)' }}>team:platform</code>
            </p>
          </div>
          {activeTab === 'clusters'   && <ClustersTab />}
          {activeTab === 'namespaces' && <NamespacesTab />}
          {activeTab === 'workloads'  && <WorkloadsTab />}
        </Card>
      </div>
    </div>
  )
}
