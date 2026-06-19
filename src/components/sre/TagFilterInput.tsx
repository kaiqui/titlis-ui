import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}

export function isKeyValue(tag: string): boolean {
  return tag.includes(':') && tag.indexOf(':') > 0 && tag.indexOf(':') < tag.length - 1
}

export function TagFilterInput({ value, onChange, suggestions = [], placeholder = 'Filtrar por tag (ex: env:prod)' }: Props) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = input.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s))
    : []

  useEffect(() => {
    setHighlighted(0)
  }, [input])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function confirmTag(raw: string) {
    const tag = raw.trim()
    if (!tag || value.includes(tag)) {
      setInput('')
      return
    }
    onChange([...value, tag])
    setInput('')
    setOpen(false)
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      if (e.key === 'Tab' && filtered.length > 0 && open) {
        e.preventDefault()
        confirmTag(filtered[highlighted] ?? input)
        return
      }
      if (e.key === 'Enter' && filtered.length > 0 && open) {
        e.preventDefault()
        confirmTag(filtered[highlighted] ?? input)
        return
      }
      if (input.trim()) {
        e.preventDefault()
        confirmTag(input)
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const inputIsValid = isKeyValue(input.trim())

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5 rounded-2xl border px-3 py-2 transition-colors focus-within:ring-2"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          outline: 'none',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={
              isKeyValue(tag)
                ? { backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }
                : { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#b45309' }
            }
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              className="rounded-full opacity-60 hover:opacity-100 transition-opacity"
              aria-label={`Remover tag ${tag}`}
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        <div className="relative flex flex-1 items-center" style={{ minWidth: '120px' }}>
          <span
            className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-full transition-colors"
            style={{ backgroundColor: input.trim() ? (inputIsValid ? 'var(--color-primary)' : '#f59e0b') : 'transparent' }}
          />
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setOpen(true) }}
            onFocus={() => { if (input || filtered.length > 0) setOpen(true) }}
            onKeyDown={onKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 bg-transparent pl-2 text-sm outline-none placeholder:text-[var(--color-muted-foreground)]"
            style={{ color: input.trim() ? (inputIsValid ? 'var(--color-primary-strong)' : '#92400e') : 'var(--color-foreground)' }}
            aria-autocomplete="list"
            aria-expanded={open && filtered.length > 0}
          />
        </div>
      </div>

      {open && filtered.length > 0 && (
        <ul
          className="absolute left-0 top-full z-50 mt-1 w-full rounded-2xl border py-1 shadow-lg"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          role="listbox"
        >
          {filtered.slice(0, 10).map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === highlighted}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{
                backgroundColor: i === highlighted ? 'var(--color-muted)' : 'transparent',
                color: 'var(--color-foreground)',
              }}
              onMouseDown={e => { e.preventDefault(); confirmTag(s) }}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                style={
                  isKeyValue(s)
                    ? { backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }
                    : { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#b45309' }
                }
              >
                {s}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
