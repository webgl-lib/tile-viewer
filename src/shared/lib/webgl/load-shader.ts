export function loadShader(
  gl: WebGLRenderingContext,
  type: typeof gl.VERTEX_SHADER | typeof gl.FRAGMENT_SHADER,
  source: string
): WebGLShader | null {
  if (!source.trim()) {
    console.error('Shader source is empty')
    return null
  }

  const shader = gl.createShader(type)
  if (!shader) {
    console.error('Failed to create shader')
    return null
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  const isCompiled = Boolean(gl.getShaderParameter(shader, gl.COMPILE_STATUS))
  if (!isCompiled) {
    const error = gl.getShaderInfoLog(shader)
    console.error('Failed to compile shader:', error)
    gl.deleteShader(shader)
    return null
  }

  return shader
}
