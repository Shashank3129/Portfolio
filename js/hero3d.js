// WebGL hero: a slowly morphing pearl in a soft studio, with two small satellites.
// It rises and grows as the hero scrolls, leans toward the pointer, and re-tints on theme change.
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

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
}
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
float pearlField(vec3 n){
    return snoise(n * uFreq + vec3(uTime * 0.16, uTime * 0.11, 0.0)) * 0.85
         + snoise(n * uFreq * 1.9 - vec3(0.0, uTime * 0.2, uTime * 0.08)) * 0.15;
}
vec3 pearlDisplaced(vec3 n){ return n * (1.0 + uAmp * pearlField(n)); }
`;

function cssColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return new THREE.Color(value || fallback);
}

function shadowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(20, 28, 60, 0.55)');
    grad.addColorStop(0.45, 'rgba(20, 28, 60, 0.18)');
    grad.addColorStop(1, 'rgba(20, 28, 60, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

function init() {
    if (!host) return;
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
        return; // No WebGL: the CSS fallback pearl stays
    }
    const small = window.matchMedia('(max-width: 767px)').matches;
    const pr = Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2);
    renderer.setPixelRatio(pr);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    hero.classList.add('has-webgl');

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    // Accent rim light from behind, soft key from the top left
    const rim = new THREE.DirectionalLight(0xffffff, 2.2);
    rim.position.set(-3, 1.5, -3);
    scene.add(rim);
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(-2, 3, 4);
    scene.add(key);

    const group = new THREE.Group();
    scene.add(group);

    // The pearl
    const uniforms = { uTime: { value: 0 }, uAmp: { value: 0.1 }, uFreq: { value: 0.85 } };
    const pearlMat = new THREE.MeshPhysicalMaterial({
        color: 0xeef1fa,
        roughness: 0.08,
        metalness: 0.0,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        iridescence: 0.7,
        iridescenceIOR: 1.32,
        iridescenceThicknessRange: [180, 480],
        sheen: 0.4,
        sheenRoughness: 0.5,
        envMapIntensity: 1.15,
    });
    pearlMat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = NOISE + shader.vertexShader
            .replace('#include <beginnormal_vertex>', `
                vec3 dN = normalize(position);
                vec3 dHelper = abs(dN.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
                vec3 dT = normalize(cross(dN, dHelper));
                vec3 dB = normalize(cross(dN, dT));
                vec3 dP0 = pearlDisplaced(dN);
                vec3 dP1 = pearlDisplaced(normalize(dN + dT * 0.01));
                vec3 dP2 = pearlDisplaced(normalize(dN + dB * 0.01));
                vec3 objectNormal = normalize(cross(dP1 - dP0, dP2 - dP0));
                if (dot(objectNormal, dN) < 0.0) objectNormal = -objectNormal;
                #ifdef USE_TANGENT
                    vec3 objectTangent = vec3(tangent.xyz);
                #endif
            `)
            .replace('#include <begin_vertex>', `
                vec3 transformed = dP0;
                #ifdef USE_ALPHAHASH
                    vPosition = vec3(position);
                #endif
            `);
    };
    const pearl = new THREE.Mesh(new THREE.IcosahedronGeometry(1, small ? 48 : 80), pearlMat);
    group.add(pearl);

    // Coloured lights circle the pearl so its reflections pick up the palette
    const palette = ['--c1', '--c2', '--c3', '--c4'];
    const orbitLights = palette.map(() => {
        const l = new THREE.PointLight(0xffffff, 0, 0, 2);
        group.add(l);
        return l;
    });

    // Satellites in each palette colour, on their own tilted orbits
    const satGeo = new THREE.SphereGeometry(1, 48, 48);
    const sats = palette.map((_, i) => {
        const m = new THREE.Mesh(satGeo, new THREE.MeshPhysicalMaterial({ roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 }));
        m.userData = { size: [0.17, 0.11, 0.13, 0.08][i], speed: [0.45, 0.32, 0.38, 0.55][i], phase: i * 1.7, rx: [1.75, 1.5, 1.95, 1.35][i], ry: [0.3, -0.45, 0.6, -0.2][i], rz: [1.2, 1.0, 1.4, 0.9][i] };
        group.add(m);
        return m;
    });

    // Soft contact shadow under the pearl
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false })
    );
    scene.add(shadow);

    function applyTheme() {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const accent = cssColor('--accent', '#3a5bd9');
        palette.forEach((name, i) => {
            const c = cssColor(name, '#3a5bd9');
            sats[i].material.color.copy(c);
            orbitLights[i].color.copy(c);
        });
        rim.color.copy(accent);
        rim.intensity = dark ? 3.2 : 2.2;
        pearlMat.color.set(dark ? 0xdfe4f2 : 0xeef1fa);
        shadow.material.opacity = dark ? 0.35 : 1;
        render();
    }

    // Layout in world units, recomputed on resize
    let visH = 1, visW = 1;
    function resize() {
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        visW = visH * camera.aspect;
        render();
    }

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', (e) => {
        pointer.tx = (e.clientX / innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    let introStart = null;
    const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    function introAmount(now) {
        if (reduce) return 1;
        if (introStart === null) introStart = state.introAt || now;
        return easeOutExpo(Math.min(1, (now - introStart) / 2400));
    }

    let time = 0, last = performance.now(), swell = 0;
    function render(now = performance.now()) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!reduce) time += dt;

        const intro = introAmount(now);
        pointer.x += (pointer.tx - pointer.x) * 0.04;
        pointer.y += (pointer.ty - pointer.y) * 0.04;
        const speed = Math.min(Math.abs(state.velocity || 0) / 4000, 1);
        swell += (speed - swell) * 0.06;

        // Scroll: from low and modest to centred and large
        const t = smooth(0.0, 0.7, state.heroProgress || 0);
        const startR = Math.min(visH * 0.17, visW * 0.3);
        const endR = Math.min(visH * 0.3, visW * 0.4);
        const radius = mix(startR, endR, t) * (0.86 + 0.14 * intro);
        const y = mix(-visH * 0.29, -visH * 0.02, t) - (1 - intro) * visH * 0.12;

        uniforms.uTime.value = time;
        uniforms.uAmp.value = 0.09 + swell * 0.08;

        group.position.set(pointer.x * 0.08, y - pointer.y * 0.05, 0);
        pearl.scale.setScalar(radius);
        pearl.rotation.y = time * 0.12 + pointer.x * 0.35 + t * 1.2;
        pearl.rotation.x = pointer.y * 0.2;

        // Satellites trace tilted orbits; coloured lights circle just outside the pearl
        sats.forEach((m) => {
            const d = m.userData;
            const a = time * d.speed + d.phase + t * 2;
            m.position.set(Math.cos(a) * radius * d.rx, d.ry * radius + Math.sin(a * 1.3) * radius * 0.2, Math.sin(a) * radius * d.rz);
            m.scale.setScalar(radius * d.size * (0.6 + 0.4 * intro));
        });
        orbitLights.forEach((l, i) => {
            const a = time * 0.35 + i * (Math.PI / 2);
            l.position.set(Math.cos(a) * radius * 2.2, Math.sin(a * 0.8 + i) * radius * 1.2, Math.sin(a) * radius * 2.2 + radius * 0.8);
            l.intensity = 9 * radius * radius * intro;
        });

        shadow.position.set(group.position.x, y - radius * 1.08, -radius);
        shadow.scale.set(radius * 2.8, radius * 0.5, 1);
        shadow.material.opacity = (document.documentElement.getAttribute('data-theme') === 'dark' ? 0.35 : 1) * intro * (1 - t * 0.35);

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

    resize();
    applyTheme();
    start();
}

init();
