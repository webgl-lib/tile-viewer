precision mediump float;

uniform sampler2D u_Sampler;

varying vec2 v_TexCoord;
varying float v_Alpha;

void main() {
  vec4 color = texture2D(u_Sampler, v_TexCoord);
  gl_FragColor = vec4(color.rgb, color.a * v_Alpha);
}
