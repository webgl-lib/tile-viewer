import type { TileCamera } from '@/features/tile-camera'
import { Matrix4 } from '@/shared/lib/math/matrix4'
import { createProgram } from '@/shared/lib/webgl/create-program'

import fragmentShaderSource from './shaders/tiles.frag?raw'
import vertexShaderSource from './shaders/tile.vert?raw'
import {
  getLevelForZoom,
  getVisibleTiles,
  getVisibleTilesForZoom,
  type TilePyramidManifest,
  type TilePyramidLevel,
  type VisibleTile
} from './tile-pyramid'

type RendererResources = {
  gl: WebGLRenderingContext
  program: WebGLProgram
  vertexBuffer: WebGLBuffer
  textureSupport: RawTextureSupport
  attributes: {
    position: number
    texCoord: number
  }
  uniforms: {
    sampler: WebGLUniformLocation
    viewProjection: WebGLUniformLocation
    model: WebGLUniformLocation
    texCoordScale: WebGLUniformLocation
    alpha: WebGLUniformLocation
    contrastLow: WebGLUniformLocation
    contrastHigh: WebGLUniformLocation
    contrastGamma: WebGLUniformLocation
    textureEncoding: WebGLUniformLocation
  }
}

export type TileContrastSettings = {
  low: number
  high: number
  gamma: number
}

type FrameRenderedCallback = (time: number) => void

type RawTextureEncoding = 'float' | 'packed-uint16'

type RawTextureSupport = {
  preferEncoding: RawTextureEncoding
  floatLinear: boolean
}

type TileTextureRecord = {
  status: 'loading' | 'ready' | 'error'
  texture: WebGLTexture | null
  encoding: RawTextureEncoding | null
}

const MAX_CACHED_TEXTURES = 384
const RAW_TILE_SIZE = 256
const TARGET_LEVEL_PREFETCH_OVERSCAN = 2
const LEVEL_CROSSFADE_DURATION_MS = 180
const UINT16_MAX_VALUE = 65535
const TEXTURE_ENCODING_FLOAT = 0
const TEXTURE_ENCODING_PACKED_UINT16 = 1
const DEFAULT_CONTRAST_SETTINGS: TileContrastSettings = {
  low: 0,
  high: 1,
  gamma: 1
}

