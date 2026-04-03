import type { TileGrid } from '../model/types'

import { getTileAtlasUv, resolveTileVariant } from './tile-palette'

type CreateTileGridParams = {
  columns: number
  rows: number
  tileSize: number
}

const FLOATS_PER_VERTEX = 4
const VERTICES_PER_TILE = 6

export function createTileGrid({
  columns,
  rows,
  tileSize
}: CreateTileGridParams): TileGrid {
  const tileCount = columns * rows
  const vertexCount = tileCount * VERTICES_PER_TILE
  const vertexData = new Float32Array(vertexCount * FLOATS_PER_VERTEX)

  let cursor = 0

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = column * tileSize
      const y0 = row * tileSize
      const x1 = x0 + tileSize
      const y1 = y0 + tileSize

      const variant = resolveTileVariant(column, row)
      const { u0, v0, u1, v1 } = getTileAtlasUv(variant)

      cursor = writeVertex(vertexData, cursor, x0, y0, u0, v0)
      cursor = writeVertex(vertexData, cursor, x1, y0, u1, v0)
      cursor = writeVertex(vertexData, cursor, x1, y1, u1, v1)

      cursor = writeVertex(vertexData, cursor, x0, y0, u0, v0)
      cursor = writeVertex(vertexData, cursor, x1, y1, u1, v1)
      cursor = writeVertex(vertexData, cursor, x0, y1, u0, v1)
    }
  }

  return {
    columns,
    rows,
    tileSize,
    worldWidth: columns * tileSize,
    worldHeight: rows * tileSize,
    vertexData,
    vertexCount
  }
}

function writeVertex(
  target: Float32Array,
  cursor: number,
  x: number,
  y: number,
  u: number,
  v: number
) {
  target[cursor] = x
  target[cursor + 1] = y
  target[cursor + 2] = u
  target[cursor + 3] = v

  return cursor + FLOATS_PER_VERTEX
}
