// Tokens compartilhados de animação — motion (motion.dev), GSAP e anime.js devem ler daqui
// para manter timing/easing consistentes entre as três libs.

export const duration = {
  fast: 0.15,
  base: 0.3,
  slow: 0.6,
} as const

export const easing = {
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
}

// Mesma curva em notação CSS/GSAP (string), para quando a lib não aceita array de bezier
export const easingCss = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
}

export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: duration.base, ease: easing.standard },
}

export const staggerContainer = (staggerChildren = 0.06) => ({
  animate: {
    transition: { staggerChildren },
  },
})
