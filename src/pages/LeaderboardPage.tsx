import { useState, useEffect } from 'react'
import type { User } from '../types'
import { fetchLeaderboard } from '../utils/api'
import { getUsers, recalculateAllScores } from '../utils/storage'

export default function LeaderboardPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const list = await fetchLeaderboard()
        if (!cancelled) setUsers(list)
      } catch {
        if (!cancelled) {
          recalculateAllScores()
          setUsers(getUsers().sort((a, b) => b.points - a.points))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="container">
      <div className="lb-header">
        <h2>Lestvica</h2>
        <p className="subtitle">
          Točke iz uvrstitev (1. mesto = 5 točk … 5. mesto = 1 točka). Po približno 20 dneh se okrona skupni zmagovalec!
        </p>
      </div>

      {loading ? (
        <div className="card empty">
          <p>Nalagam...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card empty">
          <p>Še ni rezultatov. Riši in glasuj, da prideš na lestvico!</p>
        </div>
      ) : (
        <div className="card lb-card">
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Igralec</th>
                <th>Točke</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={i < 3 ? `top-${i + 1}` : ''}>
                  <td className="rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="name">{u.name}</td>
                  <td className="points">{u.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .lb-header { margin-bottom: 1.75rem; }
        .lb-header h2 { font-size: 1.6rem; margin-bottom: 0.35rem; }
        .subtitle { color: #64748b; max-width: 520px; }
        .lb-card { padding: 0; overflow: hidden; }
        .lb-table { width: 100%; border-collapse: collapse; }
        .lb-table th { text-align: left; padding: 1rem 1.25rem; background: #f8fafc; color: #64748b; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
        .lb-table td { padding: 1rem 1.25rem; border-top: 1px solid #f1f5f9; }
        .rank { font-size: 1.25rem; width: 60px; text-align: center; }
        .name { font-weight: 600; font-size: 1.05rem; }
        .points { font-weight: 800; font-size: 1.15rem; color: #4361ee; text-align: right; }
        .top-1 .name { color: #b45309; }
        .top-2 .name { color: #64748b; }
        .top-3 .name { color: #92400e; }
        .empty { text-align: center; padding: 3rem; color: #64748b; }
      `}</style>
    </div>
  )
}
