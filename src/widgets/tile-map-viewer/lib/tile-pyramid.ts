import type { TileCamera } from '@/features/tile-camera'

export type TilePyramidLevel = {
  z: number
  width: number
  height: number
  columns: number
  rows: number
  transform?: [number, number, number, number, number, number]
}

export type TilePyramidManifest = {
  tileSize: number
  sourceWidth: number
  sourceHeight: number
  baseColumns: number
  baseRows: number
  worldWidth: number
  worldHeight: number
  levels: TilePyramidLevel[]
  urlPrefix: string
}

export type VisibleTile = {
  key: string
  z: number
  x: number
  y: number
  worldX: number
  worldY: number
  worldWidth: number
  worldHeight: number
  textureWidth: number
  textureHeight: number
  rawUrl: string
}

type VisibleTileSet = {
  level: TilePyramidLevel
  tileWorldSize: number
  tiles: VisibleTile[]
}

const DEFAULT_TILE_OVERSCAN = 1

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getLevelIndex(manifest: TilePyramidManifest, z: number) {
  return manifest.levels.findIndex((level) => level.z === z)
}

export function getLevelTileWorldSize(
  manifest: TilePyramidManifest,
  level: TilePyramidLevel
) {
  return (manifest.tileSize * manifest.worldWidth) / level.width
}

export function getLevelTileWorldHeight(
  manifest: TilePyramidManifest,
  level: TilePyramidLevel
) {
  return (manifest.tileSize * manifest.worldHeight) / level.height
}

export function getCoarserLevel(
  manifest: TilePyramidManifest,
  level: TilePyramidLevel
) {
  const currentIndex = getLevelIndex(manifest, level.z)

  if (currentIndex < 0 || currentIndex >= manifest.levels.length - 1) {
    return null
  }

  return manifest.levels[currentIndex + 1]
}

export function getCoarserLevels(
  manifest: TilePyramidManifest,
  level: TilePyramidLevel,
  count = 2
) {
  const currentIndex = getLevelIndex(manifest, level.z)

  if (currentIndex < 0) {
    return []
  }

  return manifest.levels.slice(
    currentIndex + 1,
    Math.min(currentIndex + 1 + count, manifest.levels.length)
  )
}

export function getLevelForZoom(
  manifest: TilePyramidManifest,
  zoom: number,
  preferredLevelZ?: number
) {
  const safeZoom = Math.max(zoom, 0.0001)
  const targetTileWorldSize = manifest.tileSize / safeZoom
  const preferredLevelIndex =
    preferredLevelZ === undefined ? -1 : getLevelIndex(manifest, preferredLevelZ)

  if (preferredLevelIndex >= 0) {
    let index = preferredLevelIndex

    while (index > 0) {
      const currentLevel = manifest.levels[index]
      const finerLevel = manifest.levels[index - 1]
      const currentTileWorldSize = getLevelTileWorldSize(manifest, currentLevel)
      const finerTileWorldSize = getLevelTileWorldSize(manifest, finerLevel)
      const switchThreshold = (currentTileWorldSize + finerTileWorldSize) / 2

      if (targetTileWorldSize < switchThreshold * 0.75) {
        index -= 1
        continue
      }

      break
    }

    while (index < manifest.levels.length - 1) {
      const currentLevel = manifest.levels[index]
      const coarserLevel = manifest.levels[index + 1]
      const currentTileWorldSize = getLevelTileWorldSize(manifest, currentLevel)
      const coarserTileWorldSize = getLevelTileWorldSize(manifest, coarserLevel)
      const switchThreshold = (currentTileWorldSize + coarserTileWorldSize) / 2

      if (targetTileWorldSize > switchThreshold * 1.25) {
        index += 1
        continue
      }

      break
    }

    return manifest.levels[index]
  }

  return manifest.levels.reduce((best, level) => {
    const levelTileWorldSize = getLevelTileWorldSize(manifest, level)
    const bestTileWorldSize = getLevelTileWorldSize(manifest, best)

    return Math.abs(levelTileWorldSize - targetTileWorldSize) <
      Math.abs(bestTileWorldSize - targetTileWorldSize)
      ? level
      : best
  }, manifest.levels[0])
}

export function getTileUrl(
  manifest: TilePyramidManifest,
  z: number,
  x: number,
  y: number
) {
  return `${manifest.urlPrefix}/${z}_${x}_${y}.png`
}

export function getTileRawUrl(
  manifest: TilePyramidManifest,
  z: number,
  x: number,
  y: number
) {
  return `${manifest.urlPrefix}/${z}_${x}_${y}.raw`
}

export function getVisibleTiles(
  manifest: TilePyramidManifest,
  level: TilePyramidLevel,
  camera: TileCamera,
  viewportWidth: number,
  viewportHeight: number,
  overscan = DEFAULT_TILE_OVERSCAN
): VisibleTileSet {
  const scaleX = manifest.worldWidth / level.width
  const scaleY = manifest.worldHeight / level.height
  const tileWorldWidth = getLevelTileWorldSize(manifest, level)
  const tileWorldHeight = getLevelTileWorldHeight(manifest, level)

  const left = clamp(camera.x, 0, manifest.worldWidth)
  const top = clamp(camera.y, 0, manifest.worldHeight)
  const right = clamp(
    camera.x + viewportWidth / Math.max(camera.zoom, 0.0001),
    0,
    manifest.worldWidth
  )
  const bottom = clamp(
    camera.y + viewportHeight / Math.max(camera.zoom, 0.0001),
    0,
    manifest.worldHeight
  )

  const startX = clamp(
    Math.floor(left / tileWorldWidth) - overscan,
    0,
    level.columns - 1
  )
  const endX = clamp(
    Math.floor(Math.max(right - 0.0001, 0) / tileWorldWidth) + overscan,
    0,
    level.columns - 1
  )
  const startY = clamp(
    Math.floor(top / tileWorldHeight) - overscan,
    0,
    level.rows - 1
  )
  const endY = clamp(
    Math.floor(Math.max(bottom - 0.0001, 0) / tileWorldHeight) + overscan,
    0,
    level.rows - 1
  )

  const tiles: VisibleTile[] = []

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      tiles.push({
        key: `${level.z}/${x}/${y}`,
        z: level.z,
        x,
        y,
        worldX: x * manifest.tileSize * scaleX,
        worldY: y * manifest.tileSize * scaleY,
        worldWidth: Math.min(
          manifest.tileSize,
          level.width - x * manifest.tileSize
        ) * scaleX,
        worldHeight: Math.min(
          manifest.tileSize,
          level.height - y * manifest.tileSize
        ) * scaleY,
        textureWidth: Math.min(
          manifest.tileSize,
          level.width - x * manifest.tileSize
        ),
        textureHeight: Math.min(
          manifest.tileSize,
          level.height - y * manifest.tileSize
        ),
        rawUrl: getTileRawUrl(manifest, level.z, x, y)
      })
    }
  }

  return {
    level,
    tileWorldSize: tileWorldWidth,
    tiles
  }
}

export function getVisibleTilesForZoom(
  manifest: TilePyramidManifest,
  camera: TileCamera,
  viewportWidth: number,
  viewportHeight: number,
  preferredLevelZ?: number
): VisibleTileSet {
  const level = getLevelForZoom(manifest, camera.zoom, preferredLevelZ)

  return getVisibleTiles(manifest, level, camera, viewportWidth, viewportHeight)
}
