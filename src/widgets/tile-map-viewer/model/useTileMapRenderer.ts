import { useCallback, useLayoutEffect, useRef } from 'react'

import type { TileCamera } from '@/features/tile-camera'

import { TileMapRenderer } from '../lib/tile-map-renderer'
import type { TilePyramidManifest } from '../lib/tile-pyramid'

type UseTileMapRendererParams = {
  manifest: TilePyramidManifest | null
  camera: TileCamera
  viewportWidth: number
  viewportHeight: number
}

export function useTileMapRenderer({
  manifest,
  camera,
  viewportWidth,
  viewportHeight
}: UseTileMapRendererParams) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<TileMapRenderer | null>(null)
  const manifestRef = useRef<TilePyramidManifest | null>(null)

  const attachCanvas = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node

      rendererRef.current?.destroy()
      rendererRef.current = null

      if (!node || !manifest) {
        manifestRef.current = manifest
        return
      }

      const renderer = new TileMapRenderer(node, manifest)
      renderer.initialize()
      rendererRef.current = renderer
      manifestRef.current = manifest
    },
    [manifest]
  )

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !manifest) {
      return
    }

    if (!rendererRef.current || manifestRef.current !== manifest) {
      rendererRef.current?.destroy()

      const renderer = new TileMapRenderer(canvas, manifest)
      renderer.initialize()
      rendererRef.current = renderer
      manifestRef.current = manifest
    }

    const renderer = rendererRef.current
    const devicePixelRatio = window.devicePixelRatio || 1

    renderer.resize(viewportWidth, viewportHeight, devicePixelRatio)
    renderer.render(camera)

    return () => {
      if (!canvasRef.current) {
        rendererRef.current?.destroy()
        rendererRef.current = null
      }
    }
  }, [camera, manifest, viewportHeight, viewportWidth])

  return {
    canvasRef: attachCanvas
  }
}
