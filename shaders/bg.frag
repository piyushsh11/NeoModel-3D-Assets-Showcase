precision highp float;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
varying vec2 vUv;
float sdGrid(vec2 p, float s){
  vec2 a = abs(fract(p/s - 0.5) - 0.5) * s;
  float g = min(a.x, a.y);
  return g;
}
float star(vec2 p){
  float d = length(p);
  float m = smoothstep(0.02, 0.0, d);
  return m;
}
void main(){
  vec2 uv = (gl_FragCoord.xy / uResolution.xy);
  vec2 q = uv*2.0-1.0;
  q.x *= uResolution.x/uResolution.y;
  float t = uTime*0.25;
  float grid = smoothstep(0.015, 0.0, sdGrid(q*8.0 + vec2(t*0.6, t*0.3), 0.25));
  float glow = grid*0.6;
  vec2 m = uMouse*0.6;
  float s = star(q - m)*0.8 + star(q + m*0.6)*0.5;
  vec3 col = vec3(0.04,0.06,0.10) + vec3(0.2,0.4,0.8)*glow + vec3(0.2,1.0,1.0)*s*0.8;
  gl_FragColor = vec4(col,1.0);
}
