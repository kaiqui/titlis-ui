import { Star } from 'lucide-react'
import { useToggleFavorite } from '@/hooks/useApi'

interface FavoriteStarProps {
  workloadId: string
  isFavorite: boolean
}

export function FavoriteStar({ workloadId, isFavorite }: FavoriteStarProps) {
  const toggle = useToggleFavorite()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    toggle.mutate({ workloadId, isFavorite })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className="shrink-0 rounded-full p-1 transition-colors hover:bg-[var(--color-muted)]"
    >
      <Star
        size={15}
        className={isFavorite ? 'fill-amber-400 text-amber-400' : 'text-[var(--color-muted-foreground)]'}
      />
    </button>
  )
}
