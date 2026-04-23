import type { TilePyramidManifest } from './tile-pyramid'

type TilePyramidMetadata = {
  tile_size: number
  source_width: number
  source_height: number
  levels: Array<{
    z: number
    width: number
    height: number
    columns: number
    rows: number
    transform?: [number, number, number, number, number, number]
  }>
}

const TILESET_MANIFEST_URL = '/landsat-tiles/metadata.json'

export async function loadTilePyramidManifest(signal?: AbortSignal) {
  const response = await fetch(TILESET_MANIFEST_URL, { signal })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const metadata = (await response.json()) as TilePyramidMetadata
  const baseLevel = metadata.levels[0]

  return {
    tileSize: metadata.tile_size,
    sourceWidth: metadata.source_width,
    sourceHeight: metadata.source_height,
    baseColumns: baseLevel.columns,
    baseRows: baseLevel.rows,
    worldWidth: metadata.source_width,
    worldHeight: metadata.source_height,
    levels: metadata.levels,
    urlPrefix: '/landsat-tiles'
  } satisfies TilePyramidManifest
}
