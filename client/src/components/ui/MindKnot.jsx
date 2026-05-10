import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const MOODS = {
  neutral:      { c1:[0.48,0.55,1.00], c2:[0.28,0.30,0.90] },
  anticipation: { c1:[0.48,0.55,1.00], c2:[0.28,0.30,0.90] },
  joy:          { c1:[1.00,0.72,0.10], c2:[1.00,0.45,0.10] },
  trust:        { c1:[0.10,0.90,0.55], c2:[0.05,0.70,0.40] },
  fear:         { c1:[0.25,0.65,1.00], c2:[0.05,0.40,0.85] },
  anger:        { c1:[1.00,0.22,0.22], c2:[0.90,0.10,0.05] },
  sadness:      { c1:[0.45,0.40,0.95], c2:[0.25,0.20,0.75] },
  surprise:     { c1:[0.10,0.85,0.95], c2:[0.05,0.60,0.80] },
  disgust:      { c1:[1.00,0.50,0.10], c2:[0.85,0.30,0.05] },
}

const LIGHT_COLORS = {
  neutral:      [0x7c6af7, 0xa78bfa],
  anticipation: [0x7c6af7, 0xa78bfa],
  joy:          [0xf59e0b, 0xfbbf24],
  trust:        [0x10b981, 0x34d399],
  fear:         [0x0ea5e9, 0x38bdf8],
  anger:        [0xef4444, 0xf87171],
  sadness:      [0x6366f1, 0x818cf8],
  surprise:     [0x06b6d4, 0x22d3ee],
  disgust:      [0xf97316, 0xfb923c],
}

const VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vPos;
  varying float vFresnel;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    vFresnel = 1.0 - abs(dot(vNormal, vViewDir));
    vPos = position;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT_SHADER = `
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vPos;
  varying float vFresnel;

  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0,4,2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    float angle = atan(vPos.y, vPos.x);
    float hShift = sin(angle * 3.0 + uTime * 0.4) * 0.10 + vFresnel * 0.14;
    float t = (vPos.y + 1.8) / 3.6;
    vec3 baseColor = mix(uC1, uC2, t + sin(angle + uTime * 0.3) * 0.14);

    float diffuse = max(0.0, dot(vNormal, normalize(vec3(1.0, 1.5, 1.0))));
    float spec1 = pow(max(0.0, dot(reflect(-normalize(vec3(1.0,1.5,1.0)), vNormal), vViewDir)), 72.0);
    float spec2 = pow(max(0.0, dot(reflect(-normalize(vec3(-1.0,-1.0,1.0)), vNormal), vViewDir)), 36.0);

    vec3 iridColor = hsl2rgb(vec3(hShift + t * 0.4, 0.75, 0.68));
    vec3 rimColor = mix(baseColor * 1.6, vec3(1.0), vFresnel * 0.35);

    vec3 col = baseColor * (0.28 + diffuse * 0.52);
    col += iridColor * 0.20 * vFresnel;
    col += vec3(1.0) * spec1 * 1.0;
    col += baseColor * spec2 * 0.55;
    col += rimColor * pow(vFresnel, 2.0) * 0.38;
    col += baseColor * 0.07;

    float micro = sin(vPos.x * 20.0) * sin(vPos.y * 20.0) * sin(vPos.z * 20.0) * 0.035;
    col += baseColor * micro;

    gl_FragColor = vec4(col, 1.0);
  }
`

const GLOW_VERT = `
  varying float vF;
  void main() {
    vec3 n = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vF = 1.0 - abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`

const GLOW_FRAG = `
  uniform vec3 uC1;
  uniform float uTime;
  varying float vF;
  void main() {
    float p = sin(uTime * 1.2) * 0.5 + 0.5;
    float a = pow(vF, 2.5) * 0.24 * (0.8 + p * 0.2);
    gl_FragColor = vec4(uC1 * 1.9, a);
  }
`

