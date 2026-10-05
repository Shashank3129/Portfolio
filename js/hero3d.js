// WebGL hero: a liquid-metal form with an orbiting dust ring.
// Follows the pointer, swells with scroll speed, and re-tints on theme change.
import * as THREE from './vendor/three.module.min.js';

const host = document.getElementById('hero-canvas');
const hero = document.querySelector('.hero');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = (window.portfolio = window.portfolio || { heroProgress: 0, velocity: 0, introAt: 0 });

const NOISE = /* glsl */ `
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const blobVertex = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
varying vec3 vNormal;
varying vec3 vViewPos;
varying float vDisp;
${NOISE}
float field(vec3 n){
    return snoise(n * uFreq + vec3(uTime * 0.2, uTime * 0.13, 0.0)) * 0.82
         + snoise(n * uFreq * 2.0 - vec3(0.0, uTime * 0.26, uTime * 0.1)) * 0.18;
}
vec3 displaced(vec3 n){ return n * (1.0 + uAmp * field(n)); }
void main(){
    vec3 n = normalize(position);
    vec3 helper = abs(n.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 t = normalize(cross(n, helper));
    vec3 b = normalize(cross(n, t));
    float e = 0.012;
    vec3 p0 = displaced(n);
    vec3 p1 = displaced(normalize(n + t * e));
    vec3 p2 = displaced(normalize(n + b * e));
    vec3 nn = normalize(cross(p1 - p0, p2 - p0));
    if (dot(nn, n) < 0.0) nn = -nn;
    vDisp = field(n);
    vNormal = normalize(normalMatrix * nn);
    vec4 mv = modelViewMatrix * vec4(p0, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
}`;

const blobFragment = /* glsl */ `
uniform vec3 uAccent;
uniform vec3 uDeep;
uniform vec3 uSky;
uniform float uLight;
varying vec3 vNormal;
varying vec3 vViewPos;
varying float vDisp;
void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vViewPos);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    vec3 R = reflect(-V, N);

    // A soft studio: deep floor, pale ceiling, an amber horizon band and two softboxes
    vec3 env = mix(uDeep, uSky, smoothstep(-0.55, 0.95, R.y));
    env += uAccent * 1.4 * exp(-pow((R.y + 0.08) * 6.0, 2.0));
    env += uSky * 1.1 * smoothstep(0.86, 0.97, dot(R, normalize(vec3(-0.55, 0.65, 0.5))));
    env += uAccent * 0.8 * smoothstep(0.9, 0.99, dot(R, normalize(vec3(0.85, -0.15, 0.45))));

    vec3 tint = mix(vec3(1.0), uAccent * 1.2 + 0.08, 0.85);
    vec3 col = env * tint;
    float fres = pow(1.0 - ndv, 3.0);
    col = mix(col, env * 1.1, fres * 0.7);
    col += uAccent * smoothstep(0.2, 0.9, vDisp) * 0.18;

    // Gentle tone curve so highlights roll off instead of clipping
    col = col / (col + vec3(0.75)) * 1.7;
    col = mix(col, col * 0.92 + 0.04, uLight);
    gl_FragColor = vec4(col, 1.0);
}`;

const dustVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPR;
attribute float aRand;
varying float vAlpha;
void main(){
    vec3 p = position;
    float a = uTime * (0.05 + aRand * 0.06);
    float c = cos(a), s = sin(a);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.y += sin(uTime * 0.6 + aRand * 20.0) * 0.04;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPR * (0.4 + aRand) * (1.0 / -mv.z);
    vAlpha = 0.25 + 0.75 * fract(aRand * 7.31);
    gl_Position = projectionMatrix * mv;
}`;

const dustFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vAlpha * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
}`;

function cssColor(name) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return new THREE.Color(value || '#ffffff');
}

