import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import type { TileCamera } from '@/features/tile-camera'

import {
  TileMapRenderer,
  type TileContrastSettings
} from '../lib/tile-map-renderer'
import type { TilePyramidManifest } from '../lib/tile-pyramid'

type UseTileMapRendererParams = {
  manifest: TilePyramidManifest | null
  camera: TileCamera
  contrastSettings: TileContrastSettings
  viewportWidth: number
  viewportHeight: number
}

export function useTileMapRenderer({
  manifest,
  camera,
  contrastSettings,
  viewportWidth,
  viewportHeight
}: UseTileMapRendererParams) {
  const [fps, setFps] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<TileMapRenderer | null>(null)
  const manifestRef = useRef<TilePyramidManifest | null>(null)
  const fpsSampleRef = useRef({
    frameCount: 0,
    startedAt: 0
  })

  const recordFrame = useCallback((time: number) => {
    const sample = fpsSampleRef.current

    if (sample.startedAt === 0) {
      sample.startedAt = time
      sample.frameCount = 0
    }

    sample.frameCount += 1

    const elapsed = time - sample.startedAt

    if (elapsed < 500) {
      return
    }

    setFps(Math.round((sample.frameCount * 1000) / elapsed))
    sample.startedAt = time
    sample.frameCount = 0
  }, [])

  const attachCanvas = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node

      rendererRef.current?.destroy()
      rendererRef.current = null

      if (!node || !manifest) {
        manifestRef.current = manifest
        return
      }

      const renderer = new TileMapRenderer(node, manifest, recordFrame)
      renderer.initialize()
      rendererRef.current = renderer
      manifestRef.current = manifest
    },
    [manifest, recordFrame]
  )

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !manifest) {
      return
    }

    if (!rendererRef.current || manifestRef.current !== manifest) {
      rendererRef.current?.destroy()

      const renderer = new TileMapRenderer(canvas, manifest, recordFrame)
      renderer.initialize()
      rendererRef.current = renderer
      manifestRef.current = manifest
    }

    const renderer = rendererRef.current
    const devicePixelRatio = window.devicePixelRatio || 1

    renderer.resize(viewportWidth, viewportHeight, devicePixelRatio)
    renderer.render(camera, contrastSettings)

    return () => {
      if (!canvasRef.current) {
        rendererRef.current?.destroy()
        rendererRef.current = null
      }
    }
  }, [
    camera,
    contrastSettings,
    manifest,
    recordFrame,
    viewportHeight,
    viewportWidth
  ])

  return {
    canvasRef: attachCanvas,
    fps
  }
}
