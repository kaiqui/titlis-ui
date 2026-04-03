import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface InlineAccordionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function InlineAccordion({ title, defaultOpen = false, children }: InlineAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className="rounded-[1.3rem] border"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
    >
      <button
        onClick={() => setOpen(current => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        type="button"
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</span>
        <ChevronDown size={16} style={{ color: 'var(--color-muted-foreground)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}
