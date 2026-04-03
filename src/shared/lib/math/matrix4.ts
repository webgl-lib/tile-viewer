import { Vector3 } from './vector3'
import { Vector4 } from './vector4'

export class Matrix4 {
  elements: Float32Array

  constructor(optSrc?: Matrix4) {
    if (optSrc?.elements) {
      const source = optSrc.elements
      const destination = new Float32Array(16)

      for (let index = 0; index < 16; index += 1) {
        destination[index] = source[index]
      }

      this.elements = destination
      return
    }

    this.elements = new Float32Array([
      1, 0, 0, 0, 
      0, 1, 0, 0, 
      0, 0, 1, 0, 
      0, 0, 0, 1
    ])
  }

  setIdentity(): this {
    const e = this.elements

    e[0] = 1
    e[1] = 0
    e[2] = 0
    e[3] = 0

    e[4] = 0
    e[5] = 1
    e[6] = 0
    e[7] = 0

    e[8] = 0
    e[9] = 0
    e[10] = 1
    e[11] = 0

    e[12] = 0
    e[13] = 0
    e[14] = 0
    e[15] = 1

    return this
  }

  set(source: Matrix4): this {
    const src = source.elements
    const destination = this.elements

    if (src === destination) {
      return this
    }

    for (let index = 0; index < 16; index += 1) {
      destination[index] = src[index]
    }

    return this
  }

  concat(other: Matrix4): this {
    const e = this.elements
    const a = this.elements
    let b = other.elements

    if (e === b) {
      b = new Float32Array(16)

      for (let index = 0; index < 16; index += 1) {
        b[index] = e[index]
      }
    }

    for (let index = 0; index < 4; index += 1) {
      const ai0 = a[index]
      const ai1 = a[index + 4]
      const ai2 = a[index + 8]
      const ai3 = a[index + 12]

      e[index] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3]
      e[index + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7]
      e[index + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11]
      e[index + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15]
    }

