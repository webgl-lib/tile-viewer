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

type LegacyTilePyramidIndex = {
  tileSize: number
  baseColumns: number
  baseRows: number
  worldWidth: number
  worldHeight: number
  levels: Array<{
    z: number
    columns: number
    rows: number
  }>
  urlPrefix: string
}

const TILESET_ROUTE = '/landsat-tiles'
const TILESET_MANIFEST_URLS = [
  `${TILESET_ROUTE}/index.json`,
  `${TILESET_ROUTE}/metadata.json`
]

export async function loadTilePyramidManifest(signal?: AbortSignal) {
  let lastError: Error | null = null

  for (const url of TILESET_MANIFEST_URLS) {
    const response = await fetch(url, { signal })

    if (!response.ok) {
      lastError = new Error(`HTTP ${response.status}`)
      continue
    }

    const payload = (await response.json()) as
      | TilePyramidMetadata
      | LegacyTilePyramidIndex

    if (isMetadataManifest(payload)) {
      return normalizeMetadataManifest(payload)
    }

    if (isLegacyIndexManifest(payload)) {
      return normalizeLegacyIndexManifest(payload)
    }

    lastError = new Error(`Unsupported manifest format at ${url}`)
  }

  throw lastError ?? new Error('Failed to load tileset manifest')
}

function normalizeMetadataManifest(metadata: TilePyramidMetadata) {
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
    urlPrefix: TILESET_ROUTE
  } satisfies TilePyramidManifest
}

function normalizeLegacyIndexManifest(index: LegacyTilePyramidIndex) {
  return {
    tileSize: index.tileSize,
    sourceWidth: index.worldWidth,
    sourceHeight: index.worldHeight,
    baseColumns: index.baseColumns,
    baseRows: index.baseRows,
    worldWidth: index.worldWidth,
    worldHeight: index.worldHeight,
    levels: index.levels.map((level) => ({
      z: level.z,
      columns: level.columns,
      rows: level.rows,
      width: level.columns * index.tileSize,
      height: level.rows * index.tileSize
    })),
    urlPrefix: index.urlPrefix || TILESET_ROUTE
  } satisfies TilePyramidManifest
}

function isMetadataManifest(
  payload: TilePyramidMetadata | LegacyTilePyramidIndex
): payload is TilePyramidMetadata {
  return (
    'tile_size' in payload &&
    'source_width' in payload &&
    'source_height' in payload
  )
}

function isLegacyIndexManifest(
  payload: TilePyramidMetadata | LegacyTilePyramidIndex
): payload is LegacyTilePyramidIndex {
  return (
    'tileSize' in payload &&
    'baseColumns' in payload &&
    'baseRows' in payload &&
    'levels' in payload
  )
}
