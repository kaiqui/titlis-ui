import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { resolveRange, type ResolvedRange } from '@/lib/timeRange'

export interface TimeRangeControl extends ResolvedRange {
  setPreset: (id: string) => void
  setAbsolute: (from: number, to: number) => void
}

export function useTimeRange(): TimeRangeControl {
  const [params, setParams] = useSearchParams()
  const resolved = useMemo(() => resolveRange(params), [params])

  const setPreset = useCallback(
    (id: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('range', id)
          next.delete('from')
          next.delete('to')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setAbsolute = useCallback(
    (from: number, to: number) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('from', String(Math.round(from)))
          next.set('to', String(Math.round(to)))
          next.delete('range')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return { ...resolved, setPreset, setAbsolute }
}
