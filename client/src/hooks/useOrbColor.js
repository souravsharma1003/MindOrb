import { useRef, useCallback } from 'react'

// ── Emotion → RGB values ──────────────────────────────────────
const EMOTION_RGB = {
  joy:          { c1: [253, 230, 138], c2: [245, 158, 11],  c3: [217, 119, 6]  },
  trust:        { c1: [110, 231, 183], c2: [16,  185, 129], c3: [5,   150, 105] },
  fear:         { c1: [186, 230, 253], c2: [14,  165, 233], c3: [3,   105, 161] },
  surprise:     { c1: [165, 243, 252], c2: [6,   182, 212], c3: [14,  116, 144] },
  sadness:      { c1: [196, 181, 253], c2: [124, 106, 247], c3: [79,  63,  181] },
  disgust:      { c1: [254, 215, 170], c2: [249, 115, 22],  c3: [194, 65,  12]  },
  anger:        { c1: [252, 165, 165], c2: [239, 68,  68],  c3: [185, 28,  28]  },
  anticipation: { c1: [221, 214, 254], c2: [124, 106, 247], c3: [91,  33,  182] },
  neutral:      { c1: [212, 212, 216], c2: [113, 113, 122], c3: [63,  63,  70]  },
}

function lerpRGB(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function toCSS([r, g, b]) {
  return `rgb(${r},${g},${b})`
}

export function useOrbColor(initialEmotion = 'neutral') {
  const init     = EMOTION_RGB[initialEmotion] || EMOTION_RGB.neutral
  const curRef   = useRef({ c1: [...init.c1], c2: [...init.c2], c3: [...init.c3] })
  const targetRef = useRef({ c1: [...init.c1], c2: [...init.c2], c3: [...init.c3] })
  const rafRef   = useRef(null)
  const listenersRef = useRef(new Set())

  // Subscribe to color updates
  const subscribe = useCallback((cb) => {
    listenersRef.current.add(cb)
    return () => listenersRef.current.delete(cb)
  }, [])

  // Notify all subscribers with current colors as CSS strings
  const emit = useCallback(() => {
    const cur = curRef.current
    listenersRef.current.forEach(cb => cb({
      c1:   toCSS(cur.c1),
      c2:   toCSS(cur.c2),
      c3:   toCSS(cur.c3),
      glow: `rgba(${cur.c2[0]},${cur.c2[1]},${cur.c2[2]},0.45)`,
    }))
  }, [])

  // Start lerping to new target
  const setEmotion = useCallback((emotion) => {
    const tgt = EMOTION_RGB[emotion] || EMOTION_RGB.neutral
    targetRef.current = {
      c1: [...tgt.c1],
      c2: [...tgt.c2],
      c3: [...tgt.c3],
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const DURATION = 1800 // ms — ink drop feel
    const startTime = performance.now()
    const startColors = {
      c1: [...curRef.current.c1],
      c2: [...curRef.current.c2],
      c3: [...curRef.current.c3],
    }

    function tick(now) {
      const elapsed = now - startTime
      const raw = elapsed / DURATION
      // Ease out cubic — fast start, slow finish (ink drop)
      const t = Math.min(1, 1 - Math.pow(1 - raw, 3))

      curRef.current = {
        c1: lerpRGB(startColors.c1, targetRef.current.c1, t),
        c2: lerpRGB(startColors.c2, targetRef.current.c2, t),
        c3: lerpRGB(startColors.c3, targetRef.current.c3, t),
      }

      emit()

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [emit])

  // Get current colors immediately (for initial render)
  const getColors = useCallback(() => {
    const cur = curRef.current
    return {
      c1:   toCSS(cur.c1),
      c2:   toCSS(cur.c2),
      c3:   toCSS(cur.c3),
      glow: `rgba(${cur.c2[0]},${cur.c2[1]},${cur.c2[2]},0.45)`,
    }
  }, [])

  return { setEmotion, subscribe, getColors }
}