function lerp3(a, b, s) {
  return [
    a[0] + (b[0] - a[0]) * s,
    a[1] + (b[1] - a[1]) * s,
    a[2] + (b[2] - a[2]) * s,
  ]
}

export function setKnotEmotion(name) {
  if (window.__setKnotMood) window.__setKnotMood(name)
}

export default function MindKnot({
  size = 400,
  autoRotate = true,
  interactive = true,
  demoCycle = false,
  rotateSpeed = 0.5,
}) {
  const mountRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // ── Renderer ─────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5))
    renderer.setSize(size, size)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    el.appendChild(renderer.domElement)

    // ── Scene + Camera ────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100)
    camera.position.set(0, 0, 5.5)

    // ── Manual orbit state ────────────────────────────────────
    let rotX = 0.3, rotY = 0
    let velX = 0,   velY = 0
    let isDragging = false
    let lastX = 0,  lastY = 0

    const onMouseDown = (e) => {
      if (!interactive) return
      isDragging = true
      lastX = e.clientX
      lastY = e.clientY
      velX = 0; velY = 0
    }
    const onMouseMove = (e) => {
      if (!isDragging) return
      velY = (e.clientX - lastX) * 0.008
      velX = (e.clientY - lastY) * 0.006
      rotY += velY
      rotX += velX
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX))
      lastX = e.clientX
      lastY = e.clientY
    }
    const onMouseUp   = () => { isDragging = false }

    // Touch support
    const onTouchStart = (e) => {
      if (!interactive) return
      isDragging = true
      lastX = e.touches[0].clientX
      lastY = e.touches[0].clientY
      velX = 0; velY = 0
    }
    const onTouchMove = (e) => {
      if (!isDragging) return
      velY = (e.touches[0].clientX - lastX) * 0.008
      velX = (e.touches[0].clientY - lastY) * 0.006
      rotY += velY
      rotX += velX
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX))
      lastX = e.touches[0].clientX
      lastY = e.touches[0].clientY
    }
    const onTouchEnd = () => { isDragging = false }

    el.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    el.addEventListener('touchstart',  onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: true })
    window.addEventListener('touchend',   onTouchEnd)

    // ── Lights ────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.12))

    const keyL = new THREE.DirectionalLight(0xffffff, 2.8)
    keyL.position.set(3, 4, 3)
    scene.add(keyL)

    const fillL = new THREE.DirectionalLight(0xffffff, 1.3)
    fillL.position.set(-4, -2, 2)
    scene.add(fillL)

    const rimL = new THREE.DirectionalLight(0xffffff, 2.0)
    rimL.position.set(0, -3, -4)
    scene.add(rimL)

    const pt1 = new THREE.PointLight(0x7c6af7, 3.5, 14)
    pt1.position.set(2, 2, 2)
    scene.add(pt1)

    const pt2 = new THREE.PointLight(0xa78bfa, 2.0, 12)
    pt2.position.set(-2, -2, 2)
    scene.add(pt2)

    // ── Color state ───────────────────────────────────────────
    const init = MOODS.anticipation
    const uniforms = {
      uC1:   { value: new THREE.Vector3(...init.c1) },
      uC2:   { value: new THREE.Vector3(...init.c2) },
      uTime: { value: 0.0 },
    }

    let c1L = [...init.c1]
    let c2L = [...init.c2]
    let tgtC1 = [...init.c1]
    let tgtC2 = [...init.c2]
    let currentKey = 'anticipation'
    const pt1Color = new THREE.Color(0x7c6af7)
    const pt2Color = new THREE.Color(0xa78bfa)

    window.__setKnotMood = (name) => {
      const m = MOODS[name] || MOODS.neutral
      tgtC1 = [...m.c1]
      tgtC2 = [...m.c2]
      currentKey = name
    }

    // ── Knot ──────────────────────────────────────────────────
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.3, 0.38, 320, 48, 2, 3),
      new THREE.ShaderMaterial({ vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, uniforms })
    )
    scene.add(knot)

    // ── Glow ──────────────────────────────────────────────────
    const glowMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.32, 0.41, 200, 32, 2, 3),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    scene.add(glowMesh)

    // ── Particles ─────────────────────────────────────────────
    const PC   = 160
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(PC * 3)
    const pMeta = []
    for (let i = 0; i < PC; i++) {
      const r  = 2.4 + Math.random() * 1.2
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pPos[i*3]   = r * Math.sin(ph) * Math.cos(th)
      pPos[i*3+1] = r * Math.sin(ph) * Math.sin(th)
      pPos[i*3+2] = r * Math.cos(ph)
      pMeta.push({ r, th, ph,
        ts: (Math.random()-0.5) * 0.003,
        ps: (Math.random()-0.5) * 0.002,
        phase: Math.random() * Math.PI * 2,
      })
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({
      color: 0xc4b5fd, size: 0.022,
      transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    scene.add(new THREE.Points(pGeo, pMat))

    // ── Demo cycle ────────────────────────────────────────────
    const DEMO = ['anticipation','joy','trust','fear','sadness','anger']
    let demoIdx = 0, nextAt = 4.5

    // ── Tick ──────────────────────────────────────────────────
    let t = 0
    const pArr = pGeo.attributes.position.array
    const autoRotSpeed = rotateSpeed * 0.003

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      t += 0.009

      // Demo cycle
      if (demoCycle && t > nextAt) {
        demoIdx = (demoIdx + 1) % DEMO.length
        window.__setKnotMood(DEMO[demoIdx])
        nextAt = t + 4.5 + Math.random() * 2
      }

      // Color lerp
      c1L = lerp3(c1L, tgtC1, 0.032)
      c2L = lerp3(c2L, tgtC2, 0.032)
      uniforms.uC1.value.set(c1L[0], c1L[1], c1L[2])
      uniforms.uC2.value.set(c2L[0], c2L[1], c2L[2])
      uniforms.uTime.value = t

      // Lights lerp
      const lc = LIGHT_COLORS[currentKey]
      if (lc) {
        pt1Color.lerp(new THREE.Color(lc[0]), 0.025)
        pt2Color.lerp(new THREE.Color(lc[1]), 0.025)
        pt1.color.copy(pt1Color)
        pt2.color.copy(pt2Color)
      }

      // Particle color
      pMat.color.setRGB(
        Math.min(1, c1L[0] * 1.3),
        Math.min(1, c1L[1] * 1.3),
        Math.min(1, c1L[2] * 1.3),
      )

      // Inertia + auto-rotate
      if (!isDragging) {
        velX *= 0.92
        velY *= 0.92
        rotY += velY
        rotX += velX
        if (autoRotate) rotY += autoRotSpeed
      }

      // Apply rotation
      knot.rotation.x = rotX
      knot.rotation.y = rotY
      knot.rotation.z = t * 0.08

      // Breathe
      const breathe = 1.0 + Math.sin(t * 0.9) * 0.014
      knot.scale.setScalar(breathe)
      glowMesh.rotation.copy(knot.rotation)
      glowMesh.scale.setScalar(breathe)

      // Particles
      for (let i = 0; i < PC; i++) {
        const m = pMeta[i]
        m.th += m.ts
        m.ph += m.ps
        const br = m.r * (1 + Math.sin(t * 0.45 + m.phase) * 0.055)
        pArr[i*3]   = br * Math.sin(m.ph) * Math.cos(m.th)
        pArr[i*3+1] = br * Math.sin(m.ph) * Math.sin(m.th)
        pArr[i*3+2] = br * Math.cos(m.ph)
      }
      pGeo.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }
    tick()

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current)
      delete window.__setKnotMood
      el.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      el.removeEventListener('touchstart',  onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [size, autoRotate, interactive, demoCycle, rotateSpeed])

  return (
    <div
      ref={mountRef}
      style={{
        width: size,
        height: size,
        cursor: interactive ? 'grab' : 'default',
      }}
    />
  )
}