import type { ReactNode } from 'react'
import { usePrefersReducedMotion } from '@/lib/motion/useReducedMotion'

interface MotionGateProps {
  children: ReactNode
  fallback?: ReactNode
}

// Desliga animação pesada (Three.js, GSAP ScrollTrigger) quando o usuário pede
// prefers-reduced-motion. Animações leves de motion/react continuam funcionando
// normalmente fora deste gate (elas já respeitam reduced motion internamente).
export function MotionGate({ children, fallback = null }: MotionGateProps) {
  const reducedMotion = usePrefersReducedMotion()
  if (reducedMotion) return <>{fallback}</>
  return <>{children}</>
}
