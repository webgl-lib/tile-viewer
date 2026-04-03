import { TILE_ATLAS_CONFIG } from '@/entities/tile/lib/tile-palette'

export function createAtlasTexture(gl: WebGLRenderingContext): WebGLTexture | null {
  const texture = gl.createTexture()
  if (!texture) {
    return null
  }

  const atlasCanvas = document.createElement('canvas')
  atlasCanvas.width = TILE_ATLAS_CONFIG.atlasSize
  atlasCanvas.height = TILE_ATLAS_CONFIG.atlasSize

  const context = atlasCanvas.getContext('2d')
  if (!context) {
    return null
  }

  drawAtlas(context)

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    atlasCanvas
  )

  gl.bindTexture(gl.TEXTURE_2D, null)

  return texture
}

function drawAtlas(context: CanvasRenderingContext2D) {
  drawGrassTile(context, 0, 0)
  drawForestTile(context, 64, 0)
  drawSandTile(context, 0, 64)
  drawWaterTile(context, 64, 64)
}

function drawGrassTile(
  context: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  context.fillStyle = '#55a84b'
  context.fillRect(x, y, 64, 64)

  for (let index = 0; index < 36; index += 1) {
    const px = x + ((index * 17) % 56) + 4
    const py = y + ((index * 29) % 56) + 4
    context.fillStyle = index % 2 === 0 ? '#78c25c' : '#478c3d'
    context.fillRect(px, py, 4, 4)
  }
}

function drawForestTile(
  context: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  context.fillStyle = '#356d36'
  context.fillRect(x, y, 64, 64)

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const cx = x + column * 16 + 8
      const cy = y + row * 16 + 8
      context.fillStyle = '#1f4f27'
      context.beginPath()
      context.arc(cx, cy, 6, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = '#7a4b2a'
      context.fillRect(cx - 1, cy + 4, 2, 5)
    }
  }
}

function drawSandTile(
  context: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  context.fillStyle = '#d8c27a'
  context.fillRect(x, y, 64, 64)

  for (let index = 0; index < 50; index += 1) {
    const px = x + ((index * 13) % 60) + 2
    const py = y + ((index * 19) % 60) + 2
    context.fillStyle = index % 3 === 0 ? '#c8ac5c' : '#e6d18d'
    context.fillRect(px, py, 3, 3)
  }
}

function drawWaterTile(
  context: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  context.fillStyle = '#2d7fd2'
  context.fillRect(x, y, 64, 64)

  context.strokeStyle = '#7dc0ff'
  context.lineWidth = 3

  for (let row = 0; row < 4; row += 1) {
    const waveY = y + row * 16 + 9
    context.beginPath()
    context.moveTo(x + 2, waveY)
    context.bezierCurveTo(
      x + 14,
      waveY - 5,
      x + 18,
      waveY + 5,
      x + 30,
      waveY
    )
    context.bezierCurveTo(
      x + 42,
      waveY - 5,
      x + 46,
      waveY + 5,
      x + 62,
      waveY
    )
    context.stroke()
  }
}
