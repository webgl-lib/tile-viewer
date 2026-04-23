import type { TileCamera } from '@/features/tile-camera'
import { Matrix4 } from '@/shared/lib/math/matrix4'
import { createProgram } from '@/shared/lib/webgl/create-program'

import fragmentShaderSource from './shaders/tiles.frag?raw'
import vertexShaderSource from './shaders/tile.vert?raw'
import {
  getVisibleTilesForZoom,
  type TilePyramidManifest,
  type VisibleTile
} from './tile-pyramid'

type RendererResources = {
  gl: WebGLRenderingContext
  program: WebGLProgram
  vertexBuffer: WebGLBuffer
  attributes: {
    position: number
    texCoord: number
  }
  uniforms: {
    sampler: WebGLUniformLocation
    viewProjection: WebGLUniformLocation
    model: WebGLUniformLocation
    texCoordScale: WebGLUniformLocation
  }
}

type TileTextureRecord = {
  status: 'loading' | 'ready' | 'error'
  texture: WebGLTexture | null
  rawData: Uint16Array | null
}

const MAX_CACHED_TEXTURES = 384
const RAW_TILE_SIZE = 256

export class TileMapRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly manifest: TilePyramidManifest
  private resources: RendererResources | null = null
  private viewportWidth = 1
  private viewportHeight = 1
  private lastCamera: TileCamera | null = null
  private activeLevelZ: number | null = null
  private frameRequestId: number | null = null
  private readonly textureCache = new Map<string, TileTextureRecord>()
  private readonly quadModelMatrix = new Matrix4()
  private readonly quadScaleMatrix = new Matrix4()

  constructor(canvas: HTMLCanvasElement, manifest: TilePyramidManifest) {
    this.canvas = canvas
    this.manifest = manifest
  }

  initialize() {
    const gl = this.canvas.getContext('webgl', {
      alpha: false,
      antialias: true
    })

    if (!gl) {
      throw new Error('Failed to get WebGL context')
    }

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
    if (!program) {
      throw new Error('Failed to create shader program')
    }

    const vertexBuffer = gl.createBuffer()
    if (!vertexBuffer) {
      throw new Error('Failed to create vertex buffer')
    }

    gl.useProgram(program)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, createQuadVertexData(), gl.STATIC_DRAW)

    const position = gl.getAttribLocation(program, 'a_Position')
    const texCoord = gl.getAttribLocation(program, 'a_TexCoord')
    const sampler = gl.getUniformLocation(program, 'u_Sampler')
    const viewProjection = gl.getUniformLocation(program, 'u_ViewProjection')
    const model = gl.getUniformLocation(program, 'u_Model')
    const texCoordScale = gl.getUniformLocation(program, 'u_TexCoordScale')

    if (
      position < 0 ||
      texCoord < 0 ||
      !sampler ||
      !viewProjection ||
      !model ||
      !texCoordScale
    ) {
      throw new Error('Failed to resolve shader locations')
    }

    const stride = Float32Array.BYTES_PER_ELEMENT * 4

    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0)
    gl.enableVertexAttribArray(position)

    gl.vertexAttribPointer(
      texCoord,
      2,
      gl.FLOAT,
      false,
      stride,
      Float32Array.BYTES_PER_ELEMENT * 2
    )
    gl.enableVertexAttribArray(texCoord)

    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(sampler, 0)

    this.resources = {
      gl,
      program,
      vertexBuffer,
      attributes: {
        position,
        texCoord
      },
      uniforms: {
        sampler,
        viewProjection,
        model,
        texCoordScale
      }
    }
  }

  resize(viewportWidth: number, viewportHeight: number, devicePixelRatio: number) {
    this.viewportWidth = Math.max(viewportWidth, 1)
    this.viewportHeight = Math.max(viewportHeight, 1)

    const width = Math.max(Math.floor(viewportWidth * devicePixelRatio), 1)
    const height = Math.max(Math.floor(viewportHeight * devicePixelRatio), 1)

    this.canvas.width = width
    this.canvas.height = height

    if (!this.resources) {
      return
    }

    this.resources.gl.viewport(0, 0, width, height)
  }

  render(camera: TileCamera) {
    if (!this.resources) {
      return
    }

    this.lastCamera = { ...camera }

    const { gl, uniforms } = this.resources

    const viewProjection = new Matrix4()
      .setOrtho(
        0,
        this.viewportWidth / camera.zoom,
        this.viewportHeight / camera.zoom,
        0,
        -1,
        1
      )
      .translate(-camera.x, -camera.y, 0)

    gl.useProgram(this.resources.program)
    gl.uniformMatrix4fv(
      uniforms.viewProjection,
      false,
      viewProjection.elements
    )

    gl.clearColor(0.062, 0.09, 0.15, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const visibleTiles = getVisibleTilesForZoom(
      this.manifest,
      camera,
      this.viewportWidth,
      this.viewportHeight,
      this.activeLevelZ ?? undefined
    )
    this.activeLevelZ = visibleTiles.level.z
    this.drawTiles(visibleTiles.tiles, false)
    this.evictOverflowTextures()
  }

  destroy() {
    if (!this.resources) {
      return
    }

    const { gl, program, vertexBuffer } = this.resources

    for (const record of this.textureCache.values()) {
      if (record.texture) {
        gl.deleteTexture(record.texture)
      }
    }

    this.textureCache.clear()
    gl.deleteBuffer(vertexBuffer)
    gl.deleteProgram(program)

    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId)
      this.frameRequestId = null
    }

    this.resources = null
  }

  private drawTiles(tiles: VisibleTile[], cachedOnly: boolean) {
    if (!this.resources) {
      return
    }

    const { gl, uniforms } = this.resources

    for (const tile of tiles) {
      const texture = cachedOnly
        ? this.getCachedTexture(tile.rawUrl)
        : this.getOrCreateTexture(tile.rawUrl)

      if (!texture) {
        continue
      }

      gl.bindTexture(gl.TEXTURE_2D, texture)

      const model = this.quadModelMatrix
        .setTranslate(tile.worldX, tile.worldY, 0)
        .concat(this.quadScaleMatrix.setScale(tile.worldWidth, tile.worldHeight, 1))

      gl.uniformMatrix4fv(uniforms.model, false, model.elements)
      gl.uniform2f(
        uniforms.texCoordScale,
        tile.textureWidth / RAW_TILE_SIZE,
        tile.textureHeight / RAW_TILE_SIZE
      )
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
  }

  private getCachedTexture(url: string) {
    const cached = this.textureCache.get(url)

    if (cached?.status !== 'ready') {
      return null
    }

    this.textureCache.delete(url)
    this.textureCache.set(url, cached)

    return cached.texture
  }

  private getOrCreateTexture(url: string) {
    if (!this.resources) {
      return null
    }

    const cached = this.textureCache.get(url)

    if (cached?.status === 'ready') {
      this.textureCache.delete(url)
      this.textureCache.set(url, cached)
      return cached.texture
    }

    if (cached) {
      return null
    }

    this.textureCache.set(url, {
      status: 'loading',
      texture: null,
      rawData: null
    })

    void fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return response.arrayBuffer()
      })
      .then((buffer) => {
        if (!this.resources) {
          return
        }

        const rawData = new Uint16Array(buffer)
        const texture = createTextureFromRawTile(
          this.resources.gl,
          rawData,
          RAW_TILE_SIZE
        )

        this.textureCache.set(url, {
          status: texture ? 'ready' : 'error',
          texture,
          rawData
        })
        this.requestRender()
      })
      .catch(() => {
        this.textureCache.set(url, {
          status: 'error',
          texture: null,
          rawData: null
        })
      })

    return null
  }

  private requestRender() {
    if (this.frameRequestId !== null) {
      return
    }

    this.frameRequestId = requestAnimationFrame(() => {
      this.frameRequestId = null

      if (this.lastCamera) {
        this.render(this.lastCamera)
      }
    })
  }

  private evictOverflowTextures() {
    if (!this.resources || this.textureCache.size <= MAX_CACHED_TEXTURES) {
      return
    }

    for (const [url, record] of this.textureCache) {
      if (this.textureCache.size <= MAX_CACHED_TEXTURES) {
        break
      }

      if (record.status === 'loading') {
        continue
      }

      if (record.texture) {
        this.resources.gl.deleteTexture(record.texture)
      }

      this.textureCache.delete(url)
    }
  }
}

