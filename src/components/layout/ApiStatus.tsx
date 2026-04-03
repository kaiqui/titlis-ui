import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

type ProbeState = 'checking' | 'ok' | 'error'

export function ApiStatus() {
  const [status, setStatus] = useState<ProbeState>('checking')
  const [message, setMessage] = useState('API')

  useEffect(() => {
    let cancelled = false

    async function probe() {
      try {
        const response = await fetch('/health', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`health returned ${response.status}`)
        }

        if (!cancelled) {
          setStatus('ok')
          setMessage('API OK')
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
          setMessage(error instanceof Error ? 'API offline' : 'API indisponível')
        }
      }
    }

    void probe()
    return () => {
      cancelled = true
    }
  }, [])

  const tone = status === 'ok'
    ? 'bg-emerald-500/10 text-emerald-500'
    : status === 'error'
      ? 'bg-red-500/10 text-red-500'
      : 'bg-slate-500/10 text-slate-500'

  const Icon = status === 'ok' ? Wifi : WifiOff

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${tone}`} title={message}>
      <Icon size={13} />
      {message}
    </div>
  )
}
