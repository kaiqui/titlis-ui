import { useMemo, useState } from 'react'
import { Info, Plus, X } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useAddLabelValue, useLabelRegistry, useRemoveLabelValue } from '@/hooks/useApi'
import type { LabelRegistryEntry } from '@/types'

const REQUIRED_KEYS = ['env', 'team', 'service']

function LabelValueChip({
  entry,
  onRemove,
}: {
  entry: LabelRegistryEntry
  onRemove: (id: number) => void
}) {
  const removeMutation = useRemoveLabelValue()

  function handleRemove() {
    removeMutation.mutate(entry.id, {
      onSuccess: () => onRemove(entry.id),
    })
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
      style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
    >
      {entry.labelValue}
      <button
        type="button"
        onClick={handleRemove}
        disabled={removeMutation.isPending}
        className="rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30"
        title={`Remover "${entry.labelValue}"`}
      >
        <X size={10} />
      </button>
    </span>
  )
}

function AddValueForm({
  labelKey,
  onDone,
}: {
  labelKey: string
  onDone: () => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const addMutation = useAddLabelValue()

  const trimmed = value.trim()
  const invalid = trimmed.length === 0

  function handleSubmit() {
    if (invalid || addMutation.isPending) return
    setError('')
    addMutation.mutate(
      { labelKey, labelValue: trimmed },
      {
        onSuccess: () => {
          setValue('')
          onDone()
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Erro ao adicionar valor.')
        },
      },
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={`ex: ${labelKey === 'env' ? 'production' : labelKey === 'team' ? 'platform' : 'api-gateway'}`}
          autoFocus
          disabled={addMutation.isPending}
          className="h-8 min-w-0 flex-1 rounded-lg border bg-transparent px-3 text-[13px] outline-none focus:ring-1"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={invalid || addMutation.isPending}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[12px] font-semibold transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
        >
          <Plus size={12} />
          {addMutation.isPending ? 'Salvando…' : 'Adicionar'}
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

function LabelKeySection({
  labelKey,
  entries,
}: {
  labelKey: string
  entries: LabelRegistryEntry[]
}) {
  const [showForm, setShowForm] = useState(false)
  const activeEntries = entries.filter(e => e.isActive)

  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
            <code
              className="rounded px-1.5 py-0.5 text-[12px]"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-primary)' }}
            >
              {labelKey}
            </code>
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-muted-foreground)' }}>
            {activeEntries.length} {activeEntries.length === 1 ? 'valor registrado' : 'valores registrados'}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-soft)' }}
          >
            <Plus size={11} />
            Adicionar valor
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {activeEntries.length === 0 && !showForm && (
          <span className="text-[12px] italic" style={{ color: 'var(--color-muted-foreground)' }}>
            Sem valores registrados.
          </span>
        )}
        {activeEntries.map(entry => (
          <LabelValueChip
            key={entry.id}
            entry={entry}
            onRemove={() => {}}
          />
        ))}
      </div>

      {showForm && (
        <AddValueForm
          labelKey={labelKey}
          onDone={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

export function SettingsLabels() {
  const { data: entries, isLoading, error } = useLabelRegistry()

  const byKey = useMemo(() => {
    const map = new Map<string, LabelRegistryEntry[]>()
    for (const key of REQUIRED_KEYS) {
      map.set(key, [])
    }
    for (const entry of (entries ?? [])) {
      if (!map.has(entry.labelKey)) {
        map.set(entry.labelKey, [])
      }
      map.get(entry.labelKey)!.push(entry)
    }
    return map
  }, [entries])

  if (isLoading) return <><Header title="Labels de Compliance" /><PageLoading /></>
  if (error) {
    return (
      <>
        <Header title="Labels de Compliance" />
        <PageError message={error instanceof Error ? error.message : undefined} />
      </>
    )
  }

  const allKeys = Array.from(new Set([...REQUIRED_KEYS, ...Array.from(byKey.keys())]))

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Labels de Compliance"
        subtitle="Valores válidos de labels para scoring de filas (regra QS-001)."
      />

      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8 max-w-3xl">
        <Card>
          <div className="flex items-start gap-2">
            <Info size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
              Labels registradas são replicadas como tags nos monitores Datadog criados pelo Titlis.
              A regra <code className="rounded px-1" style={{ backgroundColor: 'var(--color-muted)' }}>QS-001</code> exige
              que <code className="rounded px-1" style={{ backgroundColor: 'var(--color-muted)' }}>env</code>,{' '}
              <code className="rounded px-1" style={{ backgroundColor: 'var(--color-muted)' }}>team</code> e{' '}
              <code className="rounded px-1" style={{ backgroundColor: 'var(--color-muted)' }}>service</code> estejam
              presentes nas filas com valores registrados aqui.
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          {allKeys.map(key => (
            <LabelKeySection
              key={key}
              labelKey={key}
              entries={byKey.get(key) ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
