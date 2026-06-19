import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZES = [10, 25, 50, 100]

interface Props {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
}: Props) {
  if (totalItems === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        <span>Itens por página:</span>
        {PAGE_SIZES.map(size => (
          <button
            key={size}
            type="button"
            onClick={() => onPageSizeChange(size)}
            className="rounded-full px-2.5 py-1 font-semibold transition-colors"
            style={
              size === pageSize
                ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }
            }
          >
            {size}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {startIndex + 1}–{endIndex} de {totalItems}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-xl p-1.5 transition-colors disabled:opacity-30"
            style={{ color: 'var(--color-foreground)', backgroundColor: 'var(--color-muted)' }}
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>

          <span className="min-w-[3.5rem] text-center text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-xl p-1.5 transition-colors disabled:opacity-30"
            style={{ color: 'var(--color-foreground)', backgroundColor: 'var(--color-muted)' }}
            aria-label="Próxima página"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
