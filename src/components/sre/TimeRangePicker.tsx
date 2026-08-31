import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { useTimeRange } from '@/hooks/useTimeRange'
import { RANGE_PRESETS, fromDatetimeLocal, toDatetimeLocal } from '@/lib/timeRange'

// Seletor de faixa de tempo no formato do Datadog: pílula com a faixa atual + dropdown com
// presets relativos à esquerda e faixa absoluta à direita.
export function TimeRangePicker() {
  const { from, to, preset, label, setPreset, setAbsolute } = useTimeRange()
  const [open, setOpen] = useState(false)
  const [absFrom, setAbsFrom] = useState(toDatetimeLocal(from))
  const [absTo, setAbsTo] = useState(toDatetimeLocal(to))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setAbsFrom(toDatetimeLocal(from))
      setAbsTo(toDatetimeLocal(to))
    }
  }, [open, from, to])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function applyAbsolute() {
    const f = fromDatetimeLocal(absFrom)
    const t = fromDatetimeLocal(absTo)
    if (Number.isFinite(f) && Number.isFinite(t) && t > f) {
      setAbsolute(f, t)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}
      >
        <Calendar size={14} style={{ color: 'var(--color-muted-foreground)' }} />
        <span className="max-w-[16rem] truncate">{label}</span>
        <ChevronDown size={14} style={{ color: 'var(--color-muted-foreground)' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 flex w-[30rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-2xl"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <div className="w-1/2 border-r py-1.5" style={{ borderColor: 'var(--color-border)' }}>
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPreset(p.id); setOpen(false) }}
                className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[var(--color-muted)]"
                style={{ color: preset === p.id ? 'var(--color-primary)' : 'var(--color-foreground)', fontWeight: preset === p.id ? 700 : 400 }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="w-1/2 space-y-3 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
              Faixa personalizada
            </p>
            <label className="block text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              De
              <input
                type="datetime-local"
                value={absFrom}
                onChange={(e) => setAbsFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </label>
            <label className="block text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Até
              <input
                type="datetime-local"
                value={absTo}
                onChange={(e) => setAbsTo(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </label>
            <button
              type="button"
              onClick={applyAbsolute}
              className="w-full rounded-lg px-3 py-1.5 text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
