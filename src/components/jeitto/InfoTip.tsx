import { Info } from 'lucide-react'

interface InfoTipProps {
  content: string
}

export function InfoTip({ content }: InfoTipProps) {
  return (
    <span
      title={content}
      aria-label={content}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border align-middle"
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-muted-foreground)',
        backgroundColor: 'var(--color-muted)',
      }}
    >
      <Info size={10} />
    </span>
  )
}
