import type { TileGrid } from '@/entities/tile'
import type { TileCamera } from '@/features/tile-camera'
import { Matrix4 } from '@/shared/lib/math/matrix4'
import { createProgram } from '@/shared/lib/webgl/create-program'

import { createAtlasTexture } from './create-atlas-texture'
import fragmentShaderSource from './shaders/tiles.frag?raw'
import vertexShaderSource from './shaders/tiles.vert?raw'

type RendererResources = {
  gl: WebGLRenderingContext
  program: WebGLProgram
  vertexBuffer: WebGLBuffer
  texture: WebGLTexture
  attributes: {
    position: number
    texCoord: number
  }
  uniforms: {
    sampler: WebGLUniformLocation
    viewProjection: WebGLUniformLocation
  }
}

export class TileMapRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly tileGrid: TileGrid
  private resources: RendererResources | null = null
  private viewportWidth = 1
  private viewportHeight = 1

  constructor(canvas: HTMLCanvasElement, tileGrid: TileGrid) {
    this.canvas = canvas
    this.tileGrid = tileGrid
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

    const texture = createAtlasTexture(gl)
    if (!texture) {
      throw new Error('Failed to create atlas texture')
    }

    gl.useProgram(program)

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.tileGrid.vertexData, gl.STATIC_DRAW)

    const position = gl.getAttribLocation(program, 'a_Position')
    const texCoord = gl.getAttribLocation(program, 'a_TexCoord')
    const sampler = gl.getUniformLocation(program, 'u_Sampler')
    const viewProjection = gl.getUniformLocation(program, 'u_ViewProjection')

    if (
      position < 0 ||
      texCoord < 0 ||
      !sampler ||
      !viewProjection
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
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(sampler, 0)

    this.resources = {
      gl,
      program,
      vertexBuffer,
      texture,
      attributes: {
        position,
        texCoord
      },
      uniforms: {
        sampler,
        viewProjection
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

    gl.drawArrays(gl.TRIANGLES, 0, this.tileGrid.vertexCount)
  }

  destroy() {
    if (!this.resources) {
      return
    }

    const { gl, program, texture, vertexBuffer } = this.resources

    gl.deleteTexture(texture)
    gl.deleteBuffer(vertexBuffer)
    gl.deleteProgram(program)

    this.resources = null
  }
}
