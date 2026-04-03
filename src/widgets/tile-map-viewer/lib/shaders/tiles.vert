attribute vec2 a_Position;
attribute vec2 a_TexCoord;

uniform mat4 u_ViewProjection;

varying vec2 v_TexCoord;

void main() {
  gl_Position = u_ViewProjection * vec4(a_Position, 0.0, 1.0);
  v_TexCoord = a_TexCoord;
}