function createQuadVertexData() {
  return new Float32Array([
    0, 0, 0, 0,
    1, 0, 1, 0,
    1, 1, 1, 1,
    0, 0, 0, 0,
    1, 1, 1, 1,
    0, 1, 0, 1
  ])
}

function createTextureFromImage(
  gl: WebGLRenderingContext,
  imageData: Uint8Array,
  width: number,
  height: number
) {
  const texture = gl.createTexture()

  if (!texture) {
    return null
  }

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    imageData
  )

  return texture
}

function createTextureFromRawTile(
  gl: WebGLRenderingContext,
  rawData: Uint16Array,
  tileSize: number
) {
  const rgbaData = normalizeRawTileToRgba(rawData, tileSize)

  return createTextureFromImage(gl, rgbaData, tileSize, tileSize)
}

function normalizeRawTileToRgba(rawData: Uint16Array, tileSize: number) {
  const rgbaData = new Uint8Array(tileSize * tileSize * 4)
  let maxValue = 0

  for (let index = 0; index < rawData.length; index += 1) {
    if (rawData[index] > maxValue) {
      maxValue = rawData[index]
    }
  }

  const safeMax = Math.max(maxValue, 1)

  for (let index = 0; index < rawData.length; index += 1) {
    const value = rawData[index]
    const rgbaIndex = index * 4

    const normalizedValue = Math.round((value / safeMax) * 255)

    rgbaData[rgbaIndex] = normalizedValue
    rgbaData[rgbaIndex + 1] = normalizedValue
    rgbaData[rgbaIndex + 2] = normalizedValue
    rgbaData[rgbaIndex + 3] = 255
  }

  return rgbaData
}
