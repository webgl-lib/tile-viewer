export class Vector3 {
  elements: Float32Array

  constructor(optSrc?: number[] | Float32Array) {
    const vector = new Float32Array(3)

    if (optSrc) {
      vector[0] = optSrc[0]
      vector[1] = optSrc[1]
      vector[2] = optSrc[2]
    }

    this.elements = vector
  }
}
