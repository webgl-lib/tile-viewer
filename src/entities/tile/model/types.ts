export type TileVariant = 'grass' | 'forest' | 'sand' | 'water'

export type TileAtlasUv = {
  u0: number
  v0: number
  u1: number
  v1: number
}

export type TileGrid = {
  columns: number
  rows: number
  tileSize: number
  worldWidth: number
  worldHeight: number
  vertexData: Float32Array
  vertexCount: number
}
