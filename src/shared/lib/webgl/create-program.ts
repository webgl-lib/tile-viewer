import { loadShader } from './load-shader'

export function createProgram(
  gl: WebGLRenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string
): WebGLProgram | null {
  const vertexShader = loadShader(
    gl,
    gl.VERTEX_SHADER,
    vertexShaderSource
  )
  const fragmentShader = loadShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  )

  if (!vertexShader || !fragmentShader) {
    return null
  }

  const program = gl.createProgram()
  if (!program) {
    return null
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  const isLinked = Boolean(gl.getProgramParameter(program, gl.LINK_STATUS))

  if (!isLinked) {
    const error = gl.getProgramInfoLog(program)
    console.error('Failed to link program:', error)

    gl.deleteProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    return null
  }

  return program
}