function init() {
    if (!host) return;
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
        return; // No WebGL: the CSS fallback orb stays
    }
    THREE.ColorManagement.enabled = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const pr = Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2);
    renderer.setPixelRatio(pr);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    hero.classList.add('has-webgl');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    const group = new THREE.Group();
    scene.add(group);

    const blobUniforms = {
        uTime: { value: 0 },
        uAmp: { value: 0 },
        uFreq: { value: 0.95 },
        uAccent: { value: new THREE.Color() },
        uDeep: { value: new THREE.Color() },
        uSky: { value: new THREE.Color() },
        uLight: { value: 0 },
    };
    const blob = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, small ? 40 : 72),
        new THREE.ShaderMaterial({ uniforms: blobUniforms, vertexShader: blobVertex, fragmentShader: blobFragment })
    );
    group.add(blob);

    // Dust ring: a tilted disc of points plus a sparse outer shell
    const count = small ? 900 : 1800;
    const positions = new Float32Array(count * 3);
    const rands = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const r = Math.random();
        let x, y, z;
        if (i < count * 0.72) {
            const radius = 1.75 + Math.pow(Math.random(), 1.6) * 1.1;
            const a = Math.random() * Math.PI * 2;
            x = Math.cos(a) * radius;
            z = Math.sin(a) * radius;
            y = (Math.random() - 0.5) * 0.12;
        } else {
            const u = Math.random() * 2 - 1;
            const a = Math.random() * Math.PI * 2;
            const radius = 2.4 + Math.random() * 2.2;
            const s = Math.sqrt(1 - u * u);
            x = Math.cos(a) * s * radius;
            y = u * radius;
            z = Math.sin(a) * s * radius;
        }
        positions.set([x, y, z], i * 3);
        rands[i] = r;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute('aRand', new THREE.BufferAttribute(rands, 1));
    const dustUniforms = {
        uTime: { value: 0 },
        uSize: { value: small ? 26 : 34 },
        uPR: { value: pr },
        uColor: { value: new THREE.Color() },
        uOpacity: { value: 0 },
    };
    const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
        uniforms: dustUniforms,
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        transparent: true,
        depthWrite: false,
    }));
    dust.rotation.set(0.42, 0, -0.22);
    group.add(dust);

    function applyTheme() {
        const light = document.documentElement.getAttribute('data-theme') === 'light';
        blobUniforms.uAccent.value.copy(cssColor('--accent'));
        if (light) {
            blobUniforms.uAccent.value.set('#d9902a');
            blobUniforms.uDeep.value.set('#5f7a6c');
            blobUniforms.uSky.value.set('#fbfaf6');
        } else {
            blobUniforms.uDeep.value.set('#0b0d0b');
            blobUniforms.uSky.value.set('#f6ecd8');
        }
        blobUniforms.uLight.value = light ? 1 : 0;
        dustUniforms.uColor.value.copy(cssColor('--fg'));
        render();
    }

    // Layout: right side on wide screens, top centre on phones
    let baseX = 0, baseY = 0, baseScale = 1;
    function resize() {
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const visW = visH * camera.aspect;
        if (camera.aspect < 0.9) {
            baseScale = Math.min(0.9, (visW * 0.3) / 1.25);
            baseX = 0;
            baseY = visH * 0.25;
        } else {
            baseScale = Math.min(1.05, (visH * 0.3) / 1.25);
            baseX = visW * 0.22;
            baseY = visH * 0.08;
        }
        render();
    }

    // Pointer, eased
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', (e) => {
        pointer.tx = (e.clientX / innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    let introStart = null;
    const introDuration = 2200;
    const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    function introAmount(now) {
        if (reduce) return 1;
        if (introStart === null) {
            if (state.introAt) introStart = state.introAt;
            else if (!document.documentElement.classList.contains('is-loading')) introStart = now;
            else return 0;
        }
        return easeOutExpo(Math.min(1, (now - introStart) / introDuration));
    }

    let time = 0, last = performance.now(), swell = 0;
    function render(now = performance.now()) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!reduce) time += dt;

        const intro = introAmount(now);
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        const speed = Math.min(Math.abs(state.velocity || 0) / 3000, 1);
        swell += (speed - swell) * 0.08;
        const p = state.heroProgress || 0;

        blobUniforms.uTime.value = time;
        dustUniforms.uTime.value = time;
        blobUniforms.uAmp.value = (0.17 + swell * 0.2 + Math.abs(pointer.x) * 0.04) * intro;
        dustUniforms.uOpacity.value = intro * (1 - p * 0.6);

        const s = baseScale * (0.55 + 0.45 * intro) * (1 - p * 0.25);
        group.scale.setScalar(s);
        group.position.set(baseX + pointer.x * 0.18, baseY - pointer.y * 0.12 + p * 1.6, 0);
        blob.rotation.y = time * 0.18 + pointer.x * 0.5;
        blob.rotation.x = pointer.y * 0.35 + p * 0.8;
        dust.rotation.y = pointer.x * 0.25;

        renderer.render(scene, camera);
    }

    let visible = true;
    let rafId = 0;
    function loop(now) {
        rafId = 0;
        if (!visible || document.hidden) return;
        render(now);
        rafId = requestAnimationFrame(loop);
    }
    function start() {
        if (reduce || rafId) return;
        last = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    document.addEventListener('themechange', applyTheme);
    new ResizeObserver(resize).observe(host);

    applyTheme();
    resize();
    start();
}

init();
