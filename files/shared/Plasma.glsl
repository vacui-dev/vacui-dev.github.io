// Basic Plasma Shader
uniform float time;
varying vec2 vUv;

void main() {
    vec2 p = vUv * 8.0 - 4.0;
    float v = sin(p.x + time);
    v += sin(p.y + time) / 2.0;
    v += sin(p.x + p.y + time) / 2.0;
    vec3 col = vec3(sin(v * 3.14), sin(v * 3.14 + 2.0), sin(v * 3.14 + 4.0));
    gl_FragColor = vec4(col * 0.5 + 0.5, 1.0);
}