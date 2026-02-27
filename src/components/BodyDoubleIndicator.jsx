import React, { useEffect, useState } from 'react'

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default function BodyDoubleIndicator({ baseCount, onChange, shortLabel = false }) {
  const [count, setCount] = useState(
    typeof baseCount === 'number' ? baseCount : randomBetween(180, 300)
  )

  // Notify parent when the count actually changes, but avoid depending on
  // the callback identity so we don't create a render loop.
  useEffect(() => {
    if (typeof onChange === 'function') {
      onChange(count)
    }
    // We intentionally omit `onChange` here because the parent passes a
    // new function each render; including it would retrigger this effect
    // even when `count` hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = randomBetween(-5, 5)
        const next = Math.min(400, Math.max(120, prev + delta))
        return next
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const label = shortLabel ? 'working now' : 'people working now'

  return (
    <div className="rounded-full bg-white/80 px-3 py-1.5 text-sm shadow-sm backdrop-blur">
      <span className="mr-1">🟢</span>
      <span className="font-medium">{count}</span>
      <span className="ml-1 text-xs text-neutral-600">{label}</span>
    </div>
  )
}

