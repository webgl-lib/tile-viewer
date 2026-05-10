precision mediump float;

uniform sampler2D u_Sampler;
uniform float u_ContrastLow;
uniform float u_ContrastHigh;
uniform float u_ContrastGamma;
uniform int u_TextureEncoding;

varying vec2 v_TexCoord;
varying float v_Alpha;

const int TEXTURE_ENCODING_PACKED_UINT16 = 1;

float readRawValue(vec2 texCoord) {
  vec4 sampleValue = texture2D(u_Sampler, texCoord);

  if (u_TextureEncoding == TEXTURE_ENCODING_PACKED_UINT16) {
    float highByte = floor(sampleValue.r * 255.0 + 0.5);
    float lowByte = floor(sampleValue.g * 255.0 + 0.5);

    return ((highByte * 256.0) + lowByte) / 65535.0;
  }

  return sampleValue.r;
}

void main() {
  float rawValue = readRawValue(v_TexCoord);
  float contrastRange = max(u_ContrastHigh - u_ContrastLow, 0.00001);
  float value = clamp((rawValue - u_ContrastLow) / contrastRange, 0.0, 1.0);
  float correctedValue = pow(value, 1.0 / max(u_ContrastGamma, 0.00001));

  gl_FragColor = vec4(vec3(correctedValue), v_Alpha);
}
