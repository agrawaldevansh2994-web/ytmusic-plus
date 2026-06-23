import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 → target with an easeOutCubic curve.
 * Re-runs whenever `target` changes (e.g. period switch).
 */
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0)
  const frame = useRef<number>()

  useEffect(() => {
    if (!Number.isFinite(target)) return
    let start: number | undefined
    const from = 0

    const tick = (t: number) => {
      if (start === undefined) start = t
      const progress = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (target - from) * eased)
      if (progress < 1) frame.current = requestAnimationFrame(tick)
      else setValue(target)
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [target, duration])

  return value
}
