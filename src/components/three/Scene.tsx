import { Suspense, lazy } from 'react'
import type { ComponentType } from 'react'

interface SceneProps {
  className?: string
}

// Carrega Three.js só quando o componente é montado — nunca entra no chunk principal.
// Cada cena concreta (ex: NetworkMeshScene) vive em arquivo próprio nesta pasta e é
// referenciada aqui via import() para manter o code-splitting por rota.
function makeLazyScene(loader: () => Promise<{ default: ComponentType<SceneProps> }>) {
  const LazyScene = lazy(loader)
  return function SceneWrapper(props: SceneProps) {
    return (
      <Suspense fallback={null}>
        <LazyScene {...props} />
      </Suspense>
    )
  }
}

export const NetworkMeshScene = makeLazyScene(() => import('./scenes/NetworkMeshScene'))
