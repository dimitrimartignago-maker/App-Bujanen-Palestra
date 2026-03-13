'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  durationSeconds: number
  onDone: () => void
  onSkip: () => void
}

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 339.3

export default function RestTimer({ durationSeconds, onDone, onSkip }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const doneCalledRef = useRef(false)

  const finish = useCallback(() => {
    if (doneCalledRef.current) return
    doneCalledRef.current = true
    // Haptic feedback on completion
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
    onDone()
  }, [onDone])

  useEffect(() => {
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now
      const elapsed = (now - startRef.current) / 1000
      const left = Math.max(0, durationSeconds - elapsed)
      setRemaining(left)
      if (left <= 0) {
        finish()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [durationSeconds, finish])

  const progress = durationSeconds > 0 ? remaining / durationSeconds : 0
  // dashOffset 0 = full ring, CIRCUMFERENCE = empty ring
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  const displaySecs = Math.ceil(remaining)

  // Color: green when plenty of time, yellow when < 30%, red when < 10%
  const ringColor =
    progress > 0.3 ? '#16a34a' : progress > 0.1 ? '#ca8a04' : '#dc2626'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-6">
      {/* Ring */}
      <div className="relative flex items-center justify-center">
        <svg
          width={140}
          height={140}
          viewBox="0 0 120 120"
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="#374151"
            strokeWidth="8"
          />
          {/* Countdown arc */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke 0.3s' }}
          />
        </svg>

        {/* Centre time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tabular-nums text-white leading-none">
            {displaySecs}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-widest text-gray-400">
            riposo
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="mt-8 text-base font-semibold text-white">Riposa…</p>
      <p className="mt-1 text-sm text-gray-400">Il timer ti avviserà alla fine.</p>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="mt-10 rounded-full border border-white/20 px-8 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
      >
        Salta il riposo
      </button>
    </div>
  )
}
