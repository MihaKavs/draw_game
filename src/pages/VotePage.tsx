import { useState, useEffect } from 'react'
import type { User, Drawing, Prompt } from '../types'
import {
  fetchPrompt,
  fetchDrawings,
  checkHasVoted,
  submitVotes,
} from '../utils/api'
import {
  getPromptForDate,
  getDrawingsForPrompt,
  hasUserVotedForPrompt,
  saveVotes,
  recalculateAllScores,
} from '../utils/storage'

interface Props {
  user: User | null
}

export default function VotePage({ user }: Props) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [selected, setSelected] = useState<(string | null)[]>([null, null, null])
  const [hasVoted, setHasVoted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [useApi, setUseApi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const p = await fetchPrompt(yesterdayStr)
        if (cancelled) return
        setPrompt(p)
        setUseApi(true)

        const list = await fetchDrawings(p.id)
        if (cancelled) return
        setDrawings([...list].sort(() => Math.random() - 0.5))

        if (user) {
          const voted = await checkHasVoted(p.id, user.id)
          if (!cancelled) setHasVoted(voted)
        }
      } catch {
        if (cancelled) return
        const p = getPromptForDate(yesterdayStr)
        setPrompt(p)
        setUseApi(false)
        const list = getDrawingsForPrompt(p.id)
        setDrawings([...list].sort(() => Math.random() - 0.5))
        if (user) {
          setHasVoted(hasUserVotedForPrompt(user.id, p.id))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, yesterdayStr])

  const toggleSelect = (drawingId: string) => {
    if (hasVoted || submitted) return
    setSelected((prev) => {
      const already = prev.indexOf(drawingId)
      if (already >= 0) {
        const next = [...prev]
        next[already] = null
        return next
      }
      const empty = prev.indexOf(null)
      if (empty === -1) return prev
      const next = [...prev]
      next[empty] = drawingId
      return next
    })
  }

  const getRank = (drawingId: string) => {
    const idx = selected.indexOf(drawingId)
    return idx >= 0 ? idx + 1 : null
  }

  const handleSubmitVotes = async () => {
    if (!user || !prompt || selected.some((s) => s === null)) return
    setError(null)

    const votes = selected.map((drawingId, i) => ({
      drawingId: drawingId!,
      rank: (i + 1) as 1 | 2 | 3,
    }))

    try {
      if (useApi) {
        await submitVotes({
          voterId: user.id,
          promptId: prompt.id,
          votes,
        })
      } else {
        saveVotes(
          votes.map((v) => ({
            drawingId: v.drawingId,
            voterId: user.id,
            rank: v.rank,
          }))
        )
        recalculateAllScores()
      }
      setSubmitted(true)
      setHasVoted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka pri glasovanju')
    }
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Prijavi se, da lahko glasuješ</h2>
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
      <div className="vote-header">
        <p className="date-label">Glasovanje za {yesterdayStr}</p>
        <h2>Včerajšnja beseda</h2>
        <div className="word-badge">{prompt.word}</div>
        <p className="hint">
          Izberi <strong>najboljše 3</strong> risbe (1. = najboljša). Pred oddajo lahko spremeniš izbor.
        </p>
      </div>

      {error && <div className="error-box">{error}</div>}

      {drawings.length === 0 ? (
        <div className="card empty">
          <p>Včeraj ni bilo oddanih risb.</p>
        </div>
      ) : hasVoted || submitted ? (
        <div className="card submitted-card">
          <div className="check">🗳️</div>
          <h3>{submitted ? 'Glasovi oddani!' : 'Za ta dan si že glasoval/a'}</h3>
          <p>Hvala za glasovanje. Preveri Lestvico za rezultate.</p>
        </div>
      ) : (
        <>
          <div className="vote-grid">
            {drawings.map((d) => {
              const rank = getRank(d.id)
              return (
                <div
                  key={d.id}
                  className={`vote-card ${rank ? 'selected' : ''}`}
                  onClick={() => toggleSelect(d.id)}
                >
                  {rank && <div className={`rank-badge rank-${rank}`}>{rank}</div>}
                  <img src={d.imageUrl} alt={`Risba od ${d.userName}`} />
                  <p className="artist">{d.userName}</p>
                </div>
              )
            })}
          </div>

          <div className="vote-actions">
            <p className="selection-info">
              Izbrano: {selected.filter(Boolean).length} / 3
            </p>
            <button
              className="btn btn-primary"
              disabled={selected.some((s) => s === null)}
              onClick={handleSubmitVotes}
            >
              Oddaj top 3
            </button>
          </div>
        </>
      )}

      <style>{`
        .vote-header { text-align: center; margin-bottom: 2rem; }
        .date-label { color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.35rem; }
        .vote-header h2 { font-size: 1.1rem; color: #64748b; font-weight: 600; margin-bottom: 0.75rem; }
        .hint { margin-top: 1rem; color: #64748b; font-size: 0.95rem; }
        .error-box { background: #fee2e2; color: #b91c1c; padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1rem; text-align: center; }
        .vote-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
        .vote-card { background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); cursor: pointer; position: relative; border: 3px solid transparent; transition: all 0.15s; }
        .vote-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .vote-card.selected { border-color: #4361ee; }
        .vote-card img { width: 100%; aspect-ratio: 7/5; object-fit: contain; background: #f8fafc; display: block; }
        .artist { padding: 0.65rem; text-align: center; font-weight: 600; font-size: 0.9rem; color: #475569; }
        .rank-badge { position: absolute; top: 10px; left: 10px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 1rem; z-index: 2; }
        .rank-1 { background: #f59e0b; }
        .rank-2 { background: #94a3b8; }
        .rank-3 { background: #b45309; }
        .vote-actions { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .selection-info { color: #64748b; font-weight: 600; }
        .empty, .submitted-card { text-align: center; padding: 3rem 2rem; }
        .check { font-size: 3rem; margin-bottom: 1rem; }
      `}</style>
    </div>
  )
}