    return this
  }

  multiplyVector3(vector: Vector3): Vector3 {
    const e = this.elements
    const p = vector.elements
    const result = new Vector3()
    const target = result.elements

    target[0] = p[0] * e[0] + p[1] * e[4] + p[2] * e[8] + e[12]
    target[1] = p[0] * e[1] + p[1] * e[5] + p[2] * e[9] + e[13]
    target[2] = p[0] * e[2] + p[1] * e[6] + p[2] * e[10] + e[14]

    return result
  }

  multiplyVector4(vector: Vector4): Vector4 {
    const e = this.elements
    const p = vector.elements
    const result = new Vector4()
    const target = result.elements

    target[0] = p[0] * e[0] + p[1] * e[4] + p[2] * e[8] + p[3] * e[12]
    target[1] = p[0] * e[1] + p[1] * e[5] + p[2] * e[9] + p[3] * e[13]
    target[2] = p[0] * e[2] + p[1] * e[6] + p[2] * e[10] + p[3] * e[14]
    target[3] = p[0] * e[3] + p[1] * e[7] + p[2] * e[11] + p[3] * e[15]

    return result
  }

  transpose(): this {
    const e = this.elements

    let temporary = e[1]
    e[1] = e[4]
    e[4] = temporary

    temporary = e[2]
    e[2] = e[8]
    e[8] = temporary

    temporary = e[3]
    e[3] = e[12]
    e[12] = temporary

    temporary = e[6]
    e[6] = e[9]
    e[9] = temporary

    temporary = e[7]
    e[7] = e[13]
    e[13] = temporary

    temporary = e[11]
    e[11] = e[14]
    e[14] = temporary

    return this
  }

  setInverseOf(other: Matrix4): this {
    const source = other.elements
    const destination = this.elements
    const inverse = new Float32Array(16)

    inverse[0] =
      source[5] * source[10] * source[15] -
      source[5] * source[11] * source[14] -
      source[9] * source[6] * source[15] +
      source[9] * source[7] * source[14] +
      source[13] * source[6] * source[11] -
      source[13] * source[7] * source[10]
    inverse[4] =
      -source[4] * source[10] * source[15] +
      source[4] * source[11] * source[14] +
      source[8] * source[6] * source[15] -
      source[8] * source[7] * source[14] -
      source[12] * source[6] * source[11] +
      source[12] * source[7] * source[10]
    inverse[8] =
      source[4] * source[9] * source[15] -
      source[4] * source[11] * source[13] -
      source[8] * source[5] * source[15] +
      source[8] * source[7] * source[13] +
      source[12] * source[5] * source[11] -
      source[12] * source[7] * source[9]
    inverse[12] =
      -source[4] * source[9] * source[14] +
      source[4] * source[10] * source[13] +
      source[8] * source[5] * source[14] -
      source[8] * source[6] * source[13] -
      source[12] * source[5] * source[10] +
      source[12] * source[6] * source[9]

    inverse[1] =
      -source[1] * source[10] * source[15] +
      source[1] * source[11] * source[14] +
      source[9] * source[2] * source[15] -
      source[9] * source[3] * source[14] -
      source[13] * source[2] * source[11] +
      source[13] * source[3] * source[10]
    inverse[5] =
      source[0] * source[10] * source[15] -
      source[0] * source[11] * source[14] -
      source[8] * source[2] * source[15] +
      source[8] * source[3] * source[14] +
      source[12] * source[2] * source[11] -
      source[12] * source[3] * source[10]
    inverse[9] =
      -source[0] * source[9] * source[15] +
      source[0] * source[11] * source[13] +
      source[8] * source[1] * source[15] -
      source[8] * source[3] * source[13] -
      source[12] * source[1] * source[11] +
      source[12] * source[3] * source[9]
    inverse[13] =
      source[0] * source[9] * source[14] -
      source[0] * source[10] * source[13] -
      source[8] * source[1] * source[14] +
      source[8] * source[2] * source[13] +
      source[12] * source[1] * source[10] -
      source[12] * source[2] * source[9]

    inverse[2] =
      source[1] * source[6] * source[15] -
      source[1] * source[7] * source[14] -
      source[5] * source[2] * source[15] +
      source[5] * source[3] * source[14] +
      source[13] * source[2] * source[7] -
      source[13] * source[3] * source[6]
    inverse[6] =
      -source[0] * source[6] * source[15] +
      source[0] * source[7] * source[14] +
      source[4] * source[2] * source[15] -
      source[4] * source[3] * source[14] -
      source[12] * source[2] * source[7] +
      source[12] * source[3] * source[6]
    inverse[10] =
      source[0] * source[5] * source[15] -
      source[0] * source[7] * source[13] -
      source[4] * source[1] * source[15] +
      source[4] * source[3] * source[13] +
      source[12] * source[1] * source[7] -
      source[12] * source[3] * source[5]
    inverse[14] =
      -source[0] * source[5] * source[14] +
      source[0] * source[6] * source[13] +
      source[4] * source[1] * source[14] -
      source[4] * source[2] * source[13] -
      source[12] * source[1] * source[6] +
      source[12] * source[2] * source[5]

    inverse[3] =
      -source[1] * source[6] * source[11] +
      source[1] * source[7] * source[10] +
      source[5] * source[2] * source[11] -
      source[5] * source[3] * source[10] -
      source[9] * source[2] * source[7] +
      source[9] * source[3] * source[6]
    inverse[7] =
      source[0] * source[6] * source[11] -
      source[0] * source[7] * source[10] -
      source[4] * source[2] * source[11] +
      source[4] * source[3] * source[10] +
      source[8] * source[2] * source[7] -
      source[8] * source[3] * source[6]
    inverse[11] =
      -source[0] * source[5] * source[11] +
      source[0] * source[7] * source[9] +
      source[4] * source[1] * source[11] -
      source[4] * source[3] * source[9] -
      source[8] * source[1] * source[7] +
      source[8] * source[3] * source[5]
    inverse[15] =
      source[0] * source[5] * source[10] -
      source[0] * source[6] * source[9] -
      source[4] * source[1] * source[10] +
      source[4] * source[2] * source[9] +
      source[8] * source[1] * source[6] -
      source[8] * source[2] * source[5]

    let determinant =
      source[0] * inverse[0] +
      source[1] * inverse[4] +
      source[2] * inverse[8] +
      source[3] * inverse[12]

    if (determinant === 0) {
      return this
    }

    determinant = 1 / determinant

    for (let index = 0; index < 16; index += 1) {
      destination[index] = inverse[index] * determinant
    }

    return this
  }

  invert(): this {
    return this.setInverseOf(this)
  }

  setOrtho(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): this {
    if (left === right || bottom === top || near === far) {
      throw new Error('null frustum')
    }

    const rw = 1 / (right - left)
    const rh = 1 / (top - bottom)
    const rd = 1 / (far - near)

    const e = this.elements

    e[0] = 2 * rw
    e[1] = 0
    e[2] = 0
    e[3] = 0

    e[4] = 0
    e[5] = 2 * rh
    e[6] = 0
    e[7] = 0

    e[8] = 0
    e[9] = 0
    e[10] = -2 * rd
    e[11] = 0

    e[12] = -(right + left) * rw
    e[13] = -(top + bottom) * rh
    e[14] = -(far + near) * rd
    e[15] = 1

    return this
  }

  ortho(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): this {
    return this.concat(
      new Matrix4().setOrtho(left, right, bottom, top, near, far)
    )
  }

  setPerspective(
    fovy: number,
    aspect: number,
    near: number,
    far: number
  ): this {
    if (near === far || aspect === 0) {
      throw new Error('null frustum')
    }

    if (near <= 0) {
      throw new Error('near <= 0')
    }

    if (far <= 0) {
      throw new Error('far <= 0')
    }

    const halfFovy = (Math.PI * fovy) / 180 / 2
    const sine = Math.sin(halfFovy)

    if (sine === 0) {
      throw new Error('null frustum')
    }

    const rd = 1 / (far - near)
    const cotangent = Math.cos(halfFovy) / sine
    const e = this.elements

    e[0] = cotangent / aspect
    e[1] = 0
    e[2] = 0
    e[3] = 0

    e[4] = 0
    e[5] = cotangent
    e[6] = 0
    e[7] = 0

    e[8] = 0
    e[9] = 0
    e[10] = -(far + near) * rd
    e[11] = -1

    e[12] = 0
    e[13] = 0
    e[14] = -2 * near * far * rd
    e[15] = 0

    return this
  }

  perspective(
    fovy: number,
    aspect: number,
    near: number,
    far: number
  ): this {
    return this.concat(
      new Matrix4().setPerspective(fovy, aspect, near, far)
    )
  }

  setScale(x: number, y: number, z: number): this {
    const e = this.elements

    e[0] = x
    e[1] = 0
    e[2] = 0
    e[3] = 0

    e[4] = 0
    e[5] = y
    e[6] = 0
    e[7] = 0

    e[8] = 0
    e[9] = 0
    e[10] = z
    e[11] = 0

    e[12] = 0
    e[13] = 0
    e[14] = 0
    e[15] = 1

    return this
  }

  scale(x: number, y: number, z: number): this {
    const e = this.elements

    e[0] *= x
    e[1] *= x
    e[2] *= x
    e[3] *= x

    e[4] *= y
    e[5] *= y
    e[6] *= y
    e[7] *= y

    e[8] *= z
    e[9] *= z
    e[10] *= z
    e[11] *= z

    return this
  }

  setTranslate(x: number, y: number, z: number): this {
    const e = this.elements

    e[0] = 1
    e[1] = 0
    e[2] = 0
    e[3] = 0

    e[4] = 0
    e[5] = 1
    e[6] = 0
    e[7] = 0

    e[8] = 0
    e[9] = 0
    e[10] = 1
    e[11] = 0

    e[12] = x
    e[13] = y
    e[14] = z
    e[15] = 1

    return this
  }

  translate(x: number, y: number, z: number): this {
    const e = this.elements

    e[12] += e[0] * x + e[4] * y + e[8] * z
    e[13] += e[1] * x + e[5] * y + e[9] * z
    e[14] += e[2] * x + e[6] * y + e[10] * z
    e[15] += e[3] * x + e[7] * y + e[11] * z

    return this
  }

  setRotate(angle: number, x: number, y: number, z: number): this {
    const e = this.elements

    const radianAngle = (Math.PI * angle) / 180
    const sine = Math.sin(radianAngle)
    const cosine = Math.cos(radianAngle)

    if (x !== 0 && y === 0 && z === 0) {
      if (x < 0) {
        return this.setRotate(angle, -x, -y, -z)
      }

      e[0] = 1
      e[1] = 0
      e[2] = 0
      e[3] = 0

      e[4] = 0
      e[5] = cosine
      e[6] = sine
      e[7] = 0

      e[8] = 0
      e[9] = -sine
      e[10] = cosine
      e[11] = 0

      e[12] = 0
      e[13] = 0
      e[14] = 0
      e[15] = 1

      return this
    }

    if (y !== 0 && x === 0 && z === 0) {
      if (y < 0) {
        return this.setRotate(angle, -x, -y, -z)
      }

      e[0] = cosine
      e[1] = 0
      e[2] = -sine
      e[3] = 0

      e[4] = 0
      e[5] = 1
      e[6] = 0
      e[7] = 0

      e[8] = sine
      e[9] = 0
      e[10] = cosine
      e[11] = 0

      e[12] = 0
      e[13] = 0
      e[14] = 0
      e[15] = 1

      return this
    }

    if (z !== 0 && x === 0 && y === 0) {
      if (z < 0) {
        return this.setRotate(angle, -x, -y, -z)
      }

      e[0] = cosine
      e[1] = sine
      e[2] = 0
      e[3] = 0

      e[4] = -sine
      e[5] = cosine
      e[6] = 0
      e[7] = 0

      e[8] = 0
      e[9] = 0
      e[10] = 1
      e[11] = 0

      e[12] = 0
      e[13] = 0
      e[14] = 0
      e[15] = 1

      return this
    }

    let length = Math.sqrt(x * x + y * y + z * z)

    if (length !== 1) {
      const normalizedLength = 1 / length
      x *= normalizedLength
      y *= normalizedLength
      z *= normalizedLength
    }

    const nc = 1 - cosine
    const xy = x * y
    const yz = y * z
    const zx = z * x
    const xs = x * sine
    const ys = y * sine
    const zs = z * sine

    e[0] = x * x * nc + cosine
    e[1] = xy * nc + zs
    e[2] = zx * nc - ys
    e[3] = 0

    e[4] = xy * nc - zs
    e[5] = y * y * nc + cosine
    e[6] = yz * nc + xs
    e[7] = 0

    e[8] = zx * nc + ys
    e[9] = yz * nc - xs
    e[10] = z * z * nc + cosine
    e[11] = 0

    e[12] = 0
    e[13] = 0
    e[14] = 0
    e[15] = 1

    return this
  }

  rotate(angle: number, x: number, y: number, z: number): this {
    return this.concat(new Matrix4().setRotate(angle, x, y, z))
  }
}
