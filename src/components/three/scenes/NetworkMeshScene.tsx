import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface NetworkMeshSceneProps {
  className?: string
}

const NODE_COUNT = 60
const CONNECT_DISTANCE = 2.6

// Malha de pontos conectados por linhas, remetendo ao grafo de discovery
// (K8s + Datadog) descrito no CLAUDE.md §3.7 — puramente decorativo, sem dados reais.
export default function NetworkMeshScene({ className }: NetworkMeshSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.z = 10

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const nodePositions: THREE.Vector3[] = []
    for (let i = 0; i < NODE_COUNT; i++) {
      nodePositions.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 6,
        ),
      )
    }

    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(nodePositions)
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0x8b8bff,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
    })
    const points = new THREE.Points(pointsGeometry, pointsMaterial)
    scene.add(points)

    const linePositions: number[] = []
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < CONNECT_DISTANCE) {
          linePositions.push(
            nodePositions[i].x,
            nodePositions[i].y,
            nodePositions[i].z,
            nodePositions[j].x,
            nodePositions[j].y,
            nodePositions[j].z,
          )
        }
      }
    }
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4a4a8a, transparent: true, opacity: 0.25 })
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lines)

    let frameId = 0
    const animate = () => {
      points.rotation.y += 0.0008
      lines.rotation.y += 0.0008
      points.rotation.x += 0.0002
      lines.rotation.x += 0.0002
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    const resize = () => {
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0 || clientHeight === 0) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      pointsGeometry.dispose()
      pointsMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className={className} aria-hidden="true" />
}
