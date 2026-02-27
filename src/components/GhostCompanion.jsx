import React from 'react'

export default function GhostCompanion({ mood = 'idle', variant = 'full', className = '' }) {
  const isAvatar = variant === 'avatar'

  return (
    <div
      className={[
        'ghost-root',
        `ghost-mood-${mood}`,
        isAvatar ? 'ghost-variant-avatar' : 'ghost-variant-full',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <div className="ghost-dots" aria-hidden>…</div>
      <div className="ghost-stars" aria-hidden>
        <span className="ghost-star ghost-star-1" />
        <span className="ghost-star ghost-star-2" />
        <span className="ghost-star ghost-star-3" />
        <span className="ghost-star ghost-star-4" />
      </div>
      <div className="ghost-body" aria-hidden>
        <div className="ghost-eye ghost-eye-left" />
        <div className="ghost-eye ghost-eye-right" />
      </div>

      <style>{`
        .ghost-root {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          contain: layout paint;
        }

        .ghost-variant-full {
          width: 100px;
          height: 110px;
        }

        .ghost-variant-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #fff8f0, #ffffff);
          border: 1.5px solid rgba(249,115,22,0.15);
          box-shadow: 0 2px 8px rgba(249,115,22,0.12);
        }

        .ghost-body {
          width: 100px;
          height: 110px;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(249,115,22,0.15);
          border-radius: 50% 50% 45% 45%;
          position: relative;
          overflow: hidden;
        }

        .ghost-variant-avatar .ghost-body {
          width: 23px;
          height: 23px;
          border-radius: 50% 50% 45% 45%;
          box-shadow: none;
        }

        .ghost-eye {
          position: absolute;
          display: block;
          top: 44px;
          width: 6px;
          height: 6px;
          background: #1c1917;
          border-radius: 50%;
          transform-origin: center;
        }

        .ghost-variant-avatar .ghost-eye {
          top: 8px;
          width: 3px;
          height: 3px;
        }

        .ghost-eye-left { left: 36px; }
        .ghost-eye-right { right: 36px; }

        .ghost-variant-avatar .ghost-eye-left { left: 7px; }
        .ghost-variant-avatar .ghost-eye-right { right: 7px; }

        /* Dots only visible in thinking */
        .ghost-dots {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 16px;
          letter-spacing: 2px;
          color: rgba(17,17,17,0.55);
          opacity: 0;
        }

        .ghost-variant-avatar .ghost-dots {
          top: -14px;
          font-size: 13px;
        }

        /* Stars only visible in celebrating */
        .ghost-stars {
          position: absolute;
          inset: -20px;
          opacity: 0;
          pointer-events: none;
        }

        .ghost-star {
          position: absolute;
          width: 10px;
          height: 10px;
          opacity: 0;
        }
        .ghost-star::before,
        .ghost-star::after {
          content: '';
          position: absolute;
          inset: 0;
          margin: auto;
          width: 10px;
          height: 2px;
          background: rgba(249,115,22,0.9);
          border-radius: 9999px;
        }
        .ghost-star::after {
          transform: rotate(90deg);
        }
        .ghost-star-1 { top: 6px; left: 10px; }
        .ghost-star-2 { top: 0px; right: 14px; }
        .ghost-star-3 { bottom: 8px; left: 0px; }
        .ghost-star-4 { bottom: 2px; right: 4px; }

        /* Base idle motion */
        .ghost-mood-idle .ghost-body {
          animation: ghostFloat 3s ease-in-out infinite;
        }
        .ghost-mood-idle .ghost-eye {
          animation: ghostBlink 4s infinite;
        }

        /* Thinking: wobble + dots */
        .ghost-mood-thinking .ghost-body {
          animation: ghostWobble 0.9s ease-in-out infinite;
        }
        .ghost-mood-thinking .ghost-dots {
          opacity: 1;
          animation: ghostDots 1.1s ease-in-out infinite;
        }
        .ghost-mood-thinking .ghost-eye {
          animation: ghostBlink 3.2s infinite;
        }

        /* Celebrating: bounce + spin + stars */
        .ghost-mood-celebrating .ghost-body {
          animation: ghostBounceSpin 0.95s ease-in-out infinite;
        }
        .ghost-mood-celebrating .ghost-stars {
          opacity: 1;
        }
        .ghost-mood-celebrating .ghost-star {
          opacity: 1;
          animation: ghostStarPop 1.1s ease-in-out infinite;
        }
        .ghost-mood-celebrating .ghost-star-2 { animation-delay: 0.12s; }
        .ghost-mood-celebrating .ghost-star-3 { animation-delay: 0.24s; }
        .ghost-mood-celebrating .ghost-star-4 { animation-delay: 0.36s; }

        /* Concerned: droop + sad eyes */
        .ghost-mood-concerned .ghost-body {
          animation: ghostDroop 1.8s ease-in-out infinite;
        }
        .ghost-mood-concerned .ghost-eye {
          background: transparent;
          width: 10px;
          height: 7px;
          border-radius: 9999px;
          border: 2px solid transparent;
          border-top-color: #111111;
        }
        .ghost-variant-avatar.ghost-mood-concerned .ghost-eye {
          width: 6px;
          height: 4px;
          border-width: 2px;
        }
        .ghost-mood-concerned .ghost-eye-left { left: 32px; }
        .ghost-mood-concerned .ghost-eye-right { right: 32px; }
        .ghost-variant-avatar.ghost-mood-concerned .ghost-eye-left { left: 6px; }
        .ghost-variant-avatar.ghost-mood-concerned .ghost-eye-right { right: 6px; }

        /* Walking: alternating tilt */
        .ghost-mood-walking .ghost-body {
          animation: ghostWalkTilt 0.7s ease-in-out infinite;
        }

        @keyframes ghostFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        @keyframes ghostBlink {
          0%, 92%, 100% { transform: scaleY(1); }
          94% { transform: scaleY(0.1); }
          96% { transform: scaleY(1); }
        }

        @keyframes ghostWobble {
          0%, 100% { transform: translateX(0px) rotate(0deg); }
          25% { transform: translateX(-3px) rotate(-2deg); }
          50% { transform: translateX(0px) rotate(0deg); }
          75% { transform: translateX(3px) rotate(2deg); }
        }

        @keyframes ghostDots {
          0%, 100% { transform: translateX(-50%) translateY(0px); opacity: 0.7; }
          50% { transform: translateX(-50%) translateY(-2px); opacity: 1; }
        }

        @keyframes ghostBounceSpin {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40% { transform: translateY(-7px) rotate(6deg); }
          70% { transform: translateY(0px) rotate(-4deg); }
        }

        @keyframes ghostStarPop {
          0%, 100% { transform: scale(0.7) rotate(0deg); opacity: 0.6; }
          50% { transform: scale(1.15) rotate(10deg); opacity: 1; }
        }

        @keyframes ghostDroop {
          0%, 100% { transform: translateY(0px); }
          60% { transform: translateY(5px); }
        }

        @keyframes ghostWalkTilt {
          0%, 100% { transform: rotate(-3deg) translateY(0px); }
          50% { transform: rotate(3deg) translateY(-2px); }
        }
      `}</style>
    </div>
  )
}

