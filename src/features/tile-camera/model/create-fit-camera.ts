import type { TileCamera } from './types'

type CreateFitCameraParams = {
  worldWidth: number
  worldHeight: number
  viewportWidth: number
  viewportHeight: number
  padding?: number
}

export function createFitCamera({
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  padding = 24
}: CreateFitCameraParams): TileCamera {
  const safeViewportWidth = Math.max(viewportWidth - padding * 2, 1)
  const safeViewportHeight = Math.max(viewportHeight - padding * 2, 1)

  const zoomX = safeViewportWidth / worldWidth
  const zoomY = safeViewportHeight / worldHeight
  const zoom = Math.max(Math.min(zoomX, zoomY), 0.05)

  const visibleWorldWidth = viewportWidth / zoom
  const visibleWorldHeight = viewportHeight / zoom

  const x = (worldWidth - visibleWorldWidth) / 2
  const y = (worldHeight - visibleWorldHeight) / 2

  return {
    x,
    y,
    zoom
  }
}
