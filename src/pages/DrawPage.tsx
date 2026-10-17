import { useState, useEffect } from 'react'
import type { User, Prompt } from '../types'
import DrawingCanvas from '../components/DrawingCanvas'
import { fetchPrompt, submitDrawing, fetchDrawings } from '../utils/api'
import {
  getTodayPrompt,
  getDrawingsForPrompt,
  addDrawing,
  getTodayDate,
} from '../utils/storage'

interface Props {
  user: User | null
}

export default function DrawPage({ user }: Props) {
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [drawingStarted, setDrawingStarted] = useState(false)
  const [useApi, setUseApi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const p = await fetchPrompt()
        if (cancelled) return
        setPrompt(p)
        setUseApi(true)

        if (user) {
          const drawings = await fetchDrawings(p.id)
          if (cancelled) return
          setAlreadySubmitted(drawings.some((d) => d.userId === user.id))
        }
      } catch {
        if (cancelled) return
        const p = getTodayPrompt()
        setPrompt(p)
        setUseApi(false)
        if (user) {
          const drawings = getDrawingsForPrompt(p.id)
          setAlreadySubmitted(drawings.some((d) => d.userId === user.id))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const handleSave = async (dataUrl: string) => {
    if (!user || !prompt || alreadySubmitted) return
    setError(null)

    try {
      if (useApi) {
        await submitDrawing({
          id: crypto.randomUUID(),
          userId: user.id,
          userName: user.name,
          promptId: prompt.id,
          promptWord: prompt.word,
          imageBase64: dataUrl,
        })
      } else {
        addDrawing({
          id: crypto.randomUUID(),
          userId: user.id,
          userName: user.name,
          promptId: prompt.id,
          promptWord: prompt.word,
          imageUrl: dataUrl,
          createdAt: new Date().toISOString(),
          votes: 0,
        })
      }
      setAlreadySubmitted(true)
      setJustSubmitted(true)
      setDrawingStarted(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka pri oddaji')
    }
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Prijavi se, da lahko riseš</h2>
        </div>
      </div>
    )
  }

  if (loading || !prompt) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Nalagam...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="draw-header">
        <p className="date-label">{getTodayDate()}</p>
        <h2>Današnja beseda</h2>
        <div className="word-badge">{prompt.word}</div>
        {!useApi && (
          <p className="local-hint">Lokalni način (skupno shranjevanje še ni vklopljeno)</p>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      {alreadySubmitted ? (
        <div className="card submitted-card">
          <div className="check">✅</div>
          <h3>{justSubmitted ? 'Risba oddana!' : 'Danes si že oddal/a risbo'}</h3>
          <p>Jutri lahko glasuješ o risbah vseh.</p>
        </div>
      ) : !drawingStarted ? (
        <div className="card start-card">
          <p className="hint">
            Imaš <strong>3 minute</strong> za risanje. Ko klikneš gumb, se prikaže tabla in začne šteti čas.
          </p>
          <p className="hint-small">Eno oddajo na dan.</p>
          <button className="btn btn-primary start-btn" onClick={() => setDrawingStarted(true)}>
            Začni risati
          </button>
        </div>
      ) : (
        <div className="card canvas-card">
          <DrawingCanvas onSave={handleSave} />
        </div>
      )}

      <style>{`
        .draw-header { text-align: center; margin-bottom: 1.5rem; }
        .date-label { color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.35rem; }
        .draw-header h2 { font-size: 1.1rem; color: #64748b; font-weight: 600; margin-bottom: 0.75rem; }
        .local-hint { margin-top: 0.75rem; font-size: 0.8rem; color: #f59e0b; }
        .error-box { background: #fee2e2; color: #b91c1c; padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1rem; text-align: center; }
        .start-card { text-align: center; padding: 2.5rem 1.5rem; }
        .hint { color: #475569; font-size: 1.05rem; margin-bottom: 0.5rem; line-height: 1.5; }
        .hint-small { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.75rem; }
        .start-btn { padding: 1rem 2rem; font-size: 1.15rem; min-width: 200px; }
        .submitted-card { text-align: center; padding: 3rem 2rem; }
        .check { font-size: 3rem; margin-bottom: 1rem; }
        .submitted-card h3 { margin-bottom: 0.5rem; }
        .submitted-card p { color: #64748b; }
        .canvas-card { padding: 1rem; }
        @media (max-width: 600px) {
          .canvas-card { padding: 0.5rem; margin-left: -0.5rem; margin-right: -0.5rem; border-radius: 12px; }
        }
      `}</style>
    </div>
  )
}
