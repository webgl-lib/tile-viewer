import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const TILESET_ROUTE = '/landsat-tiles'
const TILESET_DIR = 'D:\\Практика\\Весна2026\\tails'
const TILE_SIZE = 256

function createTilesetManifest() {
  const levels = new Map<number, { columns: number; rows: number }>()

  for (const entry of fs.readdirSync(TILESET_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.png')) {
      continue
    }

    const match = /^(\d+)_(\d+)_(\d+)\.png$/i.exec(entry.name)
    if (!match) {
      continue
    }

    const z = Number(match[1])
    const x = Number(match[2])
    const y = Number(match[3])
    const current = levels.get(z) ?? { columns: 0, rows: 0 }

    current.columns = Math.max(current.columns, x + 1)
    current.rows = Math.max(current.rows, y + 1)
    levels.set(z, current)
  }

  const sortedLevels = Array.from(levels.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([z, size]) => ({
      z,
      columns: size.columns,
      rows: size.rows
    }))

  const baseLevel = sortedLevels[0]
  const worldWidth = baseLevel.columns * TILE_SIZE
  const worldHeight = baseLevel.rows * TILE_SIZE

  return {
    tileSize: TILE_SIZE,
    baseColumns: baseLevel.columns,
    baseRows: baseLevel.rows,
    worldWidth,
    worldHeight,
    levels: sortedLevels,
    urlPrefix: TILESET_ROUTE
  }
}

function externalTilesPlugin() {
  return {
    name: 'external-landsat-tiles',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((request, response, next) => {
        handleTilesetRequest(request.url, response, next)
      })
    },
    configurePreviewServer(server: import('vite').PreviewServer) {
      server.middlewares.use((request, response, next) => {
        handleTilesetRequest(request.url, response, next)
      })
    }
  }
}

function handleTilesetRequest(
  requestUrl: string | undefined,
  response: import('node:http').ServerResponse,
  next: () => void
) {
  if (!requestUrl) {
    next()
    return
  }

  const pathname = requestUrl.split('?')[0]

  if (pathname === `${TILESET_ROUTE}/index.json`) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(createTilesetManifest()))
    return
  }

  if (!pathname.startsWith(`${TILESET_ROUTE}/`)) {
    next()
    return
  }

  const relativePath = decodeURIComponent(
    pathname.slice(`${TILESET_ROUTE}/`.length)
  )
  const filePath = path.resolve(TILESET_DIR, relativePath)
  const normalizedTilesetDir = path.resolve(TILESET_DIR)

  if (!filePath.startsWith(normalizedTilesetDir) || !fs.existsSync(filePath)) {
    response.statusCode = 404
    response.end('Not found')
    return
  }

  response.setHeader('Content-Type', getContentType(filePath))
  fs.createReadStream(filePath).pipe(response)
}

function getContentType(filePath: string) {
  if (filePath.endsWith('.png')) {
    return 'image/png'
  }

  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8'
  }

  return 'application/octet-stream'
}

export default defineConfig({
  plugins: [react(), externalTilesPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