export class TileMapRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly manifest: TilePyramidManifest
  private readonly onFrameRendered?: FrameRenderedCallback
  private resources: RendererResources | null = null
  private viewportWidth = 1
  private viewportHeight = 1
  private lastCamera: TileCamera | null = null
  private activeLevelZ: number | null = null
  private transitionFromLevelZ: number | null = null
  private transitionToLevelZ: number | null = null
  private transitionStartTime = 0
  private frameRequestId: number | null = null
  private contrastSettings = DEFAULT_CONTRAST_SETTINGS
  private readonly textureCache = new Map<string, TileTextureRecord>()
  private readonly quadModelMatrix = new Matrix4()
  private readonly quadScaleMatrix = new Matrix4()

  constructor(
    canvas: HTMLCanvasElement,
    manifest: TilePyramidManifest,
    onFrameRendered?: FrameRenderedCallback
  ) {
    this.canvas = canvas
    this.manifest = manifest
    this.onFrameRendered = onFrameRendered
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
    const textureSupport = resolveRawTextureSupport(gl)

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, createQuadVertexData(), gl.STATIC_DRAW)

    const position = gl.getAttribLocation(program, 'a_Position')
    const texCoord = gl.getAttribLocation(program, 'a_TexCoord')
    const sampler = gl.getUniformLocation(program, 'u_Sampler')
    const viewProjection = gl.getUniformLocation(program, 'u_ViewProjection')
    const model = gl.getUniformLocation(program, 'u_Model')
    const texCoordScale = gl.getUniformLocation(program, 'u_TexCoordScale')
    const alpha = gl.getUniformLocation(program, 'u_Alpha')
    const contrastLow = gl.getUniformLocation(program, 'u_ContrastLow')
    const contrastHigh = gl.getUniformLocation(program, 'u_ContrastHigh')
    const contrastGamma = gl.getUniformLocation(program, 'u_ContrastGamma')
    const textureEncoding = gl.getUniformLocation(program, 'u_TextureEncoding')

    if (
      position < 0 ||
      texCoord < 0 ||
      !sampler ||
      !viewProjection ||
      !model ||
      !texCoordScale ||
      !alpha ||
      !contrastLow ||
      !contrastHigh ||
      !contrastGamma ||
      !textureEncoding
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
      textureSupport,
      attributes: {
        position,
        texCoord
      },
      uniforms: {
        sampler,
        viewProjection,
        model,
        texCoordScale,
        alpha,
        contrastLow,
        contrastHigh,
        contrastGamma,
        textureEncoding
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

  render(camera: TileCamera, contrastSettings = DEFAULT_CONTRAST_SETTINGS) {
    if (!this.resources) {
      return
    }

    this.lastCamera = { ...camera }
    this.contrastSettings = sanitizeContrastSettings(contrastSettings)

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
    gl.uniform1f(uniforms.contrastLow, this.contrastSettings.low)
    gl.uniform1f(uniforms.contrastHigh, this.contrastSettings.high)
    gl.uniform1f(uniforms.contrastGamma, this.contrastSettings.gamma)

    gl.clearColor(0.062, 0.09, 0.15, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const now = performance.now()
    const activeLevel = this.getActiveLevel(camera)
    const targetLevel = getLevelForZoom(
      this.manifest,
      camera.zoom,
      this.transitionToLevelZ ?? this.activeLevelZ ?? undefined
    )

    if (activeLevel.z === targetLevel.z) {
      this.clearTransition()
    } else if (this.transitionToLevelZ !== targetLevel.z) {
      this.startTransition(activeLevel.z, targetLevel.z, now)
    }

    if (activeLevel.z !== targetLevel.z) {
      const prefetchTiles = getVisibleTiles(
        this.manifest,
        targetLevel,
        camera,
        this.viewportWidth,
        this.viewportHeight,
        TARGET_LEVEL_PREFETCH_OVERSCAN
      )

        this.warmTiles(prefetchTiles.tiles)
    }

    const visibleTiles = getVisibleTilesForZoom(
      this.manifest,
      camera,
      this.viewportWidth,
      this.viewportHeight,
      targetLevel.z
    )

    const transitionProgress = this.getTransitionProgress(now)
    const shouldBlendLevels =
      activeLevel.z !== visibleTiles.level.z &&
      this.transitionFromLevelZ === activeLevel.z &&
      this.transitionToLevelZ === visibleTiles.level.z

    if (activeLevel.z !== visibleTiles.level.z) {
      const fallbackTiles = getVisibleTiles(
        this.manifest,
        activeLevel,
        camera,
        this.viewportWidth,
        this.viewportHeight
      )

      this.drawTiles(fallbackTiles.tiles, true, 1)
    }

    const drawnTargetTiles = this.drawTiles(
      visibleTiles.tiles,
      false,
      shouldBlendLevels ? transitionProgress : 1
    )
    const targetReadiness =
      visibleTiles.tiles.length === 0
        ? 1
        : drawnTargetTiles / visibleTiles.tiles.length

    if (
      this.activeLevelZ === null ||
      activeLevel.z === visibleTiles.level.z
    ) {
      this.activeLevelZ = visibleTiles.level.z
    } else if (shouldBlendLevels && transitionProgress >= 1 && targetReadiness >= 1) {
      this.activeLevelZ = visibleTiles.level.z
      this.clearTransition()
    }

    if (shouldBlendLevels && transitionProgress < 1) {
      this.requestRender()
    }

    this.evictOverflowTextures()
    this.onFrameRendered?.(performance.now())
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

  private drawTiles(tiles: VisibleTile[], cachedOnly: boolean, alpha = 1) {
    if (!this.resources) {
      return 0
    }

    const { gl, uniforms } = this.resources
    let drawnTiles = 0

    gl.uniform1f(uniforms.alpha, alpha)

    for (const tile of tiles) {
      const texture = cachedOnly
        ? this.getCachedTexture(tile.rawUrl)
        : this.getOrCreateTexture(tile.rawUrl)

      if (!texture?.texture || !texture.encoding) {
        continue
      }

      gl.uniform1i(
        uniforms.textureEncoding,
        texture.encoding === 'float'
          ? TEXTURE_ENCODING_FLOAT
          : TEXTURE_ENCODING_PACKED_UINT16
      )
      gl.bindTexture(gl.TEXTURE_2D, texture.texture)

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
      drawnTiles += 1
    }

    return drawnTiles
  }

  private warmTiles(tiles: VisibleTile[]) {
    for (const tile of tiles) {
      this.getOrCreateTexture(tile.rawUrl)
    }
  }

  private startTransition(fromLevelZ: number, toLevelZ: number, now: number) {
    this.transitionFromLevelZ = fromLevelZ
    this.transitionToLevelZ = toLevelZ
    this.transitionStartTime = now
  }

  private clearTransition() {
    this.transitionFromLevelZ = null
    this.transitionToLevelZ = null
    this.transitionStartTime = 0
  }

  private getTransitionProgress(now: number) {
    if (this.transitionToLevelZ === null || this.transitionStartTime === 0) {
      return 1
    }

    return Math.min(
      Math.max((now - this.transitionStartTime) / LEVEL_CROSSFADE_DURATION_MS, 0),
      1
    )
  }

  private getActiveLevel(camera: TileCamera) {
    if (this.activeLevelZ !== null) {
      const currentLevel = this.findLevelByZ(this.activeLevelZ)

      if (currentLevel) {
        return currentLevel
      }
    }

    const fallbackLevel = getLevelForZoom(this.manifest, camera.zoom)
    this.activeLevelZ = fallbackLevel.z

    return fallbackLevel
  }

  private findLevelByZ(z: number): TilePyramidLevel | null {
    return this.manifest.levels.find((level) => level.z === z) ?? null
  }

  private getCachedTexture(url: string): TileTextureRecord | null {
    const cached = this.textureCache.get(url)

    if (cached?.status !== 'ready') {
      return null
    }

    this.textureCache.delete(url)
    this.textureCache.set(url, cached)

    return cached
  }

  private getOrCreateTexture(url: string): TileTextureRecord | null {
    if (!this.resources) {
      return null
    }

    const cached = this.textureCache.get(url)

    if (cached?.status === 'ready') {
      this.textureCache.delete(url)
      this.textureCache.set(url, cached)
      return cached
    }

    if (cached) {
      return null
    }

    this.textureCache.set(url, {
      status: 'loading',
      texture: null,
      encoding: null
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
          RAW_TILE_SIZE,
          this.resources.textureSupport
        )

        this.textureCache.set(url, {
          status: texture ? 'ready' : 'error',
          texture: texture?.texture ?? null,
          encoding: texture?.encoding ?? null
        })
        this.requestRender()
      })
      .catch(() => {
        this.textureCache.set(url, {
          status: 'error',
          texture: null,
          encoding: null
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
        this.render(this.lastCamera, this.contrastSettings)
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

function createFloatTextureFromRawTile(
  gl: WebGLRenderingContext,
  rawData: Uint16Array,
  tileSize: number,
  useLinearFiltering: boolean
) {
  const texture = gl.createTexture()

  if (!texture) {
    return null
  }

  const normalizedData = new Float32Array(tileSize * tileSize)

  for (let index = 0; index < rawData.length; index += 1) {
    normalizedData[index] = rawData[index] / UINT16_MAX_VALUE
  }

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    useLinearFiltering ? gl.LINEAR : gl.NEAREST
  )
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    useLinearFiltering ? gl.LINEAR : gl.NEAREST
  )
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    tileSize,
    tileSize,
    0,
    gl.LUMINANCE,
    gl.FLOAT,
    normalizedData
  )

  return texture
}

function createPackedUint16TextureFromRawTile(
  gl: WebGLRenderingContext,
  rawData: Uint16Array,
  tileSize: number
) {
  const texture = gl.createTexture()

  if (!texture) {
    return null
  }

  const packedData = new Uint8Array(tileSize * tileSize * 4)

  for (let index = 0; index < rawData.length; index += 1) {
    const value = rawData[index]
    const rgbaIndex = index * 4

    packedData[rgbaIndex] = value >> 8
    packedData[rgbaIndex + 1] = value & 255
    packedData[rgbaIndex + 2] = 0
    packedData[rgbaIndex + 3] = 255
  }

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    tileSize,
    tileSize,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    packedData
  )

  return texture
}

function createTextureFromRawTile(
  gl: WebGLRenderingContext,
  rawData: Uint16Array,
  tileSize: number,
  textureSupport: RawTextureSupport
) {
  if (textureSupport.preferEncoding === 'float') {
    const texture = createFloatTextureFromRawTile(
      gl,
      rawData,
      tileSize,
      textureSupport.floatLinear
    )

    if (texture) {
      return {
        texture,
        encoding: 'float' as const
      }
    }
  }

  const texture = createPackedUint16TextureFromRawTile(gl, rawData, tileSize)

  if (!texture) {
    return null
  }

  return {
    texture,
    encoding: 'packed-uint16' as const
  }
}

function resolveRawTextureSupport(gl: WebGLRenderingContext): RawTextureSupport {
  const floatTextures = gl.getExtension('OES_texture_float')
  const floatLinear = Boolean(gl.getExtension('OES_texture_float_linear'))

  return {
    preferEncoding: floatTextures ? 'float' : 'packed-uint16',
    floatLinear
  }
}

function sanitizeContrastSettings(
  settings: TileContrastSettings
): TileContrastSettings {
  const low = clamp01(settings.low)
  const high = Math.max(clamp01(settings.high), low + 0.00001)

  return {
    low,
    high,
    gamma: Math.max(settings.gamma, 0.00001)
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
