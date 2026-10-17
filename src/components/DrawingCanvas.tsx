import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onSave: (dataUrl: string) => void
  disabled?: boolean
  timeLimitSeconds?: number // default 180 (3 min)
}

const DRAW_SECONDS = 180

export default function DrawingCanvas({ onSave, disabled, timeLimitSeconds = DRAW_SECONDS }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#1a1a2e')
  const [brushSize, setBrushSize] = useState(6)
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds)
  const [timerActive, setTimerActive] = useState(true)
  const submittedRef = useRef(false)

  // Bigger internal resolution for sharper lines on phones
  const CANVAS_W = 900
  const CANVAS_H = 700

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const doSave = useCallback(() => {
    if (submittedRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    submittedRef.current = true
    setTimerActive(false)
    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }, [onSave])

  // Timer
  useEffect(() => {
    if (!timerActive || disabled) return
    if (secondsLeft <= 0) {
      doSave()
      return
    }
    const id = setInterval(() => {
      setSecondsLeft((s) => s - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [timerActive, secondsLeft, disabled, doSave])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !timerActive) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled || !timerActive) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const isLow = secondsLeft <= 30
  const isCritical = secondsLeft <= 10

  const presetColors = ['#1a1a2e', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff']

  return (
    <div className="canvas-wrapper">
      {/* Timer */}
      <div className={`timer ${isCritical ? 'critical' : isLow ? 'low' : ''}`}>
        <span className="timer-label">Preostali čas</span>
        <span className="timer-value">{formatTime(secondsLeft)}</span>
      </div>

      <div className="toolbar">
        <div className="color-section">
          <div className="color-presets">
            {presetColors.map((c) => (
              <button
                key={c}
                className={`color-btn ${color === c ? 'active' : ''}`}
                style={{ background: c, borderColor: c === '#ffffff' ? '#cbd5e1' : undefined }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
          <label className="custom-color">
            <span>Barva</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-input"
            />
          </label>
        </div>

        <div className="brush-size">
          <label>Debelina</label>
          <input
            type="range"
            min="2"
            max="28"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>

        <button className="btn btn-secondary btn-sm" onClick={clearCanvas} disabled={disabled || !timerActive}>
          Počisti
        </button>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="canvas-actions">
        <button
          className="btn btn-primary"
          onClick={doSave}
          disabled={disabled || !timerActive}
        >
          Oddaj risbo
        </button>
      </div>

      <style>{`
        .canvas-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          align-items: stretch;
          width: 100%;
        }
        .timer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
          padding: 0.6rem 1rem;
          background: #f1f5f9;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }
        .timer.low {
          background: #fef3c7;
          border-color: #f59e0b;
        }
        .timer.critical {
          background: #fee2e2;
          border-color: #ef4444;
          animation: pulse 0.8s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        .timer-label {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
        }
        .timer-value {
          font-size: 1.75rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: #1e293b;
        }
        .timer.low .timer-value { color: #b45309; }
        .timer.critical .timer-value { color: #dc2626; }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          justify-content: center;
        }
        .color-section {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .color-presets {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .color-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          padding: 0;
        }
        .color-btn.active {
          border-color: #4361ee;
          transform: scale(1.12);
        }
        .custom-color {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 600;
        }
        .color-input {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          padding: 0;
          background: none;
        }
        .brush-size {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 600;
        }
        .brush-size input {
          width: 90px;
        }
        .canvas-container {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
          background: #fff;
          /* Make it tall on phones */
          min-height: 55vh;
        }
        .drawing-canvas {
          display: block;
          width: 100%;
          height: auto;
          min-height: 55vh;
          touch-action: none;
          cursor: crosshair;
          background: white;
        }
        .canvas-actions {
          display: flex;
          justify-content: center;
          padding-bottom: 0.5rem;
        }
        .canvas-actions .btn {
          min-width: 160px;
          padding: 0.85rem 1.5rem;
          font-size: 1.05rem;
        }

        @media (min-width: 700px) {
          .canvas-container {
            min-height: 420px;
          }
          .drawing-canvas {
            min-height: 420px;
          }
        }
      `}</style>
    </div>
  )
}
