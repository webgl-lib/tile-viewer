attribute vec2 a_Position;
attribute vec2 a_TexCoord;

uniform mat4 u_ViewProjection;
uniform mat4 u_Model;
uniform vec2 u_TexCoordScale;

varying vec2 v_TexCoord;

void main() {
  gl_Position = u_ViewProjection * u_Model * vec4(a_Position, 0.0, 1.0);
  v_TexCoord = a_TexCoord * u_TexCoordScale;
}
