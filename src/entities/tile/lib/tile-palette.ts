import type { TileAtlasUv, TileVariant } from '../model/types'

const ATLAS_SIZE = 128
const CELL_SIZE = 64
const UV_PADDING = 2

const TILE_LAYOUT: Record<TileVariant, { column: number; row: number }> = {
  grass: { column: 0, row: 0 },
  forest: { column: 1, row: 0 },
  sand: { column: 0, row: 1 },
  water: { column: 1, row: 1 }
}

export function resolveTileVariant(x: number, y: number): TileVariant {
  const waves =
    Math.sin(x * 0.11) +
    Math.cos(y * 0.09) +
    Math.sin((x + y) * 0.035) +
    Math.cos((x - y) * 0.05)

  if (waves > 2) {
    return 'forest'
  }

  if (waves > 0.25) {
    return 'grass'
  }

  if (waves > -1.2) {
    return 'sand'
  }

  return 'water'
}

export function getTileAtlasUv(variant: TileVariant): TileAtlasUv {
  const tile = TILE_LAYOUT[variant]

  const x0 = tile.column * CELL_SIZE + UV_PADDING
  const y0 = tile.row * CELL_SIZE + UV_PADDING
  const x1 = (tile.column + 1) * CELL_SIZE - UV_PADDING
  const y1 = (tile.row + 1) * CELL_SIZE - UV_PADDING

  return {
    u0: x0 / ATLAS_SIZE,
    v0: y0 / ATLAS_SIZE,
    u1: x1 / ATLAS_SIZE,
    v1: y1 / ATLAS_SIZE
  }
}

export const TILE_ATLAS_CONFIG = {
  atlasSize: ATLAS_SIZE,
  cellSize: CELL_SIZE
}
