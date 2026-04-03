import { useEffect, useMemo, useRef, useState } from 'react'

import {
  createTileGrid,
  TILE_MAP_COLUMNS,
  TILE_MAP_ROWS,
  TILE_SIZE
} from '@/entities/tile'
import { useTileCamera } from '@/features/tile-camera'

import { TileMapRenderer } from '../lib/tile-map-renderer'

type Viewport = {
  width: number
  height: number
}

const INITIAL_VIEWPORT: Viewport = {
  width: 1,
  height: 1
}

export function TileMapViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<TileMapRenderer | null>(null)
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT)

  const tileGrid = useMemo(
    () =>
      createTileGrid({
        columns: TILE_MAP_COLUMNS,
        rows: TILE_MAP_ROWS,
        tileSize: TILE_SIZE
      }),
    []
  )

  const { camera, bind, fitToWorld } = useTileCamera({
    worldWidth: tileGrid.worldWidth,
    worldHeight: tileGrid.worldHeight,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const renderer = new TileMapRenderer(canvas, tileGrid)
    renderer.initialize()
    rendererRef.current = renderer

    return () => {
      renderer.destroy()
      rendererRef.current = null
    }
  }, [tileGrid])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextViewport = {
        width: entry.contentRect.width,
        height: entry.contentRect.height
      }

      setViewport(nextViewport)

      const devicePixelRatio = window.devicePixelRatio || 1
      rendererRef.current?.resize(
        nextViewport.width,
        nextViewport.height,
        devicePixelRatio
      )
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!rendererRef.current) {
      return
    }

    const devicePixelRatio = window.devicePixelRatio || 1

    rendererRef.current.resize(
      viewport.width,
      viewport.height,
      devicePixelRatio
    )
    rendererRef.current.render(camera)
  }, [camera, viewport.height, viewport.width])

  return (
    <div className="viewer-card">
      <div className="viewer-card__toolbar">
        <div className="viewer-card__badge">Pure WebGL renderer</div>

        <div className="viewer-card__stats">
          <span>{TILE_MAP_COLUMNS} × {TILE_MAP_ROWS}</span>
          <span>tile size: {TILE_SIZE}px</span>
          <span>zoom: {camera.zoom.toFixed(2)}x</span>
        </div>

        <button
          className="viewer-card__button"
          type="button"
          onClick={fitToWorld}
        >
          Fit to view
        </button>
      </div>

      <div ref={containerRef} className="viewer-card__canvas-shell">
        <canvas
          ref={canvasRef}
          className="viewer-card__canvas"
          {...bind}
        />
      </div>

      <div className="viewer-card__footer">
        <span>ЛКМ + drag — pan</span>
        <span>Колесо мыши — zoom</span>
        <span>Рендеринг всех 62 500 тайлов идет одним буфером</span>
      </div>
    </div>
  )
}
