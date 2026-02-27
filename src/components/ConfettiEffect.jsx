import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function ConfettiEffect() {
  useEffect(() => {
    const duration = 1500
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 40,
        spread: 80,
        origin: { y: 0.6 }
      })
      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [])

  return null
}

