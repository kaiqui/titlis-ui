import type { JourneyInput } from '@/types'

// "serviço | rota | kind" por linha → passos (formulário de nova jornada)
export function parseStepsText(text: string): JourneyInput['steps'] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [service = '', route = '', kind = ''] = line.split('|').map((p) => p.trim())
      const k = (['entry', 'sync', 'async'].includes(kind) ? kind : i === 0 ? 'entry' : 'sync') as 'entry' | 'sync' | 'async'
      return k === 'async'
        ? { serviceName: service, subscriptionId: route || null, kind: k }
        : { serviceName: service, resourceName: route || null, kind: k }
    })
}

