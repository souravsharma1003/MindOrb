import { useRef, useCallback } from 'react'

export function useTimer() {
  const startRef = useRef(null)

  const start = useCallback(() => {
    startRef.current = performance.now()
  }, [])

  const stop = useCallback(() => {
    if (!startRef.current) return 0
    const elapsed = Math.round(performance.now() - startRef.current)
    startRef.current = null
    return elapsed
  }, [])

  const reset = useCallback(() => {
    startRef.current = null
  }, [])

  return { start, stop, reset }
}